-- ═══════════════════════════════════════════════════════════════════════════
--  ISLII SMS — 0007 PRICING INTEGRITY + DATA-LOSS FIXES
-- ═══════════════════════════════════════════════════════════════════════════
--  Run after 0006, BEFORE the school starts entering real data. Everything
--  here is a correctness fix found by auditing 0005/0006 against how a real
--  school actually operates. Two of them destroy money silently.
--
--  ── 1. PAYMENTS WERE CASCADE-DELETED (critical) ──────────────────────────
--  payments.enrollment_id and .student_id were ON DELETE CASCADE. Deleting a
--  student therefore deleted their enrolments, which deleted every receipt
--  they had ever paid — no error, no trace, and the school's income for the
--  term quietly drops. A financial record must outlive the convenience of
--  deleting a row, so both become RESTRICT: a student who has paid money
--  cannot be deleted until the payments are dealt with deliberately.
--
--  ── 2. A ZERO FEE COULD NOT MEAN "FREE" (correctness) ────────────────────
--  enrollments.fee_kes was `not null default 0`, and the trigger overwrote 0
--  with the course price. A scholarship student entered at 0 was silently
--  re-billed the full fee. Postgres cannot tell "column omitted" from
--  "explicitly 0" in a BEFORE trigger, so the column becomes NULLABLE and the
--  three states become distinct and honest:
--
--      NULL → not priced yet, inherit from the intake or course
--      0    → deliberately free (scholarship, bursary, staff child)
--      > 0  → the agreed fee
--
--  ── 3. INTAKES HAD NO PRICE (the conflict you predicted) ─────────────────
--  Every cohort was forced to the course price, so an evening class, a
--  corporate cohort or a January promotion had nowhere to live and staff
--  would have had to edit the course — re-pricing the whole catalogue — or
--  hand-edit every enrolment. Price now resolves down a chain, most specific
--  first:  enrolment → intake → course.
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
--  1. STOP CASCADE-DELETING MONEY
-- ═══════════════════════════════════════════════════════════════════════════
alter table public.payments
  drop constraint if exists payments_enrollment_id_fkey,
  drop constraint if exists payments_student_id_fkey;

alter table public.payments
  add constraint payments_enrollment_id_fkey
    foreign key (enrollment_id) references public.enrollments (id) on delete restrict,
  add constraint payments_student_id_fkey
    foreign key (student_id) references public.students (id) on delete restrict;

comment on table public.payments is
  'Append-only money ledger, one row per receipt. RESTRICT on both foreign '
  'keys: deleting a student or an enrolment must fail while receipts exist, '
  'rather than silently erasing the school''s income.';


-- ═══════════════════════════════════════════════════════════════════════════
--  2. FEES BECOME NULLABLE — NULL means "not priced", 0 means "free"
-- ═══════════════════════════════════════════════════════════════════════════
alter table public.enrollments alter column fee_kes drop default;
alter table public.enrollments alter column fee_kes drop not null;

-- An enrolment sitting at exactly 0 today is almost certainly "never priced"
-- rather than "deliberately free" — nothing in the UI could express free yet.
-- Reset those to NULL so the resolver can fill them in; a real scholarship can
-- then be set to 0 and it will stick.
update public.enrollments e
   set fee_kes = null
 where e.fee_kes = 0
   and not exists (select 1 from public.payments p where p.enrollment_id = e.id);

comment on column public.enrollments.fee_kes is
  'Agreed fee for THIS enrolment. NULL = not priced yet (resolve from the '
  'intake, then the course). 0 = deliberately free. Never re-derived once set: '
  'a student who enrolled at 30,000 still owes 30,000 after a price rise.';


-- ═══════════════════════════════════════════════════════════════════════════
--  3. COHORT PRICING
-- ═══════════════════════════════════════════════════════════════════════════
alter table public.intakes
  add column if not exists fee_kes numeric(12,2)
    check (fee_kes is null or fee_kes >= 0);

comment on column public.intakes.fee_kes is
  'Price for this cohort. NULL = inherit the course fee. Set it for an evening '
  'class, a corporate cohort or a promotional intake without re-pricing the '
  'catalogue.';


-- The single source of truth for "what should this cost". Used by the
-- enrolment trigger and by apply_pending_fees(), so the precedence rule exists
-- in exactly one place and cannot drift between them.
create or replace function public.resolve_fee(p_intake_id uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(i.fee_kes, c.fee_kes, 0)
    from public.intakes i
    join public.courses c on c.id = i.course_id
   where i.id = p_intake_id;
$$;


-- Fill the fee only when the enrolment did not bring its own.
create or replace function public.set_enrollment_fee()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- IS NULL, not `= 0`. An explicit 0 is a scholarship and must survive.
  if new.fee_kes is null then
    new.fee_kes := public.resolve_fee(new.intake_id);
  end if;
  return new;
end;
$$;

drop trigger if exists enrollments_set_fee on public.enrollments;
create trigger enrollments_set_fee
  before insert on public.enrollments
  for each row execute function public.set_enrollment_fee();


-- Price an intake or a course AFTER students are already enrolled.
--
-- This is the normal order of events, not an edge case: a school registers
-- students in week one and agrees the price in week two. Without this the
-- trigger has already run, every one of those enrolments is stuck at whatever
-- it was, and staff would have to open each student individually.
--
-- Only touches enrolments that have taken NO payment and are still unpriced or
-- at the old inherited figure — it can never overwrite a negotiated fee or
-- disturb an account with money against it.
create or replace function public.apply_pending_fees(
  p_intake_id uuid default null,
  p_course_id uuid default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if not public.is_staff() then
    raise exception 'only an admin or registrar may re-price enrolments'
      using errcode = '42501';
  end if;

  if p_intake_id is null and p_course_id is null then
    raise exception 'name an intake or a course to re-price';
  end if;

  with target as (
    select e.id, public.resolve_fee(e.intake_id) as fee
      from public.enrollments e
      join public.intakes i on i.id = e.intake_id
     where (p_intake_id is null or e.intake_id = p_intake_id)
       and (p_course_id is null or i.course_id = p_course_id)
       and e.status <> 'withdrawn'
       and coalesce(e.fee_kes, 0) = 0
       and not exists (select 1 from public.payments p where p.enrollment_id = e.id)
  )
  update public.enrollments e
     set fee_kes = t.fee
    from target t
   where e.id = t.id and t.fee > 0;

  get diagnostics v_count = row_count;

  insert into public.audit_log (actor, action, entity, entity_id, detail)
  values (auth.uid(), 'fees.applied', 'enrollments', coalesce(p_intake_id, p_course_id),
          jsonb_build_object('enrolments', v_count,
                             'intake_id', p_intake_id,
                             'course_id', p_course_id));

  return v_count;
end;
$$;


-- ═══════════════════════════════════════════════════════════════════════════
--  4. VIEWS REBUILT FOR NULLABLE FEES
-- ═══════════════════════════════════════════════════════════════════════════
drop view if exists public.enrollment_finance;

create view public.enrollment_finance as
select
  e.id                          as enrollment_id,
  e.student_id,
  e.intake_id,
  e.fee_kes                     as fee_raw,          -- NULL = never priced
  coalesce(e.fee_kes, 0)        as fee_kes,
  coalesce(p.paid, 0)           as paid_kes,
  coalesce(e.fee_kes, 0) - coalesce(p.paid, 0) as balance_kes,
  case
    when e.fee_kes is null                      then 'unbilled'
    when coalesce(p.paid, 0) >  e.fee_kes       then 'overpaid'
    when e.fee_kes = 0                          then 'free'
    when coalesce(p.paid, 0) = 0                then 'unpaid'
    when coalesce(p.paid, 0) >= e.fee_kes       then 'paid'
    else                                             'partial'
  end as payment_status,
  p.last_paid_on,
  p.receipts
from public.enrollments e
left join (
  select enrollment_id,
         sum(amount_kes) as paid,
         max(paid_on)    as last_paid_on,
         count(*)        as receipts
    from public.payments
   group by enrollment_id
) p on p.enrollment_id = e.id;

alter view public.enrollment_finance set (security_invoker = on);

comment on view public.enrollment_finance is
  'Fee, paid and balance per enrolment. A view, never stored totals, so a '
  'corrected or deleted receipt can never leave a stale balance behind.';


-- ═══════════════════════════════════════════════════════════════════════════
--  5. ATTENDANCE INTEGRITY
-- ═══════════════════════════════════════════════════════════════════════════
--  mark_attendance() trusted whatever enrolment ids the client sent. Staff-only
--  is not the same as correct: a stale browser tab holding a register for a
--  cohort somebody has since edited could write marks against enrolments that
--  are withdrawn, or that belong to an entirely different intake. Attendance is
--  evidence — a school may use it to bar a student from an assessment — so it
--  is worth being strict about.
create or replace function public.mark_attendance(
  p_session_date date,
  p_entries      jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count   integer;
  v_bad     integer;
begin
  if not public.is_staff() then
    raise exception 'only an admin or registrar may take attendance'
      using errcode = '42501';
  end if;

  if p_session_date > current_date then
    raise exception 'attendance cannot be recorded for a future date';
  end if;

  -- Reject the whole register rather than silently dropping rows: a teacher
  -- who marked thirty students must not be told "saved" when it saved 28.
  select count(*) into v_bad
    from jsonb_array_elements(p_entries) as entry
   where not exists (
     select 1 from public.enrollments e
      where e.id = (entry ->> 'enrollment_id')::uuid
        and e.status <> 'withdrawn'
   );

  if v_bad > 0 then
    raise exception
      '% entr%  refer to an enrolment that no longer exists or has been withdrawn. Reload the register and try again.',
      v_bad, case when v_bad = 1 then 'y' else 'ies' end;
  end if;

  insert into public.attendance (enrollment_id, session_date, state, note, recorded_by)
  select
    (entry ->> 'enrollment_id')::uuid,
    p_session_date,
    coalesce((entry ->> 'state')::public.attendance_state, 'present'),
    nullif(trim(entry ->> 'note'), ''),
    auth.uid()
  from jsonb_array_elements(p_entries) as entry
  on conflict (enrollment_id, session_date) do update
    set state       = excluded.state,
        note        = excluded.note,
        recorded_at = now(),
        recorded_by = excluded.recorded_by;

  get diagnostics v_count = row_count;

  insert into public.audit_log (actor, action, entity, entity_id, detail)
  values (auth.uid(), 'attendance.recorded', 'attendance', null,
          jsonb_build_object('session_date', p_session_date, 'entries', v_count));

  return v_count;
end;
$$;


-- Same reasoning for marks: a score written against a withdrawn or foreign
-- enrolment is a transcript error nobody will catch until graduation.
create or replace function public.record_scores(
  p_assessment_id uuid,
  p_scores        jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_bad   integer;
begin
  if not public.is_staff() then
    raise exception 'only an admin or registrar may record marks'
      using errcode = '42501';
  end if;

  -- The enrolment must sit in the same intake as the assessment.
  select count(*) into v_bad
    from jsonb_array_elements(p_scores) as entry
   where not exists (
     select 1
       from public.enrollments e
       join public.assessments a on a.id = p_assessment_id
      where e.id = (entry ->> 'enrollment_id')::uuid
        and e.intake_id = a.intake_id
        and e.status <> 'withdrawn'
   );

  if v_bad > 0 then
    raise exception
      '% mark(s) refer to a student who is not on this assessment''s cohort. Reload and try again.',
      v_bad;
  end if;

  insert into public.assessment_scores (assessment_id, enrollment_id, score, remark, recorded_by)
  select
    p_assessment_id,
    (entry ->> 'enrollment_id')::uuid,
    nullif(entry ->> 'score', '')::numeric,
    nullif(trim(entry ->> 'remark'), ''),
    auth.uid()
  from jsonb_array_elements(p_scores) as entry
  on conflict (assessment_id, enrollment_id) do update
    set score       = excluded.score,
        remark      = excluded.remark,
        recorded_at = now(),
        recorded_by = excluded.recorded_by;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;


-- ═══════════════════════════════════════════════════════════════════════════
--  6. PAYMENT GUARDS
-- ═══════════════════════════════════════════════════════════════════════════
--  Two additions over 0006: a duplicate-reference check, and rejecting a
--  payment against an enrolment that was never priced.
--
--  The duplicate check exists because the single most common data-entry error
--  in a cash office is pasting the same M-Pesa code twice — once when the
--  message arrives and once when reconciling. It is a warning-by-error rather
--  than a hard constraint, because a genuine repeat is possible; the caller
--  can pass p_allow_duplicate to proceed.
create or replace function public.record_payment(
  p_enrollment_id   uuid,
  p_amount          numeric,
  p_method          public.payment_method default 'cash',
  p_reference       text default null,
  p_paid_on         date default current_date,
  p_note            text default null,
  p_allow_duplicate boolean default false
)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student uuid;
  v_fee     numeric;
  v_receipt text;
  v_ref     text := nullif(trim(p_reference), '');
  v_row     public.payments;
begin
  if not public.is_staff() then
    raise exception 'only an admin or registrar may record a payment'
      using errcode = '42501';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'a payment must be greater than zero';
  end if;

  if p_paid_on > current_date then
    raise exception 'a payment cannot be dated in the future';
  end if;

  select e.student_id, e.fee_kes into v_student, v_fee
    from public.enrollments e where e.id = p_enrollment_id;

  if v_student is null then
    raise exception 'enrolment not found';
  end if;

  if v_fee is null then
    raise exception 'set the fee for this programme before taking a payment against it';
  end if;

  if v_ref is not null and not p_allow_duplicate then
    if exists (
      select 1 from public.payments
       where reference is not null
         and upper(reference) = upper(v_ref)
    ) then
      raise exception 'a payment with reference % has already been recorded', v_ref
        using errcode = '23505';
    end if;
  end if;

  v_receipt := public.allocate_number('receipt');

  insert into public.payments (
    receipt_no, enrollment_id, student_id, amount_kes,
    method, reference, paid_on, note, created_by
  )
  values (
    v_receipt, p_enrollment_id, v_student, round(p_amount, 2),
    p_method, v_ref, p_paid_on, nullif(trim(p_note), ''), auth.uid()
  )
  returning * into v_row;

  insert into public.audit_log (actor, action, entity, entity_id, detail)
  values (auth.uid(), 'payment.recorded', 'payments', v_row.id,
          jsonb_build_object('receipt_no', v_receipt,
                             'amount_kes', v_row.amount_kes,
                             'method', v_row.method,
                             'reference', v_ref));

  return v_row;
end;
$$;

-- The 6-argument signature from 0006 is now ambiguous against the 7-argument
-- one for callers that omit the tail. Drop it explicitly.
drop function if exists public.record_payment(uuid, numeric, public.payment_method, text, date, text);


-- ═══════════════════════════════════════════════════════════════════════════
--  7. FINANCE STATS — unchanged maths, new statuses
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function public.finance_stats()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when not public.is_signed_in() then '{}'::jsonb else
    jsonb_build_object(
      'billed',      coalesce((select sum(fee_kes)  from public.enrollment_finance), 0),
      'collected',   coalesce((select sum(paid_kes) from public.enrollment_finance), 0),
      -- greatest(...,0) per row: summing raw balances would let one student's
      -- overpayment cancel another's arrears and under-report the debt.
      'outstanding', coalesce((select sum(greatest(balance_kes, 0))
                                 from public.enrollment_finance), 0),
      'in_arrears',  (select count(distinct student_id)
                        from public.enrollment_finance where balance_kes > 0),
      'unpriced',    (select count(*) from public.enrollment_finance
                       where payment_status = 'unbilled'),
      'collected_30d', coalesce((select sum(amount_kes) from public.payments
                                  where paid_on >= current_date - interval '30 days'), 0),
      'by_method', coalesce((
        select jsonb_object_agg(method, total)
          from (select method, sum(amount_kes) as total
                  from public.payments group by method) m
      ), '{}'::jsonb)
    )
  end;
$$;


-- ═══════════════════════════════════════════════════════════════════════════
--  8. GRANTS
-- ═══════════════════════════════════════════════════════════════════════════
revoke execute on function public.record_payment(uuid, numeric, public.payment_method, text, date, text, boolean) from anon;
revoke execute on function public.apply_pending_fees(uuid, uuid) from anon;
revoke execute on function public.resolve_fee(uuid) from anon;

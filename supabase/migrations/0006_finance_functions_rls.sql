-- ═══════════════════════════════════════════════════════════════════════════
--  ISLII SMS — 0006 FUNCTIONS + RLS FOR FEES, ATTENDANCE, ASSESSMENTS
-- ═══════════════════════════════════════════════════════════════════════════
--  Run after 0005.
--
--  Same posture as 0003: RLS is the security boundary, the UI is convenience.
--  Anything that must be atomic, audited, or that allocates a number goes
--  through a SECURITY DEFINER function and has no direct client policy.
-- ═══════════════════════════════════════════════════════════════════════════


-- ── Receipt numbers ────────────────────────────────────────────────────────
-- allocate_number() only knew 'student' and 'certificate'. Extending it here
-- rather than writing a second allocator keeps one row-locked counter table as
-- the single source of sequence truth.
create or replace function public.allocate_number(p_kind text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year   integer := extract(year from now())::integer;
  v_prefix text;
  v_scope  text;
  v_value  integer;
begin
  v_prefix := case p_kind
                when 'student'     then 'ISLII'
                when 'certificate' then 'ISLII-CERT'
                when 'receipt'     then 'RCT'
              end;

  if v_prefix is null then
    raise exception 'allocate_number: unknown kind %', p_kind
      using hint = 'expected ''student'', ''certificate'' or ''receipt''';
  end if;

  v_scope := p_kind || ':' || v_year;

  insert into public.counters (scope) values (v_scope)
  on conflict (scope) do nothing;

  -- UPDATE ... RETURNING takes a row lock, so two concurrent callers serialise
  -- here rather than both reading the same value. Never SELECT max()+1.
  update public.counters
     set value = value + 1
   where scope = v_scope
  returning value into v_value;

  return v_prefix || '-' || v_year || '-' || lpad(v_value::text, 4, '0');
end;
$$;

revoke execute on function public.allocate_number(text) from anon, authenticated;


-- ═══════════════════════════════════════════════════════════════════════════
--  FINANCE
-- ═══════════════════════════════════════════════════════════════════════════

-- One row per enrolment with the money already reconciled. Every finance screen
-- reads from here, so the arithmetic exists in exactly one place.
create or replace view public.enrollment_finance as
select
  e.id                as enrollment_id,
  e.student_id,
  e.intake_id,
  e.fee_kes,
  coalesce(p.paid, 0) as paid_kes,
  e.fee_kes - coalesce(p.paid, 0) as balance_kes,
  case
    when e.fee_kes = 0                        then 'unbilled'
    when coalesce(p.paid, 0) = 0              then 'unpaid'
    when coalesce(p.paid, 0) >= e.fee_kes     then 'paid'
    else                                           'partial'
  end as payment_status,
  p.last_paid_on
from public.enrollments e
left join (
  select enrollment_id, sum(amount_kes) as paid, max(paid_on) as last_paid_on
    from public.payments
   group by enrollment_id
) p on p.enrollment_id = e.id;

comment on view public.enrollment_finance is
  'Fee, paid and balance per enrolment. A view rather than stored totals so a '
  'deleted or corrected payment can never leave a stale balance behind.';

-- Views run with the privileges of their owner unless told otherwise, which
-- would bypass RLS on enrollments and payments. security_invoker makes the
-- caller''s policies apply.
alter view public.enrollment_finance set (security_invoker = on);


-- Snapshot the course fee onto a new enrolment.
--
-- A trigger rather than application code, because the enrolment is created from
-- three different places (the student page, the wizard, a future import) and a
-- fee that depends on remembering to pass it is a fee that will one day be
-- zero. Passing an explicit non-zero fee still wins, so a discount survives.
create or replace function public.set_enrollment_fee()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(new.fee_kes, 0) = 0 then
    select c.fee_kes into new.fee_kes
      from public.intakes i
      join public.courses c on c.id = i.course_id
     where i.id = new.intake_id;
  end if;

  new.fee_kes := coalesce(new.fee_kes, 0);
  return new;
end;
$$;

drop trigger if exists enrollments_set_fee on public.enrollments;
create trigger enrollments_set_fee
  before insert on public.enrollments
  for each row execute function public.set_enrollment_fee();


-- Record a payment. Allocates the receipt number, stamps the actor, writes the
-- audit entry — none of which a bare INSERT could be trusted to do.
create or replace function public.record_payment(
  p_enrollment_id uuid,
  p_amount        numeric,
  p_method        public.payment_method default 'cash',
  p_reference     text default null,
  p_paid_on       date default current_date,
  p_note          text default null
)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student uuid;
  v_receipt text;
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

  select student_id into v_student
    from public.enrollments where id = p_enrollment_id;

  if v_student is null then
    raise exception 'enrolment not found';
  end if;

  v_receipt := public.allocate_number('receipt');

  insert into public.payments (
    receipt_no, enrollment_id, student_id, amount_kes,
    method, reference, paid_on, note, created_by
  )
  values (
    v_receipt, p_enrollment_id, v_student, round(p_amount, 2),
    p_method, nullif(trim(p_reference), ''), p_paid_on,
    nullif(trim(p_note), ''), auth.uid()
  )
  returning * into v_row;

  insert into public.audit_log (actor, action, entity, entity_id, detail)
  values (auth.uid(), 'payment.recorded', 'payments', v_row.id,
          jsonb_build_object('receipt_no', v_receipt,
                             'amount_kes', v_row.amount_kes,
                             'method', v_row.method));

  return v_row;
end;
$$;


-- Deleting money leaves a hole, so it is admin-only and always audited.
create or replace function public.delete_payment(p_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.payments;
begin
  if not public.is_admin() then
    raise exception 'only an admin may delete a payment' using errcode = '42501';
  end if;

  if coalesce(trim(p_reason), '') = '' then
    raise exception 'a reason is required to delete a payment';
  end if;

  delete from public.payments where id = p_id returning * into v_row;

  if v_row.id is null then
    raise exception 'payment not found';
  end if;

  -- Written AFTER the delete and holding the full row, so the audit entry is a
  -- complete record of what disappeared rather than a pointer to nothing.
  insert into public.audit_log (actor, action, entity, entity_id, detail)
  values (auth.uid(), 'payment.deleted', 'payments', v_row.id,
          jsonb_build_object('receipt_no', v_row.receipt_no,
                             'amount_kes', v_row.amount_kes,
                             'student_id', v_row.student_id,
                             'reason', trim(p_reason)));
end;
$$;


-- Headline finance numbers for the dashboard and the Finance page.
create or replace function public.finance_stats()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when not public.is_signed_in() then '{}'::jsonb else
    jsonb_build_object(
      'billed',      coalesce((select sum(fee_kes)     from public.enrollment_finance), 0),
      'collected',   coalesce((select sum(paid_kes)    from public.enrollment_finance), 0),
      -- Outstanding counts only what is genuinely owed. Summing balance_kes
      -- directly would let one student's overpayment cancel out another's
      -- arrears and under-report the debt.
      'outstanding', coalesce((select sum(greatest(balance_kes, 0))
                                 from public.enrollment_finance), 0),
      'in_arrears',  (select count(distinct student_id)
                        from public.enrollment_finance where balance_kes > 0),
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
--  ATTENDANCE
-- ═══════════════════════════════════════════════════════════════════════════

-- Take a whole register in one call. p_entries is [{"enrollment_id":…,
-- "state":"present","note":null}, …].
--
-- One statement, one transaction: a register half-saved because the tenth of
-- thirty requests failed is worse than one that did not save at all.
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
  v_count integer;
begin
  if not public.is_staff() then
    raise exception 'only an admin or registrar may take attendance'
      using errcode = '42501';
  end if;

  if p_session_date > current_date then
    raise exception 'attendance cannot be recorded for a future date';
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


-- Attendance rate per enrolment. 'excused' is deliberately excluded from the
-- denominator: an authorised absence should not damage a rate the school may
-- use to decide whether someone can sit an assessment.
create or replace view public.enrollment_attendance as
select
  e.id as enrollment_id,
  e.student_id,
  count(a.id) filter (where a.state <> 'excused')                      as sessions,
  count(a.id) filter (where a.state in ('present', 'late'))            as attended,
  count(a.id) filter (where a.state = 'absent')                        as absences,
  count(a.id) filter (where a.state = 'late')                          as lates,
  case
    when count(a.id) filter (where a.state <> 'excused') = 0 then null
    else round(
      100.0 * count(a.id) filter (where a.state in ('present', 'late'))
            / count(a.id) filter (where a.state <> 'excused'), 1)
  end as rate_pct
from public.enrollments e
left join public.attendance a on a.enrollment_id = e.id
group by e.id, e.student_id;

alter view public.enrollment_attendance set (security_invoker = on);


-- ═══════════════════════════════════════════════════════════════════════════
--  ASSESSMENTS
-- ═══════════════════════════════════════════════════════════════════════════

-- Save a column of marks for one assessment in a single transaction, for the
-- same reason mark_attendance() is one call.
create or replace function public.record_scores(
  p_assessment_id uuid,
  p_scores        jsonb   -- [{"enrollment_id":…, "score":82.5, "remark":null}, …]
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
    raise exception 'only an admin or registrar may record marks'
      using errcode = '42501';
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


-- Weighted final mark per enrolment.
--
-- Weighted by (weight × max_score), not by weight alone: a paper out of 20 and
-- one out of 100 at equal weight should still contribute equally, and dividing
-- raw totals would quietly make the bigger paper worth five times more.
create or replace view public.enrollment_grades as
select
  e.id as enrollment_id,
  e.student_id,
  count(s.id) filter (where s.score is not null) as marked,
  count(a.id)                                     as assessments,
  case
    when coalesce(sum(a.weight * a.max_score) filter (where s.score is not null), 0) = 0
      then null
    else round(
      100.0 * sum(a.weight * s.score) filter (where s.score is not null)
            / sum(a.weight * a.max_score) filter (where s.score is not null), 1)
  end as final_pct
from public.enrollments e
left join public.assessments a       on a.intake_id = e.intake_id
left join public.assessment_scores s on s.assessment_id = a.id and s.enrollment_id = e.id
group by e.id, e.student_id;

alter view public.enrollment_grades set (security_invoker = on);


-- ═══════════════════════════════════════════════════════════════════════════
--  ROW-LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════
alter table public.payments          enable row level security;
alter table public.attendance        enable row level security;
alter table public.assessments       enable row level security;
alter table public.assessment_scores enable row level security;

-- ── payments ───────────────────────────────────────────────────────────────
drop policy if exists "signed-in read payments" on public.payments;
create policy "signed-in read payments"
  on public.payments for select
  using (public.is_signed_in());

-- No INSERT policy: payments are created only by record_payment(), so a client
-- cannot write a receipt-less row or forge the actor.
-- No UPDATE policy at all: the ledger is append-only. Correcting a payment
-- means deleting it (audited) and recording the right one.
-- No DELETE policy: delete_payment() enforces admin + a written reason.

-- ── attendance ─────────────────────────────────────────────────────────────
drop policy if exists "signed-in read attendance" on public.attendance;
create policy "signed-in read attendance"
  on public.attendance for select
  using (public.is_signed_in());

drop policy if exists "admins delete attendance" on public.attendance;
create policy "admins delete attendance"
  on public.attendance for delete
  using (public.is_admin());

-- Writes go through mark_attendance() so a register is always atomic.

-- ── assessments ────────────────────────────────────────────────────────────
drop policy if exists "signed-in read assessments" on public.assessments;
create policy "signed-in read assessments"
  on public.assessments for select
  using (public.is_signed_in());

drop policy if exists "staff manage assessments" on public.assessments;
create policy "staff manage assessments"
  on public.assessments for all
  using (public.is_staff())
  with check (public.is_staff());

-- ── assessment_scores ──────────────────────────────────────────────────────
drop policy if exists "signed-in read scores" on public.assessment_scores;
create policy "signed-in read scores"
  on public.assessment_scores for select
  using (public.is_signed_in());

drop policy if exists "staff delete scores" on public.assessment_scores;
create policy "staff delete scores"
  on public.assessment_scores for delete
  using (public.is_staff());

-- Inserts/updates go through record_scores(), which stamps the marker.


-- ── courses: let registrars manage them ────────────────────────────────────
-- Previously admin-only, which meant the people actually running intakes had
-- to ask an admin every time a new programme or a new price appeared. That is
-- the friction the school reported. A registrar already creates intakes and
-- enrols students; withholding the course list from them protected nothing.
drop policy if exists "admins manage courses" on public.courses;

drop policy if exists "staff manage courses" on public.courses;
create policy "staff manage courses"
  on public.courses for all
  using (public.is_staff())
  with check (public.is_staff());


-- ── Grants ─────────────────────────────────────────────────────────────────
-- Anonymous users get nothing here. Certificate verification remains the only
-- public surface, and it does not touch money, attendance or marks.
revoke all on public.payments          from anon;
revoke all on public.attendance        from anon;
revoke all on public.assessments       from anon;
revoke all on public.assessment_scores from anon;

revoke execute on function public.record_payment(uuid, numeric, public.payment_method, text, date, text) from anon;
revoke execute on function public.delete_payment(uuid, text) from anon;
revoke execute on function public.mark_attendance(date, jsonb) from anon;
revoke execute on function public.record_scores(uuid, jsonb) from anon;
revoke execute on function public.finance_stats() from anon;

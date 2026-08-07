-- ═══════════════════════════════════════════════════════════════════════════
--  ISLII SMS — 0010 FIX: ENROLLING BEFORE PRICING
-- ═══════════════════════════════════════════════════════════════════════════
--  Run after 0009. Safe on live data.
--
--  NOTHING IS DROPPED. No DROP of any kind — not a table, view, trigger or
--  function. Every change is CREATE OR REPLACE, plus two UPDATEs that are
--  deliberately narrow and previewed in STEP 1 before you run them.
--
--  ── THE BUG ──────────────────────────────────────────────────────────────
--  Create a course with no fee → create an intake → enrol students → then go
--  back and set the course fee. The fee never reaches those students.
--
--  `resolve_fee()` ended in `coalesce(…, 0)`, so with nothing priced yet it
--  returned 0 instead of "unknown", and the insert trigger wrote that 0 onto
--  every enrolment. But 0007 had made 0 mean *deliberately free* — so the
--  system had recorded all of them as scholarships, and `apply_pending_fees()`
--  skipped them for exactly that reason. The back-fill meant to catch this had
--  been taught not to touch them.
--
--  Two different states flattened into one number. That is the same mistake
--  0007 fixed for the fee column, left in the function that feeds it.
--
--      NULL  = nobody has priced it   → the back-fill may set it
--      0     = deliberately free      → the back-fill must leave it alone
--
--  Setting the fee the other way round — course first, then intake, then
--  students — always worked, because the trigger had a real number to copy.
-- ═══════════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────────
--  STEP 1 — PREVIEW. Run this block alone. It changes nothing.
--
--  `would_become` is the fee each student will be given. Anything with a
--  payment or a discount already recorded is excluded by STEP 3 and will not
--  appear here.
-- ───────────────────────────────────────────────────────────────────────────
select
  s.student_no,
  s.first_name || ' ' || s.last_name as student,
  c.title      as course,
  i.code       as intake,
  e.fee_kes    as fee_now,
  coalesce(i.fee_kes, nullif(c.fee_kes, 0)) as would_become
from public.enrollments e
join public.intakes  i on i.id = e.intake_id
join public.courses  c on c.id = i.course_id
join public.students s on s.id = e.student_id
where e.status <> 'withdrawn'
  and coalesce(e.fee_kes, 0) = 0
  and e.discount_kes = 0
  and not exists (select 1 from public.payments p where p.enrollment_id = e.id)
  and coalesce(i.fee_kes, nullif(c.fee_kes, 0)) is not null
order by c.title, i.code, s.last_name;

-- Anything NOT in the list above keeps whatever it has. If a student you
-- expected is missing, they have a payment or a discount against them — that
-- is deliberate, and their fee should be set on their own record instead.


-- ───────────────────────────────────────────────────────────────────────────
--  STEP 2 — THE FIX. Three functions replaced in place.
-- ───────────────────────────────────────────────────────────────────────────

-- 2a. Resolution returns NULL when nothing has been priced.
create or replace function public.resolve_fee(p_intake_id uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select case
           -- An intake fee wins when present, INCLUDING an explicit 0: a free
           -- taster or sponsored cohort is real and must survive.
           when i.fee_kes is not null then i.fee_kes
           -- courses.fee_kes is NOT NULL defaulting to 0, so 0 there means
           -- "nobody typed a price" — not "free". That is the distinction the
           -- old coalesce destroyed.
           else nullif(c.fee_kes, 0)
         end
    from public.intakes i
    join public.courses c on c.id = i.course_id
   where i.id = p_intake_id;
$$;


-- 2b. The trigger may now legitimately leave the fee NULL.
--
--     CREATE OR REPLACE TRIGGER, not DROP + CREATE. Postgres 14 added the
--     replace form, Supabase is well past that, and on a live database an
--     idiom that never removes anything is worth the two extra words.
create or replace function public.set_enrollment_fee()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- IS NULL, not `= 0`: an explicit 0 from the caller is a scholarship.
  -- resolve_fee() may now return NULL, and for "enrolled before anyone set a
  -- price" that is the correct answer rather than a silent zero.
  if new.fee_kes is null then
    new.fee_kes := public.resolve_fee(new.intake_id);
  end if;
  return new;
end;
$$;

create or replace trigger enrollments_set_fee
  before insert on public.enrollments
  for each row execute function public.set_enrollment_fee();


-- 2c. The back-fill targets the unpriced, not the free.
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
       -- Both states: NULL is unpriced, and 0 is only touched when no
       -- discount and no payment exist, because until this migration a 0 was
       -- what the old trigger wrote for "unpriced".
       and coalesce(e.fee_kes, 0) = 0
       and e.discount_kes = 0
       and not exists (select 1 from public.payments p where p.enrollment_id = e.id)
  )
  update public.enrollments e
     set fee_kes = t.fee
    from target t
   where e.id = t.id and t.fee is not null and t.fee > 0;

  get diagnostics v_count = row_count;

  insert into public.audit_log (actor, action, entity, entity_id, detail)
  values (auth.uid(), 'fees.applied', 'enrollments', coalesce(p_intake_id, p_course_id),
          jsonb_build_object('enrolments', v_count,
                             'intake_id', p_intake_id,
                             'course_id', p_course_id));

  return v_count;
end;
$$;

revoke execute on function public.apply_pending_fees(uuid, uuid) from anon;
revoke execute on function public.resolve_fee(uuid) from anon;


-- ───────────────────────────────────────────────────────────────────────────
--  STEP 3 — REPAIR the students already caught by this.
--
--  Exactly the rows listed in STEP 1. Skips anyone with a payment or a
--  discount, because either means a person made a decision here.
-- ───────────────────────────────────────────────────────────────────────────
update public.enrollments e
   set fee_kes = public.resolve_fee(e.intake_id)
  from public.intakes i
 where i.id = e.intake_id
   and e.status <> 'withdrawn'
   and coalesce(e.fee_kes, 0) = 0
   and e.discount_kes = 0
   and public.resolve_fee(e.intake_id) is not null
   and public.resolve_fee(e.intake_id) > 0
   and not exists (select 1 from public.payments p where p.enrollment_id = e.id);


-- ───────────────────────────────────────────────────────────────────────────
--  STEP 4 — CONFIRM. Every row should now show the fee from STEP 1.
-- ───────────────────────────────────────────────────────────────────────────
select
  s.student_no,
  s.first_name || ' ' || s.last_name as student,
  i.code    as intake,
  e.fee_kes as fee
from public.enrollments e
join public.intakes  i on i.id = e.intake_id
join public.students s on s.id = e.student_id
where e.status <> 'withdrawn'
order by i.code, s.last_name;

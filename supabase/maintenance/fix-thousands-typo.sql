-- ═══════════════════════════════════════════════════════════════════════════
--  CORRECT A "THOUSANDS" TYPO ON ENROLMENT FEES
-- ═══════════════════════════════════════════════════════════════════════════
--  For fees entered as 35 when 35,000 was meant.
--
--  Nothing is dropped. One UPDATE, previewed first, and every row it will
--  touch is listed before you run it.
--
--  ── DO THIS FIRST ────────────────────────────────────────────────────────
--  Fix the COURSE or INTAKE price in the admin before running this. This
--  script corrects students who are already enrolled; it does not change the
--  price the next student will be given. Fix the source or the problem simply
--  comes back with the next enrolment.
-- ═══════════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────────
--  STEP 1 — PREVIEW. Changes nothing. Read every row.
--
--  The filter is "more than zero but under 1,000". No real programme at this
--  school costs under a thousand shillings, and 0 is excluded deliberately
--  because 0 means a scholarship somebody granted on purpose.
-- ───────────────────────────────────────────────────────────────────────────
select
  s.student_no,
  s.first_name || ' ' || s.last_name as student,
  i.code            as intake,
  e.fee_kes         as fee_now,
  e.fee_kes * 1000  as would_become,
  e.discount_kes,
  (select count(*) from public.payments p where p.enrollment_id = e.id) as payments
from public.enrollments e
join public.intakes  i on i.id = e.intake_id
join public.students s on s.id = e.student_id
where e.fee_kes > 0
  and e.fee_kes < 1000
order by i.code, s.last_name;

-- CHECK THE `payments` COLUMN. Any row showing more than 0 is excluded from
-- STEP 2: a student who has already paid against a wrong fee needs a decision,
-- not a multiplication. Correct those on their own record so the balance is
-- something a person has looked at.


-- ───────────────────────────────────────────────────────────────────────────
--  STEP 2 — CORRECT. Run only if STEP 1 looked right.
--
--  ×1000 rather than a typed figure, so each student keeps their own number:
--  35 → 35,000 and 30 → 30,000 in the same pass, and any per-student
--  difference somebody set on purpose survives.
-- ───────────────────────────────────────────────────────────────────────────
update public.enrollments e
   set fee_kes = e.fee_kes * 1000
 where e.fee_kes > 0
   and e.fee_kes < 1000
   and not exists (select 1 from public.payments p where p.enrollment_id = e.id);


-- ───────────────────────────────────────────────────────────────────────────
--  STEP 3 — CONFIRM.
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

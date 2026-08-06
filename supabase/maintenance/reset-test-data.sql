-- ═══════════════════════════════════════════════════════════════════════════
--  RESET TEST DATA
-- ═══════════════════════════════════════════════════════════════════════════
--  ⚠️  FOR PRE-LAUNCH CLEANUP ONLY. Run this once, before the school begins
--      entering real students, and never again.
--
--  It deletes certificates and payments. Both are things the system is
--  deliberately built to protect:
--
--    · A certificate that exists in the world must always resolve — as valid
--      or as revoked. Deleting one makes it verify as "not found", which to an
--      employer is indistinguishable from a forgery.
--    · The payment ledger is append-only so that a balance can always be
--      reconstructed from receipts.
--
--  Those rules are why you could not delete the test records from the admin:
--  the foreign keys are RESTRICT, not CASCADE, precisely so that removing a
--  student can never silently erase money. This script steps around that
--  guard on purpose, which is safe now and is not safe later.
--
--  Once a real student holds a real certificate, DO NOT RUN THIS. Withdraw a
--  student by setting their enrolment to `withdrawn`, and withdraw a
--  certificate by revoking it.
--
--  ── WHAT IS KEPT ──────────────────────────────────────────────────────────
--    · Staff accounts and roles (profiles)
--    · The course catalogue and its fees (courses)
--
--  ── WHAT IS REMOVED ───────────────────────────────────────────────────────
--    · Students, enrolments, intakes
--    · Certificates, payments, attendance, assessments and marks
--    · The audit log
--    · Numbering is reset, so the next student is ISLII-<year>-0001 again
--
--  ── RUN ORDER ─────────────────────────────────────────────────────────────
--    STEP 1 — run the preview alone and read it.
--    STEP 2 — run the deletion.
--    STEP 3 — clear the storage buckets by hand (SQL cannot do this).
-- ═══════════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────────
--  STEP 1 — PREVIEW.  Select this block only and run it. Nothing is deleted.
-- ───────────────────────────────────────────────────────────────────────────
select 'students'          as table_name, count(*) as rows_to_delete from public.students
union all select 'enrollments',       count(*) from public.enrollments
union all select 'intakes',           count(*) from public.intakes
union all select 'certificates',      count(*) from public.certificates
union all select 'payments',          count(*) from public.payments
union all select 'attendance',        count(*) from public.attendance
union all select 'assessments',       count(*) from public.assessments
union all select 'assessment_scores', count(*) from public.assessment_scores
union all select 'audit_log',         count(*) from public.audit_log
union all select '— KEPT: courses',   count(*) from public.courses
union all select '— KEPT: profiles',  count(*) from public.profiles
order by table_name;

-- Money about to be destroyed. If this is not zero, STOP and check that every
-- one of these really is a test receipt.
select
  count(*)                        as payment_count,
  coalesce(sum(amount_kes), 0)    as total_kes,
  min(paid_on)                    as earliest,
  max(paid_on)                    as latest
from public.payments;

-- Certificates about to be destroyed, with their numbers, so there is a record
-- in your query history of exactly what existed before you ran this.
select certificate_no, status, issued_at, student_id
from public.certificates
order by certificate_no;


-- ───────────────────────────────────────────────────────────────────────────
--  STEP 2 — DELETE.  Select from BEGIN to COMMIT and run it.
--
--  It is one transaction: if any statement fails, nothing is deleted. If the
--  preview surprised you, change COMMIT to ROLLBACK before running.
-- ───────────────────────────────────────────────────────────────────────────
begin;

-- Children first, then parents. `delete from … where true` is deliberate —
-- it makes an unqualified delete look intentional rather than like a missing
-- WHERE clause to whoever reads this next.

-- 1. Marks and their definitions.
delete from public.assessment_scores where true;
delete from public.assessments       where true;

-- 2. Attendance.
delete from public.attendance where true;

-- 3. Money. RESTRICT on students and enrolments means this must go first.
delete from public.payments where true;

-- 4. Certificates. RESTRICT on students and enrolments, same reason.
--    There is no DELETE policy on this table for any application role; this
--    works only because the SQL editor runs as `postgres`.
delete from public.certificates where true;

-- 5. Enrolments, then the cohorts, then the people.
delete from public.enrollments where true;
delete from public.intakes     where true;
delete from public.students    where true;

-- 6. The audit trail of all of the above.
delete from public.audit_log where true;

-- 7. Numbering restarts. Without this the first real student would be
--    ISLII-2026-0005 or wherever the tests left off, which looks like the
--    school lost four records.
delete from public.counters where true;

commit;


-- ───────────────────────────────────────────────────────────────────────────
--  STEP 3 — VERIFY.  Every count should be 0 except courses and profiles.
-- ───────────────────────────────────────────────────────────────────────────
select 'students'          as table_name, count(*) as remaining from public.students
union all select 'enrollments',       count(*) from public.enrollments
union all select 'intakes',           count(*) from public.intakes
union all select 'certificates',      count(*) from public.certificates
union all select 'payments',          count(*) from public.payments
union all select 'attendance',        count(*) from public.attendance
union all select 'assessments',       count(*) from public.assessments
union all select 'assessment_scores', count(*) from public.assessment_scores
union all select 'audit_log',         count(*) from public.audit_log
union all select 'counters',          count(*) from public.counters
union all select '— KEPT: courses',   count(*) from public.courses
union all select '— KEPT: profiles',  count(*) from public.profiles
order by table_name;


-- ═══════════════════════════════════════════════════════════════════════════
--  STEP 4 — STORAGE (cannot be done in SQL)
-- ═══════════════════════════════════════════════════════════════════════════
--  The certificate PDFs and student photographs are FILES, not rows. Deleting
--  the records above leaves them behind as orphans — harmless, but they are
--  test students' faces sitting in a public bucket, so clear them out.
--
--  Dashboard → Storage:
--    · `certificates`   — delete the year folder (e.g. 2026/)
--    · `student-photos` — delete everything
--    · `brand`          — LEAVE ALONE (crest and fonts live here)
--
--  Do not delete the buckets themselves, only their contents.
-- ═══════════════════════════════════════════════════════════════════════════

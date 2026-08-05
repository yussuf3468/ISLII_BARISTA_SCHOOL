-- ═══════════════════════════════════════════════════════════════════════════
--  ISLII SMS — 0005 FEES, PAYMENTS, ATTENDANCE, ASSESSMENTS
-- ═══════════════════════════════════════════════════════════════════════════
--  Run after 0004_seed. Safe to run once, on an existing populated database:
--  every ALTER is additive with a default, and every CREATE is guarded.
--
--  Four capabilities, one migration because they share a spine (the enrolment
--  is the unit of billing, of attendance and of assessment):
--
--    · COURSE FEES     — what a programme costs, editable by staff
--    · PAYMENTS        — an append-only money ledger with receipt numbers
--    · ATTENDANCE      — one row per student per session
--    · ASSESSMENTS     — named, weighted marks that roll up to a final grade
--
--  MONEY IS numeric(12,2), NEVER float. A double cannot represent 0.1, and a
--  fee ledger that drifts by fractions of a shilling is a ledger nobody can
--  reconcile. 12 digits covers KES 9,999,999,999.99 — comfortably beyond any
--  plausible school.
-- ═══════════════════════════════════════════════════════════════════════════


-- ── Enums ──────────────────────────────────────────────────────────────────
do $$ begin
  create type public.payment_method as enum ('cash', 'mpesa', 'bank', 'card', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.attendance_state as enum ('present', 'absent', 'late', 'excused');
exception when duplicate_object then null; end $$;


-- ═══════════════════════════════════════════════════════════════════════════
--  FEES
-- ═══════════════════════════════════════════════════════════════════════════

-- The course carries the STANDARD fee — the published price of the programme.
alter table public.courses
  add column if not exists fee_kes numeric(12,2) not null default 0
    check (fee_kes >= 0);

comment on column public.courses.fee_kes is
  'Standard fee for the programme. Copied onto an enrolment at enrolment time; '
  'changing it later never re-prices students already enrolled.';

-- The enrolment carries the AGREED fee — what this particular student owes.
-- It is a snapshot, not a lookup, and that distinction is the whole point:
-- a student who enrolled at 30,000 still owes 30,000 after the school raises
-- the price to 35,000. Deriving the balance from courses.fee_kes at read time
-- would silently re-bill every past student every time somebody edits a price.
alter table public.enrollments
  add column if not exists fee_kes numeric(12,2) not null default 0
    check (fee_kes >= 0);

comment on column public.enrollments.fee_kes is
  'Agreed fee for THIS enrolment, snapshotted from the course at enrolment. '
  'Editable per student for discounts, scholarships and instalment deals.';

-- Backfill existing enrolments from their course so nothing reads as free.
update public.enrollments e
   set fee_kes = c.fee_kes
  from public.intakes i
  join public.courses c on c.id = i.course_id
 where e.intake_id = i.id
   and e.fee_kes = 0
   and c.fee_kes > 0;


-- ═══════════════════════════════════════════════════════════════════════════
--  PAYMENTS
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.payments (
  id            uuid primary key default gen_random_uuid(),
  receipt_no    text not null unique,
  enrollment_id uuid not null references public.enrollments (id) on delete cascade,
  -- Denormalised on purpose. Every finance screen asks "what has this STUDENT
  -- paid", and joining through enrollments for that is a join per row on the
  -- hottest query in the module. It is written once, by a function, from the
  -- enrolment — it cannot drift.
  student_id    uuid not null references public.students (id) on delete cascade,
  amount_kes    numeric(12,2) not null check (amount_kes > 0),
  method        public.payment_method not null default 'cash',
  -- M-Pesa code, bank slip number, cheque number. The thing you would quote to
  -- a parent disputing a payment.
  reference     text,
  paid_on       date not null default current_date,
  note          text,
  created_at    timestamptz not null default now(),
  created_by    uuid references public.profiles (id) on delete set null
);

create index if not exists payments_student_idx    on public.payments (student_id, paid_on desc);
create index if not exists payments_enrollment_idx on public.payments (enrollment_id);
create index if not exists payments_paid_on_idx    on public.payments (paid_on desc);

comment on table public.payments is
  'Append-only money ledger. One row per receipt. Never updated — a correction '
  'is a reversing entry or a deletion by an admin, and both are audited.';


-- ═══════════════════════════════════════════════════════════════════════════
--  ATTENDANCE
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.attendance (
  id            uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments (id) on delete cascade,
  session_date  date not null,
  state         public.attendance_state not null default 'present',
  note          text,
  recorded_at   timestamptz not null default now(),
  recorded_by   uuid references public.profiles (id) on delete set null,

  -- One mark per student per day. Taking the register twice must correct the
  -- first entry, not create a second contradictory one.
  unique (enrollment_id, session_date)
);

create index if not exists attendance_enrollment_idx on public.attendance (enrollment_id, session_date desc);
create index if not exists attendance_date_idx       on public.attendance (session_date desc);


-- ═══════════════════════════════════════════════════════════════════════════
--  ASSESSMENTS
-- ═══════════════════════════════════════════════════════════════════════════
--  Assessments belong to the INTAKE, not the student: every student in a cohort
--  sits the same papers. Scores then hang off the enrolment.
create table if not exists public.assessments (
  id         uuid primary key default gen_random_uuid(),
  intake_id  uuid not null references public.intakes (id) on delete cascade,
  title      text not null,
  max_score  numeric(6,2) not null default 100 check (max_score > 0),
  -- Relative weight in the final mark. Two assessments at weight 1 and 3 make
  -- the second worth three times the first, whatever their max scores are.
  weight     numeric(5,2) not null default 1 check (weight >= 0),
  due_on     date,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null
);

create index if not exists assessments_intake_idx on public.assessments (intake_id, sort_order);

create table if not exists public.assessment_scores (
  id            uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  enrollment_id uuid not null references public.enrollments (id) on delete cascade,
  score         numeric(6,2) check (score >= 0),
  remark        text,
  recorded_at   timestamptz not null default now(),
  recorded_by   uuid references public.profiles (id) on delete set null,
  unique (assessment_id, enrollment_id)
);

create index if not exists assessment_scores_enrollment_idx
  on public.assessment_scores (enrollment_id);

-- `score <= max_score` spans two tables, so a CHECK cannot express it. Without
-- this trigger a typo of 950 on a paper marked out of 100 silently produces a
-- 950% final grade.
create or replace function public.assert_score_within_max()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_max numeric(6,2);
begin
  if new.score is null then return new; end if;

  select max_score into v_max from public.assessments where id = new.assessment_id;

  if new.score > v_max then
    raise exception 'score % is above the maximum of % for this assessment',
      new.score, v_max using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists assessment_scores_within_max on public.assessment_scores;
create trigger assessment_scores_within_max
  before insert or update on public.assessment_scores
  for each row execute function public.assert_score_within_max();

-- ═══════════════════════════════════════════════════════════════════════════
--  ISLII STUDENT MANAGEMENT SYSTEM — 0001 SCHEMA
-- ═══════════════════════════════════════════════════════════════════════════
--  Run order: 0001_schema → 0002_functions → 0003_rls → 0004_seed
--
--  Supabase enables pgcrypto by default, so gen_random_uuid() and
--  gen_random_bytes() are available without an extension statement.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Enums ──────────────────────────────────────────────────────────────────
create type public.staff_role       as enum ('admin', 'registrar', 'viewer');
create type public.intake_status    as enum ('planned', 'running', 'completed', 'cancelled');
create type public.enrollment_state as enum ('enrolled', 'completed', 'withdrawn');
create type public.certificate_state as enum ('valid', 'revoked');


-- ── profiles ───────────────────────────────────────────────────────────────
-- Extends auth.users with a role. A row is created automatically by the
-- handle_new_user trigger in 0002 so a signed-up user is never role-less.
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '',
  email       text not null,
  role        public.staff_role not null default 'viewer',
  created_at  timestamptz not null default now()
);

comment on table public.profiles is
  'Staff accounts. `role` drives every RLS policy in this schema.';


-- ── students ───────────────────────────────────────────────────────────────
create table public.students (
  id           uuid primary key default gen_random_uuid(),
  student_no   text not null unique,
  first_name   text not null,
  last_name    text not null,
  phone        text,
  email        text,
  national_id  text,
  photo_path   text,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid references public.profiles (id) on delete set null
);

-- Surname is used by the public certificate search as a shared secret, so it
-- needs to be searchable case-insensitively without a sequential scan.
create index students_last_name_lower_idx on public.students (lower(last_name));
create index students_created_at_idx      on public.students (created_at desc);

-- Trigram index for the admin's free-text search across names and numbers.
create extension if not exists pg_trgm;
create index students_search_idx on public.students
  using gin ((first_name || ' ' || last_name || ' ' || student_no) gin_trgm_ops);

comment on column public.students.student_no is
  'Format ISLII-<year>-<0001>. Allocated atomically by allocate_number().';


-- ── courses ────────────────────────────────────────────────────────────────
-- Deliberately lean. Marketing copy, photography and SEO fields stay in
-- src/data/courses.ts — the slug is the join between the two.
create table public.courses (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  title         text not null,
  duration      text not null,
  level         text not null,
  certification text not null,
  active        boolean not null default true,
  sort_order    integer not null default 0
);


-- ── intakes (cohorts) ──────────────────────────────────────────────────────
create table public.intakes (
  id         uuid primary key default gen_random_uuid(),
  course_id  uuid not null references public.courses (id) on delete restrict,
  code       text not null unique,
  starts_on  date not null,
  ends_on    date,
  capacity   integer check (capacity is null or capacity > 0),
  status     public.intake_status not null default 'planned',
  created_at timestamptz not null default now(),
  constraint intake_dates_ordered check (ends_on is null or ends_on >= starts_on)
);

create index intakes_course_idx on public.intakes (course_id, starts_on desc);


-- ── enrollments ────────────────────────────────────────────────────────────
create table public.enrollments (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references public.students (id) on delete cascade,
  intake_id    uuid not null references public.intakes (id) on delete restrict,
  status       public.enrollment_state not null default 'enrolled',
  grade        text,
  completed_on date,
  created_at   timestamptz not null default now(),
  created_by   uuid references public.profiles (id) on delete set null,
  unique (student_id, intake_id)
);

create index enrollments_student_idx on public.enrollments (student_id);
create index enrollments_intake_idx  on public.enrollments (intake_id);


-- ── certificates ───────────────────────────────────────────────────────────
create table public.certificates (
  id             uuid primary key default gen_random_uuid(),
  certificate_no text not null unique,
  verify_token   text not null unique,
  student_id     uuid not null references public.students (id) on delete restrict,
  enrollment_id  uuid not null references public.enrollments (id) on delete restrict,
  issued_at      timestamptz not null default now(),
  issued_by      uuid references public.profiles (id) on delete set null,
  status         public.certificate_state not null default 'valid',
  revoked_at     timestamptz,
  revoked_by     uuid references public.profiles (id) on delete set null,
  revoked_reason text,
  pdf_path       text,

  -- A revoked certificate must say why and when. Without this a revocation is
  -- unexplainable after the fact, which is exactly when it gets questioned.
  constraint revocation_is_explained check (
    (status = 'valid'   and revoked_at is null and revoked_reason is null) or
    (status = 'revoked' and revoked_at is not null and revoked_reason is not null)
  )
);

-- One LIVE certificate per enrollment. Revoked ones stay in the table forever
-- (a revoked certificate still exists in the world and must still verify as
-- revoked), so the uniqueness is partial rather than absolute.
create unique index certificates_one_live_per_enrollment
  on public.certificates (enrollment_id) where status = 'valid';

create index certificates_student_idx  on public.certificates (student_id);
create index certificates_issued_idx   on public.certificates (issued_at desc);
create index certificates_no_lower_idx on public.certificates (lower(certificate_no));

comment on column public.certificates.verify_token is
  'Random 144-bit token. This — never certificate_no — is what the QR encodes. '
  'certificate_no is sequential and therefore enumerable.';


-- ── counters (atomic number allocation) ────────────────────────────────────
create table public.counters (
  scope text primary key,
  value integer not null default 0
);

comment on table public.counters is
  'One row per number series, e.g. student:2026. Incremented under a row lock '
  'by allocate_number() — never by application code.';


-- ── audit_log ──────────────────────────────────────────────────────────────
create table public.audit_log (
  id         bigserial primary key,
  actor      uuid references public.profiles (id) on delete set null,
  action     text not null,
  entity     text not null,
  entity_id  uuid,
  detail     jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_created_idx on public.audit_log (created_at desc);
create index audit_log_entity_idx  on public.audit_log (entity, entity_id);

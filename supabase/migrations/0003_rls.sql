-- ═══════════════════════════════════════════════════════════════════════════
--  ISLII SMS — 0003 ROW-LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════
--  This file IS the security model. The React app hides buttons a role cannot
--  use, but that is convenience — anyone can open devtools, take the anon key
--  out of the bundle and query PostgREST directly. Only these policies stop
--  them.
--
--  Default posture: every table denies everything. Anonymous users are granted
--  nothing at all; they reach the system exclusively through the two SECURITY
--  DEFINER verification functions in 0002.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.profiles     enable row level security;
alter table public.students     enable row level security;
alter table public.courses      enable row level security;
alter table public.intakes      enable row level security;
alter table public.enrollments  enable row level security;
alter table public.certificates enable row level security;
alter table public.counters     enable row level security;
alter table public.audit_log    enable row level security;

-- Counters are touched only by allocate_number(), which is SECURITY DEFINER.
-- RLS is enabled with no policies at all, so every direct client query fails.


-- ── profiles ───────────────────────────────────────────────────────────────
create policy "read own profile"
  on public.profiles for select
  using (id = auth.uid());

create policy "admins read all profiles"
  on public.profiles for select
  using (public.is_admin());

create policy "admins manage profiles"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

-- Deliberately no INSERT policy: rows are created by the handle_new_user
-- trigger. And no DELETE — removing a profile would orphan its audit trail.


-- ── students ───────────────────────────────────────────────────────────────
create policy "signed-in staff read students"
  on public.students for select
  using (public.is_signed_in());

create policy "staff update students"
  on public.students for update
  using (public.is_staff())
  with check (public.is_staff());

create policy "admins delete students"
  on public.students for delete
  using (public.is_admin());

-- No INSERT policy. Students are created only via register_student(), so a
-- direct insert cannot bypass atomic student-number allocation.


-- ── courses ────────────────────────────────────────────────────────────────
create policy "signed-in read courses"
  on public.courses for select
  using (public.is_signed_in());

create policy "admins manage courses"
  on public.courses for all
  using (public.is_admin())
  with check (public.is_admin());


-- ── intakes ────────────────────────────────────────────────────────────────
create policy "signed-in read intakes"
  on public.intakes for select
  using (public.is_signed_in());

create policy "staff manage intakes"
  on public.intakes for all
  using (public.is_staff())
  with check (public.is_staff());


-- ── enrollments ────────────────────────────────────────────────────────────
create policy "signed-in read enrollments"
  on public.enrollments for select
  using (public.is_signed_in());

create policy "staff manage enrollments"
  on public.enrollments for all
  using (public.is_staff())
  with check (public.is_staff());


-- ── certificates ───────────────────────────────────────────────────────────
create policy "signed-in read certificates"
  on public.certificates for select
  using (public.is_signed_in());

-- No INSERT policy: certificates are issued only by the issue-certificate Edge
-- Function using the service role. A client cannot mint one.
--
-- No UPDATE policy: revocation goes through revoke_certificate(), which forces
-- a reason and writes an audit entry. Allowing a bare UPDATE would let an
-- admin silently flip a status with no record of why.
--
-- No DELETE policy, ever: a certificate that exists in the world must always
-- resolve — as valid or as revoked. Deleting one makes it verify as
-- "not found", which is indistinguishable from a forgery.


-- ── audit_log ──────────────────────────────────────────────────────────────
create policy "admins read audit log"
  on public.audit_log for select
  using (public.is_admin());

-- Append-only from the client's point of view: writes happen inside SECURITY
-- DEFINER functions. No UPDATE or DELETE policy exists, so history is immutable.


-- ═══════════════════════════════════════════════════════════════════════════
--  STORAGE
-- ═══════════════════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public)
values
  -- Public: shown on the verification page, which is public by definition.
  ('student-photos', 'student-photos', true),
  -- Private: the PDF carries the full record. Staff download it via a signed
  -- URL; the public gets the verification page instead, which shows less.
  ('certificates',   'certificates',   false),
  -- Public: brand assets the PDF generator fetches (crest, TTF fonts).
  ('brand',          'brand',          true)
on conflict (id) do nothing;

create policy "staff upload student photos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'student-photos' and public.is_staff());

create policy "staff replace student photos"
  on storage.objects for update to authenticated
  using (bucket_id = 'student-photos' and public.is_staff());

create policy "anyone reads student photos"
  on storage.objects for select
  using (bucket_id = 'student-photos');

create policy "anyone reads brand assets"
  on storage.objects for select
  using (bucket_id = 'brand');

create policy "signed-in read certificates pdf"
  on storage.objects for select to authenticated
  using (bucket_id = 'certificates' and public.is_signed_in());

-- ═══════════════════════════════════════════════════════════════════════════
--  ISLII SMS — 0002 FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Role helpers ───────────────────────────────────────────────────────────
-- SECURITY DEFINER so a policy on `profiles` can call it without recursing
-- into its own RLS check. Named my_role() rather than current_role() because
-- current_role is a Postgres built-in.
create or replace function public.my_role()
returns public.staff_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.my_role() = 'admin', false);
$$;

-- Can create and modify records. Revocation is admin-only (see 0003).
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.my_role() in ('admin', 'registrar'), false);
$$;

create or replace function public.is_signed_in()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid());
$$;


-- ── Auto-create a profile for every new auth user ──────────────────────────
-- Without this, a user can exist in auth.users with no profile row, which
-- makes my_role() null and locks them out of everything with no clear cause.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    -- The very first account becomes admin so the system is reachable after a
    -- clean install; everyone after that starts with no privileges.
    case when (select count(*) from public.profiles) = 0 then 'admin'::public.staff_role
         else 'viewer'::public.staff_role end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ── updated_at maintenance ─────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger students_touch_updated_at
  before update on public.students
  for each row execute function public.touch_updated_at();


-- ── Atomic number allocation ───────────────────────────────────────────────
-- THE correctness-critical function in this schema.
--
-- The naive version — SELECT max(seq)+1 — duplicates numbers whenever two
-- registrations land in the same instant, and student_no is printed on a
-- physical certificate. UPDATE ... RETURNING takes a row-level lock for the
-- duration of the transaction, so concurrent callers serialise on the counter
-- row and each receives a distinct value.
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
              end;

  if v_prefix is null then
    raise exception 'allocate_number: unknown kind %', p_kind
      using hint = 'expected ''student'' or ''certificate''';
  end if;

  v_scope := p_kind || ':' || v_year;

  insert into public.counters (scope) values (v_scope)
  on conflict (scope) do nothing;

  update public.counters
     set value = value + 1
   where scope = v_scope
  returning value into v_value;

  return v_prefix || '-' || v_year || '-' || lpad(v_value::text, 4, '0');
end;
$$;

revoke execute on function public.allocate_number(text) from anon, authenticated;


-- ── Verification token ─────────────────────────────────────────────────────
-- 18 random bytes → 144 bits, base64 with the URL-hostile characters mapped
-- into the alphabet. Not enumerable at any scale.
create or replace function public.new_verify_token()
returns text language sql volatile as $$
  select translate(encode(gen_random_bytes(18), 'base64'), '+/=', 'xyz');
$$;


-- ── Student registration ───────────────────────────────────────────────────
-- Wraps number allocation and insert in one transaction so a crash can never
-- burn a number without creating the student.
create or replace function public.register_student(
  p_first_name  text,
  p_last_name   text,
  p_phone       text default null,
  p_email       text default null,
  p_national_id text default null,
  p_notes       text default null
)
returns public.students
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student public.students;
begin
  if not public.is_staff() then
    raise exception 'not authorised' using errcode = '42501';
  end if;

  if coalesce(trim(p_first_name), '') = '' or coalesce(trim(p_last_name), '') = '' then
    raise exception 'first_name and last_name are required';
  end if;

  insert into public.students
    (student_no, first_name, last_name, phone, email, national_id, notes, created_by)
  values
    (public.allocate_number('student'), trim(p_first_name), trim(p_last_name),
     nullif(trim(coalesce(p_phone, '')), ''),
     nullif(trim(coalesce(p_email, '')), ''),
     nullif(trim(coalesce(p_national_id, '')), ''),
     nullif(trim(coalesce(p_notes, '')), ''),
     auth.uid())
  returning * into v_student;

  insert into public.audit_log (actor, action, entity, entity_id, detail)
  values (auth.uid(), 'student.registered', 'students', v_student.id,
          jsonb_build_object('student_no', v_student.student_no));

  return v_student;
end;
$$;


-- ── Certificate revocation ─────────────────────────────────────────────────
create or replace function public.revoke_certificate(p_id uuid, p_reason text)
returns public.certificates
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cert public.certificates;
begin
  if not public.is_admin() then
    raise exception 'only an admin may revoke a certificate' using errcode = '42501';
  end if;

  if coalesce(trim(p_reason), '') = '' then
    raise exception 'a revocation reason is required';
  end if;

  update public.certificates
     set status = 'revoked',
         revoked_at = now(),
         revoked_by = auth.uid(),
         revoked_reason = trim(p_reason)
   where id = p_id and status = 'valid'
  returning * into v_cert;

  if v_cert.id is null then
    raise exception 'certificate not found, or already revoked';
  end if;

  insert into public.audit_log (actor, action, entity, entity_id, detail)
  values (auth.uid(), 'certificate.revoked', 'certificates', v_cert.id,
          jsonb_build_object('certificate_no', v_cert.certificate_no,
                             'reason', trim(p_reason)));

  return v_cert;
end;
$$;


-- ═══════════════════════════════════════════════════════════════════════════
--  PUBLIC VERIFICATION
-- ═══════════════════════════════════════════════════════════════════════════
--  Anonymous callers get NO table access whatsoever. These two SECURITY
--  DEFINER functions are the entire public surface, and each returns a fixed,
--  deliberately narrow column list.
--
--  Never exposed: phone, email, national_id, notes, fees, internal ids.
--  Filtering this in React would be theatre — anyone can query PostgREST
--  directly with the anon key.
-- ═══════════════════════════════════════════════════════════════════════════

-- Full record. Reached only by scanning the QR, which carries the token.
create or replace function public.verify_certificate(p_token text)
returns table (
  certificate_no text,
  status         public.certificate_state,
  issued_on      date,
  revoked_on     date,
  student_no     text,
  full_name      text,
  photo_path     text,
  course_title   text,
  course_level   text,
  course_duration text,
  certification  text,
  intake_started date,
  intake_ended   date,
  grade          text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.certificate_no,
    c.status,
    c.issued_at::date,
    c.revoked_at::date,
    s.student_no,
    s.first_name || ' ' || s.last_name,
    s.photo_path,
    co.title,
    co.level,
    co.duration,
    co.certification,
    i.starts_on,
    i.ends_on,
    e.grade
  from public.certificates c
  join public.students     s  on s.id  = c.student_id
  join public.enrollments  e  on e.id  = c.enrollment_id
  join public.intakes      i  on i.id  = e.intake_id
  join public.courses      co on co.id = i.course_id
  where c.verify_token = p_token;
$$;

-- Typed lookup. Requires the certificate number AND the surname, so knowing a
-- sequential number alone reveals nothing. Returns strictly less than the
-- token path: no photo, no student number, no grade.
create or replace function public.find_certificate(
  p_certificate_no text,
  p_surname        text
)
returns table (
  certificate_no text,
  status         public.certificate_state,
  issued_on      date,
  full_name      text,
  course_title   text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.certificate_no,
    c.status,
    c.issued_at::date,
    s.first_name || ' ' || s.last_name,
    co.title
  from public.certificates c
  join public.students    s  on s.id  = c.student_id
  join public.enrollments e  on e.id  = c.enrollment_id
  join public.intakes     i  on i.id  = e.intake_id
  join public.courses     co on co.id = i.course_id
  where lower(c.certificate_no) = lower(trim(p_certificate_no))
    and lower(s.last_name)      = lower(trim(p_surname));
$$;

grant execute on function public.verify_certificate(text) to anon, authenticated;
grant execute on function public.find_certificate(text, text) to anon, authenticated;


-- ── Dashboard counters ─────────────────────────────────────────────────────
create or replace function public.dashboard_stats()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'students',            (select count(*) from public.students),
    'students_this_month', (select count(*) from public.students
                             where created_at >= date_trunc('month', now())),
    'certificates',        (select count(*) from public.certificates where status = 'valid'),
    'revoked',             (select count(*) from public.certificates where status = 'revoked'),
    'enrolled',            (select count(*) from public.enrollments where status = 'enrolled'),
    'completed',           (select count(*) from public.enrollments where status = 'completed'),
    'intakes_running',     (select count(*) from public.intakes where status = 'running')
  )
  where public.is_signed_in();
$$;

import { db, supabase } from '@/lib/supabase';
import type {
  Certificate,
  CertificateRow,
  Course,
  DashboardStats,
  EnrollmentDetail,
  Intake,
  IntakeWithCourse,
  Profile,
  StaffRole,
  AuditEntry,
  Student,
} from '@/lib/db.types';

/**
 * Data access for the admin app.
 *
 * Everything privileged goes through an RPC rather than a direct table write:
 * `register_student` allocates the student number atomically, and issuing a
 * certificate is an Edge Function. Both paths are closed to clients by RLS, so
 * this module cannot bypass them even by mistake.
 */

/* ── Dashboard ────────────────────────────────────────────────────────── */

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const { data, error } = await db().rpc('dashboard_stats');
  if (error) throw error;
  return data as DashboardStats;
}

/* ── Students ─────────────────────────────────────────────────────────── */

export type StudentStatusFilter = 'all' | 'active' | 'graduate';
export type StudentPeriodFilter = 'all' | 'month' | 'year';
export type StudentSortField = 'created_at' | 'last_name' | 'student_no';

export interface StudentQuery {
  search?: string;
  status?: StudentStatusFilter;
  period?: StudentPeriodFilter;
  sortField?: StudentSortField;
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface StudentRow extends Student {
  /** Derived from the embedded rows — drives the badge in the table. */
  activeCount: number;
  completedCount: number;
  certificateCount: number;
}

/**
 * Status filtering is done by the DATABASE, not by filtering the fetched page.
 *
 * PostgREST's `!inner` turns an embedded resource into an inner join, so
 * `enrollments!inner(status)` + `.eq('enrollments.status', 'enrolled')` returns
 * only students who actually have a live enrolment — and, critically, `count`
 * reflects that too. Filtering the current page in JavaScript would have given
 * a pager that lies about how many results exist.
 */
export async function fetchStudents({
  search = '',
  status = 'all',
  period = 'all',
  sortField = 'created_at',
  sortDir = 'desc',
  page = 0,
  pageSize = 25,
}: StudentQuery) {
  const embed =
    status === 'active'
      ? 'enrollments!inner(status), certificates(id, status)'
      : status === 'graduate'
        ? 'certificates!inner(id, status), enrollments(status)'
        : 'enrollments(status), certificates(id, status)';

  let query = db()
    .from('students')
    .select(`*, ${embed}`, { count: 'exact' })
    .order(sortField, { ascending: sortDir === 'asc' })
    .range(page * pageSize, page * pageSize + pageSize - 1);

  if (status === 'active') query = query.eq('enrollments.status', 'enrolled');
  if (status === 'graduate') query = query.eq('certificates.status', 'valid');

  if (period !== 'all') {
    const from = new Date();
    if (period === 'month') from.setDate(1);
    else from.setMonth(0, 1);
    from.setHours(0, 0, 0, 0);
    query = query.gte('created_at', from.toISOString());
  }

  const term = search.trim();
  if (term) {
    const escaped = term.replace(/[%,()]/g, '');
    query = query.or(
      `first_name.ilike.%${escaped}%,last_name.ilike.%${escaped}%,student_no.ilike.%${escaped}%`,
    );
  }

  const { data, error, count } = await query;
  if (error) throw error;

  const rows = (data ?? []).map((raw) => {
    const r = raw as Student & {
      enrollments?: { status: string }[];
      certificates?: { id: string; status: string }[];
    };
    const enrollments = r.enrollments ?? [];
    const certificates = r.certificates ?? [];
    return {
      ...(raw as Student),
      activeCount: enrollments.filter((e) => e.status === 'enrolled').length,
      completedCount: enrollments.filter((e) => e.status === 'completed').length,
      certificateCount: certificates.filter((c) => c.status === 'valid').length,
    } as StudentRow;
  });

  return { rows, total: count ?? 0 };
}

export async function fetchStudent(id: string): Promise<Student> {
  const { data, error } = await db().from('students').select('*').eq('id', id).single();
  if (error) throw error;
  return data as Student;
}

export interface NewStudent {
  first_name: string;
  last_name: string;
  phone?: string;
  email?: string;
  national_id?: string;
  notes?: string;
}

/** Student numbers are allocated inside the RPC under a row lock — never here. */
export async function registerStudent(input: NewStudent): Promise<Student> {
  const { data, error } = await db().rpc('register_student', {
    p_first_name: input.first_name,
    p_last_name: input.last_name,
    p_phone: input.phone || null,
    p_email: input.email || null,
    p_national_id: input.national_id || null,
    p_notes: input.notes || null,
  });
  if (error) throw error;
  return data as Student;
}

/**
 * Delete a student. Admin-only — enforced by the existing RLS policy, not here.
 *
 * Enrolments cascade with the student. Certificates deliberately do NOT: the
 * `certificates.student_id` foreign key is ON DELETE RESTRICT, so Postgres
 * refuses to remove a student who has ever been certified. That is intentional
 * — a certificate in someone's hands must keep resolving forever, and the
 * error surfaces to the user as a plain refusal.
 */
export async function deleteStudent(id: string): Promise<void> {
  const { error } = await db().from('students').delete().eq('id', id);
  if (error) throw error;
}

export async function updateStudent(id: string, patch: Partial<Student>): Promise<Student> {
  const { data, error } = await db().from('students').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data as Student;
}

export async function uploadStudentPhoto(studentId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const path = `${studentId}/portrait.${ext}`;

  const { error } = await db()
    .storage.from('student-photos')
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;

  await updateStudent(studentId, { photo_path: path });
  return path;
}

/* ── Courses & intakes ────────────────────────────────────────────────── */

export async function fetchCourses(): Promise<Course[]> {
  const { data, error } = await db()
    .from('courses')
    .select('*')
    .eq('active', true)
    .order('sort_order');
  if (error) throw error;
  return (data ?? []) as Course[];
}

export async function fetchIntakes(): Promise<IntakeWithCourse[]> {
  const { data, error } = await db()
    .from('intakes')
    .select('*, course:courses(id, title, slug, certification, duration, level)')
    .order('starts_on', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as IntakeWithCourse[];
}

export interface NewIntake {
  course_id: string;
  code: string;
  starts_on: string;
  ends_on?: string | null;
  capacity?: number | null;
  status?: Intake['status'];
}

export async function createIntake(input: NewIntake) {
  const { data, error } = await db().from('intakes').insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function updateIntake(id: string, patch: Partial<Intake>) {
  const { data, error } = await db().from('intakes').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

/**
 * Delete an intake.
 *
 * `enrollments.intake_id` is ON DELETE RESTRICT, so Postgres refuses if anyone
 * is enrolled. That is the desired behaviour — silently cascading would erase
 * enrolment history — and the caller translates the constraint error into
 * something a registrar can act on.
 */
export async function deleteIntake(id: string): Promise<void> {
  const { error } = await db().from('intakes').delete().eq('id', id);
  if (error) throw error;
}

/* ── Enrollments ──────────────────────────────────────────────────────── */

export async function fetchStudentEnrollments(studentId: string): Promise<EnrollmentDetail[]> {
  const { data, error } = await db()
    .from('enrollments')
    .select(
      `*,
       intake:intakes(*, course:courses(id, title, slug, certification, duration, level)),
       certificate:certificates(id, certificate_no, verify_token, status, pdf_path)`,
    )
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });
  if (error) throw error;

  // PostgREST returns the reverse relation as an array; the partial unique
  // index guarantees at most one live certificate, so collapse it.
  return (data ?? []).map((row) => {
    const certs = (row as { certificate?: unknown }).certificate;
    const list = Array.isArray(certs) ? certs : certs ? [certs] : [];
    return {
      ...(row as object),
      certificate: list.find((c) => (c as Certificate).status === 'valid') ?? list[0] ?? null,
    } as EnrollmentDetail;
  });
}

export async function enrollStudent(studentId: string, intakeId: string) {
  const { data, error } = await db()
    .from('enrollments')
    .insert({ student_id: studentId, intake_id: intakeId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function setEnrollmentStatus(
  id: string,
  status: 'enrolled' | 'completed' | 'withdrawn',
  extras: { grade?: string | null; completed_on?: string | null } = {},
) {
  const patch: Record<string, unknown> = { status, ...extras };
  if (status === 'completed' && !extras.completed_on) {
    patch.completed_on = new Date().toISOString().slice(0, 10);
  }
  const { data, error } = await db().from('enrollments').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

/* ── Certificates ─────────────────────────────────────────────────────── */

export async function fetchCertificates(search = ''): Promise<CertificateRow[]> {
  let query = db()
    .from('certificates')
    .select('*, student:students(id, student_no, first_name, last_name)')
    .order('issued_at', { ascending: false })
    .limit(200);

  const term = search.trim().replace(/[%,()]/g, '');
  if (term) query = query.ilike('certificate_no', `%${term}%`);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as CertificateRow[];
}

export interface IssueResult {
  certificate_no: string;
  verify_token: string;
  verify_url: string;
  pdf_path: string;
  warnings: string[];
  /** Public base URL the function fetched brand assets from — paste into a
   *  browser to see whether a file is actually there. */
  brandBase?: string;
}

/**
 * Issue a certificate.
 *
 * Delegates to the Edge Function because the number allocation, PDF render and
 * insert must happen together under the service role. A client cannot mint a
 * certificate directly — `certificates` has no INSERT policy at all.
 */
export async function issueCertificate(enrollmentId: string): Promise<IssueResult> {
  const client = db();
  const { data: sessionData } = await client.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error('Your session has expired. Please sign in again.');

  const { data, error } = await client.functions.invoke('issue-certificate', {
    body: { enrollment_id: enrollmentId },
    headers: { Authorization: `Bearer ${token}` },
  });

  if (error) {
    // A network-level failure here almost always means the function is not
    // deployed. The browser reports it as CORS (a 404 preflight carries no
    // CORS headers), which sends people hunting for a CORS bug that does not
    // exist — so name the real cause.
    if (/Failed to send a request|Failed to fetch|NetworkError/i.test(error.message)) {
      throw new Error(
        'The certificate service is not reachable. It usually means the Edge Function ' +
          'has not been deployed yet — run `supabase functions deploy issue-certificate`. ' +
          'See supabase/README.md step 4.',
      );
    }
    // Otherwise the useful message is in the response body.
    const detail = await (error as { context?: Response }).context
      ?.json?.()
      .catch(() => null);
    throw new Error(detail?.error ?? error.message);
  }
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);

  return data as IssueResult;
}

export async function revokeCertificate(id: string, reason: string) {
  const { data, error } = await db().rpc('revoke_certificate', { p_id: id, p_reason: reason });
  if (error) throw error;
  return data as Certificate;
}

export async function certificatePdfUrl(path: string): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.storage.from('certificates').createSignedUrl(path, 120);
  return error ? null : data.signedUrl;
}

/* ── Team & audit (read/update only — no schema changes) ──────────────── */

export async function fetchProfiles(): Promise<Profile[]> {
  const { data, error } = await db()
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Profile[];
}

/**
 * Change a teammate's role.
 *
 * Admin-only, enforced by the existing "admins manage profiles" RLS policy —
 * this function has no privilege of its own.
 */
export async function updateProfileRole(id: string, role: StaffRole): Promise<Profile> {
  const { data, error } = await db()
    .from('profiles').update({ role }).eq('id', id).select().single();
  if (error) throw error;
  return data as Profile;
}

export interface AuditQuery {
  action?: string;
  page?: number;
  pageSize?: number;
}

export async function fetchAuditLog({ action = 'all', page = 0, pageSize = 30 }: AuditQuery) {
  let query = db()
    .from('audit_log')
    .select('*, actor_profile:profiles(full_name, email)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * pageSize, page * pageSize + pageSize - 1);

  if (action !== 'all') query = query.eq('action', action);

  const { data, error, count } = await query;
  if (error) throw error;
  return {
    rows: (data ?? []) as unknown as (AuditEntry & {
      actor_profile: { full_name: string; email: string } | null;
    })[],
    total: count ?? 0,
  };
}

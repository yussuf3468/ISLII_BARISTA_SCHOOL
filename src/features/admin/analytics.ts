import { db } from '@/lib/supabase';
import type { AuditEntry, Course } from '@/lib/db.types';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Dashboard aggregates
 * ─────────────────────────────────────────────────────────────────────────────
 *  Everything here is derived with plain SELECTs against the existing schema.
 *  No migration, no new view, no new RPC — the backend is deliberately left
 *  exactly as it was.
 *
 *  That is affordable because of the scale: a school with a few hundred
 *  students and a few dozen intakes. Bucketing a year of registration dates in
 *  the browser costs nothing at that size. If the register ever reached tens of
 *  thousands of rows, these three functions are the ones to replace with a SQL
 *  view — and nothing else would need to change.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface MonthPoint {
  label: string;
  value: number;
  iso: string;
}

/** Twelve month buckets ending with the current month. */
function emptyMonths(count = 12): MonthPoint[] {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1);
    return {
      iso: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('en-GB', { month: 'short' }),
      value: 0,
    };
  });
}

function bucket(rows: { created_at: string }[], months: MonthPoint[]): MonthPoint[] {
  const index = new Map(months.map((m, i) => [m.iso, i]));
  const out = months.map((m) => ({ ...m }));
  for (const row of rows) {
    const d = new Date(row.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const i = index.get(key);
    if (i !== undefined) out[i]!.value += 1;
  }
  return out;
}

export interface OverviewData {
  totals: {
    students: number;
    active: number;
    graduates: number;
    certificates: number;
    revoked: number;
    intakes: number;
    intakesRunning: number;
    courses: number;
  };
  registrations: MonthPoint[];
  certificatesByMonth: MonthPoint[];
  byCourse: { label: string; value: number }[];
}

/**
 * One round trip per concern, run in parallel.
 *
 * `head: true` with `count: 'exact'` asks Postgres for the count and returns
 * no rows at all — the cheap way to fill a stat card.
 */
export async function fetchOverview(): Promise<OverviewData> {
  const client = db();
  const since = new Date();
  since.setMonth(since.getMonth() - 11, 1);
  since.setHours(0, 0, 0, 0);
  const sinceIso = since.toISOString();

  const [
    students,
    activeEnrollments,
    completedEnrollments,
    certificates,
    revoked,
    intakes,
    running,
    courses,
    studentDates,
    certDates,
    courseRows,
  ] = await Promise.all([
    client.from('students').select('id', { count: 'exact', head: true }),
    client.from('enrollments').select('student_id', { count: 'exact', head: true }).eq('status', 'enrolled'),
    client.from('enrollments').select('student_id', { count: 'exact', head: true }).eq('status', 'completed'),
    client.from('certificates').select('id', { count: 'exact', head: true }).eq('status', 'valid'),
    client.from('certificates').select('id', { count: 'exact', head: true }).eq('status', 'revoked'),
    client.from('intakes').select('id', { count: 'exact', head: true }),
    client.from('intakes').select('id', { count: 'exact', head: true }).eq('status', 'running'),
    client.from('courses').select('id', { count: 'exact', head: true }).eq('active', true),
    client.from('students').select('created_at').gte('created_at', sinceIso),
    client.from('certificates').select('issued_at').gte('issued_at', sinceIso),
    client.from('enrollments').select('intake:intakes(course:courses(title))'),
  ]);

  const months = emptyMonths();

  // Enrolments carry the course only through their intake, so the tally is
  // done here rather than asking Postgres for a grouped count.
  const tally = new Map<string, number>();
  for (const row of (courseRows.data ?? []) as unknown as {
    intake: { course: { title: string } | null } | null;
  }[]) {
    const title = row.intake?.course?.title;
    if (!title) continue;
    tally.set(title, (tally.get(title) ?? 0) + 1);
  }

  return {
    totals: {
      students: students.count ?? 0,
      active: activeEnrollments.count ?? 0,
      graduates: completedEnrollments.count ?? 0,
      certificates: certificates.count ?? 0,
      revoked: revoked.count ?? 0,
      intakes: intakes.count ?? 0,
      intakesRunning: running.count ?? 0,
      courses: courses.count ?? 0,
    },
    registrations: bucket((studentDates.data ?? []) as { created_at: string }[], months),
    certificatesByMonth: bucket(
      ((certDates.data ?? []) as { issued_at: string }[]).map((r) => ({ created_at: r.issued_at })),
      months,
    ),
    byCourse: [...tally.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value),
  };
}

/* ── Activity feed ────────────────────────────────────────────────────── */

export interface ActivityItem extends AuditEntry {
  actor_profile: { full_name: string; email: string } | null;
}

/**
 * The audit log is admin-only by RLS. A registrar querying it gets an empty
 * array rather than an error, so the caller can simply hide the panel.
 */
export async function fetchActivity(limit = 12): Promise<ActivityItem[]> {
  const { data, error } = await db()
    .from('audit_log')
    .select('*, actor_profile:profiles(full_name, email)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data ?? []) as unknown as ActivityItem[];
}

/* ── Intake roll-ups ──────────────────────────────────────────────────── */

export interface IntakeStats {
  intake_id: string;
  enrolled: number;
  completed: number;
  withdrawn: number;
  certificates: number;
}

/** Per-intake counts, tallied client-side from one enrolment fetch. */
export async function fetchIntakeStats(): Promise<Map<string, IntakeStats>> {
  const { data, error } = await db()
    .from('enrollments')
    .select('intake_id, status, certificate:certificates(id, status)');

  const map = new Map<string, IntakeStats>();
  if (error || !data) return map;

  for (const row of data as unknown as {
    intake_id: string;
    status: 'enrolled' | 'completed' | 'withdrawn';
    certificate: { id: string; status: string }[] | null;
  }[]) {
    const s =
      map.get(row.intake_id) ??
      { intake_id: row.intake_id, enrolled: 0, completed: 0, withdrawn: 0, certificates: 0 };

    if (row.status === 'enrolled') s.enrolled += 1;
    if (row.status === 'completed') s.completed += 1;
    if (row.status === 'withdrawn') s.withdrawn += 1;
    if ((row.certificate ?? []).some((c) => c.status === 'valid')) s.certificates += 1;

    map.set(row.intake_id, s);
  }
  return map;
}

export const courseLabel = (c: Pick<Course, 'title'>) => c.title;

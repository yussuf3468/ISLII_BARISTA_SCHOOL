import { db } from '@/lib/supabase';
import type {
  Assessment, AssessmentScore, AttendanceRow, AttendanceState, Course,
  EnrollmentAttendance, EnrollmentFinance, EnrollmentGrades, Expense,
  ExpenseCategory, FinanceStats, IntakeFinance, Payment, PaymentMethod,
  StudentFinanceRow,
} from '@/lib/db.types';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Fees, payments, attendance and assessments.
 * ─────────────────────────────────────────────────────────────────────────────
 *  Kept out of api.ts because that file is already the whole registry domain,
 *  and because everything here shares one rule that nothing there has to think
 *  about:
 *
 *  MONEY CROSSES THE WIRE AS A STRING. PostgREST serialises `numeric` as text
 *  on purpose — numeric(12,2) carries more significant digits than an IEEE
 *  double, so emitting a JSON number would quietly round it. Cast it once,
 *  here, and the rest of the app can treat amounts as numbers. Skipping this
 *  produces `"12000.00" + 500 === "12000.00500"`, which type-checks perfectly.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Parse a PostgREST numeric. `null` and `''` both mean zero for our purposes. */
const num = (v: unknown): number => {
  if (v === null || v === undefined || v === '') return 0;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Same, but preserves "no value" — a missing mark is not a mark of zero. */
const numOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

/* ═══════════════════════════════════════════════════════════════════════════
   COURSES  — staff maintain the catalogue and its prices
   ═══════════════════════════════════════════════════════════════════════════ */

export interface CourseRow extends Course {
  fee_kes: number;
  intakeCount: number;
}

export interface IntakeFeeInput {
  /** null clears the override so the cohort inherits its course price again. */
  fee_kes: number | null;
}

export async function setIntakeFee(intakeId: string, fee: number | null) {
  const { error } = await db().from('intakes').update({ fee_kes: fee }).eq('id', intakeId);
  if (error) throw error;
}

export async function fetchCoursesAdmin(): Promise<CourseRow[]> {
  const { data, error } = await db()
    .from('courses')
    .select('*, intakes(id)')
    .order('sort_order')
    .order('title');
  if (error) throw error;

  return (data ?? []).map((c) => {
    const { intakes, ...rest } = c as Course & { intakes?: unknown[]; fee_kes: unknown };
    return {
      ...(rest as Course),
      fee_kes: num((c as { fee_kes: unknown }).fee_kes),
      intakeCount: Array.isArray(intakes) ? intakes.length : 0,
    };
  });
}

export interface CourseInput {
  title: string;
  duration: string;
  level: string;
  certification: string;
  fee_kes: number;
  active: boolean;
  sort_order?: number;
}

/** Slugs are derived, never typed. A hand-entered slug is a broken URL waiting. */
export const slugify = (s: string) =>
  s.toLowerCase().trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

export async function createCourse(input: CourseInput): Promise<Course> {
  const { data, error } = await db()
    .from('courses')
    .insert({ ...input, slug: slugify(input.title) })
    .select()
    .single();
  if (error) throw error;
  return data as Course;
}

export async function updateCourse(id: string, patch: Partial<CourseInput>) {
  // The slug is deliberately NOT regenerated on rename. It is the join key to
  // the marketing site's course copy in src/data/courses.ts, and changing it
  // would silently detach the photography and SEO from the programme.
  const { data, error } = await db()
    .from('courses').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data as Course;
}

export async function deleteCourse(id: string) {
  const { error } = await db().from('courses').delete().eq('id', id);
  if (error) throw error;
}

/* ═══════════════════════════════════════════════════════════════════════════
   FINANCE
   ═══════════════════════════════════════════════════════════════════════════ */

export async function fetchFinanceStats(): Promise<FinanceStats> {
  const { data, error } = await db().rpc('finance_stats');
  if (error) throw error;
  const d = (data ?? {}) as Record<string, unknown>;
  return {
    billed: num(d.billed),
    collected: num(d.collected),
    outstanding: num(d.outstanding),
    in_arrears: num(d.in_arrears),
    unpriced: num(d.unpriced),
    spent: num(d.spent),
    spent_30d: num(d.spent_30d),
    net: num(d.net),
    by_category: Object.fromEntries(
      Object.entries((d.by_category ?? {}) as Record<string, unknown>)
        .map(([k, v]) => [k, num(v)]),
    ) as FinanceStats['by_category'],
    collected_30d: num(d.collected_30d),
    by_method: Object.fromEntries(
      Object.entries((d.by_method ?? {}) as Record<string, unknown>)
        .map(([k, v]) => [k, num(v)]),
    ) as FinanceStats['by_method'],
  };
}

export type FeeFilter = 'all' | 'owing' | 'paid' | 'unbilled';

/**
 * One row per student with their fees totalled across every enrolment.
 *
 * The aggregation happens here rather than in SQL because `enrollment_finance`
 * is per-enrolment and a student may sit two programmes. Rolling it up in the
 * database would need a second view whose only job is a GROUP BY — at this
 * scale (a school, not a university) fetching and summing is simpler and one
 * round trip either way.
 */
export async function fetchStudentFinance(
  filter: FeeFilter = 'all',
  search = '',
): Promise<StudentFinanceRow[]> {
  const { data: fin, error: finErr } = await db()
    .from('enrollment_finance')
    .select('student_id, fee_kes, paid_kes, balance_kes, last_paid_on');
  if (finErr) throw finErr;

  const totals = new Map<
    string,
    { fee: number; paid: number; last: string | null; unpriced: number }
  >();
  for (const r of (fin ?? []) as Array<Record<string, unknown>>) {
    const id = r.student_id as string;
    const cur = totals.get(id) ?? { fee: 0, paid: 0, last: null, unpriced: 0 };
    cur.fee += num(r.fee_kes);
    cur.paid += num(r.paid_kes);
    // fee_raw is NULL only when nobody has priced the enrolment. A deliberate
    // 0 (scholarship) is a real, complete price and must not be counted here.
    if (numOrNull(r.fee_raw) === null) cur.unpriced += 1;
    const last = r.last_paid_on as string | null;
    if (last && (!cur.last || last > cur.last)) cur.last = last;
    totals.set(id, cur);
  }

  if (totals.size === 0) return [];

  let q = db()
    .from('students')
    .select('id, student_no, first_name, last_name, phone, photo_path')
    .in('id', [...totals.keys()]);

  if (search.trim()) {
    const t = search.trim();
    q = q.or(`first_name.ilike.%${t}%,last_name.ilike.%${t}%,student_no.ilike.%${t}%`);
  }

  const { data: students, error } = await q;
  if (error) throw error;

  const rows: StudentFinanceRow[] = (students ?? []).map((s) => {
    const t = totals.get((s as { id: string }).id)!;
    const st = s as Record<string, unknown>;
    return {
      student_id: st.id as string,
      student_no: st.student_no as string,
      first_name: st.first_name as string,
      last_name: st.last_name as string,
      phone: (st.phone as string) ?? null,
      photo_path: (st.photo_path as string) ?? null,
      fee_kes: t.fee,
      paid_kes: t.paid,
      balance_kes: t.fee - t.paid,
      unpriced: t.unpriced,
      last_paid_on: t.last,
    };
  });

  const filtered = rows.filter((r) => {
    if (filter === 'owing') return r.balance_kes > 0;
    if (filter === 'paid') return r.fee_kes > 0 && r.balance_kes <= 0;
    // "No fee set" means genuinely unpriced, not "priced at zero". A bursary
    // student is fully handled and must not sit in the chase-up list.
    if (filter === 'unbilled') return r.unpriced > 0;
    return true;
  });

  // Biggest debt first: the list exists to be worked through, and the only
  // useful default order is "who to chase".
  return filtered.sort((a, b) => b.balance_kes - a.balance_kes);
}

export async function fetchEnrollmentFinance(studentId: string): Promise<EnrollmentFinance[]> {
  const { data, error } = await db()
    .from('enrollment_finance')
    .select('*')
    .eq('student_id', studentId);
  if (error) throw error;
  return (data ?? []).map((r) => {
    const x = r as Record<string, unknown>;
    return {
      enrollment_id: x.enrollment_id as string,
      student_id: x.student_id as string,
      intake_id: x.intake_id as string,
      fee_raw: numOrNull(x.fee_raw),
      fee_kes: num(x.fee_kes),
      paid_kes: num(x.paid_kes),
      balance_kes: num(x.balance_kes),
      receipts: num(x.receipts),
      payment_status: x.payment_status as EnrollmentFinance['payment_status'],
      last_paid_on: (x.last_paid_on as string) ?? null,
    };
  });
}

export async function fetchPayments(studentId: string): Promise<Payment[]> {
  const { data, error } = await db()
    .from('payments')
    .select('*')
    .eq('student_id', studentId)
    .order('paid_on', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((p) => ({
    ...(p as Payment),
    amount_kes: num((p as Record<string, unknown>).amount_kes),
  }));
}

export async function fetchRecentPayments(limit = 25): Promise<
  Array<Payment & { student: { id: string; student_no: string; first_name: string; last_name: string } }>
> {
  const { data, error } = await db()
    .from('payments')
    .select('*, student:students(id, student_no, first_name, last_name)')
    .order('paid_on', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((p) => {
    const row = p as unknown as Payment & {
      student: { id: string; student_no: string; first_name: string; last_name: string };
    };
    return { ...row, amount_kes: num((p as Record<string, unknown>).amount_kes) };
  });
}

export interface NewPayment {
  enrollment_id: string;
  amount: number;
  method: PaymentMethod;
  reference?: string | null;
  paid_on?: string;
  note?: string | null;
  /** Set only after the operator confirms a genuine repeat reference. */
  allowDuplicate?: boolean;
}

/** Thrown when the M-Pesa code or slip number has been receipted before. */
export class DuplicateReferenceError extends Error {
  constructor(public reference: string) {
    super(`A payment with reference ${reference} has already been recorded.`);
    this.name = 'DuplicateReferenceError';
  }
}

export async function recordPayment(input: NewPayment): Promise<Payment> {
  const { data, error } = await db().rpc('record_payment', {
    p_enrollment_id: input.enrollment_id,
    p_amount: input.amount,
    p_method: input.method,
    p_reference: input.reference ?? null,
    p_paid_on: input.paid_on ?? new Date().toISOString().slice(0, 10),
    p_note: input.note ?? null,
    p_allow_duplicate: input.allowDuplicate ?? false,
  });
  if (error) {
    // Surfaced as a distinct type so the UI can offer "record it anyway"
    // instead of a dead end — a genuine repeat reference does happen.
    if (/already been recorded/i.test(error.message) && input.reference) {
      throw new DuplicateReferenceError(input.reference);
    }
    throw error;
  }
  return { ...(data as Payment), amount_kes: num((data as Record<string, unknown>).amount_kes) };
}

/**
 * Apply the current course/intake price to enrolments that were created before
 * anyone set it.
 *
 * This is the normal sequence at a school, not an edge case: students are
 * registered in week one and the price is agreed in week two. Without it the
 * insert trigger has already run and every one of those enrolments is stuck.
 * The function only touches unpriced enrolments with no payments, so it can
 * never overwrite a negotiated fee.
 */
export async function applyPendingFees(
  target: { intakeId?: string; courseId?: string },
): Promise<number> {
  const { data, error } = await db().rpc('apply_pending_fees', {
    p_intake_id: target.intakeId ?? null,
    p_course_id: target.courseId ?? null,
  });
  if (error) throw error;
  return num(data);
}

export async function deletePayment(id: string, reason: string) {
  const { error } = await db().rpc('delete_payment', { p_id: id, p_reason: reason });
  if (error) throw error;
}

/** Adjust the agreed fee on one enrolment — a discount, bursary or correction. */
export async function setEnrollmentFee(enrollmentId: string, fee: number) {
  const { error } = await db()
    .from('enrollments')
    .update({ fee_kes: fee })
    .eq('id', enrollmentId);
  if (error) throw error;
}

/* ═══════════════════════════════════════════════════════════════════════════
   ATTENDANCE
   ═══════════════════════════════════════════════════════════════════════════ */

export interface RegisterRow {
  enrollment_id: string;
  student_id: string;
  student_no: string;
  first_name: string;
  last_name: string;
  photo_path: string | null;
  state: AttendanceState | null;
  note: string | null;
}

/** The register for one intake on one date, including students not yet marked. */
export async function fetchRegister(intakeId: string, date: string): Promise<RegisterRow[]> {
  const { data, error } = await db()
    .from('enrollments')
    .select('id, student:students(id, student_no, first_name, last_name, photo_path)')
    .eq('intake_id', intakeId)
    // Someone who withdrew should not appear on today's register.
    .eq('status', 'enrolled');
  if (error) throw error;

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  if (rows.length === 0) return [];

  const { data: marks, error: mErr } = await db()
    .from('attendance')
    .select('enrollment_id, state, note')
    .eq('session_date', date)
    .in('enrollment_id', rows.map((r) => r.id as string));
  if (mErr) throw mErr;

  const byEnrollment = new Map(
    (marks ?? []).map((m) => [
      (m as Record<string, unknown>).enrollment_id as string,
      m as Record<string, unknown>,
    ]),
  );

  return rows
    .map((r) => {
      const s = r.student as Record<string, unknown>;
      const mark = byEnrollment.get(r.id as string);
      return {
        enrollment_id: r.id as string,
        student_id: s.id as string,
        student_no: s.student_no as string,
        first_name: s.first_name as string,
        last_name: s.last_name as string,
        photo_path: (s.photo_path as string) ?? null,
        state: (mark?.state as AttendanceState) ?? null,
        note: (mark?.note as string) ?? null,
      };
    })
    .sort((a, b) => a.last_name.localeCompare(b.last_name));
}

export async function markAttendance(
  date: string,
  entries: Array<{ enrollment_id: string; state: AttendanceState; note?: string | null }>,
): Promise<number> {
  const { data, error } = await db().rpc('mark_attendance', {
    p_session_date: date,
    p_entries: entries,
  });
  if (error) throw error;
  return num(data);
}

export async function fetchAttendanceSummary(studentId: string): Promise<EnrollmentAttendance[]> {
  const { data, error } = await db()
    .from('enrollment_attendance')
    .select('*')
    .eq('student_id', studentId);
  if (error) throw error;
  return (data ?? []).map((r) => {
    const x = r as Record<string, unknown>;
    return {
      enrollment_id: x.enrollment_id as string,
      student_id: x.student_id as string,
      sessions: num(x.sessions),
      attended: num(x.attended),
      absences: num(x.absences),
      lates: num(x.lates),
      rate_pct: numOrNull(x.rate_pct),
    };
  });
}

export async function fetchStudentAttendance(enrollmentIds: string[]): Promise<AttendanceRow[]> {
  if (!enrollmentIds.length) return [];
  const { data, error } = await db()
    .from('attendance')
    .select('*')
    .in('enrollment_id', enrollmentIds)
    .order('session_date', { ascending: false })
    .limit(120);
  if (error) throw error;
  return (data ?? []) as AttendanceRow[];
}

/** Dates on which this intake has any register at all — drives the date picker. */
export async function fetchSessionDates(intakeId: string): Promise<string[]> {
  const { data: enr, error } = await db()
    .from('enrollments').select('id').eq('intake_id', intakeId);
  if (error) throw error;
  const ids = (enr ?? []).map((e) => (e as { id: string }).id);
  if (!ids.length) return [];

  const { data, error: aErr } = await db()
    .from('attendance')
    .select('session_date')
    .in('enrollment_id', ids)
    .order('session_date', { ascending: false });
  if (aErr) throw aErr;

  return [...new Set((data ?? []).map((r) => (r as { session_date: string }).session_date))];
}

/* ═══════════════════════════════════════════════════════════════════════════
   ASSESSMENTS
   ═══════════════════════════════════════════════════════════════════════════ */

export async function fetchAssessments(intakeId: string): Promise<Assessment[]> {
  const { data, error } = await db()
    .from('assessments')
    .select('*')
    .eq('intake_id', intakeId)
    .order('sort_order')
    .order('created_at');
  if (error) throw error;
  return (data ?? []).map((a) => {
    const x = a as Record<string, unknown>;
    return { ...(a as Assessment), max_score: num(x.max_score), weight: num(x.weight) };
  });
}

export interface NewAssessment {
  intake_id: string;
  title: string;
  max_score: number;
  weight: number;
  due_on?: string | null;
  sort_order?: number;
}

export async function createAssessment(input: NewAssessment): Promise<Assessment> {
  const { data, error } = await db().from('assessments').insert(input).select().single();
  if (error) throw error;
  return data as Assessment;
}

export async function updateAssessment(id: string, patch: Partial<NewAssessment>) {
  const { error } = await db().from('assessments').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteAssessment(id: string) {
  const { error } = await db().from('assessments').delete().eq('id', id);
  if (error) throw error;
}

export interface MarkSheetRow {
  enrollment_id: string;
  student_id: string;
  student_no: string;
  first_name: string;
  last_name: string;
  /** assessment_id → score. Absent key means unmarked, which is not zero. */
  scores: Record<string, number | null>;
  remarks: Record<string, string | null>;
}

export async function fetchMarkSheet(intakeId: string): Promise<MarkSheetRow[]> {
  const { data, error } = await db()
    .from('enrollments')
    .select('id, student:students(id, student_no, first_name, last_name)')
    .eq('intake_id', intakeId)
    .neq('status', 'withdrawn');
  if (error) throw error;

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  if (!rows.length) return [];

  const { data: scores, error: sErr } = await db()
    .from('assessment_scores')
    .select('assessment_id, enrollment_id, score, remark')
    .in('enrollment_id', rows.map((r) => r.id as string));
  if (sErr) throw sErr;

  const byEnrollment = new Map<string, Array<Record<string, unknown>>>();
  for (const s of (scores ?? []) as Array<Record<string, unknown>>) {
    const k = s.enrollment_id as string;
    byEnrollment.set(k, [...(byEnrollment.get(k) ?? []), s]);
  }

  return rows
    .map((r) => {
      const st = r.student as Record<string, unknown>;
      const mine = byEnrollment.get(r.id as string) ?? [];
      return {
        enrollment_id: r.id as string,
        student_id: st.id as string,
        student_no: st.student_no as string,
        first_name: st.first_name as string,
        last_name: st.last_name as string,
        scores: Object.fromEntries(
          mine.map((s) => [s.assessment_id as string, numOrNull(s.score)]),
        ),
        remarks: Object.fromEntries(
          mine.map((s) => [s.assessment_id as string, (s.remark as string) ?? null]),
        ),
      };
    })
    .sort((a, b) => a.last_name.localeCompare(b.last_name));
}

export async function recordScores(
  assessmentId: string,
  scores: Array<{ enrollment_id: string; score: number | null; remark?: string | null }>,
): Promise<number> {
  const { data, error } = await db().rpc('record_scores', {
    p_assessment_id: assessmentId,
    p_scores: scores.map((s) => ({
      enrollment_id: s.enrollment_id,
      // The SQL casts '' to null, so an empty box clears a mark rather than
      // storing a zero. Those mean very different things on a transcript.
      score: s.score === null ? '' : String(s.score),
      remark: s.remark ?? null,
    })),
  });
  if (error) throw error;
  return num(data);
}

export async function fetchGradeSummary(studentId: string): Promise<EnrollmentGrades[]> {
  const { data, error } = await db()
    .from('enrollment_grades')
    .select('*')
    .eq('student_id', studentId);
  if (error) throw error;
  return (data ?? []).map((r) => {
    const x = r as Record<string, unknown>;
    return {
      enrollment_id: x.enrollment_id as string,
      student_id: x.student_id as string,
      marked: num(x.marked),
      assessments: num(x.assessments),
      final_pct: numOrNull(x.final_pct),
    };
  });
}

export async function fetchStudentScores(enrollmentIds: string[]): Promise<
  Array<AssessmentScore & { assessment: Pick<Assessment, 'id' | 'title' | 'max_score' | 'weight'> }>
> {
  if (!enrollmentIds.length) return [];
  const { data, error } = await db()
    .from('assessment_scores')
    .select('*, assessment:assessments(id, title, max_score, weight)')
    .in('enrollment_id', enrollmentIds);
  if (error) throw error;
  return (data ?? []).map((s) => {
    const x = s as Record<string, unknown>;
    const a = x.assessment as Record<string, unknown>;
    const row = s as unknown as AssessmentScore & {
      assessment: Pick<Assessment, 'id' | 'title' | 'max_score' | 'weight'>;
    };
    return {
      ...row,
      score: numOrNull(x.score),
      assessment: {
        ...row.assessment,
        max_score: num(a.max_score),
        weight: num(a.weight),
      },
    };
  });
}

/* ── Formatting ───────────────────────────────────────────────────────────
   One place, so a shilling never renders three different ways. */
export const kes = (n: number) =>
  'KES ' + n.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

/** Compact form for dense table cells and KPI tiles. */
export const kesShort = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `KES ${(n / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 10_000) return `KES ${(n / 1000).toFixed(0)}K`;
  return kes(n);
};

/* ═══════════════════════════════════════════════════════════════════════════
   EXPENSES — money out
   ═══════════════════════════════════════════════════════════════════════════ */

/** Display order is roughly "how often a school touches it", not alphabetical. */
export const EXPENSE_CATEGORIES: Array<{ value: ExpenseCategory; label: string }> = [
  { value: 'ingredients', label: 'Ingredients & supplies' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'salaries', label: 'Salaries & tutors' },
  { value: 'rent', label: 'Rent' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'maintenance', label: 'Maintenance & repairs' },
  { value: 'transport', label: 'Transport' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'licences', label: 'Licences & permits' },
  { value: 'other', label: 'Other' },
];

export const expenseCategoryLabel = (c: ExpenseCategory) =>
  EXPENSE_CATEGORIES.find((x) => x.value === c)?.label ?? c;

export type ExpensePeriod = 'all' | 'month' | 'quarter' | 'year';

export interface ExpenseQuery {
  category?: ExpenseCategory | 'all';
  period?: ExpensePeriod;
  search?: string;
}

/** Start of the requested window, or null for "everything". */
function periodStart(period: ExpensePeriod): string | null {
  if (period === 'all') return null;
  const d = new Date();
  if (period === 'month') d.setMonth(d.getMonth() - 1);
  if (period === 'quarter') d.setMonth(d.getMonth() - 3);
  if (period === 'year') d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().slice(0, 10);
}

export async function fetchExpenses(q: ExpenseQuery = {}): Promise<Expense[]> {
  let query = db()
    .from('expenses')
    .select('*')
    .order('spent_on', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(500);

  if (q.category && q.category !== 'all') query = query.eq('category', q.category);

  const from = periodStart(q.period ?? 'all');
  if (from) query = query.gte('spent_on', from);

  if (q.search?.trim()) {
    const t = q.search.trim();
    query = query.or(`description.ilike.%${t}%,vendor.ilike.%${t}%,reference.ilike.%${t}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((e) => ({
    ...(e as Expense),
    amount_kes: num((e as Record<string, unknown>).amount_kes),
  }));
}

export interface NewExpense {
  category: ExpenseCategory;
  description: string;
  amount: number;
  spent_on?: string;
  vendor?: string | null;
  method?: PaymentMethod;
  reference?: string | null;
  intake_id?: string | null;
  note?: string | null;
}

export async function recordExpense(input: NewExpense): Promise<Expense> {
  const { data, error } = await db().rpc('record_expense', {
    p_category: input.category,
    p_description: input.description,
    p_amount: input.amount,
    p_spent_on: input.spent_on ?? new Date().toISOString().slice(0, 10),
    p_vendor: input.vendor ?? null,
    p_method: input.method ?? 'cash',
    p_reference: input.reference ?? null,
    p_intake_id: input.intake_id ?? null,
    p_note: input.note ?? null,
  });
  if (error) throw error;
  return { ...(data as Expense), amount_kes: num((data as Record<string, unknown>).amount_kes) };
}

export async function deleteExpense(id: string, reason: string) {
  const { error } = await db().rpc('delete_expense', { p_id: id, p_reason: reason });
  if (error) throw error;
}

/** Per-cohort: fees collected against costs booked to that cohort. */
export async function fetchIntakeFinance(): Promise<IntakeFinance[]> {
  const { data, error } = await db()
    .from('intake_finance')
    .select('*')
    .order('code', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => {
    const x = r as Record<string, unknown>;
    return {
      intake_id: x.intake_id as string,
      code: x.code as string,
      billed_kes: num(x.billed_kes),
      collected_kes: num(x.collected_kes),
      direct_costs_kes: num(x.direct_costs_kes),
      margin_kes: num(x.margin_kes),
    };
  });
}

/**
 * Database types.
 *
 * Hand-written to mirror supabase/migrations/*.sql. Once the project is live
 * these can be regenerated instead, which is the better long-term habit:
 *
 *   npx supabase gen types typescript --project-id <ref> > src/lib/db.types.ts
 *
 * Until then this file is the contract — if you change a migration, change it
 * here in the same commit.
 */

export type StaffRole = 'admin' | 'registrar' | 'viewer';
export type IntakeStatus = 'planned' | 'running' | 'completed' | 'cancelled';
export type EnrollmentState = 'enrolled' | 'completed' | 'withdrawn';
export type CertificateState = 'valid' | 'revoked';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: StaffRole;
  created_at: string;
}

export interface Student {
  id: string;
  student_no: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  national_id: string | null;
  photo_path: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface Course {
  id: string;
  slug: string;
  title: string;
  duration: string;
  level: string;
  certification: string;
  active: boolean;
  sort_order: number;
  /** Standard published fee. An intake may override it; an enrolment snapshots it. */
  fee_kes: number;
}

export interface Intake {
  id: string;
  /** NULL inherits the course fee. Set for evening/corporate/promo cohorts. */
  fee_kes?: number | null;
  course_id: string;
  code: string;
  starts_on: string;
  ends_on: string | null;
  capacity: number | null;
  status: IntakeStatus;
  created_at: string;
}

export interface Enrollment {
  id: string;
  student_id: string;
  intake_id: string;
  status: EnrollmentState;
  grade: string | null;
  completed_on: string | null;
  created_at: string;
  created_by: string | null;
}

export interface Certificate {
  id: string;
  certificate_no: string;
  verify_token: string;
  student_id: string;
  enrollment_id: string;
  issued_at: string;
  issued_by: string | null;
  status: CertificateState;
  revoked_at: string | null;
  revoked_by: string | null;
  revoked_reason: string | null;
  pdf_path: string | null;
}

export interface AuditEntry {
  id: number;
  actor: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
}

/* ── Shapes returned by the public verification RPCs ───────────────────── */

/** verify_certificate(token) — the full public record, reached via the QR. */
export interface VerifiedCertificate {
  certificate_no: string;
  status: CertificateState;
  issued_on: string;
  revoked_on: string | null;
  student_no: string;
  full_name: string;
  photo_path: string | null;
  course_title: string;
  course_level: string;
  course_duration: string;
  certification: string;
  intake_started: string | null;
  intake_ended: string | null;
  grade: string | null;
}

/** find_certificate(no, surname) — deliberately less than the token path. */
export interface FoundCertificate {
  certificate_no: string;
  status: CertificateState;
  issued_on: string;
  full_name: string;
  course_title: string;
}

export interface DashboardStats {
  students: number;
  students_this_month: number;
  certificates: number;
  revoked: number;
  enrolled: number;
  completed: number;
  intakes_running: number;
}

/* ── Joined shapes used by the admin lists ─────────────────────────────── */

export interface IntakeWithCourse extends Intake {
  course: Pick<Course, 'id' | 'title' | 'slug' | 'certification' | 'duration' | 'level'>;
}

export interface EnrollmentDetail extends Enrollment {
  intake: IntakeWithCourse;
  certificate: Pick<
    Certificate,
    'id' | 'certificate_no' | 'verify_token' | 'status' | 'pdf_path'
  > | null;
}

export interface CertificateRow extends Certificate {
  student: Pick<Student, 'id' | 'student_no' | 'first_name' | 'last_name'>;
}

/* ═══════════════════════════════════════════════════════════════════════════
   FEES, PAYMENTS, ATTENDANCE, ASSESSMENTS  (migrations 0005 / 0006)
   ═══════════════════════════════════════════════════════════════════════════
   Money arrives from PostgREST as a STRING, not a number. numeric(12,2) has
   more precision than a JS double, so the driver refuses to lose it silently.
   Every amount is parsed at the API boundary — never `as number`, which
   type-checks and then produces "12000.00" + 500 = "12000.00500".
   ═══════════════════════════════════════════════════════════════════════════ */

export type PaymentMethod = 'cash' | 'mpesa' | 'bank' | 'card' | 'other';
export type AttendanceState = 'present' | 'absent' | 'late' | 'excused';
export type PaymentStatus =
  | 'unbilled'   // never priced — NULL fee, not zero
  | 'free'       // deliberately 0: scholarship, bursary, staff child
  | 'unpaid'
  | 'partial'
  | 'paid'
  | 'overpaid';

export interface Payment {
  id: string;
  receipt_no: string;
  enrollment_id: string;
  student_id: string;
  amount_kes: number;
  method: PaymentMethod;
  reference: string | null;
  paid_on: string;
  note: string | null;
  created_at: string;
  created_by: string | null;
}

/** One row of `enrollment_finance`. */
export interface EnrollmentFinance {
  enrollment_id: string;
  student_id: string;
  intake_id: string;
  /** NULL when the enrolment has never been priced. 0 means genuinely free. */
  fee_raw: number | null;
  fee_kes: number;
  receipts: number;
  paid_kes: number;
  balance_kes: number;
  payment_status: PaymentStatus;
  last_paid_on: string | null;
}

export interface FinanceStats {
  billed: number;
  collected: number;
  outstanding: number;
  in_arrears: number;
  /** Enrolments with no fee set — money the school is not yet asking for. */
  unpriced: number;
  collected_30d: number;
  by_method: Partial<Record<PaymentMethod, number>>;

  /* ── Money out ─────────────────────────────────────────────────────── */
  spent: number;
  spent_30d: number;
  /** Collected minus spent. Deliberately NOT billed minus spent — an unpaid
   *  invoice does not buy coffee beans. */
  net: number;
  by_category: Partial<Record<ExpenseCategory, number>>;
}

export interface AttendanceRow {
  id: string;
  enrollment_id: string;
  session_date: string;
  state: AttendanceState;
  note: string | null;
  recorded_at: string;
  recorded_by: string | null;
}

/** One row of `enrollment_attendance`. */
export interface EnrollmentAttendance {
  enrollment_id: string;
  student_id: string;
  sessions: number;
  attended: number;
  absences: number;
  lates: number;
  rate_pct: number | null;
}

export interface Assessment {
  id: string;
  intake_id: string;
  title: string;
  max_score: number;
  weight: number;
  due_on: string | null;
  sort_order: number;
  created_at: string;
  created_by: string | null;
}

export interface AssessmentScore {
  id: string;
  assessment_id: string;
  enrollment_id: string;
  score: number | null;
  remark: string | null;
  recorded_at: string;
  recorded_by: string | null;
}

/** One row of `enrollment_grades`. */
export interface EnrollmentGrades {
  enrollment_id: string;
  student_id: string;
  marked: number;
  assessments: number;
  final_pct: number | null;
}

/** A student in the finance list — one row per student, totalled. */
export interface StudentFinanceRow {
  student_id: string;
  /** Enrolments this student has that have never been priced. */
  unpriced: number;
  student_no: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  photo_path: string | null;
  fee_kes: number;
  paid_kes: number;
  balance_kes: number;
  last_paid_on: string | null;
}

/* ═══════════════════════════════════════════════════════════════════════════
   EXPENSES  (migration 0008)
   ═══════════════════════════════════════════════════════════════════════════ */

export type ExpenseCategory =
  | 'ingredients' | 'equipment' | 'rent' | 'utilities' | 'salaries'
  | 'marketing' | 'maintenance' | 'transport' | 'licences' | 'other';

export interface Expense {
  id: string;
  expense_no: string;
  category: ExpenseCategory;
  description: string;
  amount_kes: number;
  spent_on: string;
  vendor: string | null;
  method: PaymentMethod;
  reference: string | null;
  intake_id: string | null;
  note: string | null;
  created_at: string;
  created_by: string | null;
}

/** One row of `intake_finance` — what a cohort brought in against what it cost. */
export interface IntakeFinance {
  intake_id: string;
  code: string;
  billed_kes: number;
  collected_kes: number;
  /** Only costs explicitly attributed to this intake. Rent and power are not
   *  apportioned, so this is direct cost, not true profit. */
  direct_costs_kes: number;
  margin_kes: number;
}

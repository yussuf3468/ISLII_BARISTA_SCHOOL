import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Wallet, Plus, Receipt, Trash2, Pencil, CalendarCheck, ClipboardList,
} from 'lucide-react';
import {
  fetchEnrollmentFinance, fetchPayments, recordPayment, deletePayment,
  setEnrollmentFee, fetchAttendanceSummary, fetchGradeSummary, kes,
  DuplicateReferenceError,
} from '@/features/admin/finance';
import {
  Panel, Badge, EmptyState, ErrorNote, TableSkeleton, ProgressBar,
  Field, inputClass, inputErrorClass, type BadgeTone,
} from '@/components/admin/AdminUI';
import { ActionMenu, AdminButton } from '@/components/admin/Menu';
import { Modal, useConfirm } from '@/components/admin/Overlay';
import { useToast } from '@/components/admin/Toast';
import { useAuth } from '@/features/auth/AuthProvider';
import { readableError } from '@/lib/supabase';
import type { EnrollmentDetail, PaymentMethod, PaymentStatus } from '@/lib/db.types';
import { cn } from '@/lib/utils';

const METHODS: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'mpesa', label: 'M-Pesa' },
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank transfer' },
  { value: 'card', label: 'Card' },
  { value: 'other', label: 'Other' },
];

const fmt = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

/* Six states, because "0" is genuinely ambiguous until you separate them:
   an unpriced enrolment is work outstanding for the office, a free one is
   finished business, and they must never look the same. */
const STATUS_LABEL: Record<PaymentStatus, string> = {
  unbilled: 'No fee set',
  free: 'Free',
  unpaid: 'Unpaid',
  partial: 'Part paid',
  paid: 'Paid',
  overpaid: 'In credit',
};

const STATUS_TONE: Record<PaymentStatus, BadgeTone> = {
  unbilled: 'planned',
  free: 'neutral',
  unpaid: 'revoked',
  partial: 'running',
  paid: 'valid',
  overpaid: 'enrolled',
};

const paySchema = z.object({
  enrollment_id: z.string().min(1, 'Which programme is this for?'),
  amount: z.coerce.number({ invalid_type_error: 'Enter an amount.' })
    .positive('A payment must be more than zero.')
    .max(9_999_999, 'That looks like a typo.'),
  method: z.enum(['cash', 'mpesa', 'bank', 'card', 'other']),
  reference: z.string().trim().max(60).optional(),
  paid_on: z.string().min(1, 'When was it paid?'),
  note: z.string().trim().max(200).optional(),
});
type PayValues = z.infer<typeof paySchema>;

function PaymentModal({
  open, onClose, studentId, enrollments, defaultEnrollment,
}: {
  open: boolean;
  onClose: () => void;
  studentId: string;
  enrollments: EnrollmentDetail[];
  defaultEnrollment?: string;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();

  const {
    register, handleSubmit, reset, formState: { errors, isDirty },
  } = useForm<PayValues>({
    resolver: zodResolver(paySchema),
    mode: 'onBlur',
    values: {
      enrollment_id: defaultEnrollment ?? enrollments[0]?.id ?? '',
      amount: 0,
      method: 'mpesa',
      reference: '',
      paid_on: new Date().toISOString().slice(0, 10),
      note: '',
    },
  });

  const save = useMutation({
    /* Pasting the same M-Pesa code twice — once when the SMS arrives, once at
       reconciliation — is the most common error in a cash office, and it
       double-credits a student. The database rejects a repeat reference; here
       we turn that rejection into a decision rather than a wall, because a
       genuine repeat does occasionally happen. */
    mutationFn: async (v: PayValues) => {
      const payload = {
        enrollment_id: v.enrollment_id,
        amount: v.amount,
        method: v.method,
        reference: v.reference || null,
        paid_on: v.paid_on,
        note: v.note || null,
      };
      try {
        return await recordPayment(payload);
      } catch (err) {
        if (!(err instanceof DuplicateReferenceError)) throw err;

        const ok = await confirm({
          title: 'This reference has been receipted before',
          body: (
            <>
              A payment with reference{' '}
              <strong className="font-medium text-slate-900">{err.reference}</strong> already
              exists. Recording it again will credit the student twice. Continue only if this
              is genuinely a separate payment that happens to share the reference.
            </>
          ),
          confirmLabel: 'Record it anyway',
        });
        if (ok === null) throw new Error('cancelled');
        return recordPayment({ ...payload, allowDuplicate: true });
      }
    },
    onSuccess: (p) => {
      void qc.invalidateQueries({ queryKey: ['finance', studentId] });
      void qc.invalidateQueries({ queryKey: ['payments', studentId] });
      void qc.invalidateQueries({ queryKey: ['finance-stats'] });
      void qc.invalidateQueries({ queryKey: ['student-finance'] });
      void qc.invalidateQueries({ queryKey: ['recent-payments'] });
      toast.success('Payment recorded', `Receipt ${p.receipt_no} · ${kes(p.amount_kes)}`);
      reset();
      onClose();
    },
    onError: (e) => {
      // The operator chose not to proceed past the duplicate warning; that is
      // not an error worth shouting about.
      if ((e as Error).message === 'cancelled') return;
      toast.error('Could not record the payment', readableError(e));
    },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record a payment"
      description="A receipt number is allocated automatically."
      dirty={isDirty}
      footer={
        <>
          <AdminButton variant="ghost" onClick={onClose}>Cancel</AdminButton>
          <AdminButton
            variant="primary" disabled={save.isPending}
            onClick={() => void handleSubmit((v) => save.mutate(v))()}
          >
            {save.isPending ? 'Recording…' : 'Record payment'}
          </AdminButton>
        </>
      }
    >
      <form onSubmit={handleSubmit((v) => save.mutate(v))} noValidate className="space-y-4">
        <Field label="Towards" htmlFor="enrollment_id" error={errors.enrollment_id?.message}>
          <select
            id="enrollment_id"
            className={cn(inputClass, errors.enrollment_id && inputErrorClass)}
            {...register('enrollment_id')}
          >
            {enrollments.map((e) => (
              <option key={e.id} value={e.id}>
                {e.intake.course.title} — {e.intake.code}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Amount (KES)" htmlFor="amount" error={errors.amount?.message}>
            <input
              id="amount" type="number" min={1} step={100} inputMode="numeric" autoFocus
              className={cn(inputClass, 'tabular-nums', errors.amount && inputErrorClass)}
              {...register('amount')}
            />
          </Field>

          <Field label="Method" htmlFor="method" error={errors.method?.message}>
            <select id="method" className={inputClass} {...register('method')}>
              {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Reference" htmlFor="reference" optional
            hint="M-Pesa code, slip or cheque number."
          >
            <input
              id="reference" placeholder="e.g. SJ42KL9QRT"
              className={cn(inputClass, 'uppercase')} {...register('reference')}
            />
          </Field>

          <Field label="Date paid" htmlFor="paid_on" error={errors.paid_on?.message}>
            <input
              id="paid_on" type="date" max={new Date().toISOString().slice(0, 10)}
              className={cn(inputClass, 'tabular-nums', errors.paid_on && inputErrorClass)}
              {...register('paid_on')}
            />
          </Field>
        </div>

        <Field label="Note" htmlFor="note" optional>
          <input id="note" className={inputClass} {...register('note')} />
        </Field>
      </form>
      {dialog}
    </Modal>
  );
}

function FeeModal({
  open, onClose, studentId, enrollment, current,
}: {
  open: boolean;
  onClose: () => void;
  studentId: string;
  enrollment: EnrollmentDetail | null;
  current: number;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const [fee, setFee] = useState(String(current));

  const save = useMutation({
    mutationFn: () => setEnrollmentFee(enrollment!.id, Number(fee)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['finance', studentId] });
      void qc.invalidateQueries({ queryKey: ['finance-stats'] });
      void qc.invalidateQueries({ queryKey: ['student-finance'] });
      toast.success('Fee updated');
      onClose();
    },
    onError: (e) => toast.error('Could not update the fee', readableError(e)),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Adjust the agreed fee"
      description={enrollment ? enrollment.intake.course.title : undefined}
      size="sm"
      dirty={fee !== String(current)}
      footer={
        <>
          <AdminButton variant="ghost" onClick={onClose}>Cancel</AdminButton>
          <AdminButton variant="primary" disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? 'Saving…' : 'Save fee'}
          </AdminButton>
        </>
      }
    >
      <Field
        label="Agreed fee (KES)" htmlFor="fee"
        hint="Use this for a discount, bursary or an instalment arrangement. Payments already recorded are untouched."
      >
        <input
          id="fee" type="number" min={0} step={500} autoFocus
          value={fee} onChange={(e) => setFee(e.target.value)}
          className={cn(inputClass, 'tabular-nums')}
        />
      </Field>
    </Modal>
  );
}

/**
 * Fees, attendance and grades for one student.
 *
 * Deliberately one component and one panel group rather than three scattered
 * cards: a registrar asking "how is this student doing" wants money, presence
 * and marks in the same glance, and they all hang off the same enrolments.
 */
export function StudentFinance({
  studentId, enrollments,
}: {
  studentId: string;
  enrollments: EnrollmentDetail[];
}) {
  const { can } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const { confirm, dialog } = useConfirm();
  const [payOpen, setPayOpen] = useState(false);
  const [payFor, setPayFor] = useState<string | undefined>();
  const [feeFor, setFeeFor] = useState<{ e: EnrollmentDetail; fee: number } | null>(null);

  const finance = useQuery({
    queryKey: ['finance', studentId],
    queryFn: () => fetchEnrollmentFinance(studentId),
  });
  const payments = useQuery({
    queryKey: ['payments', studentId],
    queryFn: () => fetchPayments(studentId),
  });
  const attendance = useQuery({
    queryKey: ['attendance', studentId],
    queryFn: () => fetchAttendanceSummary(studentId),
  });
  const grades = useQuery({
    queryKey: ['grades', studentId],
    queryFn: () => fetchGradeSummary(studentId),
  });

  const remove = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => deletePayment(id, reason),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['finance', studentId] });
      void qc.invalidateQueries({ queryKey: ['payments', studentId] });
      void qc.invalidateQueries({ queryKey: ['finance-stats'] });
      toast.success('Payment deleted');
    },
    onError: (e) => toast.error('Could not delete', readableError(e)),
  });

  const fin = finance.data ?? [];
  const totalFee = fin.reduce((s, f) => s + f.fee_kes, 0);
  const totalPaid = fin.reduce((s, f) => s + f.paid_kes, 0);
  const balance = totalFee - totalPaid;

  const byEnrollment = new Map(fin.map((f) => [f.enrollment_id, f]));
  const attByEnrollment = new Map((attendance.data ?? []).map((a) => [a.enrollment_id, a]));
  const gradeByEnrollment = new Map((grades.data ?? []).map((g) => [g.enrollment_id, g]));

  const askDeletePayment = async (id: string, receipt: string) => {
    const reason = await confirm({
      title: 'Delete this payment?',
      body: (
        <>
          Receipt <strong className="font-medium text-slate-900">{receipt}</strong> will be removed
          and the balance recalculated. The deletion is recorded permanently in the audit log.
        </>
      ),
      confirmLabel: 'Delete payment',
      reasonLabel: 'Reason (recorded permanently)',
    });
    if (reason !== null) remove.mutate({ id, reason });
  };

  return (
    <>
      {/* ── Fees ─────────────────────────────────────────────────────────── */}
      <Panel
        title="Fees"
        description={enrollments.length ? undefined : 'Enrol the student to bill them.'}
        action={
          can('admin', 'registrar') && enrollments.length > 0 ? (
            <AdminButton
              size="sm" variant="primary" Icon={Plus}
              onClick={() => { setPayFor(undefined); setPayOpen(true); }}
            >
              Record payment
            </AdminButton>
          ) : undefined
        }
      >
        {finance.isError ? (
          <div className="p-4 sm:p-5">
            <ErrorNote message={readableError(finance.error)} retry={() => void finance.refetch()} />
          </div>
        ) : finance.isLoading ? (
          <TableSkeleton rows={2} cols={3} />
        ) : !enrollments.length ? (
          <EmptyState
            Icon={Wallet}
            title="Nothing billed"
            body="Fees are attached to enrolments. Enrol this student into an intake first."
          />
        ) : (
          <>
            {/* Headline totals */}
            <div className="border-b border-[rgba(9,9,11,0.07)] p-4 sm:p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                <div>
                  <p className="font-sans text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-slate-500">
                    Balance
                  </p>
                  <p
                    className={cn(
                      'mt-1 font-sans text-[1.75rem] font-semibold leading-none tracking-[-0.03em]',
                      balance > 0 ? 'text-red-700' : balance < 0 ? 'text-blue-700' : 'text-emerald-700',
                    )}
                  >
                    {balance < 0 ? `${kes(-balance)} credit` : kes(balance)}
                  </p>
                </div>
                <p className="font-sans text-[0.8125rem] text-slate-500 tabular-nums">
                  <span className="font-medium text-slate-900">{kes(totalPaid)}</span>
                  {' paid of '}{kes(totalFee)}
                </p>
              </div>
              {totalFee > 0 && (
                <div className="mt-3">
                  <ProgressBar value={Math.min(totalPaid, totalFee)} max={totalFee} tone="emerald" />
                </div>
              )}
            </div>

            {/* Per programme */}
            <ul className="divide-y divide-[rgba(9,9,11,0.06)]">
              {enrollments.map((e) => {
                const f = byEnrollment.get(e.id);
                const att = attByEnrollment.get(e.id);
                const g = gradeByEnrollment.get(e.id);
                const bal = f ? f.balance_kes : 0;

                return (
                  <li key={e.id} className="p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-sans text-[0.875rem] font-semibold text-slate-900">
                          {e.intake.course.title}
                        </p>
                        <p className="mt-0.5 font-sans text-[0.75rem] text-slate-500 tabular-nums">
                          {e.intake.code}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {f && <Badge tone={STATUS_TONE[f.payment_status]}>
                          {STATUS_LABEL[f.payment_status]}
                        </Badge>}
                        {can('admin', 'registrar') && (
                          <ActionMenu
                            label={`Fee actions for ${e.intake.course.title}`}
                            items={[
                              {
                                label: 'Record payment', Icon: Receipt,
                                onSelect: () => { setPayFor(e.id); setPayOpen(true); },
                              },
                              {
                                label: 'Adjust agreed fee', Icon: Pencil,
                                onSelect: () => setFeeFor({ e, fee: f?.fee_kes ?? 0 }),
                              },
                            ]}
                          />
                        )}
                      </div>
                    </div>

                    {/* Fee / attendance / grade for this programme, side by side.
                        Three numbers about the same enrolment belong together —
                        splitting them across panels is what makes an admin feel
                        like separate tools bolted to one database. */}
                    <dl className="mt-3 grid grid-cols-3 gap-3">
                      <div>
                        <dt className="font-sans text-[0.6875rem] uppercase tracking-[0.1em] text-slate-500">
                          Fee
                        </dt>
                        <dd className="mt-0.5 font-sans text-[0.875rem] text-slate-900 tabular-nums">
                          {f && f.fee_kes > 0 ? kes(f.fee_kes) : <span className="text-slate-400">Not set</span>}
                        </dd>
                        {f && f.fee_kes > 0 && (
                          <dd className={cn(
                            'font-sans text-[0.75rem] tabular-nums',
                            bal > 0 ? 'text-red-700' : 'text-emerald-700',
                          )}>
                            {bal > 0 ? `${kes(bal)} owing` : 'Paid up'}
                          </dd>
                        )}
                        {/* The database refuses a payment against an unpriced
                            enrolment. Saying so here beats letting someone fill
                            in a receipt and then be rejected. */}
                        {f && f.payment_status === 'unbilled' && (
                          <dd className="font-sans text-[0.75rem] text-amber-700">
                            Set a fee before taking payment
                          </dd>
                        )}
                      </div>

                      <div>
                        <dt className="flex items-center gap-1 font-sans text-[0.6875rem] uppercase tracking-[0.1em] text-slate-500">
                          <CalendarCheck className="size-3" aria-hidden="true" /> Attendance
                        </dt>
                        <dd className="mt-0.5 font-sans text-[0.875rem] text-slate-900 tabular-nums">
                          {att && att.rate_pct !== null
                            ? `${att.rate_pct}%`
                            : <span className="text-slate-400">—</span>}
                        </dd>
                        {att && att.sessions > 0 && (
                          <dd className="font-sans text-[0.75rem] text-slate-500 tabular-nums">
                            {att.attended}/{att.sessions} sessions
                          </dd>
                        )}
                      </div>

                      <div>
                        <dt className="flex items-center gap-1 font-sans text-[0.6875rem] uppercase tracking-[0.1em] text-slate-500">
                          <ClipboardList className="size-3" aria-hidden="true" /> Grade
                        </dt>
                        <dd className="mt-0.5 font-sans text-[0.875rem] text-slate-900 tabular-nums">
                          {g && g.final_pct !== null
                            ? `${g.final_pct}%`
                            : <span className="text-slate-400">—</span>}
                        </dd>
                        {g && g.assessments > 0 && (
                          <dd className="font-sans text-[0.75rem] text-slate-500 tabular-nums">
                            {g.marked}/{g.assessments} marked
                          </dd>
                        )}
                      </div>
                    </dl>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Panel>

      {/* ── Receipts ─────────────────────────────────────────────────────── */}
      {payments.data && payments.data.length > 0 && (
        <Panel title="Payment history" description={`${payments.data.length} receipt${payments.data.length === 1 ? '' : 's'}`}>
          <ul className="divide-y divide-[rgba(9,9,11,0.06)]">
            {payments.data.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-emerald-600/10 text-emerald-700">
                  <Receipt className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-sans text-[0.875rem] text-slate-900 tabular-nums">
                    {kes(p.amount_kes)}
                  </span>
                  <span className="block truncate font-sans text-[0.75rem] text-slate-500">
                    {p.receipt_no} · {METHODS.find((m) => m.value === p.method)?.label ?? p.method}
                    {p.reference ? ` · ${p.reference}` : ''} · {fmt(p.paid_on)}
                  </span>
                </span>
                {can('admin') && (
                  <ActionMenu
                    label={`Actions for receipt ${p.receipt_no}`}
                    items={[{
                      label: 'Delete payment', Icon: Trash2, tone: 'danger',
                      onSelect: () => void askDeletePayment(p.id, p.receipt_no),
                    }]}
                  />
                )}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <PaymentModal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        studentId={studentId}
        enrollments={enrollments}
        defaultEnrollment={payFor}
      />
      <FeeModal
        open={feeFor !== null}
        onClose={() => setFeeFor(null)}
        studentId={studentId}
        enrollment={feeFor?.e ?? null}
        current={feeFor?.fee ?? 0}
      />
      {dialog}
    </>
  );
}

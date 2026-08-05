import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Award, Download, GraduationCap, Ban, Plus, ExternalLink, Copy, Check,
  Camera, UserPlus, QrCode, Mail, Phone, IdCard, CalendarDays, ShieldCheck, Trash2,
} from 'lucide-react';
import {
  fetchStudent, fetchStudentEnrollments, fetchIntakes, enrollStudent,
  setEnrollmentStatus, issueCertificate, revokeCertificate, certificatePdfUrl,
  uploadStudentPhoto, deleteStudent,
} from '@/features/admin/api';
import {
  Panel, Badge, Avatar, EmptyState, ErrorNote, Skeleton,
  TableSkeleton, inputClass, ProgressBar, HAIRLINE, ELEVATION,
} from '@/components/admin/AdminUI';
import { ActionMenu, AdminButton } from '@/components/admin/Menu';
import { Modal, useConfirm } from '@/components/admin/Overlay';
import { QrPreview } from '@/components/admin/QrPreview';
import { StudentFinance } from '@/components/admin/StudentFinance';
import { useToast } from '@/components/admin/Toast';
import { useAuth } from '@/features/auth/AuthProvider';
import { readableError, publicFileUrl } from '@/lib/supabase';
import { useCopy } from '@/lib/hooks';
import { site } from '@/config/site';
import { EASE_LUXE } from '@/lib/motion';
import type { EnrollmentDetail } from '@/lib/db.types';
import { cn } from '@/lib/utils';

const fmt = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

/**
 * Two different foreign keys now block a delete, and "violates foreign key
 * constraint" tells an operator nothing about which, or what to do.
 */
export function friendlyDeleteError(msg: string): string {
  if (/payments_student_id_fkey|payments_enrollment_id_fkey/i.test(msg)) {
    return 'This student has payments recorded against them. Financial records are '
      + 'never deleted automatically — remove the receipts first if this is genuinely '
      + 'a duplicate record.';
  }
  if (/certificates_student_id_fkey|violates foreign key|restrict/i.test(msg)) {
    return 'This student has been issued a certificate, which must remain verifiable. '
      + 'Students with certificates cannot be deleted.';
  }
  return msg;
}

/* ── Timeline ─────────────────────────────────────────────────────────── */

interface TimelineEvent {
  at: string;
  title: string;
  detail?: string;
  Icon: typeof UserPlus;
  tint: string;
}

/**
 * The timeline is assembled from records the student already has — registration
 * date, enrolment dates, completion dates, certificate issue and revocation.
 * No event table was added; the history is already implicit in the data, it
 * simply was not being shown.
 */
function buildTimeline(
  registeredAt: string,
  enrollments: EnrollmentDetail[],
): TimelineEvent[] {
  const events: TimelineEvent[] = [
    {
      at: registeredAt,
      title: 'Registered',
      detail: 'Student record created',
      Icon: UserPlus,
      tint: 'bg-blue-600/10 text-blue-700',
    },
  ];

  for (const e of enrollments) {
    events.push({
      at: e.created_at,
      title: `Enrolled — ${e.intake.course.title}`,
      detail: e.intake.code,
      Icon: CalendarDays,
      tint: 'bg-slate-400/15 text-slate-600',
    });

    if (e.status === 'completed' && e.completed_on) {
      events.push({
        at: e.completed_on,
        title: `Completed — ${e.intake.course.title}`,
        detail: e.grade ? `Grade ${e.grade}` : undefined,
        Icon: GraduationCap,
        tint: 'bg-emerald-600/10 text-emerald-700',
      });
    }

    if (e.certificate) {
      events.push({
        at: e.created_at,
        title: `Certificate ${e.certificate.certificate_no}`,
        detail: e.certificate.status === 'revoked' ? 'Revoked' : 'Issued',
        Icon: e.certificate.status === 'revoked' ? Ban : ShieldCheck,
        tint:
          e.certificate.status === 'revoked'
            ? 'bg-red-600/10 text-red-700'
            : 'bg-gold-500/15 text-gold-700',
      });
    }
  }

  return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

function Timeline({ events }: { events: TimelineEvent[] }) {
  return (
    <ol className="relative space-y-0 px-5 py-4">
      {events.map((e, i) => (
        <motion.li
          key={`${e.at}-${e.title}-${i}`}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, ease: EASE_LUXE, delay: i * 0.04 }}
          className="relative flex gap-3.5 pb-5 last:pb-0"
        >
          {/* Connector — stops at the last item so the line doesn't dangle. */}
          {i < events.length - 1 && (
            <span aria-hidden="true" className="absolute left-[13px] top-8 h-[calc(100%-1rem)] w-px bg-slate-400/20" />
          )}
          <span className={cn('relative z-[1] grid size-7 shrink-0 place-items-center rounded-full', e.tint)}>
            <e.Icon className="size-3.5" />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="font-sans text-[0.875rem] leading-snug text-slate-900">{e.title}</p>
            <p className="mt-0.5 font-sans text-[0.75rem] text-slate-500">
              {fmt(e.at)}{e.detail ? ` · ${e.detail}` : ''}
            </p>
          </div>
        </motion.li>
      ))}
    </ol>
  );
}

/* ── Enrolment row ────────────────────────────────────────────────────── */

function EnrollmentCard({ enrollment, studentId }: { enrollment: EnrollmentDetail; studentId: string }) {
  const qc = useQueryClient();
  const toast = useToast();
  const { can } = useAuth();
  const { confirm, dialog } = useConfirm();
  const { copied, copy } = useCopy();
  const [qrFor, setQrFor] = useState<string | null>(null);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['enrollments', studentId] });
    void qc.invalidateQueries({ queryKey: ['overview'] });
    void qc.invalidateQueries({ queryKey: ['certificates'] });
    void qc.invalidateQueries({ queryKey: ['intake-stats'] });
    void qc.invalidateQueries({ queryKey: ['activity'] });
  };

  const complete = useMutation({
    mutationFn: () => setEnrollmentStatus(enrollment.id, 'completed'),
    onSuccess: () => { refresh(); toast.success('Marked as completed', 'A certificate can now be issued.'); },
    onError: (e) => toast.error('Could not update', readableError(e)),
  });

  const withdraw = useMutation({
    mutationFn: () => setEnrollmentStatus(enrollment.id, 'withdrawn'),
    onSuccess: () => { refresh(); toast.success('Enrolment withdrawn'); },
    onError: (e) => toast.error('Could not update', readableError(e)),
  });

  const issue = useMutation({
    mutationFn: () => issueCertificate(enrollment.id),
    onSuccess: (res) => {
      refresh();
      setQrFor(res.verify_url);
      toast.success(`Certificate ${res.certificate_no} issued`, 'The PDF is ready to download.');
      res.warnings?.forEach((w) => toast.info('Certificate rendered with a fallback', w));
    },
    onError: (e) => toast.error('Could not issue certificate', readableError(e)),
  });

  const revoke = useMutation({
    mutationFn: (reason: string) => revokeCertificate(enrollment.certificate!.id, reason),
    onSuccess: () => { refresh(); toast.success('Certificate revoked'); },
    onError: (e) => toast.error('Could not revoke', readableError(e)),
  });

  const download = async () => {
    const path = enrollment.certificate?.pdf_path;
    if (!path) return;
    const url = await certificatePdfUrl(path);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
    else toast.error('Could not open the PDF');
  };

  const askRevoke = async () => {
    const reason = await confirm({
      title: 'Revoke this certificate?',
      body: (
        <>
          <strong className="font-medium text-slate-900">{enrollment.certificate?.certificate_no}</strong>{' '}
          will be marked revoked. Its QR keeps resolving and will report it as revoked.
        </>
      ),
      confirmLabel: 'Revoke certificate',
      reasonLabel: 'Reason (recorded permanently)',
    });
    if (reason !== null) revoke.mutate(reason);
  };

  const cert = enrollment.certificate;
  const verifyUrl = cert ? `${site.url}/verify/${(cert as { verify_token?: string }).verify_token ?? ''}` : '';

  return (
    <div className="border-b border-slate-200/10 p-4 last:border-0 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-sans text-[0.875rem] font-semibold leading-snug text-slate-900">
            {enrollment.intake.course.title}
          </p>
          <p className="mt-0.5 font-sans text-[0.75rem] text-slate-500 tabular-nums">
            {enrollment.intake.code} · {fmt(enrollment.intake.starts_on)} — {fmt(enrollment.intake.ends_on)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={enrollment.status} dot>{enrollment.status}</Badge>
          {can('admin', 'registrar') && enrollment.status === 'enrolled' && (
            <ActionMenu
              label="Enrolment actions"
              items={[
                { label: 'Mark completed', Icon: GraduationCap, onSelect: () => complete.mutate() },
                { label: 'Withdraw', Icon: Trash2, tone: 'danger', separatorBefore: true, onSelect: () => withdraw.mutate() },
              ]}
            />
          )}
        </div>
      </div>

      {cert ? (
        <div
          className={cn(
            'mt-3.5 rounded-lg p-3.5 ring-1',
            cert.status === 'valid'
              ? 'bg-emerald-600/[0.05] ring-emerald-600/20'
              : 'bg-red-600/[0.05] ring-red-600/20',
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="flex items-center gap-2.5">
              {cert.status === 'valid'
                ? <Award className="size-4 shrink-0 text-emerald-700" />
                : <Ban className="size-4 shrink-0 text-red-700" />}
              <span className="font-sans text-[0.875rem] text-slate-900 tabular-nums">
                {cert.certificate_no}
              </span>
              <Badge tone={cert.status === 'valid' ? 'valid' : 'revoked'}>{cert.status}</Badge>
            </span>

            <span className="flex flex-wrap gap-2">
              {verifyUrl && (
                <AdminButton size="sm" Icon={QrCode} onClick={() => setQrFor(verifyUrl)}>QR</AdminButton>
              )}
              {cert.pdf_path && (
                <AdminButton size="sm" Icon={Download} onClick={() => void download()}>PDF</AdminButton>
              )}
              {can('admin') && cert.status === 'valid' && (
                <AdminButton size="sm" variant="ghost" Icon={Ban} onClick={() => void askRevoke()}>
                  Revoke
                </AdminButton>
              )}
            </span>
          </div>
        </div>
      ) : enrollment.status === 'completed' ? (
        can('admin', 'registrar') && (
          <div className="mt-3.5">
            <AdminButton
              variant="primary"
              size="sm"
              Icon={Award}
              disabled={issue.isPending}
              onClick={() => issue.mutate()}
            >
              {issue.isPending ? 'Generating certificate…' : 'Issue certificate'}
            </AdminButton>
          </div>
        )
      ) : enrollment.status === 'enrolled' ? (
        can('admin', 'registrar') && (
          <div className="mt-4">
            <AdminButton size="sm" Icon={GraduationCap} disabled={complete.isPending} onClick={() => complete.mutate()}>
              {complete.isPending ? 'Saving…' : 'Mark as completed'}
            </AdminButton>
            <p className="mt-2 font-sans text-[0.75rem] text-slate-500">
              A certificate can only be issued once the enrolment is complete.
            </p>
          </div>
        )
      ) : null}

      {/* QR modal */}
      <Modal
        open={qrFor !== null}
        onClose={() => setQrFor(null)}
        title="Verification QR"
        description="This is the code printed on the certificate."
        size="sm"
        footer={
          <AdminButton
            Icon={copied ? Check : Copy}
            onClick={() => { copy(qrFor ?? ''); toast.success('Link copied'); }}
          >
            {copied ? 'Copied' : 'Copy link'}
          </AdminButton>
        }
      >
        {qrFor && (
          <div className="flex flex-col items-center py-2">
            <QrPreview value={qrFor} size={200} />
            <a
              href={qrFor}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 font-sans text-[0.8125rem] text-gold-700 underline underline-offset-4"
            >
              <ExternalLink className="size-3.5" /> Open verification page
            </a>
          </div>
        )}
      </Modal>

      {dialog}
    </div>
  );
}

/* ── Enrol panel ──────────────────────────────────────────────────────── */

function EnrollPanel({ studentId, existing }: { studentId: string; existing: EnrollmentDetail[] }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [intakeId, setIntakeId] = useState('');

  const intakes = useQuery({ queryKey: ['intakes'], queryFn: fetchIntakes });

  const enrol = useMutation({
    mutationFn: () => enrollStudent(studentId, intakeId),
    onSuccess: () => {
      setIntakeId('');
      void qc.invalidateQueries({ queryKey: ['enrollments', studentId] });
      void qc.invalidateQueries({ queryKey: ['overview'] });
      void qc.invalidateQueries({ queryKey: ['intake-stats'] });
      toast.success('Student enrolled');
    },
    onError: (e) => toast.error('Could not enrol', readableError(e)),
  });

  const taken = new Set(existing.map((e) => e.intake_id));
  const available = (intakes.data ?? []).filter((i) => !taken.has(i.id) && i.status !== 'cancelled');

  return (
    <div className="border-t border-slate-200/10 bg-slate-50/50 p-4 sm:p-5">
      <label htmlFor="intake" className="mb-2 block font-sans text-[0.75rem] font-medium text-slate-600">
        Enrol into an intake
      </label>

      {intakes.isLoading ? (
        <Skeleton className="h-9 w-full max-w-md" />
      ) : !available.length ? (
        <p className="font-sans text-[0.8125rem] text-slate-500">
          No available intakes.{' '}
          <Link to="/admin/intakes?new=1" className="text-gold-700 underline underline-offset-4">
            Create one
          </Link>.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2.5">
          <select
            id="intake"
            value={intakeId}
            onChange={(e) => setIntakeId(e.target.value)}
            className={cn(inputClass, 'h-9 max-w-md flex-1 appearance-none py-0 text-[0.875rem]')}
          >
            <option value="">Select an intake…</option>
            {available.map((i) => (
              <option key={i.id} value={i.id}>
                {i.code} — {i.course.title} ({fmt(i.starts_on)})
              </option>
            ))}
          </select>
          <AdminButton
            variant="primary"
            Icon={Plus}
            disabled={!intakeId || enrol.isPending}
            onClick={() => enrol.mutate()}
          >
            {enrol.isPending ? 'Enrolling…' : 'Enrol'}
          </AdminButton>
        </div>
      )}
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────── */

export default function StudentDetail() {
  const { id = '' } = useParams<{ id: string }>();
  const { can } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();
  const { confirm, dialog } = useConfirm();
  const photoRef = useRef<HTMLInputElement>(null);

  const student = useQuery({ queryKey: ['student', id], queryFn: () => fetchStudent(id) });
  const enrollments = useQuery({
    queryKey: ['enrollments', id],
    queryFn: () => fetchStudentEnrollments(id),
  });

  const upload = useMutation({
    mutationFn: (file: File) => uploadStudentPhoto(id, file),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['student', id] });
      void qc.invalidateQueries({ queryKey: ['students'] });
      toast.success('Photo updated');
    },
    onError: (e) => toast.error('Upload failed', readableError(e)),
  });

  const remove = useMutation({
    mutationFn: () => deleteStudent(id),
    onSuccess: () => { toast.success('Student deleted'); navigate('/admin/students'); },
    onError: (e) =>
      toast.error(
        'Could not delete',
        friendlyDeleteError(readableError(e)),
      ),
  });

  const { copied: copiedNo, copy: copyNo } = useCopy();

  const timeline = useMemo(
    () => (student.data ? buildTimeline(student.data.created_at, enrollments.data ?? []) : []),
    [student.data, enrollments.data],
  );

  if (student.isLoading) {
    return (
      <>
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-6 h-10 w-72" />
        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl lg:col-span-2" />
        </div>
      </>
    );
  }

  if (student.isError) return <ErrorNote message={readableError(student.error)} retry={() => void student.refetch()} />;
  if (!student.data) return <ErrorNote message="Student not found." />;

  const s = student.data;
  const photo = publicFileUrl('student-photos', s.photo_path);
  const certs = (enrollments.data ?? []).filter((e) => e.certificate);
  const completed = (enrollments.data ?? []).filter((e) => e.status === 'completed').length;
  const totalEnrol = (enrollments.data ?? []).length;

  const askDelete = async () => {
    const ok = await confirm({
      title: 'Delete this student?',
      body: (
        <>
          <strong className="font-medium text-slate-900">{s.first_name} {s.last_name}</strong> and
          their enrolment history will be removed. This cannot be undone.
        </>
      ),
      confirmLabel: 'Delete student',
      typeToConfirm: s.student_no,
    });
    if (ok !== null) remove.mutate();
  };

  const statusBadge = certs.some((c) => c.certificate?.status === 'valid') ? (
    <Badge tone="graduate" dot>Graduate</Badge>
  ) : (enrollments.data ?? []).some((e) => e.status === 'enrolled') ? (
    <Badge tone="enrolled" dot>Enrolled</Badge>
  ) : (
    <Badge tone="neutral">Registered</Badge>
  );

  /* Contact facts read as one row of label/value pairs rather than three
     full-width rows in a card of their own: same information, a third of the
     height, and sitting beside the name it belongs to. */
  const facts: Array<{ Icon: typeof Phone; label: string; value: string | null }> = [
    { Icon: Phone, label: 'Phone', value: s.phone },
    { Icon: Mail, label: 'Email', value: s.email },
    // Masked for non-admins: a registrar has no reason to read it, and an RLS
    // policy cannot mask a single column.
    { Icon: IdCard, label: 'National ID', value: can('admin') ? s.national_id : '••••••' },
    { Icon: CalendarDays, label: 'Registered', value: fmt(s.created_at) },
  ];

  return (
    <>
      <Link
        to="/admin/students"
        className="mb-3 inline-flex items-center gap-1.5 font-sans text-[0.8125rem] text-slate-500 transition-colors hover:text-slate-900"
      >
        <ArrowLeft className="size-3.5" /> All students
      </Link>

      {/* ── Identity header ───────────────────────────────────────────────
          The name used to be set at 40px display serif in a PageHeader AND
          repeated at 15px inside the profile card directly beneath it: one
          record, two names, and a headline the size of a magazine cover on a
          screen whose job is data entry. This is the record's masthead —
          photo, name, number, status and every contact fact in one band. */}
      <div className={cn('mb-4 overflow-hidden rounded-xl bg-white', HAIRLINE, ELEVATION.raised)}>
        <div
          aria-hidden="true"
          className="h-14 sm:h-16"
          style={{ background: 'linear-gradient(115deg, #18181b 0%, #27272a 55%, #3f3f46 100%)' }}
        />

        <div className="px-4 pb-4 sm:px-5 sm:pb-5">
          {/* Only the AVATAR overlaps the banner. Pulling the whole block up
              put the name — near-black type — on top of the dark gradient,
              where it was invisible. The photo is the only element that can
              cross that boundary, because it carries its own white ring. */}
          {/* Row at every width. Stacking it on a phone dropped the actions
              menu onto its own line, left-aligned under the badge, where it
              read as an orphaned control rather than the record's menu. */}
          <div className="flex items-start justify-between gap-3 sm:gap-5">
            <div className="flex min-w-0 items-start gap-3.5">
              <div className="relative -mt-9 shrink-0 sm:-mt-10">
                <span className="block rounded-full ring-4 ring-white">
                  <Avatar name={`${s.first_name} ${s.last_name}`} src={photo} size="lg" />
                </span>
                {can('admin', 'registrar') && (
                  <>
                    <button
                      type="button"
                      onClick={() => photoRef.current?.click()}
                      aria-label="Change photo"
                      className="absolute -bottom-0.5 -right-0.5 grid size-6 place-items-center rounded-full bg-slate-900 text-white ring-2 ring-white transition-colors hover:bg-slate-800"
                    >
                      <Camera className="size-3" />
                    </button>
                    <input
                      ref={photoRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && upload.mutate(e.target.files[0])}
                    />
                  </>
                )}
              </div>

              <div className="min-w-0 pt-1.5">
                <h1 className="truncate font-sans text-[1.25rem] font-semibold leading-tight tracking-[-0.02em] text-slate-900 sm:text-[1.375rem]">
                  {s.first_name} {s.last_name}
                </h1>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => copyNo(s.student_no)}
                    aria-label={`Copy student number ${s.student_no}`}
                    className="inline-flex items-center gap-1.5 font-sans text-[0.8125rem] text-slate-500 tabular-nums transition-colors hover:text-slate-900"
                  >
                    {s.student_no}
                    {copiedNo
                      ? <Check className="size-3 text-emerald-600" />
                      : <Copy className="size-3 opacity-50" />}
                  </button>
                  {statusBadge}
                </div>
                {upload.isPending && (
                  <p className="mt-1 font-sans text-[0.75rem] text-gold-700">Uploading…</p>
                )}
              </div>
            </div>

            {can('admin') && (
              <div className="shrink-0">
                <ActionMenu
                  label="Student actions"
                  items={[{ label: 'Delete student', Icon: Trash2, tone: 'danger', onSelect: () => void askDelete() }]}
                />
              </div>
            )}
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 border-t border-[rgba(9,9,11,0.07)] pt-3.5 sm:grid-cols-4">
            {facts.map((f) => (
              <div key={f.label} className="min-w-0">
                <dt className="flex items-center gap-1.5 font-sans text-[0.6875rem] uppercase tracking-[0.12em] text-slate-500">
                  <f.Icon className="size-3 shrink-0" aria-hidden="true" />
                  {f.label}
                </dt>
                <dd className="mt-0.5 truncate font-sans text-[0.8125rem] text-slate-900">
                  {f.value || <span className="text-slate-400">—</span>}
                </dd>
              </div>
            ))}
          </dl>

          {s.notes && (
            <div className="mt-3.5 rounded-lg bg-slate-50 p-3 ring-1 ring-slate-300/10">
              <p className="font-sans text-[0.6875rem] uppercase tracking-[0.12em] text-slate-500">Notes</p>
              <p className="mt-1 font-sans text-[0.8125rem] leading-relaxed text-slate-700">{s.notes}</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Profile */}
        <div className="space-y-4">
          {/* Progress summary */}
          <Panel title="Progress">
            <div className="space-y-4 p-5">
              <div>
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className="font-sans text-[0.75rem] text-slate-500">Programmes completed</span>
                  <span className="font-sans text-[0.8125rem] text-slate-900 tabular-nums">
                    {completed} / {totalEnrol || 0}
                  </span>
                </div>
                <ProgressBar value={completed} max={Math.max(1, totalEnrol)} tone="emerald" />
              </div>
              <div className="flex items-center justify-between border-t border-slate-200/10 pt-4">
                <span className="font-sans text-[0.8125rem] text-slate-500">Certificates held</span>
                <span className="font-sans text-[1.125rem] font-medium text-slate-900 tabular-nums">
                  {certs.filter((c) => c.certificate?.status === 'valid').length}
                </span>
              </div>
            </div>
          </Panel>

          <Panel title="Timeline">
            {enrollments.isLoading ? <TableSkeleton rows={3} cols={2} /> : <Timeline events={timeline} />}
          </Panel>
        </div>

        {/* Enrolments */}
        <div className="space-y-4 lg:col-span-2">
          <StudentFinance studentId={id} enrollments={enrollments.data ?? []} />

          <Panel title="Enrolments & certificates" description="Issue a certificate from a completed enrolment.">
            {enrollments.isLoading ? (
              <TableSkeleton rows={3} cols={3} />
            ) : enrollments.isError ? (
              <div className="p-5">
                <ErrorNote message={readableError(enrollments.error)} retry={() => void enrollments.refetch()} />
              </div>
            ) : !enrollments.data?.length ? (
              <EmptyState
                Icon={GraduationCap}
                title="Not enrolled yet"
                body="Assign this student to an intake to begin tracking their progress."
              />
            ) : (
              enrollments.data.map((e) => <EnrollmentCard key={e.id} enrollment={e} studentId={id} />)
            )}

            {can('admin', 'registrar') && (
              <EnrollPanel studentId={id} existing={enrollments.data ?? []} />
            )}
          </Panel>
        </div>
      </div>

      {dialog}
    </>
  );
}

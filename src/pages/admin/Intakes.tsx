import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import {
  CalendarRange, Plus, Users, GraduationCap, Award, Pencil, Trash2, LayoutGrid, List,
} from 'lucide-react';
import {
  fetchIntakes, fetchCourses, createIntake, updateIntake, deleteIntake,
} from '@/features/admin/api';
import { fetchIntakeStats } from '@/features/admin/analytics';
import { applyPendingFees } from '@/features/admin/finance';
import {
  PageHeader, Panel, Badge, Toolbar, SearchInput, SelectFilter, EmptyState, ErrorNote,
  CardSkeleton, Field, inputClass, inputErrorClass, ProgressBar, Table, Th, Td, Tr,
} from '@/components/admin/AdminUI';
import { ActionMenu, AdminButton } from '@/components/admin/Menu';
import { Modal, useConfirm } from '@/components/admin/Overlay';
import { useToast } from '@/components/admin/Toast';
import { useAuth } from '@/features/auth/AuthProvider';
import { readableError } from '@/lib/supabase';
import { EASE_LUXE } from '@/lib/motion';
import type { IntakeWithCourse, IntakeStatus } from '@/lib/db.types';
import { cn } from '@/lib/utils';

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const schema = z.object({
  course_id: z.string().uuid('Choose a course.'),
  code: z.string().trim().min(3, 'At least 3 characters.').max(24),
  starts_on: z.string().min(1, 'Required.'),
  ends_on: z.string().optional(),
  capacity: z.string().optional(),
  // A string, not a coerced number: '' has to survive as "inherit the course
  // price". z.coerce.number() turns '' into 0, which would silently make every
  // cohort free.
  fee_kes: z.string().optional(),
  status: z.enum(['planned', 'running', 'completed', 'cancelled']),
});
type Values = z.infer<typeof schema>;

/* ── Create / edit ────────────────────────────────────────────────────── */

function IntakeModal({
  open, onClose, editing,
}: {
  open: boolean;
  onClose: () => void;
  editing: IntakeWithCourse | null;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const courses = useQuery({ queryKey: ['courses'], queryFn: fetchCourses });

  const {
    register, handleSubmit, reset, watch, formState: { errors, isDirty },
  } = useForm<Values>({ resolver: zodResolver(schema), mode: 'onBlur' });

  /* Shown as the placeholder and in the hint so the operator can see what a
     blank fee will actually charge. "Leave blank to inherit" is only useful if
     you can see what you are inheriting. */
  const selectedCourse = watch('course_id');
  const courseFee =
    (courses.data ?? []).find((c) => c.id === selectedCourse)?.fee_kes ?? null;

  useEffect(() => {
    if (!open) return;
    reset(
      editing
        ? {
            course_id: editing.course_id, code: editing.code,
            starts_on: editing.starts_on, ends_on: editing.ends_on ?? '',
            capacity: editing.capacity?.toString() ?? '',
            fee_kes: editing.fee_kes === null || editing.fee_kes === undefined
              ? '' : String(editing.fee_kes),
            status: editing.status,
          }
        : {
            course_id: '', code: '', starts_on: '', ends_on: '',
            capacity: '', fee_kes: '', status: 'planned',
          },
    );
  }, [open, editing, reset]);

  const save = useMutation({
    mutationFn: async (v: Values) => {
      const payload = {
        course_id: v.course_id,
        code: v.code.trim().toUpperCase(),
        starts_on: v.starts_on,
        ends_on: v.ends_on || null,
        capacity: v.capacity ? Number(v.capacity) : null,
        // '' → null → inherit the course price. An explicit 0 makes the cohort
        // free, which is a real thing a school does for a taster or a sponsored
        // group, so it must not collapse into "unset".
        fee_kes: (v.fee_kes ?? '').trim() === '' ? null : Number(v.fee_kes),
        status: v.status as IntakeStatus,
      };
      const intake = editing
        ? await updateIntake(editing.id, payload)
        : await createIntake(payload);

      // Back-fill enrolments created before this cohort had a price. Safe by
      // construction: only unpriced enrolments with no payments are touched.
      let repriced = 0;
      if (payload.fee_kes !== null && payload.fee_kes > 0) {
        repriced = await applyPendingFees({ intakeId: (intake as { id: string }).id })
          .catch(() => 0);
      }
      return { intake, repriced };
    },
    onSuccess: ({ repriced }) => {
      void qc.invalidateQueries({ queryKey: ['intakes'] });
      void qc.invalidateQueries({ queryKey: ['overview'] });
      void qc.invalidateQueries({ queryKey: ['finance-stats'] });
      void qc.invalidateQueries({ queryKey: ['student-finance'] });
      toast.success(
        editing ? 'Intake updated' : 'Intake created',
        repriced > 0
          ? `${repriced} unpriced enrolment${repriced === 1 ? '' : 's'} now billed at this fee.`
          : undefined,
      );
      onClose();
    },
    onError: (e) => toast.error('Could not save', readableError(e)),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit intake' : 'Create an intake'}
      description="Students are enrolled into an intake, not directly into a course."
      dirty={isDirty}
      footer={
        <>
          <AdminButton variant="ghost" onClick={onClose}>Cancel</AdminButton>
          <AdminButton
            variant="primary"
            disabled={save.isPending}
            onClick={() => void handleSubmit((v) => save.mutate(v))()}
          >
            {save.isPending ? 'Saving…' : editing ? 'Save changes' : 'Create intake'}
          </AdminButton>
        </>
      }
    >
      <form onSubmit={handleSubmit((v) => save.mutate(v))} noValidate className="space-y-4">
        <Field label="Course" htmlFor="course_id" error={errors.course_id?.message}>
          <select id="course_id" className={cn(inputClass, 'appearance-none', errors.course_id && inputErrorClass)} {...register('course_id')}>
            <option value="">Select a course…</option>
            {(courses.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Intake code" htmlFor="code" hint="e.g. BAR-2026-01" error={errors.code?.message}>
            <input id="code" className={cn(inputClass, 'uppercase', errors.code && inputErrorClass)} {...register('code')} />
          </Field>
          <Field label="Status" htmlFor="status">
            <select id="status" className={cn(inputClass, 'appearance-none')} {...register('status')}>
              {['planned', 'running', 'completed', 'cancelled'].map((s) => (
                <option key={s} value={s} className="capitalize">{s}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Starts" htmlFor="starts_on" error={errors.starts_on?.message}>
            <input id="starts_on" type="date" className={cn(inputClass, errors.starts_on && inputErrorClass)} {...register('starts_on')} />
          </Field>
          <Field label="Ends" htmlFor="ends_on" optional>
            <input id="ends_on" type="date" className={inputClass} {...register('ends_on')} />
          </Field>
          <Field label="Capacity" htmlFor="capacity" optional>
            <input id="capacity" type="number" min={1} className={inputClass} {...register('capacity')} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Fee for this cohort (KES)" htmlFor="fee_kes" optional
            hint={
              courseFee !== null && courseFee > 0
                ? `Leave blank to charge the course price of ${courseFee.toLocaleString('en-KE')}.`
                : 'Leave blank to use the course price.'
            }
          >
            <input
              id="fee_kes" type="number" min={0} step={500}
              placeholder={courseFee ? String(courseFee) : 'Course price'}
              className={cn(inputClass, 'tabular-nums')}
              {...register('fee_kes')}
            />
          </Field>
        </div>
      </form>
    </Modal>
  );
}

/* ── Card ─────────────────────────────────────────────────────────────── */

function IntakeCard({
  intake, stats, index, onEdit, onDelete, canManage,
}: {
  intake: IntakeWithCourse;
  stats?: { enrolled: number; completed: number; withdrawn: number; certificates: number };
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  canManage: boolean;
}) {
  const enrolled = stats?.enrolled ?? 0;
  const completed = stats?.completed ?? 0;
  const certificates = stats?.certificates ?? 0;
  const totalStudents = enrolled + completed + (stats?.withdrawn ?? 0);
  const gradRate = completed + enrolled > 0
    ? Math.round((completed / (completed + enrolled)) * 100)
    : 0;

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE_LUXE, delay: index * 0.04 }}
      className="flex flex-col rounded-xl bg-slate-50 p-5 ring-1 ring-slate-300/12 transition-shadow duration-300 hover:shadow-[0_2px_4px_rgba(9,9,11,0.03),0_12px_24px_-8px_rgba(26,22,20,0.1)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-sans text-[0.8125rem] font-medium text-slate-900 tabular-nums">
            {intake.code}
          </p>
          <p className="mt-0.5 truncate font-sans text-[0.8125rem] text-slate-500">
            {intake.course.title}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Badge tone={intake.status} dot>{intake.status}</Badge>
          {canManage && (
            <ActionMenu
              label={`Actions for ${intake.code}`}
              items={[
                { label: 'Edit intake', Icon: Pencil, onSelect: onEdit },
                { label: 'Delete intake', Icon: Trash2, tone: 'danger', separatorBefore: true, onSelect: onDelete },
              ]}
            />
          )}
        </div>
      </div>

      <p className="mt-3 font-sans text-[0.75rem] text-slate-500 tabular-nums">
        {fmt(intake.starts_on)} — {fmt(intake.ends_on)}
      </p>

      {/* Capacity */}
      <div className="mt-5">
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="font-sans text-[0.75rem] text-slate-500">Capacity</span>
          <span className="font-sans text-[0.8125rem] text-slate-900 tabular-nums">
            {totalStudents}{intake.capacity ? ` / ${intake.capacity}` : ''}
          </span>
        </div>
        <ProgressBar value={totalStudents} max={intake.capacity ?? Math.max(1, totalStudents)} />
      </div>

      {/* Graduation */}
      <div className="mt-4">
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="font-sans text-[0.75rem] text-slate-500">Graduation</span>
          <span className="font-sans text-[0.8125rem] text-slate-900 tabular-nums">{gradRate}%</span>
        </div>
        <ProgressBar value={gradRate} max={100} tone="emerald" />
      </div>

      <dl className="mt-5 grid grid-cols-3 gap-2 border-t border-slate-200/10 pt-4">
        {[
          { label: 'Active', value: enrolled, Icon: Users },
          { label: 'Completed', value: completed, Icon: GraduationCap },
          { label: 'Certified', value: certificates, Icon: Award },
        ].map((m) => (
          <div key={m.label}>
            <dt className="flex items-center gap-1 font-sans text-[0.6875rem] text-slate-500">
              <m.Icon className="size-3" /> {m.label}
            </dt>
            <dd className="mt-0.5 font-sans text-[1.125rem] font-medium text-slate-900 tabular-nums">
              {m.value}
            </dd>
          </div>
        ))}
      </dl>
    </motion.article>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────── */

export default function Intakes() {
  const { can } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [params, setParams] = useSearchParams();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | IntakeStatus>('all');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [editing, setEditing] = useState<IntakeWithCourse | null>(null);
  const [open, setOpen] = useState(false);

  const intakes = useQuery({ queryKey: ['intakes'], queryFn: fetchIntakes });
  const stats = useQuery({ queryKey: ['intake-stats'], queryFn: fetchIntakeStats });

  useEffect(() => {
    if (params.get('new') === '1') {
      setEditing(null); setOpen(true);
      params.delete('new'); setParams(params, { replace: true });
    }
  }, [params, setParams]);

  const remove = useMutation({
    mutationFn: (id: string) => deleteIntake(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['intakes'] });
      void qc.invalidateQueries({ queryKey: ['overview'] });
      toast.success('Intake deleted');
    },
    onError: (e) =>
      toast.error(
        'Could not delete',
        /violates foreign key/i.test(readableError(e))
          ? 'Students are enrolled in this intake. Move or withdraw them first.'
          : readableError(e),
      ),
  });

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (intakes.data ?? []).filter(
      (i) =>
        (status === 'all' || i.status === status) &&
        (!term || i.code.toLowerCase().includes(term) || i.course.title.toLowerCase().includes(term)),
    );
  }, [intakes.data, search, status]);

  const isFiltered = Boolean(search.trim()) || status !== 'all';

  const askDelete = async (i: IntakeWithCourse) => {
    const ok = await confirm({
      title: 'Delete this intake?',
      body: (
        <>
          <strong className="font-medium text-slate-900">{i.code}</strong> will be removed. If any
          students are enrolled in it, the database will refuse — withdraw or move them first.
        </>
      ),
      confirmLabel: 'Delete intake',
    });
    if (ok !== null) remove.mutate(i.id);
  };

  return (
    <>
      <PageHeader
        eyebrow="Scheduling"
        title="Intakes"
        subtitle={intakes.isLoading ? 'Loading…' : `${rows.length} cohort${rows.length === 1 ? '' : 's'}`}
        actions={
          <>
            <div className="flex rounded-md ring-1 ring-slate-300/20">
              {([['grid', LayoutGrid], ['list', List]] as const).map(([v, Icon]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  aria-label={`${v} view`}
                  aria-pressed={view === v}
                  className={cn(
                    'grid size-9 place-items-center transition-colors first:rounded-l-md last:rounded-r-md',
                    view === v ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50',
                  )}
                >
                  <Icon className="size-3.5" />
                </button>
              ))}
            </div>
            {can('admin', 'registrar') && (
              <AdminButton variant="primary" Icon={Plus} onClick={() => { setEditing(null); setOpen(true); }}>
                New intake
              </AdminButton>
            )}
          </>
        }
      />

      <Toolbar>
        <SearchInput id="intake-search" value={search} onChange={setSearch} placeholder="Search code or course" />
        <SelectFilter
          id="intake-status" label="Status" value={status} onChange={setStatus}
          options={[
            { value: 'all', label: 'All statuses' },
            { value: 'planned', label: 'Planned' },
            { value: 'running', label: 'Running' },
            { value: 'completed', label: 'Completed' },
            { value: 'cancelled', label: 'Cancelled' },
          ]}
        />
      </Toolbar>

      {intakes.isError ? (
        <ErrorNote message={readableError(intakes.error)} retry={() => void intakes.refetch()} />
      ) : intakes.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <CardSkeleton count={6} />
        </div>
      ) : !rows.length ? (
        <Panel>
          <EmptyState
            Icon={CalendarRange}
            title={isFiltered ? 'No matching intakes' : 'No intakes yet'}
            body={
              isFiltered
                ? 'Try a different search, or clear the status filter.'
                : 'An intake is a cohort — a course with a start date. Students are enrolled into intakes, so create one before registering enrolments.'
            }
            action={
              isFiltered ? (
                <AdminButton onClick={() => { setSearch(''); setStatus('all'); }}>Clear filters</AdminButton>
              ) : can('admin', 'registrar') ? (
                <AdminButton variant="primary" Icon={Plus} onClick={() => { setEditing(null); setOpen(true); }}>
                  Create the first intake
                </AdminButton>
              ) : undefined
            }
          />
        </Panel>
      ) : view === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((i, idx) => (
            <IntakeCard
              key={i.id}
              intake={i}
              index={idx}
              stats={stats.data?.get(i.id)}
              canManage={can('admin', 'registrar')}
              onEdit={() => { setEditing(i); setOpen(true); }}
              onDelete={() => void askDelete(i)}
            />
          ))}
        </div>
      ) : (
        <Panel>
          <Table minWidth="54rem">
            <thead>
              <tr>
                <Th>Code</Th><Th>Course</Th><Th>Dates</Th>
                <Th>Students</Th><Th>Graduation</Th><Th>Status</Th><Th className="w-px" />
              </tr>
            </thead>
            <tbody>
              {rows.map((i) => {
                const s = stats.data?.get(i.id);
                const enrolled = s?.enrolled ?? 0;
                const completed = s?.completed ?? 0;
                const rate = completed + enrolled > 0 ? Math.round((completed / (completed + enrolled)) * 100) : 0;
                return (
                  <Tr key={i.id}>
                    <Td className="font-medium text-slate-900 tabular-nums">{i.code}</Td>
                    <Td>{i.course.title}</Td>
                    <Td className="tabular-nums">{fmt(i.starts_on)} — {fmt(i.ends_on)}</Td>
                    <Td className="tabular-nums">
                      {enrolled + completed + (s?.withdrawn ?? 0)}{i.capacity ? ` / ${i.capacity}` : ''}
                    </Td>
                    <Td className="tabular-nums">{rate}%</Td>
                    <Td><Badge tone={i.status} dot>{i.status}</Badge></Td>
                    <Td>
                      {can('admin', 'registrar') && (
                        <ActionMenu
                          label={`Actions for ${i.code}`}
                          items={[
                            { label: 'Edit intake', Icon: Pencil, onSelect: () => { setEditing(i); setOpen(true); } },
                            { label: 'Delete intake', Icon: Trash2, tone: 'danger', separatorBefore: true, onSelect: () => void askDelete(i) },
                          ]}
                        />
                      )}
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        </Panel>
      )}

      <IntakeModal open={open} onClose={() => setOpen(false)} editing={editing} />
      {dialog}
    </>
  );
}

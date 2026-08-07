import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { BookOpen, Plus, Pencil, Trash2, EyeOff, Eye } from 'lucide-react';
import {
  fetchCoursesAdmin, createCourse, updateCourse, deleteCourse, slugify, kes,
  applyPendingFees, type CourseRow, type CourseInput,
} from '@/features/admin/finance';
import {
  PageHeader, Panel, Table, Th, Td, Tr, Badge, EmptyState, ErrorNote,
  TableSkeleton, Field, inputClass, inputErrorClass, MobileList, MobileRow,
} from '@/components/admin/AdminUI';
import { ActionMenu, AdminButton } from '@/components/admin/Menu';
import { Modal, useConfirm } from '@/components/admin/Overlay';
import { useToast } from '@/components/admin/Toast';
import { useAuth } from '@/features/auth/AuthProvider';
import { readableError } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const schema = z.object({
  title: z.string().trim().min(3, 'Give the programme a name.').max(120),
  duration: z.string().trim().min(1, 'How long does it run?').max(60),
  level: z.string().trim().min(1, 'Required.').max(40),
  certification: z.string().trim().min(1, 'Required.').max(120),
  fee_kes: z.coerce
    .number({ invalid_type_error: 'Enter an amount.' })
    .min(0, 'A fee cannot be negative.')
    .max(9_999_999, 'That looks like a typo.'),
  active: z.boolean(),
});
type Values = z.infer<typeof schema>;

const LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'All levels'];

function CourseModal({
  open, onClose, editing,
}: {
  open: boolean;
  onClose: () => void;
  editing: CourseRow | null;
}) {
  const qc = useQueryClient();
  const toast = useToast();

  const {
    register, handleSubmit, reset, watch, setValue,
    formState: { errors, isDirty },
  } = useForm<Values>({ resolver: zodResolver(schema), mode: 'onBlur' });

  useEffect(() => {
    if (!open) return;
    reset(
      editing
        ? {
            title: editing.title, duration: editing.duration, level: editing.level,
            certification: editing.certification, fee_kes: editing.fee_kes,
            active: editing.active,
          }
        : {
            title: '', duration: '', level: 'Beginner',
            certification: 'Certificate of Completion', fee_kes: 0, active: true,
          },
    );
  }, [open, editing, reset]);

  const title = watch('title');
  const active = watch('active');

  const save = useMutation({
    mutationFn: async (v: Values) => {
      const course = editing
        ? await updateCourse(editing.id, v)
        : await createCourse(v as CourseInput);

      /* A school registers students in week one and agrees the price in week
         two. The insert trigger has already run by then, so those enrolments
         sit unpriced forever unless something back-fills them. Only enrolments
         with no fee AND no payments are touched, so a negotiated figure or a
         live account is never disturbed. */
      let repriced = 0;
      if (v.fee_kes > 0) {
        /* Deliberately NOT swallowed. This used to be `.catch(() => 0)`,
           which turned a failed re-price into a silent no-op — the fee
           saved, no enrolment updated, and nothing said why. */
        repriced = await applyPendingFees({ courseId: course.id });
      }
      return { course, repriced };
    },
    onSuccess: ({ repriced }) => {
      void qc.invalidateQueries({ queryKey: ['courses'] });
      void qc.invalidateQueries({ queryKey: ['overview'] });
      void qc.invalidateQueries({ queryKey: ['finance-stats'] });
      void qc.invalidateQueries({ queryKey: ['student-finance'] });
      toast.success(
        editing ? 'Course updated' : 'Course added',
        repriced > 0
          ? `${repriced} unpriced enrolment${repriced === 1 ? '' : 's'} now billed at this fee.`
          : undefined,
      );
      onClose();
    },
    onError: (e) => {
      const msg = readableError(e);
      toast.error(
        'Could not save',
        /duplicate key|unique/i.test(msg)
          ? 'A course with that name already exists.'
          : msg,
      );
    },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit course' : 'Add a course'}
      description="The fee here becomes the default for every new enrolment on this programme."
      dirty={isDirty}
      footer={
        <>
          <AdminButton variant="ghost" onClick={onClose}>Cancel</AdminButton>
          <AdminButton
            variant="primary"
            disabled={save.isPending}
            onClick={() => void handleSubmit((v) => save.mutate(v))()}
          >
            {save.isPending ? 'Saving…' : editing ? 'Save changes' : 'Add course'}
          </AdminButton>
        </>
      }
    >
      <form onSubmit={handleSubmit((v) => save.mutate(v))} noValidate className="space-y-4">
        <Field
          label="Programme name" htmlFor="title" error={errors.title?.message}
          hint={title ? `Web address: /courses/${slugify(title)}` : undefined}
        >
          <input
            id="title" autoFocus placeholder="e.g. Advanced Latte Art"
            className={cn(inputClass, errors.title && inputErrorClass)}
            {...register('title')}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Duration" htmlFor="duration" error={errors.duration?.message}>
            <input
              id="duration" placeholder="e.g. 3 weeks"
              className={cn(inputClass, errors.duration && inputErrorClass)}
              {...register('duration')}
            />
          </Field>

          <Field label="Level" htmlFor="level" error={errors.level?.message}>
            <select id="level" className={cn(inputClass, errors.level && inputErrorClass)} {...register('level')}>
              {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Certification awarded" htmlFor="certification" error={errors.certification?.message}>
          <input
            id="certification"
            className={cn(inputClass, errors.certification && inputErrorClass)}
            {...register('certification')}
          />
        </Field>

        <Field
          label="Fee (KES)" htmlFor="fee_kes" error={errors.fee_kes?.message}
          hint={
            editing
              ? 'Changing this affects future enrolments only — students already enrolled keep the fee they agreed.'
              : 'Leave at 0 if the fee is agreed per student.'
          }
        >
          <input
            id="fee_kes" type="number" inputMode="numeric" min={0} step={500}
            className={cn(inputClass, 'tabular-nums', errors.fee_kes && inputErrorClass)}
            {...register('fee_kes')}
          />
        </Field>

        {/* A plain checkbox would be lost in a form of text inputs; this reads
            as the switch it is. */}
        <button
          type="button"
          onClick={() => setValue('active', !active, { shouldDirty: true })}
          className="flex w-full items-center justify-between rounded-lg bg-slate-50 px-3.5 py-3 text-left ring-1 ring-[rgba(9,9,11,0.08)]"
        >
          <span className="min-w-0">
            <span className="block font-sans text-[0.875rem] font-medium text-slate-900">
              Offering this course
            </span>
            <span className="block font-sans text-[0.75rem] text-slate-500">
              Inactive courses stay on old records but cannot take new intakes.
            </span>
          </span>
          <span
            aria-hidden="true"
            className={cn(
              'relative ml-3 h-5 w-9 shrink-0 rounded-full transition-colors duration-200',
              active ? 'bg-emerald-600' : 'bg-slate-300',
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 size-4 rounded-full bg-white transition-transform duration-200',
                active ? 'translate-x-[1.125rem]' : 'translate-x-0.5',
              )}
            />
          </span>
        </button>
        <input type="checkbox" className="sr-only" tabIndex={-1} {...register('active')} />
      </form>
    </Modal>
  );
}

export default function Courses() {
  const { can } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [editing, setEditing] = useState<CourseRow | null>(null);
  const [open, setOpen] = useState(false);

  const query = useQuery({ queryKey: ['courses'], queryFn: fetchCoursesAdmin });

  const remove = useMutation({
    mutationFn: (id: string) => deleteCourse(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['courses'] });
      toast.success('Course deleted');
    },
    onError: (e) => {
      const msg = readableError(e);
      toast.error(
        'Could not delete',
        /foreign key|restrict|violates/i.test(msg)
          ? 'This course has intakes. Mark it as no longer offered instead — that keeps the history intact.'
          : msg,
      );
    },
  });

  const toggleActive = useMutation({
    mutationFn: (c: CourseRow) => updateCourse(c.id, { active: !c.active }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['courses'] }),
    onError: (e) => toast.error('Could not update', readableError(e)),
  });

  const rows = query.data ?? [];

  const askDelete = async (c: CourseRow) => {
    const ok = await confirm({
      title: 'Delete this course?',
      body: (
        <>
          <strong className="font-medium text-slate-900">{c.title}</strong> will be removed.
          Courses that already have intakes cannot be deleted — mark them as no longer
          offered instead.
        </>
      ),
      confirmLabel: 'Delete course',
    });
    if (ok !== null) remove.mutate(c.id);
  };

  const menuFor = (c: CourseRow) => [
    ...(can('admin', 'registrar')
      ? [
          { label: 'Edit course', Icon: Pencil, onSelect: () => { setEditing(c); setOpen(true); } },
          {
            label: c.active ? 'Stop offering' : 'Offer again',
            Icon: c.active ? EyeOff : Eye,
            onSelect: () => toggleActive.mutate(c),
          },
        ]
      : []),
    ...(can('admin')
      ? [{
          label: 'Delete course', Icon: Trash2, tone: 'danger' as const,
          separatorBefore: true, onSelect: () => void askDelete(c),
        }]
      : []),
  ];

  return (
    <>
      <PageHeader
        eyebrow="Catalogue"
        title="Courses"
        subtitle={query.isLoading ? 'Loading…' : `${rows.length} programme${rows.length === 1 ? '' : 's'}`}
        actions={
          can('admin', 'registrar') && (
            <AdminButton variant="primary" Icon={Plus} onClick={() => { setEditing(null); setOpen(true); }}>
              Add course
            </AdminButton>
          )
        }
      />

      <Panel>
        {query.isError ? (
          <div className="p-5">
            <ErrorNote message={readableError(query.error)} retry={() => void query.refetch()} />
          </div>
        ) : query.isLoading ? (
          <TableSkeleton rows={5} cols={4} />
        ) : !rows.length ? (
          <EmptyState
            Icon={BookOpen}
            title="No courses yet"
            body="Add the programmes the school teaches and what each one costs. Intakes are then created against a course."
            action={
              can('admin', 'registrar') && (
                <AdminButton variant="primary" Icon={Plus} onClick={() => { setEditing(null); setOpen(true); }}>
                  Add course
                </AdminButton>
              )
            }
          />
        ) : (
          <>
            <Table minWidth="46rem" className="hidden md:block">
              <thead>
                <tr>
                  <Th>Programme</Th>
                  <Th>Duration</Th>
                  <Th>Level</Th>
                  <Th className="text-right">Fee</Th>
                  <Th>Intakes</Th>
                  <Th className="w-px" />
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <Tr key={c.id}>
                    <Td>
                      <span className="block font-medium text-slate-900">{c.title}</span>
                      <span className="block text-[0.75rem] text-slate-500">{c.certification}</span>
                    </Td>
                    <Td>{c.duration}</Td>
                    <Td>{c.level}</Td>
                    <Td className="text-right font-medium text-slate-900 tabular-nums">
                      {c.fee_kes > 0
                        ? kes(c.fee_kes)
                        : <span className="font-normal text-slate-400">Not set</span>}
                    </Td>
                    <Td>
                      {c.active
                        ? <Badge tone="running" dot>{c.intakeCount} cohort{c.intakeCount === 1 ? '' : 's'}</Badge>
                        : <Badge tone="neutral">Not offered</Badge>}
                    </Td>
                    <Td>
                      {menuFor(c).length > 0 && (
                        <ActionMenu label={`Actions for ${c.title}`} items={menuFor(c)} />
                      )}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>

            <MobileList>
              {rows.map((c) => (
                <MobileRow
                  key={c.id}
                  title={c.title}
                  subtitle={
                    <>
                      {c.duration} · {c.level} ·{' '}
                      <span className="font-medium text-slate-900 tabular-nums">
                        {c.fee_kes > 0 ? kes(c.fee_kes) : 'Fee not set'}
                      </span>
                    </>
                  }
                  meta={!c.active ? <Badge tone="neutral">Not offered</Badge> : undefined}
                  trailing={
                    menuFor(c).length > 0
                      ? <ActionMenu label={`Actions for ${c.title}`} items={menuFor(c)} />
                      : undefined
                  }
                />
              ))}
            </MobileList>
          </>
        )}
      </Panel>

      <CourseModal open={open} onClose={() => setOpen(false)} editing={editing} />
      {dialog}
    </>
  );
}

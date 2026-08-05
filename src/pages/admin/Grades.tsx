import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ClipboardList, Plus, Save, Trash2, Users, Pencil } from 'lucide-react';
import {
  fetchAssessments, createAssessment, updateAssessment, deleteAssessment,
  fetchMarkSheet, recordScores, type MarkSheetRow,
} from '@/features/admin/finance';
import { fetchIntakes } from '@/features/admin/api';
import {
  PageHeader, Panel, EmptyState, ErrorNote, TableSkeleton, SelectFilter,
  Toolbar, Field, inputClass, inputErrorClass, Badge,
} from '@/components/admin/AdminUI';
import { ActionMenu, AdminButton } from '@/components/admin/Menu';
import { Modal, useConfirm } from '@/components/admin/Overlay';
import { useToast } from '@/components/admin/Toast';
import { useAuth } from '@/features/auth/AuthProvider';
import { readableError } from '@/lib/supabase';
import type { Assessment } from '@/lib/db.types';
import { cn } from '@/lib/utils';

const schema = z.object({
  title: z.string().trim().min(2, 'Name the assessment.').max(120),
  max_score: z.coerce.number().min(1, 'Must be at least 1.').max(1000),
  weight: z.coerce.number().min(0, 'Cannot be negative.').max(100),
  due_on: z.string().optional(),
});
type Values = z.infer<typeof schema>;

/** Kenyan school grading bands. */
function bandFor(pct: number): { label: string; tone: 'valid' | 'running' | 'neutral' | 'revoked' } {
  if (pct >= 80) return { label: 'Distinction', tone: 'valid' };
  if (pct >= 65) return { label: 'Credit', tone: 'running' };
  if (pct >= 50) return { label: 'Pass', tone: 'neutral' };
  return { label: 'Fail', tone: 'revoked' };
}

function AssessmentModal({
  open, onClose, intakeId, editing,
}: {
  open: boolean;
  onClose: () => void;
  intakeId: string;
  editing: Assessment | null;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const { register, handleSubmit, reset, formState: { errors, isDirty } } =
    useForm<Values>({ resolver: zodResolver(schema), mode: 'onBlur' });

  useEffect(() => {
    if (!open) return;
    reset(
      editing
        ? {
            title: editing.title, max_score: editing.max_score,
            weight: editing.weight, due_on: editing.due_on ?? '',
          }
        : { title: '', max_score: 100, weight: 1, due_on: '' },
    );
  }, [open, editing, reset]);

  const save = useMutation({
    mutationFn: async (v: Values) => {
      const payload = { ...v, due_on: v.due_on || null };
      if (editing) await updateAssessment(editing.id, payload);
      else await createAssessment({ ...payload, intake_id: intakeId });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['assessments', intakeId] });
      void qc.invalidateQueries({ queryKey: ['marksheet', intakeId] });
      toast.success(editing ? 'Assessment updated' : 'Assessment added');
      onClose();
    },
    onError: (e) => toast.error('Could not save', readableError(e)),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit assessment' : 'Add an assessment'}
      description="Every student in this cohort sits it."
      dirty={isDirty}
      footer={
        <>
          <AdminButton variant="ghost" onClick={onClose}>Cancel</AdminButton>
          <AdminButton
            variant="primary" disabled={save.isPending}
            onClick={() => void handleSubmit((v) => save.mutate(v))()}
          >
            {save.isPending ? 'Saving…' : editing ? 'Save changes' : 'Add assessment'}
          </AdminButton>
        </>
      }
    >
      <form onSubmit={handleSubmit((v) => save.mutate(v))} noValidate className="space-y-4">
        <Field label="Title" htmlFor="title" error={errors.title?.message}>
          <input
            id="title" autoFocus placeholder="e.g. Latte Art Practical"
            className={cn(inputClass, errors.title && inputErrorClass)} {...register('title')}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Marked out of" htmlFor="max_score" error={errors.max_score?.message}>
            <input
              id="max_score" type="number" min={1} step={1}
              className={cn(inputClass, 'tabular-nums', errors.max_score && inputErrorClass)}
              {...register('max_score')}
            />
          </Field>

          <Field
            label="Weight" htmlFor="weight" error={errors.weight?.message}
            hint="Relative to the other assessments. Leave at 1 if they all count the same."
          >
            <input
              id="weight" type="number" min={0} step={0.5}
              className={cn(inputClass, 'tabular-nums', errors.weight && inputErrorClass)}
              {...register('weight')}
            />
          </Field>
        </div>

        <Field label="Due date" htmlFor="due_on" optional>
          <input id="due_on" type="date" className={cn(inputClass, 'tabular-nums')} {...register('due_on')} />
        </Field>
      </form>
    </Modal>
  );
}

export default function Grades() {
  const { can } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();

  const [intakeId, setIntakeId] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Assessment | null>(null);
  /** enrolment → assessment → raw input text. Strings, not numbers, so a
      half-typed "8" on the way to "85" is never coerced or clamped. */
  const [draft, setDraft] = useState<Record<string, Record<string, string>>>({});

  const intakes = useQuery({ queryKey: ['intakes'], queryFn: fetchIntakes });

  useEffect(() => {
    if (intakeId || !intakes.data?.length) return;
    const running = intakes.data.find((i) => i.status === 'running') ?? intakes.data[0];
    if (running) setIntakeId(running.id);
  }, [intakes.data, intakeId]);

  const assessments = useQuery({
    queryKey: ['assessments', intakeId],
    queryFn: () => fetchAssessments(intakeId),
    enabled: Boolean(intakeId),
  });

  const sheet = useQuery({
    queryKey: ['marksheet', intakeId],
    queryFn: () => fetchMarkSheet(intakeId),
    enabled: Boolean(intakeId),
  });

  useEffect(() => setDraft({}), [intakeId]);

  const list = assessments.data ?? [];
  const rows = sheet.data ?? [];

  const valueFor = (r: MarkSheetRow, a: Assessment) => {
    const d = draft[r.enrollment_id]?.[a.id];
    if (d !== undefined) return d;
    const s = r.scores[a.id];
    return s === null || s === undefined ? '' : String(s);
  };

  /** Weighted total, computed live from whatever is on screen. */
  const finalFor = (r: MarkSheetRow) => {
    let num = 0;
    let den = 0;
    for (const a of list) {
      const raw = valueFor(r, a);
      if (raw === '') continue;
      const score = Number(raw);
      if (!Number.isFinite(score)) continue;
      num += a.weight * score;
      den += a.weight * a.max_score;
    }
    return den === 0 ? null : Math.round((num / den) * 1000) / 10;
  };

  const dirtyCount = useMemo(
    () => Object.values(draft).reduce((n, cols) => n + Object.keys(cols).length, 0),
    [draft],
  );

  const save = useMutation({
    mutationFn: async () => {
      // One call per assessment column, because record_scores() takes an
      // assessment and a set of marks. Sequential so a failure reports which
      // column broke rather than dissolving into Promise.all noise.
      let total = 0;
      for (const a of list) {
        const entries = rows
          .filter((r) => draft[r.enrollment_id]?.[a.id] !== undefined)
          .map((r) => {
            const raw = draft[r.enrollment_id]![a.id]!;
            return {
              enrollment_id: r.enrollment_id,
              score: raw.trim() === '' ? null : Number(raw),
            };
          });
        if (entries.length) total += await recordScores(a.id, entries);
      }
      return total;
    },
    onSuccess: (n) => {
      setDraft({});
      void qc.invalidateQueries({ queryKey: ['marksheet', intakeId] });
      void qc.invalidateQueries({ queryKey: ['grades'] });
      toast.success('Marks saved', `${n} mark${n === 1 ? '' : 's'} recorded`);
    },
    onError: (e) => toast.error('Could not save marks', readableError(e)),
  });

  const removeAssessment = useMutation({
    mutationFn: (id: string) => deleteAssessment(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['assessments', intakeId] });
      void qc.invalidateQueries({ queryKey: ['marksheet', intakeId] });
      toast.success('Assessment deleted');
    },
    onError: (e) => toast.error('Could not delete', readableError(e)),
  });

  const askDelete = async (a: Assessment) => {
    const ok = await confirm({
      title: 'Delete this assessment?',
      body: (
        <>
          <strong className="font-medium text-slate-900">{a.title}</strong> and every mark
          recorded against it will be removed. This cannot be undone.
        </>
      ),
      confirmLabel: 'Delete assessment',
    });
    if (ok !== null) removeAssessment.mutate(a.id);
  };

  return (
    <>
      <PageHeader
        eyebrow="Teaching"
        title="Grades"
        subtitle="Record marks for a cohort. The final grade is weighted automatically."
        actions={
          can('admin', 'registrar') && intakeId && (
            <>
              <AdminButton Icon={Plus} onClick={() => { setEditing(null); setModalOpen(true); }}>
                Add assessment
              </AdminButton>
              {list.length > 0 && rows.length > 0 && (
                <AdminButton
                  variant="primary" Icon={Save}
                  disabled={save.isPending || dirtyCount === 0}
                  onClick={() => save.mutate()}
                >
                  {save.isPending ? 'Saving…' : dirtyCount ? `Save ${dirtyCount} mark${dirtyCount === 1 ? '' : 's'}` : 'Saved'}
                </AdminButton>
              )}
            </>
          )
        }
      />

      <Toolbar>
        <SelectFilter
          id="grade-intake" label="Cohort" value={intakeId} onChange={setIntakeId}
          options={(intakes.data ?? []).map((i) => ({
            value: i.id, label: `${i.course.title} — ${i.code}`,
          }))}
        />
        {list.length > 0 && (
          <span className="font-sans text-[0.75rem] text-slate-500">
            {list.length} assessment{list.length === 1 ? '' : 's'} ·{' '}
            {rows.length} student{rows.length === 1 ? '' : 's'}
          </span>
        )}
      </Toolbar>

      <Panel title="Mark sheet">
        {!intakeId ? (
          <EmptyState Icon={ClipboardList} title="Pick a cohort" body="Choose an intake to record its marks." />
        ) : sheet.isError ? (
          <div className="p-5">
            <ErrorNote message={readableError(sheet.error)} retry={() => void sheet.refetch()} />
          </div>
        ) : sheet.isLoading || assessments.isLoading ? (
          <TableSkeleton rows={6} cols={4} />
        ) : !list.length ? (
          <EmptyState
            Icon={ClipboardList}
            title="No assessments yet"
            body="Add the papers, practicals or projects this cohort is marked on. Each one can have its own maximum and weight."
            action={
              can('admin', 'registrar') && (
                <AdminButton variant="primary" Icon={Plus} onClick={() => { setEditing(null); setModalOpen(true); }}>
                  Add assessment
                </AdminButton>
              )
            }
          />
        ) : !rows.length ? (
          <EmptyState Icon={Users} title="Nobody is enrolled" body="Enrol students into this intake to mark them." />
        ) : (
          /* A spreadsheet is the right shape here and it does not collapse into
             cards: a mark sheet without its columns side by side is not a mark
             sheet. It scrolls horizontally on a phone, deliberately. */
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="sticky left-0 z-[2] border-b border-[rgba(9,9,11,0.12)] bg-white px-4 py-2.5 font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.11em] text-slate-500"
                  >
                    Student
                  </th>
                  {list.map((a) => (
                    <th
                      key={a.id}
                      scope="col"
                      className="min-w-[7rem] border-b border-[rgba(9,9,11,0.12)] px-3 py-2.5 text-center"
                    >
                      <span className="flex items-center justify-center gap-1">
                        <span className="font-sans text-[0.75rem] font-semibold text-slate-900">
                          {a.title}
                        </span>
                        {can('admin', 'registrar') && (
                          <ActionMenu
                            label={`Actions for ${a.title}`}
                            items={[
                              { label: 'Edit', Icon: Pencil, onSelect: () => { setEditing(a); setModalOpen(true); } },
                              {
                                label: 'Delete', Icon: Trash2, tone: 'danger',
                                separatorBefore: true, onSelect: () => void askDelete(a),
                              },
                            ]}
                          />
                        )}
                      </span>
                      <span className="mt-0.5 block font-sans text-[0.6875rem] font-normal text-slate-400 tabular-nums">
                        /{a.max_score}{a.weight !== 1 ? ` · ×${a.weight}` : ''}
                      </span>
                    </th>
                  ))}
                  <th
                    scope="col"
                    className="border-b border-[rgba(9,9,11,0.12)] px-4 py-2.5 text-right font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.11em] text-slate-500"
                  >
                    Final
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const final = finalFor(r);
                  const band = final === null ? null : bandFor(final);
                  return (
                    <tr key={r.enrollment_id} className="hover:bg-slate-50/70">
                      <td className="sticky left-0 z-[1] border-b border-[rgba(9,9,11,0.06)] bg-white px-4 py-2">
                        <span className="block truncate font-sans text-[0.875rem] text-slate-900">
                          {r.first_name} {r.last_name}
                        </span>
                        <span className="block font-sans text-[0.75rem] text-slate-500 tabular-nums">
                          {r.student_no}
                        </span>
                      </td>

                      {list.map((a) => (
                        <td key={a.id} className="border-b border-[rgba(9,9,11,0.06)] px-2 py-2 text-center">
                          <input
                            type="number"
                            inputMode="decimal"
                            min={0}
                            max={a.max_score}
                            step="0.5"
                            aria-label={`${a.title} mark for ${r.first_name} ${r.last_name}`}
                            disabled={!can('admin', 'registrar')}
                            value={valueFor(r, a)}
                            onChange={(e) =>
                              setDraft((d) => ({
                                ...d,
                                [r.enrollment_id]: {
                                  ...(d[r.enrollment_id] ?? {}),
                                  [a.id]: e.target.value,
                                },
                              }))
                            }
                            className={cn(
                              'h-9 w-[4.5rem] rounded-lg bg-white px-2 text-center font-sans text-[0.875rem] tabular-nums',
                              'ring-1 ring-[rgba(9,9,11,0.12)] transition-all',
                              'focus:outline-none focus:ring-2 focus:ring-gold-500/40',
                              'disabled:bg-slate-50 disabled:text-slate-500',
                              // Out of range is flagged in the cell, before the
                              // save round-trips and the trigger rejects it.
                              Number(valueFor(r, a)) > a.max_score && 'ring-red-500/60 text-red-700',
                            )}
                          />
                        </td>
                      ))}

                      <td className="border-b border-[rgba(9,9,11,0.06)] px-4 py-2 text-right">
                        {final === null ? (
                          <span className="font-sans text-[0.8125rem] text-slate-400">—</span>
                        ) : (
                          <span className="inline-flex items-center gap-2">
                            <span className="font-sans text-[0.875rem] font-semibold text-slate-900 tabular-nums">
                              {final}%
                            </span>
                            {band && <Badge tone={band.tone}>{band.label}</Badge>}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <AssessmentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        intakeId={intakeId}
        editing={editing}
      />
      {dialog}
    </>
  );
}

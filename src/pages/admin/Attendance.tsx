import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarCheck, Check, X, Clock, ShieldCheck, Save, Users, FileDown,
} from 'lucide-react';
import {
  fetchRegister, markAttendance, fetchSessionDates, type RegisterRow,
} from '@/features/admin/finance';
import {
  fetchAttendanceSheet, buildAttendancePdf, downloadBlob,
} from '@/features/admin/attendancePdf';
import { fetchIntakes } from '@/features/admin/api';
import {
  PageHeader, Panel, Badge, Avatar, EmptyState, ErrorNote, TableSkeleton,
  SelectFilter, Toolbar, CONTROL,
} from '@/components/admin/AdminUI';
import { AdminButton } from '@/components/admin/Menu';
import { useToast } from '@/components/admin/Toast';
import { useAuth } from '@/features/auth/AuthProvider';
import { publicFileUrl, readableError } from '@/lib/supabase';
import type { AttendanceState } from '@/lib/db.types';
import { cn } from '@/lib/utils';

const today = () => new Date().toISOString().slice(0, 10);

/* Four states, one control. A dropdown per student would be four taps to mark
   somebody absent; this is one, and the whole register is scannable at a
   glance because each state has a fixed position and colour. */
const STATES: Array<{
  value: AttendanceState; label: string; Icon: typeof Check; on: string;
}> = [
  { value: 'present', label: 'Present', Icon: Check,       on: 'bg-emerald-600 text-white' },
  { value: 'late',    label: 'Late',    Icon: Clock,       on: 'bg-amber-500 text-white' },
  { value: 'absent',  label: 'Absent',  Icon: X,           on: 'bg-red-600 text-white' },
  { value: 'excused', label: 'Excused', Icon: ShieldCheck, on: 'bg-slate-600 text-white' },
];

function StatePicker({
  value, onChange, name,
}: {
  value: AttendanceState | null;
  onChange: (s: AttendanceState) => void;
  name: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={`Attendance for ${name}`}
      className="inline-flex shrink-0 items-center gap-0.5 rounded-lg bg-slate-100 p-0.5"
    >
      {STATES.map((s) => {
        const active = value === s.value;
        return (
          <button
            key={s.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={s.label}
            title={s.label}
            onClick={() => onChange(s.value)}
            className={cn(
              // 32px control inside a 44px row: comfortably tappable without
              // making the register three screens long.
              'grid size-8 place-items-center rounded-md transition-colors duration-150',
              active ? s.on : 'text-slate-400 hover:bg-white hover:text-slate-700',
            )}
          >
            <s.Icon className="size-4" strokeWidth={active ? 3 : 2} />
          </button>
        );
      })}
    </div>
  );
}

export default function Attendance() {
  const { can } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();

  const [intakeId, setIntakeId] = useState('');
  const [date, setDate] = useState(today());
  /* Local edits, keyed by enrolment. The register is not saved keystroke by
     keystroke — a teacher marking thirty students wants one deliberate save,
     not thirty writes and thirty chances to half-fail. */
  const [draft, setDraft] = useState<Record<string, AttendanceState>>({});

  const intakes = useQuery({ queryKey: ['intakes'], queryFn: fetchIntakes });

  // Default to whichever cohort is actually running.
  useEffect(() => {
    if (intakeId || !intakes.data?.length) return;
    const running = intakes.data.find((i) => i.status === 'running') ?? intakes.data[0];
    if (running) setIntakeId(running.id);
  }, [intakes.data, intakeId]);

  const register = useQuery({
    queryKey: ['register', intakeId, date],
    queryFn: () => fetchRegister(intakeId, date),
    enabled: Boolean(intakeId),
  });

  const sessions = useQuery({
    queryKey: ['session-dates', intakeId],
    queryFn: () => fetchSessionDates(intakeId),
    enabled: Boolean(intakeId),
  });

  // A new intake or date is a different register; stale edits must not carry.
  useEffect(() => setDraft({}), [intakeId, date]);

  const rows = register.data ?? [];
  const stateOf = (r: RegisterRow) => draft[r.enrollment_id] ?? r.state;

  const dirty = useMemo(
    () => rows.filter((r) => draft[r.enrollment_id] && draft[r.enrollment_id] !== r.state).length,
    [rows, draft],
  );

  const counts = useMemo(() => {
    const c = { present: 0, late: 0, absent: 0, excused: 0, unmarked: 0 };
    for (const r of rows) {
      const s = stateOf(r);
      if (!s) c.unmarked += 1;
      else c[s] += 1;
    }
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, draft]);

  const exportPdf = useMutation({
    mutationFn: async () => {
      const sheet = await fetchAttendanceSheet(intakeId);
      const blob = await buildAttendancePdf(sheet);
      downloadBlob(blob, `attendance-${sheet.intakeCode}.pdf`);
      return sheet;
    },
    onSuccess: (sheet) =>
      toast.success(
        'Attendance sheet exported',
        `${sheet.students.length} student(s) across ${sheet.dates.length} session(s)`,
      ),
    onError: (e) => toast.error('Could not export', readableError(e)),
  });

  const save = useMutation({
    mutationFn: () => {
      const entries = rows
        .map((r) => ({ enrollment_id: r.enrollment_id, state: stateOf(r) }))
        .filter((e): e is { enrollment_id: string; state: AttendanceState } => e.state !== null);
      return markAttendance(date, entries);
    },
    onSuccess: (n) => {
      setDraft({});
      void qc.invalidateQueries({ queryKey: ['register', intakeId, date] });
      void qc.invalidateQueries({ queryKey: ['session-dates', intakeId] });
      void qc.invalidateQueries({ queryKey: ['attendance'] });
      toast.success('Register saved', `${n} student${n === 1 ? '' : 's'} recorded`);
    },
    onError: (e) => toast.error('Could not save the register', readableError(e)),
  });

  const markAll = (state: AttendanceState) =>
    setDraft(Object.fromEntries(rows.map((r) => [r.enrollment_id, state])));

  const unsaved = dirty > 0 || rows.some((r) => !r.state && draft[r.enrollment_id]);

  return (
    <>
      <PageHeader
        eyebrow="Teaching"
        title="Attendance"
        subtitle="Take the register for a cohort, one session at a time."
        actions={
          <>
            {/* Available to viewers too: producing the record is not editing it,
                and a bursar or sponsor often needs the sheet without holding
                write access. */}
            {intakeId && (
              <AdminButton
                Icon={FileDown}
                disabled={exportPdf.isPending}
                onClick={() => exportPdf.mutate()}
              >
                {exportPdf.isPending ? 'Preparing…' : 'Export PDF'}
              </AdminButton>
            )}
            {can('admin', 'registrar') && rows.length > 0 && (
              <AdminButton
                variant="primary"
                Icon={Save}
                disabled={save.isPending || !unsaved}
                onClick={() => save.mutate()}
              >
                {save.isPending ? 'Saving…' : unsaved ? `Save register (${dirty || rows.length})` : 'Saved'}
              </AdminButton>
            )}
          </>
        }
      />

      <Toolbar>
        <SelectFilter
          id="intake-picker" label="Cohort" value={intakeId} onChange={setIntakeId}
          options={[
            ...(intakes.data ?? []).map((i) => ({
              value: i.id,
              label: `${i.course.title} — ${i.code}`,
            })),
          ]}
        />

        <div className="flex items-center gap-2">
          <label htmlFor="session-date" className="font-sans text-[0.8125rem] text-slate-500">
            Date
          </label>
          <input
            id="session-date"
            type="date"
            value={date}
            max={today()}
            onChange={(e) => setDate(e.target.value)}
            className={cn(CONTROL, 'px-3 tabular-nums')}
          />
        </div>

        {sessions.data && sessions.data.length > 0 && (
          <span className="font-sans text-[0.75rem] text-slate-500">
            {sessions.data.length} session{sessions.data.length === 1 ? '' : 's'} recorded
          </span>
        )}
      </Toolbar>

      <Panel
        title={date === today() ? "Today's register" : 'Register'}
        description={
          rows.length
            ? `${counts.present} present · ${counts.late} late · ${counts.absent} absent${counts.unmarked ? ` · ${counts.unmarked} unmarked` : ''}`
            : undefined
        }
        action={
          can('admin', 'registrar') && rows.length > 0 ? (
            <div className="flex gap-1.5">
              <AdminButton size="sm" onClick={() => markAll('present')}>All present</AdminButton>
              <AdminButton size="sm" variant="ghost" onClick={() => setDraft({})}>Reset</AdminButton>
            </div>
          ) : undefined
        }
      >
        {!intakeId ? (
          <EmptyState
            Icon={CalendarCheck}
            title="Pick a cohort"
            body="Choose an intake above to take its register."
          />
        ) : register.isError ? (
          <div className="p-5">
            <ErrorNote message={readableError(register.error)} retry={() => void register.refetch()} />
          </div>
        ) : register.isLoading ? (
          <TableSkeleton rows={6} cols={2} />
        ) : !rows.length ? (
          <EmptyState
            Icon={Users}
            title="Nobody is enrolled"
            body="Enrol students into this intake and they will appear on the register."
          />
        ) : (
          <ul className="divide-y divide-[rgba(9,9,11,0.06)]">
            {rows.map((r) => {
              const state = stateOf(r);
              return (
                <li
                  key={r.enrollment_id}
                  className={cn(
                    'flex items-center gap-3 px-4 py-2.5 transition-colors sm:px-5',
                    !state && 'bg-amber-50/40',
                  )}
                >
                  <Avatar
                    name={`${r.first_name} ${r.last_name}`}
                    src={publicFileUrl('student-photos', r.photo_path)}
                    size="sm"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-sans text-[0.875rem] text-slate-900">
                      {r.first_name} {r.last_name}
                    </span>
                    <span className="block font-sans text-[0.75rem] text-slate-500 tabular-nums">
                      {r.student_no}
                    </span>
                  </span>

                  {can('admin', 'registrar') ? (
                    <StatePicker
                      value={state}
                      name={`${r.first_name} ${r.last_name}`}
                      onChange={(s) => setDraft((d) => ({ ...d, [r.enrollment_id]: s }))}
                    />
                  ) : (
                    <Badge tone={state === 'absent' ? 'revoked' : state === 'present' ? 'valid' : 'neutral'}>
                      {state ?? 'unmarked'}
                    </Badge>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {/* A register with unmarked students is the most common way attendance
          data goes wrong — it looks saved but is silently incomplete. */}
      {rows.length > 0 && counts.unmarked > 0 && (
        <p className="mt-3 font-sans text-[0.8125rem] text-amber-800">
          {counts.unmarked} student{counts.unmarked === 1 ? ' is' : 's are'} still unmarked and
          will not be saved.
        </p>
      )}
    </>
  );
}

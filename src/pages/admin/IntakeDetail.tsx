import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Users, CalendarCheck, ClipboardList, Wallet, GraduationCap,
  Award, Download, CalendarRange,
} from 'lucide-react';
import {
  fetchIntake, fetchIntakeStudents, fetchIntakeFinance, kes, kesShort,
} from '@/features/admin/finance';
import { exportIntakeStudents } from '@/features/admin/csv';
import {
  PageHeader, MetricGrid, Metric, MetricSkeleton, Panel, Table, Th, Td, Tr,
  Badge, Avatar, EmptyState, ErrorNote, TableSkeleton, MobileList, MobileRow,
  ProgressBar,
} from '@/components/admin/AdminUI';
import { AdminButton } from '@/components/admin/Menu';
import { useToast } from '@/components/admin/Toast';
import { publicFileUrl, readableError } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export default function IntakeDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const intake = useQuery({ queryKey: ['intake', id], queryFn: () => fetchIntake(id) });
  const students = useQuery({
    queryKey: ['intake-students', id],
    queryFn: () => fetchIntakeStudents(id),
  });
  const finance = useQuery({ queryKey: ['intake-finance'], queryFn: fetchIntakeFinance });

  const rows = students.data ?? [];
  const money = finance.data?.find((f) => f.intake_id === id);

  /* Counted from the roll rather than from a separate query, so the numbers on
     screen can never disagree with the list beneath them. */
  const summary = useMemo(() => {
    const active = rows.filter((r) => r.status === 'enrolled').length;
    const done = rows.filter((r) => r.status === 'completed').length;
    const certified = rows.filter((r) => r.certificate_status === 'valid').length;
    const owing = rows.filter((r) => r.balance_kes > 0).length;
    const withRate = rows.filter((r) => r.attendance_pct !== null);
    const avgAttendance = withRate.length
      ? Math.round(withRate.reduce((s, r) => s + (r.attendance_pct ?? 0), 0) / withRate.length)
      : null;
    return { active, done, certified, owing, avgAttendance, total: rows.length };
  }, [rows]);

  if (intake.isError) {
    return <ErrorNote message={readableError(intake.error)} retry={() => void intake.refetch()} />;
  }

  const i = intake.data;

  return (
    <>
      <Link
        to="/admin/intakes"
        className="mb-3 inline-flex items-center gap-1.5 font-sans text-[0.8125rem] text-slate-500 transition-colors hover:text-slate-900"
      >
        <ArrowLeft className="size-3.5" /> All intakes
      </Link>

      <PageHeader
        eyebrow={i?.code ?? 'Cohort'}
        title={i?.course.title ?? 'Intake'}
        subtitle={
          i ? (
            <span className="flex flex-wrap items-center gap-2">
              <Badge tone={i.status}>{i.status}</Badge>
              <span className="tabular-nums">
                {fmt(i.starts_on)} — {fmt(i.ends_on)}
              </span>
              {i.capacity ? (
                <span className="text-slate-400">· capacity {i.capacity}</span>
              ) : null}
            </span>
          ) : undefined
        }
        actions={
          rows.length > 0 && (
            <>
              <AdminButton
                Icon={Download}
                onClick={() => {
                  exportIntakeStudents(rows, i?.code ?? 'intake');
                  toast.success('Export ready', `${rows.length} student(s) downloaded`);
                }}
              >
                Export
              </AdminButton>
              <AdminButton Icon={CalendarCheck} onClick={() => navigate('/admin/attendance')}>
                Register
              </AdminButton>
              <AdminButton variant="primary" Icon={ClipboardList} onClick={() => navigate('/admin/grades')}>
                Marks
              </AdminButton>
            </>
          )
        }
      />

      {students.isLoading ? (
        <MetricSkeleton count={5} />
      ) : (
        <MetricGrid>
          <Metric index={0} label="Students" value={summary.total} hint={`${summary.active} still enrolled`} Icon={Users} />
          <Metric index={1} label="Completed" value={summary.done} hint="Finished the programme" Icon={GraduationCap} />
          <Metric index={2} label="Certified" value={summary.certified} hint="Valid certificates" Icon={Award} />
          <Metric
            index={3}
            label="Attendance"
            value={summary.avgAttendance === null ? '—' : `${summary.avgAttendance}%`}
            hint="Cohort average"
            Icon={CalendarCheck}
          />
          <Metric
            index={4}
            label="Owing"
            value={summary.owing}
            hint={money ? `${kesShort(money.collected_kes)} collected` : 'Students with a balance'}
            Icon={Wallet}
          />
        </MetricGrid>
      )}

      {/* Cohort economics, when there is anything to say. Direct costs only —
          rent and power are not apportioned, so this is honest about being a
          margin on attributable spend rather than true profit. */}
      {money && (money.billed_kes > 0 || money.direct_costs_kes > 0) && (
        <div className="mt-4 rounded-xl bg-white p-4 ring-1 ring-[rgba(9,9,11,0.09)] shadow-[0_1px_1px_rgba(9,9,11,0.03),0_2px_4px_rgba(9,9,11,0.03),0_8px_16px_-6px_rgba(9,9,11,0.07)]">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-sans text-[0.875rem] font-semibold text-slate-900">
              This cohort
            </span>
            <span className="font-sans text-[0.8125rem] text-slate-500 tabular-nums">
              <span className="font-medium text-slate-900">{kes(money.collected_kes)}</span>
              {' collected of '}{kes(money.billed_kes)}
              {money.direct_costs_kes > 0 && (
                <>
                  {' · '}
                  <span className="text-slate-900">{kes(money.direct_costs_kes)}</span> direct costs
                </>
              )}
            </span>
          </div>
          {money.billed_kes > 0 && (
            <ProgressBar value={money.collected_kes} max={money.billed_kes} tone="emerald" />
          )}
          {money.direct_costs_kes > 0 && (
            <p className="mt-2 font-sans text-[0.75rem] text-slate-500">
              Margin on attributed costs:{' '}
              <span className={cn('font-medium tabular-nums', money.margin_kes >= 0 ? 'text-emerald-700' : 'text-red-700')}>
                {kes(money.margin_kes)}
              </span>
              . Shared costs like rent are not apportioned.
            </p>
          )}
        </div>
      )}

      <div className="mt-4">
        <Panel
          title="Students on this cohort"
          description={students.isLoading ? undefined : `${rows.length} enrolled`}
        >
          {students.isError ? (
            <div className="p-5">
              <ErrorNote message={readableError(students.error)} retry={() => void students.refetch()} />
            </div>
          ) : students.isLoading ? (
            <TableSkeleton rows={6} cols={5} />
          ) : !rows.length ? (
            <EmptyState
              Icon={CalendarRange}
              title="Nobody is enrolled yet"
              body="Open a student's record and enrol them into this intake, and they will appear here."
              action={
                <AdminButton Icon={Users} onClick={() => navigate('/admin/students')}>
                  Find a student
                </AdminButton>
              }
            />
          ) : (
            <>
              <Table minWidth="46rem" className="hidden md:block">
                <thead>
                  <tr>
                    <Th>Student</Th>
                    <Th>Status</Th>
                    <Th className="hidden lg:table-cell">Attendance</Th>
                    <Th className="hidden lg:table-cell">Grade</Th>
                    <Th className="text-right">Balance</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <Tr key={r.enrollment_id} onClick={() => navigate(`/admin/students/${r.student_id}`)}>
                      <Td>
                        <span className="flex items-center gap-2.5">
                          <Avatar
                            name={`${r.first_name} ${r.last_name}`}
                            src={publicFileUrl('student-photos', r.photo_path)}
                            size="sm"
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-slate-900">
                              {r.first_name} {r.last_name}
                            </span>
                            <span className="block text-[0.75rem] text-slate-500 tabular-nums">
                              {r.student_no}
                            </span>
                          </span>
                        </span>
                      </Td>
                      <Td>
                        {r.certificate_status === 'valid' ? (
                          <Badge tone="graduate" dot>Certified</Badge>
                        ) : (
                          <Badge tone={r.status} dot={r.status !== 'withdrawn'}>{r.status}</Badge>
                        )}
                      </Td>
                      <Td className="hidden tabular-nums lg:table-cell">
                        {r.attendance_pct === null
                          ? <span className="text-slate-400">—</span>
                          : <span className={cn(r.attendance_pct < 60 && 'text-red-700')}>
                              {r.attendance_pct}%
                            </span>}
                      </Td>
                      <Td className="hidden tabular-nums lg:table-cell">
                        {r.final_pct === null
                          ? <span className="text-slate-400">—</span>
                          : `${r.final_pct}%`}
                      </Td>
                      <Td className="text-right tabular-nums">
                        {r.fee_kes === 0 ? (
                          <span className="text-slate-400">No fee</span>
                        ) : r.balance_kes > 0 ? (
                          <span className="font-medium text-red-700">{kes(r.balance_kes)}</span>
                        ) : (
                          <span className="text-emerald-700">Paid</span>
                        )}
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>

              <MobileList>
                {rows.map((r) => (
                  <MobileRow
                    key={r.enrollment_id}
                    onClick={() => navigate(`/admin/students/${r.student_id}`)}
                    leading={
                      <Avatar
                        name={`${r.first_name} ${r.last_name}`}
                        src={publicFileUrl('student-photos', r.photo_path)}
                        size="sm"
                      />
                    }
                    title={`${r.first_name} ${r.last_name}`}
                    subtitle={
                      <span className="tabular-nums">
                        {r.student_no}
                        {r.attendance_pct !== null ? ` · ${r.attendance_pct}% present` : ''}
                      </span>
                    }
                    meta={
                      r.certificate_status === 'valid'
                        ? <Badge tone="graduate" dot>Certified</Badge>
                        : <Badge tone={r.status}>{r.status}</Badge>
                    }
                    trailing={
                      r.balance_kes > 0 ? (
                        <span className="font-sans text-[0.8125rem] font-medium text-red-700 tabular-nums">
                          {kes(r.balance_kes)}
                        </span>
                      ) : undefined
                    }
                  />
                ))}
              </MobileList>
            </>
          )}
        </Panel>
      </div>
    </>
  );
}

import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users, Award, GraduationCap, CalendarRange, BookOpen, UserCheck,
  UserPlus, Plus, ArrowRight, Activity, Ban, ShieldCheck, FileText,
} from 'lucide-react';
import { fetchOverview, fetchActivity } from '@/features/admin/analytics';
import { fetchStudents, fetchCertificates } from '@/features/admin/api';
import {
  PageHeader, MetricGrid, Metric, Panel, Badge, Avatar, EmptyState, ErrorNote,
  MetricSkeleton, TableSkeleton, Skeleton,
} from '@/components/admin/AdminUI';
import { AdminButton } from '@/components/admin/Menu';
import { AreaChart, BarList } from '@/components/admin/Charts';
import { useAuth } from '@/features/auth/AuthProvider';
import { readableError } from '@/lib/supabase';
import { cn } from '@/lib/utils';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

const ACTION_META: Record<string, { Icon: typeof UserPlus; tint: string; verb: string }> = {
  'student.registered': { Icon: UserPlus, tint: 'text-blue-700 bg-blue-600/10', verb: 'registered' },
  'certificate.issued': { Icon: ShieldCheck, tint: 'text-emerald-700 bg-emerald-600/10', verb: 'issued' },
  'certificate.revoked': { Icon: Ban, tint: 'text-red-700 bg-red-600/10', verb: 'revoked' },
};

export default function Dashboard() {
  const { profile, can } = useAuth();
  const navigate = useNavigate();

  const overview = useQuery({ queryKey: ['overview'], queryFn: fetchOverview });
  const recentStudents = useQuery({
    queryKey: ['students', '', 0, 'recent'],
    queryFn: () => fetchStudents({ search: '', page: 0, pageSize: 6 }),
  });
  const recentCerts = useQuery({ queryKey: ['certificates', ''], queryFn: () => fetchCertificates('') });
  const activity = useQuery({
    queryKey: ['activity'],
    queryFn: () => fetchActivity(10),
    enabled: can('admin'),
  });

  const t = overview.data?.totals;
  const firstName = profile?.full_name?.split(' ')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title={firstName ? `${greeting}, ${firstName}` : 'Dashboard'}
        subtitle="Registrations, enrolments and certificates across the school."
        actions={
          can('admin', 'registrar') && (
            <>
              <AdminButton Icon={CalendarRange} onClick={() => navigate('/admin/intakes?new=1')}>
                New intake
              </AdminButton>
              <AdminButton variant="primary" Icon={UserPlus} onClick={() => navigate('/admin/students?new=1')}>
                Register student
              </AdminButton>
            </>
          )
        }
      />

      {overview.isError && (
        <div className="mb-6">
          <ErrorNote message={readableError(overview.error)} retry={() => void overview.refetch()} />
        </div>
      )}

      {/* ── Metrics ────────────────────────────────────────────────────── */}
      <div
        className={cn(
          // Hold the previous render at reduced opacity on refetch rather than
          // flashing skeletons back in — no layout jump, no flicker.
          overview.isFetching && !overview.isLoading && 'opacity-60 transition-opacity',
        )}
      >
        {overview.isLoading ? (
          <MetricSkeleton count={6} />
        ) : t ? (
          <MetricGrid>
            <Metric index={0} label="Students" value={t.students.toLocaleString('en-KE')} hint="All time" Icon={Users} to="/admin/students" />
            <Metric index={1} label="Active" value={t.active.toLocaleString('en-KE')} hint="Enrolled now" Icon={UserCheck} to="/admin/students" />
            <Metric index={2} label="Graduates" value={t.graduates.toLocaleString('en-KE')} hint="Completed" Icon={GraduationCap} />
            <Metric index={3} label="Certificates" value={t.certificates.toLocaleString('en-KE')} hint={t.revoked ? `${t.revoked} revoked` : 'None revoked'} Icon={Award} to="/admin/certificates" />
            <Metric index={4} label="Intakes" value={t.intakesRunning} hint={`${t.intakes} cohorts`} Icon={CalendarRange} to="/admin/intakes" />
            <Metric index={5} label="Courses" value={t.courses} hint="Programmes" Icon={BookOpen} />
          </MetricGrid>
        ) : null}
      </div>

      {/* ── Charts ─────────────────────────────────────────────────────── */}
      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Panel className="lg:col-span-3">
          <div className="p-4 sm:p-5">
            {overview.isLoading ? (
              <>
                <Skeleton className="h-4 w-40" />
                <Skeleton className="mt-5 h-[176px] w-full" />
              </>
            ) : (
              <AreaChart
                title="Registrations"
                caption="New students per month, last 12 months"
                data={overview.data?.registrations ?? []}
                height={200}
              />
            )}
          </div>
        </Panel>

        <Panel className="lg:col-span-2">
          <div className="p-4 sm:p-5">
            {overview.isLoading ? (
              <>
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-5 h-[176px] w-full" />
              </>
            ) : (
              <BarList
                title="Enrolments by programme"
                caption="Across every intake"
                data={overview.data?.byCourse ?? []}
                emptyLabel="No enrolments recorded yet"
              />
            )}
          </div>
        </Panel>
      </div>

      {/* ── Recent + activity ──────────────────────────────────────────── */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* Recent registrations */}
        <Panel
          title="Recent registrations"
          action={
            <Link to="/admin/students" className="group inline-flex items-center gap-1 font-sans text-[0.8125rem] text-slate-500 transition-colors hover:text-slate-900">
              View all <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          }
        >
          {recentStudents.isLoading ? (
            <TableSkeleton rows={5} cols={2} />
          ) : !recentStudents.data?.rows.length ? (
            <EmptyState
              Icon={Users}
              title="No students yet"
              body="Register the first student and they will appear here."
              action={
                can('admin', 'registrar') && (
                  <AdminButton variant="primary" Icon={UserPlus} onClick={() => navigate('/admin/students?new=1')}>
                    Register student
                  </AdminButton>
                )
              }
            />
          ) : (
            <ul className="divide-y divide-slate-200/8">
              {recentStudents.data.rows.map((s) => (
                <li key={s.id}>
                  <Link
                    to={`/admin/students/${s.id}`}
                    className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-slate-50/70 sm:px-5"
                  >
                    <Avatar name={`${s.first_name} ${s.last_name}`} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-sans text-[0.875rem] text-slate-900">
                        {s.first_name} {s.last_name}
                      </span>
                      <span className="block font-sans text-[0.75rem] text-slate-500 tabular-nums">
                        {s.student_no}
                      </span>
                    </span>
                    <span className="shrink-0 font-sans text-[0.75rem] text-slate-500">
                      {timeAgo(s.created_at)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Recent certificates */}
        <Panel
          title="Recent certificates"
          action={
            <Link to="/admin/certificates" className="group inline-flex items-center gap-1 font-sans text-[0.8125rem] text-slate-500 transition-colors hover:text-slate-900">
              View all <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          }
        >
          {recentCerts.isLoading ? (
            <TableSkeleton rows={5} cols={2} />
          ) : !recentCerts.data?.length ? (
            <EmptyState
              Icon={Award}
              title="No certificates yet"
              body="Certificates appear once a completed enrolment is certified."
              action={
                <AdminButton Icon={FileText} onClick={() => navigate('/admin/students')}>
                  Find a student
                </AdminButton>
              }
            />
          ) : (
            <ul className="divide-y divide-slate-200/8">
              {recentCerts.data.slice(0, 6).map((c) => (
                <li key={c.id}>
                  <Link
                    to={`/admin/students/${c.student.id}`}
                    className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-slate-50/70 sm:px-5"
                  >
                    <span className={cn(
                      'grid size-8 shrink-0 place-items-center rounded-full',
                      c.status === 'valid' ? 'bg-emerald-600/10 text-emerald-700' : 'bg-red-600/10 text-red-700',
                    )}>
                      {c.status === 'valid' ? <Award className="size-3.5" /> : <Ban className="size-3.5" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-sans text-[0.875rem] text-slate-900">
                        {c.student.first_name} {c.student.last_name}
                      </span>
                      <span className="block font-sans text-[0.75rem] text-slate-500 tabular-nums">
                        {c.certificate_no}
                      </span>
                    </span>
                    <Badge tone={c.status === 'valid' ? 'valid' : 'revoked'}>{c.status}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Activity feed — admin only, because the audit log is admin-only by RLS */}
        {can('admin') ? (
          <Panel title="Activity" description="Audit trail">
            {activity.isLoading ? (
              <TableSkeleton rows={5} cols={2} />
            ) : !activity.data?.length ? (
              <EmptyState
                Icon={Activity}
                title="Nothing recorded yet"
                body="Registrations, certificate issues and revocations are logged here."
              />
            ) : (
              <ul className="divide-y divide-slate-200/8">
                {activity.data.map((a) => {
                  const meta = ACTION_META[a.action] ?? {
                    Icon: Activity, tint: 'text-slate-600 bg-slate-400/10', verb: a.action,
                  };
                  const subject =
                    (a.detail?.student_no as string) ?? (a.detail?.certificate_no as string) ?? '';
                  return (
                    <li key={a.id} className="flex items-start gap-3 px-4 py-2.5 sm:px-5">
                      <span className={cn('mt-0.5 grid size-7 shrink-0 place-items-center rounded-full', meta.tint)}>
                        <meta.Icon className="size-3" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-sans text-[0.8125rem] leading-snug text-slate-700">
                          <span className="font-medium text-slate-900">
                            {a.actor_profile?.full_name || a.actor_profile?.email || 'Someone'}
                          </span>{' '}
                          {meta.verb}{' '}
                          {subject && <span className="tabular-nums">{subject}</span>}
                        </span>
                        <span className="mt-0.5 block font-sans text-[0.75rem] text-slate-500">
                          {timeAgo(a.created_at)}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        ) : (
          <Panel title="Quick actions">
            <div className="space-y-2 p-4">
              {[
                { label: 'Register a student', Icon: UserPlus, to: '/admin/students?new=1' },
                { label: 'Create an intake', Icon: Plus, to: '/admin/intakes?new=1' },
                { label: 'Browse certificates', Icon: Award, to: '/admin/certificates' },
              ].map((a) => (
                <Link
                  key={a.label}
                  to={a.to}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 font-sans text-[0.875rem] text-slate-700 ring-1 ring-slate-300/12 transition-colors hover:bg-slate-50 hover:ring-slate-300/25"
                >
                  <a.Icon className="size-4 text-slate-500" />
                  {a.label}
                  <ArrowRight className="ml-auto size-3.5 text-slate-400" />
                </Link>
              ))}
            </div>
          </Panel>
        )}
      </div>
    </>
  );
}

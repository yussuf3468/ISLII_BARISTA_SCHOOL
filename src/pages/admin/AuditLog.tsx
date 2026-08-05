import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ScrollText, UserPlus, ShieldCheck, Ban, Activity, Download } from 'lucide-react';
import { fetchAuditLog } from '@/features/admin/api';
import {
  PageHeader, Panel, Toolbar, SelectFilter, Pagination, EmptyState, ErrorNote,
  TableSkeleton, Avatar, Badge,
} from '@/components/admin/AdminUI';
import { AdminButton } from '@/components/admin/Menu';
import { useToast } from '@/components/admin/Toast';
import { downloadCsv, toCsv } from '@/features/admin/csv';
import { useAuth } from '@/features/auth/AuthProvider';
import { readableError } from '@/lib/supabase';
import { EASE_LUXE } from '@/lib/motion';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 30;

const ACTION_META: Record<string, { Icon: typeof UserPlus; tint: string; label: string }> = {
  'student.registered': { Icon: UserPlus, tint: 'bg-blue-50 text-blue-700 ring-blue-600/15', label: 'registered a student' },
  'certificate.issued': { Icon: ShieldCheck, tint: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15', label: 'issued a certificate' },
  'certificate.revoked': { Icon: Ban, tint: 'bg-red-50 text-red-700 ring-red-600/15', label: 'revoked a certificate' },
};

function when(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
  };
}

export default function AuditLog() {
  const { can } = useAuth();
  const toast = useToast();
  const [action, setAction] = useState<'all' | keyof typeof ACTION_META>('all');
  const [page, setPage] = useState(0);

  const query = useQuery({
    queryKey: ['audit', action, page],
    queryFn: () => fetchAuditLog({ action, page, pageSize: PAGE_SIZE }),
    enabled: can('admin'),
  });

  const rows = query.data?.rows ?? [];
  const total = query.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (!can('admin')) {
    return (
      <>
        <PageHeader eyebrow="System" title="Audit log" />
        <Panel>
          <EmptyState
            Icon={ScrollText}
            title="Admins only"
            body="The audit trail records who did what and when. It is restricted to administrators, and that restriction is enforced by the database rather than this page."
          />
        </Panel>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="System"
        title="Audit log"
        subtitle="Every registration, issue and revocation — immutable, and attributed."
        actions={
          <AdminButton
            Icon={Download}
            onClick={() => {
              if (!rows.length) return toast.info('Nothing to export');
              downloadCsv(
                `islii-audit-${new Date().toISOString().slice(0, 10)}.csv`,
                toCsv(
                  rows.map((r) => ({
                    at: r.created_at,
                    actor: r.actor_profile?.full_name || r.actor_profile?.email || '',
                    action: r.action,
                    detail: JSON.stringify(r.detail ?? {}),
                  })),
                  ['at', 'actor', 'action', 'detail'],
                ),
              );
              toast.success('Export ready', `${rows.length} entries`);
            }}
          >
            Export
          </AdminButton>
        }
      />

      <Toolbar>
        <SelectFilter
          id="audit-action" label="Action" value={action}
          onChange={(v) => { setAction(v); setPage(0); }}
          options={[
            { value: 'all', label: 'All activity' },
            { value: 'student.registered', label: 'Registrations' },
            { value: 'certificate.issued', label: 'Certificates issued' },
            { value: 'certificate.revoked', label: 'Certificates revoked' },
          ]}
        />
      </Toolbar>

      <Panel>
        {query.isError ? (
          <div className="p-6"><ErrorNote message={readableError(query.error)} retry={() => void query.refetch()} /></div>
        ) : query.isLoading ? (
          <TableSkeleton rows={8} cols={3} />
        ) : !rows.length ? (
          <EmptyState
            Icon={Activity}
            title={action === 'all' ? 'No activity recorded yet' : 'Nothing matching that filter'}
            body={
              action === 'all'
                ? 'Registrations, certificate issues and revocations will appear here as they happen.'
                : 'Try a different action filter.'
            }
            action={action !== 'all' ? <AdminButton onClick={() => setAction('all')}>Show all activity</AdminButton> : undefined}
          />
        ) : (
          <>
            {/* A timeline, not a table — audit entries are a narrative, and a
                grid of columns makes them read as inventory. */}
            <ol className="px-6 py-2">
              {rows.map((r, i) => {
                const meta = ACTION_META[r.action] ?? {
                  Icon: Activity, tint: 'bg-slate-400/8 text-slate-500 ring-slate-300/15', label: r.action,
                };
                const t = when(r.created_at);
                const subject = (r.detail?.certificate_no as string) ?? (r.detail?.student_no as string);
                const reason = r.detail?.reason as string | undefined;

                return (
                  <motion.li
                    key={r.id}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, ease: EASE_LUXE, delay: Math.min(i * 0.02, 0.3) }}
                    className="relative flex gap-4 py-4"
                  >
                    {i < rows.length - 1 && (
                      <span aria-hidden="true" className="absolute left-[17px] top-12 h-[calc(100%-2rem)] w-px bg-[rgba(122,94,66,0.14)]" />
                    )}

                    <span className={cn('relative z-[1] grid size-9 shrink-0 place-items-center rounded-xl ring-1', meta.tint)}>
                      <meta.Icon className="size-4" />
                    </span>

                    <div className="min-w-0 flex-1 pt-1">
                      <p className="font-sans text-[0.875rem] leading-snug text-slate-700">
                        <span className="font-semibold text-slate-900">
                          {r.actor_profile?.full_name || r.actor_profile?.email || 'System'}
                        </span>{' '}
                        {meta.label}
                        {subject && <span className="font-medium text-slate-900 tabular-nums"> {subject}</span>}
                      </p>
                      {reason && (
                        <p className="mt-1.5 rounded-lg bg-red-50 px-2.5 py-1.5 font-sans text-[0.8125rem] text-red-800 ring-1 ring-red-600/12">
                          “{reason}”
                        </p>
                      )}
                      <p className="mt-1 font-sans text-[0.75rem] text-slate-500 tabular-nums">
                        {t.date} · {t.time}
                      </p>
                    </div>

                    <div className="hidden shrink-0 items-center sm:flex">
                      <Avatar name={r.actor_profile?.full_name || r.actor_profile?.email || '?'} size="xs" />
                    </div>
                  </motion.li>
                );
              })}
            </ol>
            <Pagination page={page} pageCount={pageCount} total={total} pageSize={PAGE_SIZE} onPage={setPage} />
          </>
        )}
      </Panel>

      <p className="mt-4 flex items-center gap-2 font-sans text-[0.75rem] text-slate-500">
        <Badge tone="neutral">Append-only</Badge>
        The audit table has no update or delete policy, so history cannot be edited — including by an admin.
      </p>
    </>
  );
}

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Users2, ShieldCheck, Eye, PencilLine, Check, Database, KeyRound, Globe, Mail, Phone,
} from 'lucide-react';
import { fetchProfiles, updateProfileRole } from '@/features/admin/api';
import {
  PageHeader, Panel, Card, Badge, Avatar, Table, Th, Td, Tr, EmptyState, ErrorNote,
  TableSkeleton, DetailRow, SectionTitle, HAIRLINE, ELEVATION,
} from '@/components/admin/AdminUI';

import { useToast } from '@/components/admin/Toast';
import { useConfirm } from '@/components/admin/Overlay';
import { useAuth } from '@/features/auth/AuthProvider';
import { readableError } from '@/lib/supabase';
import { site } from '@/config/site';
import { EASE_LUXE } from '@/lib/motion';
import type { StaffRole } from '@/lib/db.types';
import { cn } from '@/lib/utils';

const ROLE_META: Record<StaffRole, { label: string; blurb: string; Icon: typeof ShieldCheck; tone: 'graduate' | 'enrolled' | 'neutral' }> = {
  admin: {
    label: 'Admin', tone: 'graduate', Icon: ShieldCheck,
    blurb: 'Full access. Can revoke certificates, delete records and manage the team.',
  },
  registrar: {
    label: 'Registrar', tone: 'enrolled', Icon: PencilLine,
    blurb: 'Registers students, manages intakes and issues certificates. Cannot revoke or delete.',
  },
  viewer: {
    label: 'Viewer', tone: 'neutral', Icon: Eye,
    blurb: 'Read-only. Sees records but cannot change anything.',
  },
};

export default function Settings() {
  const { profile: me, can } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [saving, setSaving] = useState<string | null>(null);

  const team = useQuery({ queryKey: ['profiles'], queryFn: fetchProfiles, enabled: can('admin') });

  const setRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: StaffRole }) => updateProfileRole(id, role),
    onSuccess: (p) => {
      void qc.invalidateQueries({ queryKey: ['profiles'] });
      toast.success('Role updated', `${p.full_name || p.email} is now ${p.role}`);
    },
    onError: (e) => toast.error('Could not update role', readableError(e)),
    onSettled: () => setSaving(null),
  });

  const askChange = async (id: string, name: string, role: StaffRole) => {
    if (role === 'admin') {
      const ok = await confirm({
        title: 'Grant full admin access?',
        body: (
          <>
            <strong className="font-medium text-slate-900">{name}</strong> will be able to revoke
            certificates, delete student records and change other people's roles — including yours.
          </>
        ),
        confirmLabel: 'Grant admin',
      });
      if (ok === null) return;
    }
    setSaving(id);
    setRole.mutate({ id, role });
  };

  return (
    <>
      <PageHeader
        eyebrow="System"
        title="Settings"
        subtitle="Your account, the team, and how this system is configured."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Account */}
        <div className="space-y-6">
          <Card inset>
            <SectionTitle>Your account</SectionTitle>
            <div className="mt-4 flex items-center gap-3.5">
              <Avatar name={me?.full_name || me?.email || '?'} size="lg" />
              <div className="min-w-0">
                <p className="truncate font-sans text-[0.9375rem] font-semibold text-slate-900">
                  {me?.full_name || '—'}
                </p>
                <p className="truncate font-sans text-[0.8125rem] text-slate-500">{me?.email}</p>
                <div className="mt-1.5">
                  {me && <Badge tone={ROLE_META[me.role].tone} dot>{ROLE_META[me.role].label}</Badge>}
                </div>
              </div>
            </div>
            {me && (
              <p className="mt-5 rounded-xl bg-[rgba(122,94,66,0.04)] p-3.5 font-sans text-[0.8125rem] leading-relaxed text-slate-500">
                {ROLE_META[me.role].blurb}
              </p>
            )}
          </Card>

          <Card inset>
            <SectionTitle>School details</SectionTitle>
            <p className="mb-3 font-sans text-[0.75rem] text-slate-500">
              Edited in <code className="rounded bg-slate-400/10 px-1 py-0.5">src/config/site.ts</code>
            </p>
            <dl>
              <DetailRow label={<span className="inline-flex items-center gap-1.5"><Globe className="size-3" />Website</span>} value={site.url.replace('https://', '')} />
              <DetailRow label={<span className="inline-flex items-center gap-1.5"><Phone className="size-3" />Phone</span>} value={site.phone.display} />
              <DetailRow label={<span className="inline-flex items-center gap-1.5"><Mail className="size-3" />Email</span>} value={site.email.display} />
              <DetailRow label="Verification" value={`${site.url.replace('https://', '')}/verify`} />
            </dl>
          </Card>
        </div>

        {/* Team */}
        <div className="lg:col-span-2">
          <Panel
            title="Team"
            description={can('admin') ? 'Change what each teammate can do.' : 'Only an admin can manage roles.'}
          >
            {!can('admin') ? (
              <EmptyState
                Icon={Users2}
                title="Admins only"
                body="Team management is restricted to administrators. Ask an admin if you need access changed."
              />
            ) : team.isLoading ? (
              <TableSkeleton rows={4} cols={3} />
            ) : team.isError ? (
              <div className="p-6"><ErrorNote message={readableError(team.error)} retry={() => void team.refetch()} /></div>
            ) : !team.data?.length ? (
              <EmptyState Icon={Users2} title="No staff accounts yet" body="Create users in Supabase → Authentication." />
            ) : (
              <Table minWidth="40rem">
                <thead>
                  <tr><Th>Person</Th><Th>Role</Th><Th className="text-right">Change to</Th></tr>
                </thead>
                <tbody>
                  {team.data.map((p) => {
                    const isMe = p.id === me?.id;
                    return (
                      <Tr key={p.id}>
                        <Td>
                          <span className="flex items-center gap-2.5">
                            <Avatar name={p.full_name || p.email} size="sm" />
                            <span className="min-w-0">
                              <span className="block truncate font-medium text-slate-900">
                                {p.full_name || p.email.split('@')[0]}
                                {isMe && <span className="ml-1.5 font-normal text-slate-400">you</span>}
                              </span>
                              <span className="block truncate text-[0.75rem] text-slate-500">{p.email}</span>
                            </span>
                          </span>
                        </Td>
                        <Td><Badge tone={ROLE_META[p.role].tone} dot>{ROLE_META[p.role].label}</Badge></Td>
                        <Td>
                          <div className="flex justify-end gap-1">
                            {(Object.keys(ROLE_META) as StaffRole[]).map((r) => (
                              <button
                                key={r}
                                type="button"
                                disabled={p.role === r || isMe || saving === p.id}
                                onClick={() => void askChange(p.id, p.full_name || p.email, r)}
                                title={isMe ? 'You cannot change your own role' : `Make ${r}`}
                                className={cn(
                                  'rounded-lg px-2.5 py-1.5 font-sans text-[0.75rem] font-medium transition-all',
                                  p.role === r
                                    ? 'bg-slate-900 text-white'
                                    : 'text-slate-500 ring-1 ring-[rgba(122,94,66,0.18)] hover:bg-white hover:text-slate-900',
                                  (isMe || saving === p.id) && 'cursor-not-allowed opacity-40',
                                )}
                              >
                                {p.role === r && <Check className="mr-1 inline size-3" />}
                                {ROLE_META[r].label}
                              </button>
                            ))}
                          </div>
                        </Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </Panel>

          {/* Role reference */}
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {(Object.keys(ROLE_META) as StaffRole[]).map((r, i) => {
              const m = ROLE_META[r];
              return (
                <motion.div
                  key={r}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: EASE_LUXE, delay: i * 0.05 }}
                  className={cn('rounded-2xl bg-white p-4', HAIRLINE, ELEVATION.raised)}
                >
                  <span className="grid size-8 place-items-center rounded-lg bg-slate-400/8 text-slate-500">
                    <m.Icon className="size-4" />
                  </span>
                  <p className="mt-3 font-sans text-[0.875rem] font-semibold text-slate-900">{m.label}</p>
                  <p className="mt-1 font-sans text-[0.75rem] leading-relaxed text-slate-500">{m.blurb}</p>
                </motion.div>
              );
            })}
          </div>

          <Card className="mt-6" inset>
            <SectionTitle>How access is enforced</SectionTitle>
            <p className="font-sans text-[0.875rem] leading-relaxed text-slate-500">
              These roles are not enforced by the interface. Every read and write is checked by
              Row-Level Security inside Postgres, so a modified frontend gains nothing — hidden
              buttons are a convenience, the database is the boundary.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { Icon: Database, label: 'Row-Level Security' },
                { Icon: KeyRound, label: 'Service role never in the browser' },
                { Icon: ShieldCheck, label: 'Certificates are revocable, never deletable' },
              ].map((x) => (
                <span key={x.label} className="inline-flex items-center gap-1.5 rounded-lg bg-[rgba(122,94,66,0.05)] px-2.5 py-1.5 font-sans text-[0.75rem] text-slate-500">
                  <x.Icon className="size-3" /> {x.label}
                </span>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {dialog}
    </>
  );
}

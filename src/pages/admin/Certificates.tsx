import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Award, Download, ExternalLink, Ban, QrCode, Printer, Eye, Copy, Check, ShieldCheck,
} from 'lucide-react';
import { fetchCertificates, certificatePdfUrl, revokeCertificate } from '@/features/admin/api';
import {
  PageHeader, Panel, Table, Th, SortableTh, Td, Tr, Badge, Avatar, Toolbar,
  SearchInput, SelectFilter, Pagination, EmptyState, ErrorNote, TableSkeleton, DetailRow,
  type SortDir,
} from '@/components/admin/AdminUI';
import { ActionMenu, AdminButton } from '@/components/admin/Menu';
import { Modal, useConfirm } from '@/components/admin/Overlay';
import { QrPreview } from '@/components/admin/QrPreview';
import { useToast } from '@/components/admin/Toast';
import { useAuth } from '@/features/auth/AuthProvider';
import { readableError } from '@/lib/supabase';
import { useCopy } from '@/lib/hooks';
import { site } from '@/config/site';
import { downloadCsv, toCsv } from '@/features/admin/csv';
import type { CertificateRow } from '@/lib/db.types';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;
type StatusFilter = 'all' | 'valid' | 'revoked';
type SortField = 'issued_at' | 'certificate_no';

const fmt = (d: string) =>
  new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/* ── Detail / QR drawer ───────────────────────────────────────────────── */

function CertificateModal({
  cert, onClose, onRevoke,
}: {
  cert: CertificateRow | null;
  onClose: () => void;
  onRevoke: (c: CertificateRow) => void;
}) {
  const toast = useToast();
  const { can } = useAuth();
  const { copied, copy } = useCopy();
  const verifyUrl = cert ? `${site.url}/verify/${cert.verify_token}` : '';

  const openPdf = async () => {
    if (!cert?.pdf_path) return;
    const url = await certificatePdfUrl(cert.pdf_path);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
    else toast.error('Could not open the PDF', 'The signed link could not be created.');
  };

  /**
   * Printing opens the stored PDF in a new tab rather than printing the DOM.
   * The PDF is the artifact of record — printing an HTML approximation of it
   * would produce a document that does not match what was issued.
   */
  const print = async () => {
    if (!cert?.pdf_path) return;
    const url = await certificatePdfUrl(cert.pdf_path);
    if (!url) return toast.error('Could not open the PDF');
    const w = window.open(url, '_blank', 'noopener,noreferrer');
    if (!w) toast.info('Allow pop-ups to print', 'Your browser blocked the certificate window.');
  };

  return (
    <Modal
      open={cert !== null}
      onClose={onClose}
      title={cert?.certificate_no ?? ''}
      description={cert ? `Issued ${fmt(cert.issued_at)}` : undefined}
      size="lg"
      footer={
        cert && (
          <>
            {can('admin') && cert.status === 'valid' && (
              <AdminButton variant="ghost" Icon={Ban} onClick={() => onRevoke(cert)}>
                Revoke
              </AdminButton>
            )}
            {cert.pdf_path && (
              <>
                <AdminButton Icon={Printer} onClick={() => void print()}>Print</AdminButton>
                <AdminButton variant="primary" Icon={Download} onClick={() => void openPdf()}>
                  Download PDF
                </AdminButton>
              </>
            )}
          </>
        )
      }
    >
      {cert && (
        <div className="grid gap-6 sm:grid-cols-[auto_1fr]">
          <div>
            <QrPreview value={verifyUrl} size={168} showUrl={false} />
            <button
              type="button"
              onClick={() => { copy(verifyUrl); toast.success('Verification link copied'); }}
              className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-md px-2 py-1.5 font-sans text-[0.75rem] text-slate-500 ring-1 ring-slate-300/20 transition-colors hover:bg-slate-50"
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? 'Copied' : 'Copy link'}
            </button>
          </div>

          <div>
            <div className="mb-4 flex items-center gap-3">
              <Avatar name={`${cert.student.first_name} ${cert.student.last_name}`} size="md" />
              <div className="min-w-0">
                <Link
                  to={`/admin/students/${cert.student.id}`}
                  className="block truncate font-sans text-[0.9375rem] font-medium text-slate-900 underline-offset-4 hover:underline"
                >
                  {cert.student.first_name} {cert.student.last_name}
                </Link>
                <p className="font-sans text-[0.75rem] text-slate-500 tabular-nums">
                  {cert.student.student_no}
                </p>
              </div>
            </div>

            <dl>
              <DetailRow label="Status" value={
                <Badge tone={cert.status === 'valid' ? 'valid' : 'revoked'} dot>{cert.status}</Badge>
              } />
              <DetailRow label="Certificate No." value={<span className="tabular-nums">{cert.certificate_no}</span>} />
              <DetailRow label="Issued" value={fmt(cert.issued_at)} />
              {cert.status === 'revoked' && (
                <>
                  <DetailRow label="Revoked" value={cert.revoked_at ? fmt(cert.revoked_at) : '—'} />
                  <DetailRow label="Reason" value={cert.revoked_reason} />
                </>
              )}
            </dl>

            <a
              href={verifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 font-sans text-[0.8125rem] text-gold-700 underline underline-offset-4"
            >
              <ExternalLink className="size-3.5" />
              Open the public verification page
            </a>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────── */

export default function Certificates() {
  const { can } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();

  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<{ field: SortField; dir: SortDir }>({ field: 'issued_at', dir: 'desc' });
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState<CertificateRow | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search); setPage(0); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const query = useQuery({
    queryKey: ['certificates', debounced],
    queryFn: () => fetchCertificates(debounced),
  });

  const revoke = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => revokeCertificate(id, reason),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['certificates'] });
      void qc.invalidateQueries({ queryKey: ['overview'] });
      void qc.invalidateQueries({ queryKey: ['activity'] });
      setDetail(null);
      toast.success('Certificate revoked', 'Its QR now reports the certificate as revoked.');
    },
    onError: (e) => toast.error('Could not revoke', readableError(e)),
  });

  /**
   * Status filter and sort are applied here rather than in the query.
   *
   * `fetchCertificates` already returns the full (capped) set for the search
   * term, so re-querying per filter change would be a round trip for data the
   * client is holding. This is the one list where that is true — students are
   * paginated server-side because the register can grow without bound.
   */
  const filtered = useMemo(() => {
    const rows = (query.data ?? []).filter((c) => status === 'all' || c.status === status);
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) =>
      sort.field === 'issued_at'
        ? (new Date(a.issued_at).getTime() - new Date(b.issued_at).getTime()) * dir
        : a.certificate_no.localeCompare(b.certificate_no) * dir,
    );
  }, [query.data, status, sort]);

  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const isFiltered = Boolean(debounced) || status !== 'all';

  const onSort = (field: SortField) => {
    setSort((s) => ({ field, dir: s.field === field && s.dir === 'desc' ? 'asc' : 'desc' }));
    setPage(0);
  };

  const askRevoke = async (c: CertificateRow) => {
    const reason = await confirm({
      title: 'Revoke this certificate?',
      body: (
        <>
          <strong className="font-medium text-slate-900">{c.certificate_no}</strong>, issued to{' '}
          {c.student.first_name} {c.student.last_name}, will be marked revoked. Its QR code keeps
          working and will report it as revoked — it is never deleted, because a code that returned
          "not found" would be indistinguishable from a forgery.
        </>
      ),
      confirmLabel: 'Revoke certificate',
      reasonLabel: 'Reason (recorded permanently)',
    });
    if (reason !== null) revoke.mutate({ id: c.id, reason });
  };

  const exportCsv = () => {
    if (!filtered.length) return toast.info('Nothing to export');
    downloadCsv(
      `islii-certificates-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv(
        filtered.map((c) => ({
          certificate_no: c.certificate_no,
          student_no: c.student.student_no,
          student: `${c.student.first_name} ${c.student.last_name}`,
          status: c.status,
          issued: new Date(c.issued_at).toISOString().slice(0, 10),
          verify_url: `${site.url}/verify/${c.verify_token}`,
        })),
        ['certificate_no', 'student_no', 'student', 'status', 'issued', 'verify_url'],
      ),
    );
    toast.success('Export ready', `${filtered.length} certificate(s)`);
  };

  return (
    <>
      <PageHeader
        eyebrow="Records"
        title="Certificates"
        subtitle={query.isLoading ? 'Loading…' : `${total.toLocaleString('en-KE')} ${isFiltered ? 'matching' : 'issued'}`}
        actions={<AdminButton Icon={Download} onClick={exportCsv}>Export</AdminButton>}
      />

      <Toolbar>
        <SearchInput id="cert-search" value={search} onChange={setSearch} placeholder="Search certificate number" />
        <SelectFilter
          id="cert-status" label="Status" value={status}
          onChange={(v) => { setStatus(v); setPage(0); }}
          options={[
            { value: 'all', label: 'All certificates' },
            { value: 'valid', label: 'Valid only' },
            { value: 'revoked', label: 'Revoked only' },
          ]}
        />
      </Toolbar>

      <Panel>
        {query.isError ? (
          <div className="p-5">
            <ErrorNote message={readableError(query.error)} retry={() => void query.refetch()} />
          </div>
        ) : query.isLoading ? (
          <TableSkeleton rows={8} cols={5} />
        ) : !rows.length ? (
          <EmptyState
            Icon={Award}
            title={isFiltered ? 'No matching certificates' : 'No certificates issued yet'}
            body={
              isFiltered
                ? 'Try a different number, or clear the status filter.'
                : 'A certificate is issued from a student’s completed enrolment. Open a student, mark their enrolment complete, then issue.'
            }
            action={
              isFiltered ? (
                <AdminButton onClick={() => { setSearch(''); setStatus('all'); }}>Clear filters</AdminButton>
              ) : (
                <AdminButton variant="primary" Icon={ShieldCheck} as="link" to="/admin/students">
                  Go to students
                </AdminButton>
              )
            }
          />
        ) : (
          <div className={cn(query.isFetching && 'opacity-60 transition-opacity')}>
            <Table minWidth="52rem">
              <thead>
                <tr>
                  <SortableTh field="certificate_no" sort={sort} onSort={onSort}>Certificate No.</SortableTh>
                  <Th>Student</Th>
                  <SortableTh field="issued_at" sort={sort} onSort={onSort}>Issued</SortableTh>
                  <Th>Status</Th>
                  <Th className="w-px" />
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <Tr key={c.id} onClick={() => setDetail(c)}>
                    <Td className="font-medium text-slate-900 tabular-nums">{c.certificate_no}</Td>
                    <Td>
                      <span className="flex items-center gap-2.5">
                        <Avatar name={`${c.student.first_name} ${c.student.last_name}`} size="sm" />
                        <span className="min-w-0">
                          <span className="block truncate text-slate-900">
                            {c.student.first_name} {c.student.last_name}
                          </span>
                          <span className="block text-[0.75rem] text-slate-500 tabular-nums">
                            {c.student.student_no}
                          </span>
                        </span>
                      </span>
                    </Td>
                    <Td className="tabular-nums">{fmt(c.issued_at)}</Td>
                    <Td>
                      <Badge tone={c.status === 'valid' ? 'valid' : 'revoked'} dot>{c.status}</Badge>
                      {c.status === 'revoked' && c.revoked_reason && (
                        <p className="mt-1 max-w-[16rem] truncate text-[0.75rem] text-slate-500">
                          {c.revoked_reason}
                        </p>
                      )}
                    </Td>
                    <Td>
                      <span onClick={(e) => e.stopPropagation()}>
                        <ActionMenu
                          label={`Actions for ${c.certificate_no}`}
                          items={[
                            { label: 'View & QR code', Icon: QrCode, onSelect: () => setDetail(c) },
                            {
                              label: 'Download PDF', Icon: Download, disabled: !c.pdf_path,
                              onSelect: async () => {
                                if (!c.pdf_path) return;
                                const url = await certificatePdfUrl(c.pdf_path);
                                if (url) window.open(url, '_blank', 'noopener,noreferrer');
                                else toast.error('Could not open the PDF');
                              },
                            },
                            {
                              label: 'Public verification', Icon: Eye,
                              onSelect: () =>
                                window.open(`${site.url}/verify/${c.verify_token}`, '_blank', 'noopener,noreferrer'),
                            },
                            ...(can('admin') && c.status === 'valid'
                              ? [{
                                  label: 'Revoke', Icon: Ban, tone: 'danger' as const,
                                  separatorBefore: true, onSelect: () => void askRevoke(c),
                                }]
                              : []),
                          ]}
                        />
                      </span>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
            <Pagination page={page} pageCount={pageCount} total={total} pageSize={PAGE_SIZE} onPage={setPage} />
          </div>
        )}
      </Panel>

      <p className="mt-4 font-sans text-[0.75rem] leading-relaxed text-slate-500">
        Certificates are never deleted. Withdrawing one revokes it, so its QR keeps resolving and
        reports the certificate as revoked.
      </p>

      <CertificateModal cert={detail} onClose={() => setDetail(null)} onRevoke={(c) => void askRevoke(c)} />
      {dialog}
    </>
  );
}

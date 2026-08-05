import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Users, UserPlus, Upload, Download, Eye, Pencil, Trash2, FileSpreadsheet,
  CheckCircle2, AlertTriangle, LayoutGrid, List, Phone, Mail,
} from 'lucide-react';
import {
  fetchStudents, registerStudent, updateStudent, deleteStudent,
  type StudentStatusFilter, type StudentPeriodFilter, type StudentSortField, type StudentRow,
} from '@/features/admin/api';
import {
  exportStudents, parseStudentCsv, importStudents, downloadCsv,
  CSV_TEMPLATE, type ParsedRow, type ImportOutcome,
} from '@/features/admin/csv';
import {
  PageHeader, Panel, Table, Th, SortableTh, Td, Tr, Badge, Avatar, Toolbar,
  SearchInput, SelectFilter, Pagination, EmptyState, ErrorNote, TableSkeleton,
  Field, inputClass, inputErrorClass, Checkbox, SelectionBar, SelectionAction,
  MobileList, MobileRow, Segmented, HAIRLINE, ELEVATION, type SortDir,
} from '@/components/admin/AdminUI';
import { ActionMenu, AdminButton } from '@/components/admin/Menu';
import { Modal, useConfirm } from '@/components/admin/Overlay';
import { RegistrationWizard } from '@/components/admin/RegistrationWizard';
import { useToast } from '@/components/admin/Toast';
import { useAuth } from '@/features/auth/AuthProvider';
import { readableError, publicFileUrl } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 25;
const VIEW_KEY = 'islii.admin.students.view';
const KENYAN_PHONE = /^(?:\+?254|0)?[17]\d{8}$/;

const schema = z.object({
  first_name: z.string().trim().min(2, 'Required.').max(60),
  last_name: z.string().trim().min(2, 'Required.').max(60),
  phone: z
    .string().trim()
    .transform((v) => v.replace(/[\s()-]/g, ''))
    .refine((v) => v === '' || KENYAN_PHONE.test(v), 'Enter a valid Kenyan number.')
    .optional(),
  email: z.string().trim().email('Invalid email.').optional().or(z.literal('')),
  national_id: z.string().trim().max(30).optional(),
  notes: z.string().trim().max(500).optional(),
});
type Values = z.infer<typeof schema>;

/* ── Register / edit ──────────────────────────────────────────────────── */

function StudentFormModal({
  open, onClose, editing,
}: {
  open: boolean;
  onClose: () => void;
  editing: StudentRow | null;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const [created, setCreated] = useState<{ no: string; name: string } | null>(null);

  const {
    register, handleSubmit, reset, formState: { errors, isDirty },
  } = useForm<Values>({ resolver: zodResolver(schema), mode: 'onBlur' });

  useEffect(() => {
    if (!open) return;
    setCreated(null);
    reset(
      editing
        ? {
            first_name: editing.first_name, last_name: editing.last_name,
            phone: editing.phone ?? '', email: editing.email ?? '',
            national_id: editing.national_id ?? '', notes: editing.notes ?? '',
          }
        : { first_name: '', last_name: '', phone: '', email: '', national_id: '', notes: '' },
    );
  }, [open, editing, reset]);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['students'] });
    void qc.invalidateQueries({ queryKey: ['overview'] });
    void qc.invalidateQueries({ queryKey: ['activity'] });
  };

  const save = useMutation({
    mutationFn: async (v: Values) => {
      if (editing) {
        return updateStudent(editing.id, {
          first_name: v.first_name, last_name: v.last_name,
          phone: v.phone || null, email: v.email || null,
          national_id: v.national_id || null, notes: v.notes || null,
        });
      }
      return registerStudent(v);
    },
    onSuccess: (student) => {
      invalidate();
      if (editing) {
        toast.success('Student updated', `${student.first_name} ${student.last_name}`);
        onClose();
      } else {
        setCreated({ no: student.student_no, name: `${student.first_name} ${student.last_name}` });
        toast.success('Student registered', `Number ${student.student_no} allocated`);
      }
    },
    onError: (e) => toast.error('Could not save', readableError(e)),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit student' : created ? 'Student registered' : 'Register a student'}
      description={editing ? undefined : created ? undefined : 'A student number is allocated automatically.'}
      // Once the record is created there is nothing left to lose, so the
      // success screen closes freely.
      dirty={isDirty && !created}
      footer={
        created ? (
          <>
            <AdminButton onClick={() => { setCreated(null); reset(); }}>Register another</AdminButton>
            <AdminButton variant="primary" onClick={onClose}>Done</AdminButton>
          </>
        ) : (
          <>
            <AdminButton variant="ghost" onClick={onClose}>Cancel</AdminButton>
            <AdminButton
              variant="primary"
              disabled={save.isPending}
              onClick={() => void handleSubmit((v) => save.mutate(v))()}
            >
              {save.isPending ? 'Saving…' : editing ? 'Save changes' : 'Register student'}
            </AdminButton>
          </>
        )
      }
    >
      {created ? (
        <div className="py-4 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-emerald-600/10 text-emerald-700">
            <CheckCircle2 className="size-6" />
          </span>
          <p className="mt-4 font-sans text-[0.9375rem] text-slate-600">{created.name}</p>
          <p className="mt-3 font-sans text-[0.6875rem] uppercase tracking-[0.16em] text-slate-500">
            Student number
          </p>
          <p className="mt-1.5 font-sans text-3xl font-medium tracking-[-0.02em] text-slate-900">
            {created.no}
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit((v) => save.mutate(v))} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name" htmlFor="first_name" error={errors.first_name?.message}>
              <input id="first_name" autoComplete="given-name"
                className={cn(inputClass, errors.first_name && inputErrorClass)} {...register('first_name')} />
            </Field>
            <Field label="Last name" htmlFor="last_name" error={errors.last_name?.message}>
              <input id="last_name" autoComplete="family-name"
                className={cn(inputClass, errors.last_name && inputErrorClass)} {...register('last_name')} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone" htmlFor="phone" optional error={errors.phone?.message}>
              <input id="phone" inputMode="tel" placeholder="0712 345678"
                className={cn(inputClass, errors.phone && inputErrorClass)} {...register('phone')} />
            </Field>
            <Field label="Email" htmlFor="email" optional error={errors.email?.message}>
              <input id="email" type="email"
                className={cn(inputClass, errors.email && inputErrorClass)} {...register('email')} />
            </Field>
          </div>
          <Field label="National ID" htmlFor="national_id" optional
            hint="Stored for identity checks only. Never shown publicly.">
            <input id="national_id" className={inputClass} {...register('national_id')} />
          </Field>
          <Field label="Notes" htmlFor="notes" optional>
            <textarea id="notes" rows={3} className={cn(inputClass, 'resize-y')} {...register('notes')} />
          </Field>
        </form>
      )}
    </Modal>
  );
}

/* ── CSV import ───────────────────────────────────────────────────────── */

function ImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [headerError, setHeaderError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [outcome, setOutcome] = useState<ImportOutcome | null>(null);

  const reset = () => {
    setRows(null); setHeaderError(null); setProgress(null); setOutcome(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  useEffect(() => { if (open) reset(); }, [open]);

  const onFile = async (file: File) => {
    const text = await file.text();
    const parsed = parseStudentCsv(text);
    setHeaderError(parsed.headerError ?? null);
    setRows(parsed.headerError ? null : parsed.rows);
  };

  const run = async () => {
    if (!rows) return;
    setProgress({ done: 0, total: rows.filter((r) => !r.error).length });
    const result = await importStudents(rows, (done, total) => setProgress({ done, total }));
    setOutcome(result);
    setProgress(null);
    void qc.invalidateQueries({ queryKey: ['students'] });
    void qc.invalidateQueries({ queryKey: ['overview'] });
    if (result.created) toast.success(`Imported ${result.created} student${result.created === 1 ? '' : 's'}`);
    if (result.failed.length) toast.error(`${result.failed.length} row(s) could not be imported`);
  };

  const valid = rows?.filter((r) => !r.error).length ?? 0;
  const invalid = rows?.filter((r) => r.error).length ?? 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Import students from CSV"
      description="Each row becomes a student with an automatically allocated number."
      size="lg"
      footer={
        outcome ? (
          <AdminButton variant="primary" onClick={onClose}>Close</AdminButton>
        ) : (
          <>
            <AdminButton variant="ghost" onClick={onClose}>Cancel</AdminButton>
            <AdminButton
              variant="primary"
              disabled={!valid || progress !== null}
              onClick={() => void run()}
            >
              {progress ? `Importing ${progress.done}/${progress.total}…` : `Import ${valid} student${valid === 1 ? '' : 's'}`}
            </AdminButton>
          </>
        )
      }
    >
      {outcome ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg bg-emerald-600/[0.07] p-4 ring-1 ring-emerald-600/20">
            <CheckCircle2 className="size-5 shrink-0 text-emerald-700" />
            <p className="font-sans text-[0.9375rem] text-emerald-900">
              {outcome.created} student{outcome.created === 1 ? '' : 's'} imported.
            </p>
          </div>
          {outcome.failed.length > 0 && (
            <div className="rounded-lg bg-red-600/[0.05] p-4 ring-1 ring-red-600/20">
              <p className="mb-2 font-sans text-[0.875rem] font-medium text-red-800">
                {outcome.failed.length} row{outcome.failed.length === 1 ? '' : 's'} skipped
              </p>
              <ul className="max-h-48 space-y-1 overflow-y-auto">
                {outcome.failed.map((f) => (
                  <li key={`${f.line}-${f.name}`} className="font-sans text-[0.8125rem] text-red-800">
                    Line {f.line} · {f.name} — {f.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => e.target.files?.[0] && void onFile(e.target.files[0])}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:font-sans file:text-[0.8125rem] file:text-white hover:file:bg-slate-800"
            />
          </div>

          <button
            type="button"
            onClick={() => downloadCsv('islii-student-import-template.csv', CSV_TEMPLATE)}
            className="inline-flex items-center gap-1.5 font-sans text-[0.8125rem] text-gold-700 underline underline-offset-4"
          >
            <FileSpreadsheet className="size-3.5" />
            Download the template
          </button>

          {headerError && <ErrorNote message={headerError} />}

          {rows && (
            <>
              <div className="flex flex-wrap gap-2">
                <Badge tone="valid">{valid} ready</Badge>
                {invalid > 0 && <Badge tone="revoked">{invalid} with problems</Badge>}
              </div>

              <div className="max-h-64 overflow-y-auto rounded-lg ring-1 ring-slate-300/15">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr>
                      {['Line', 'Name', 'Phone', 'Status'].map((h) => (
                        <th key={h} className="px-3 py-2 font-sans text-[0.6875rem] uppercase tracking-[0.12em] text-slate-500">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.line} className="border-t border-slate-200/8">
                        <td className="px-3 py-1.5 font-sans text-[0.8125rem] text-slate-500 tabular-nums">{r.line}</td>
                        <td className="px-3 py-1.5 font-sans text-[0.8125rem] text-slate-900">
                          {r.data.first_name} {r.data.last_name}
                        </td>
                        <td className="px-3 py-1.5 font-sans text-[0.8125rem] text-slate-500 tabular-nums">
                          {r.data.phone ?? '—'}
                        </td>
                        <td className="px-3 py-1.5">
                          {r.error ? (
                            <span className="inline-flex items-center gap-1 font-sans text-[0.75rem] text-red-700">
                              <AlertTriangle className="size-3" /> {r.error}
                            </span>
                          ) : (
                            <span className="font-sans text-[0.75rem] text-emerald-700">Ready</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────── */

export default function Students() {
  const { can } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [params, setParams] = useSearchParams();

  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState<StudentStatusFilter>('all');
  const [period, setPeriod] = useState<StudentPeriodFilter>('all');
  const [sort, setSort] = useState<{ field: StudentSortField; dir: SortDir }>({
    field: 'created_at', dir: 'desc',
  });
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<StudentRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [view, setView] = useState<'table' | 'grid'>(() => {
    try {
      return localStorage.getItem(VIEW_KEY) === 'grid' ? 'grid' : 'table';
    } catch {
      return 'table';
    }
  });

  const changeView = (v: 'table' | 'grid') => {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch { /* not worth failing a click over */ }
  };

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search); setPage(0); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (params.get('new') === '1') {
      setEditing(null);
      setFormOpen(true);
      params.delete('new');
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  const query = useQuery({
    queryKey: ['students', debounced, status, period, sort.field, sort.dir, page],
    queryFn: () => fetchStudents({
      search: debounced, status, period,
      sortField: sort.field, sortDir: sort.dir,
      page, pageSize: PAGE_SIZE,
    }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteStudent(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['students'] });
      void qc.invalidateQueries({ queryKey: ['overview'] });
      toast.success('Student deleted');
    },
    onError: (e) => toast.error('Could not delete', readableError(e)),
  });

  const onSort = (field: StudentSortField) => {
    setSort((s) => ({ field, dir: s.field === field && s.dir === 'desc' ? 'asc' : 'desc' }));
    setPage(0);
  };

  const rows = query.data?.rows ?? [];
  const total = query.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = debounced || status !== 'all' || period !== 'all';

  /* ── Selection ────────────────────────────────────────────────────────
     Scoped to the rows currently on screen, and cleared whenever the query
     changes. Selection that survives a filter change is how someone ends up
     deleting two hundred records they cannot see — the count in the bar has to
     mean the rows in front of them. */
  useEffect(() => {
    setSelected(new Set());
  }, [debounced, status, period, sort.field, sort.dir, page]);

  const selectedRows = rows.filter((r) => selected.has(r.id));
  const allOnPage = rows.length > 0 && rows.every((r) => selected.has(r.id));

  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelected(allOnPage ? new Set() : new Set(rows.map((r) => r.id)));

  /* ── Why there is no bulk delete ──────────────────────────────────────
     There was one, behind a type-DELETE confirmation, and it was still wrong.
     "Select all" followed by "Delete" is two clicks from an empty register,
     and a school has no routine task that needs it: students leave by being
     marked withdrawn, not by being erased. The confirmation only slowed down
     the accident — it did not make the capability worth having.

     Deleting a student remains available one record at a time from the row
     menu, where it is typed-confirmed against that student's own number and
     the operator is necessarily looking at the person they are removing.

     Selection now exists purely to export, which is why the checkboxes are no
     longer gated on the admin role: anyone who can read the list can already
     download it from the page header. */

  const exportSelected = () => {
    exportStudents(selectedRows);
    toast.success('Export ready', `${selectedRows.length} row(s) downloaded`);
  };

  const askDelete = async (s: StudentRow) => {
    const ok = await confirm({
      title: 'Delete this student?',
      body: (
        <>
          <strong className="font-medium text-slate-900">{s.first_name} {s.last_name}</strong> ({s.student_no})
          and their enrolment history will be removed. Issued certificates are never deleted — they
          remain verifiable. This cannot be undone.
        </>
      ),
      confirmLabel: 'Delete student',
      typeToConfirm: s.student_no,
    });
    if (ok !== null) remove.mutate(s.id);
  };

  return (
    <>
      <PageHeader
        eyebrow="People"
        title="Students"
        subtitle={
          query.isLoading ? 'Loading…' : `${total.toLocaleString('en-KE')} ${filtered ? 'matching' : 'registered'}`
        }
        actions={
          <>
            <AdminButton Icon={Download} onClick={() => {
              if (!rows.length) return toast.info('Nothing to export', 'No students match the current filters.');
              exportStudents(rows);
              toast.success('Export ready', `${rows.length} row(s) downloaded`);
            }}>
              Export
            </AdminButton>
            {can('admin', 'registrar') && (
              <>
                <AdminButton Icon={Upload} onClick={() => setImportOpen(true)}>Import CSV</AdminButton>
                <AdminButton variant="primary" Icon={UserPlus} onClick={() => { setEditing(null); setFormOpen(true); }}>
                  Register student
                </AdminButton>
              </>
            )}
          </>
        }
      />

      <Toolbar>
        <SearchInput id="student-search" value={search} onChange={setSearch} placeholder="Search name or student number" />
        <SelectFilter
          id="status-filter" label="Status" value={status}
          onChange={(v) => { setStatus(v); setPage(0); }}
          options={[
            { value: 'all', label: 'All students' },
            { value: 'active', label: 'Currently enrolled' },
            { value: 'graduate', label: 'Certified graduates' },
          ]}
        />
        <SelectFilter
          id="period-filter" label="Registered" value={period}
          onChange={(v) => { setPeriod(v); setPage(0); }}
          options={[
            { value: 'all', label: 'All time' },
            { value: 'month', label: 'This month' },
            { value: 'year', label: 'This year' },
          ]}
        />

        {/* Pushed to the far end: it changes how the data LOOKS, not which
            data is shown, so it should not sit among the filters. */}
        <div className="ml-auto hidden md:block">
          <Segmented
            label="View"
            value={view}
            onChange={changeView}
            options={[
              { value: 'table', label: 'Table view', Icon: List },
              { value: 'grid', label: 'Card view', Icon: LayoutGrid },
            ]}
          />
        </div>
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
            Icon={Users}
            title={filtered ? 'No matching students' : 'No students yet'}
            body={
              filtered
                ? 'Try a different search, or clear the filters.'
                : 'Register your first student, or import an existing register from a CSV file.'
            }
            action={
              filtered ? (
                <AdminButton onClick={() => { setSearch(''); setStatus('all'); setPeriod('all'); }}>
                  Clear filters
                </AdminButton>
              ) : can('admin', 'registrar') ? (
                <div className="flex flex-wrap justify-center gap-2.5">
                  <AdminButton variant="primary" Icon={UserPlus} onClick={() => { setEditing(null); setFormOpen(true); }}>
                    Register student
                  </AdminButton>
                  <AdminButton Icon={Upload} onClick={() => setImportOpen(true)}>Import CSV</AdminButton>
                </div>
              ) : undefined
            }
          />
        ) : (
          <div className={cn(query.isFetching && 'opacity-60 transition-opacity')}>
            {/* Desktop: the table. Phone: the card list below. A 52rem table on
                a 390px screen means a name and its status are never on screen
                together, which is not a layout — it is an apology. */}
            <Table minWidth="40rem" className={cn(view === 'grid' ? 'hidden' : 'hidden md:block')}>
              <thead>
                <tr>
                  <Th className="w-px pr-0">
                      <Checkbox
                        checked={allOnPage}
                        indeterminate={selected.size > 0 && !allOnPage}
                        onChange={toggleAll}
                        label={allOnPage ? 'Clear selection' : 'Select all on this page'}
                      />
                  </Th>
                  <SortableTh field="student_no" sort={sort} onSort={onSort}>Student No.</SortableTh>
                  <SortableTh field="last_name" sort={sort} onSort={onSort}>Name</SortableTh>
                  <Th>Status</Th>
                  <Th className="hidden xl:table-cell">Phone</Th>
                  <SortableTh field="created_at" sort={sort} onSort={onSort} className="hidden w-px whitespace-nowrap xl:table-cell">Registered</SortableTh>
                  <Th className="w-px" />
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <Tr
                    key={s.id}
                    selected={selected.has(s.id)}
                    onClick={() => navigate(`/admin/students/${s.id}`)}
                  >
                    <Td className="w-px pr-0">
                        <Checkbox
                          checked={selected.has(s.id)}
                          onChange={() => toggleOne(s.id)}
                          label={`Select ${s.first_name} ${s.last_name}`}
                      />
                    </Td>
                    <Td className="font-medium text-slate-900 tabular-nums">{s.student_no}</Td>
                    <Td>
                      <span className="flex items-center gap-2.5">
                        <Avatar
                          name={`${s.first_name} ${s.last_name}`}
                          src={publicFileUrl('student-photos', s.photo_path)}
                          size="sm"
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-slate-900">
                            {s.first_name} {s.last_name}
                          </span>
                          {s.email && (
                            <span className="block truncate text-[0.75rem] text-slate-500">{s.email}</span>
                          )}
                        </span>
                      </span>
                    </Td>
                    <Td>
                      {s.certificateCount > 0 ? (
                        <Badge tone="graduate" dot>Graduate</Badge>
                      ) : s.activeCount > 0 ? (
                        <Badge tone="enrolled" dot>Enrolled</Badge>
                      ) : s.completedCount > 0 ? (
                        <Badge tone="completed" dot>Completed</Badge>
                      ) : (
                        <Badge tone="neutral">Registered</Badge>
                      )}
                    </Td>
                    <Td className="hidden w-px whitespace-nowrap tabular-nums xl:table-cell">
                      {s.phone ?? '—'}
                    </Td>
                    <Td className="hidden w-px whitespace-nowrap tabular-nums xl:table-cell">
                      {new Date(s.created_at).toLocaleDateString('en-GB')}
                    </Td>
                    <Td>
                      <span onClick={(e) => e.stopPropagation()}>
                        <ActionMenu
                          label={`Actions for ${s.first_name} ${s.last_name}`}
                          items={[
                            { label: 'View profile', Icon: Eye, onSelect: () => navigate(`/admin/students/${s.id}`) },
                            ...(can('admin', 'registrar')
                              ? [{ label: 'Edit details', Icon: Pencil, onSelect: () => { setEditing(s); setFormOpen(true); } }]
                              : []),
                            ...(can('admin')
                              ? [{
                                  label: 'Delete student', Icon: Trash2, tone: 'danger' as const,
                                  separatorBefore: true, onSelect: () => void askDelete(s),
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

            {/* Card view — desktop only; the phone already has MobileList. */}
            {view === 'grid' && (
              <div className="hidden gap-3 p-4 md:grid md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {rows.map((s) => (
                  <div
                    key={s.id}
                    className={cn(
                      'group relative rounded-xl bg-white p-4 transition-shadow duration-200',
                      HAIRLINE, ELEVATION.flat,
                      // Written out rather than composed: Tailwind scans source
                      // text, so a class built at runtime is never generated.
                      'hover:shadow-[0_1px_1px_rgba(9,9,11,0.03),0_2px_4px_rgba(9,9,11,0.03),0_8px_16px_-6px_rgba(9,9,11,0.07)]',
                      selected.has(s.id) && 'ring-2 ring-gold-500/50',
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {can('admin') && (
                        <div className="pt-0.5">
                          <Checkbox
                            checked={selected.has(s.id)}
                            onChange={() => toggleOne(s.id)}
                            label={`Select ${s.first_name} ${s.last_name}`}
                          />
                        </div>
                      )}
                      <Avatar
                        name={`${s.first_name} ${s.last_name}`}
                        src={publicFileUrl('student-photos', s.photo_path)}
                        size="md"
                      />
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/students/${s.id}`)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <span className="block truncate font-sans text-[0.9375rem] font-medium text-slate-900">
                          {s.first_name} {s.last_name}
                        </span>
                        <span className="block truncate font-sans text-[0.75rem] text-slate-500 tabular-nums">
                          {s.student_no}
                        </span>
                      </button>
                      <span onClick={(e) => e.stopPropagation()} className="shrink-0">
                        <ActionMenu
                          label={`Actions for ${s.first_name} ${s.last_name}`}
                          items={[
                            { label: 'View profile', Icon: Eye, onSelect: () => navigate(`/admin/students/${s.id}`) },
                            ...(can('admin', 'registrar')
                              ? [{ label: 'Edit details', Icon: Pencil, onSelect: () => { setEditing(s); setFormOpen(true); } }]
                              : []),
                            ...(can('admin')
                              ? [{
                                  label: 'Delete student', Icon: Trash2, tone: 'danger' as const,
                                  separatorBefore: true, onSelect: () => void askDelete(s),
                                }]
                              : []),
                          ]}
                        />
                      </span>
                    </div>

                    <div className="mt-3 space-y-1.5 border-t border-[rgba(9,9,11,0.07)] pt-3">
                      <p className="flex items-center gap-1.5 font-sans text-[0.8125rem] text-slate-500">
                        <Phone className="size-3 shrink-0" aria-hidden="true" />
                        <span className="truncate tabular-nums">{s.phone ?? '—'}</span>
                      </p>
                      <p className="flex items-center gap-1.5 font-sans text-[0.8125rem] text-slate-500">
                        <Mail className="size-3 shrink-0" aria-hidden="true" />
                        <span className="truncate">{s.email ?? '—'}</span>
                      </p>
                    </div>

                    <div className="mt-3">
                      {s.certificateCount > 0 ? (
                        <Badge tone="graduate" dot>Graduate</Badge>
                      ) : s.activeCount > 0 ? (
                        <Badge tone="enrolled" dot>Enrolled</Badge>
                      ) : s.completedCount > 0 ? (
                        <Badge tone="completed" dot>Completed</Badge>
                      ) : (
                        <Badge tone="neutral">Registered</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <MobileList>
              {rows.map((s) => (
                <MobileRow
                  key={s.id}
                  selected={selected.has(s.id)}
                  onClick={() => navigate(`/admin/students/${s.id}`)}
                  /* Always the photo on a phone. The checkbox used to take this
                     slot, which traded the one piece of information that makes
                     a list of names scannable for a selection nobody performs
                     on a phone — bulk export is a desk task, and the page
                     header already exports the filtered set. */
                  leading={
                    <Avatar
                      name={`${s.first_name} ${s.last_name}`}
                      src={publicFileUrl('student-photos', s.photo_path)}
                      size="sm"
                    />
                  }
                  title={`${s.first_name} ${s.last_name}`}
                  subtitle={
                    <span className="tabular-nums">
                      {s.student_no}
                      {s.phone ? ` · ${s.phone}` : ''}
                    </span>
                  }
                  meta={
                    s.certificateCount > 0 ? (
                      <Badge tone="graduate" dot>Graduate</Badge>
                    ) : s.activeCount > 0 ? (
                      <Badge tone="enrolled" dot>Enrolled</Badge>
                    ) : s.completedCount > 0 ? (
                      <Badge tone="completed" dot>Completed</Badge>
                    ) : (
                      <Badge tone="neutral">Registered</Badge>
                    )
                  }
                  trailing={
                    <ActionMenu
                      label={`Actions for ${s.first_name} ${s.last_name}`}
                      items={[
                        { label: 'View profile', Icon: Eye, onSelect: () => navigate(`/admin/students/${s.id}`) },
                        ...(can('admin', 'registrar')
                          ? [{ label: 'Edit details', Icon: Pencil, onSelect: () => { setEditing(s); setFormOpen(true); } }]
                          : []),
                        ...(can('admin')
                          ? [{
                              label: 'Delete student', Icon: Trash2, tone: 'danger' as const,
                              separatorBefore: true, onSelect: () => void askDelete(s),
                            }]
                          : []),
                      ]}
                    />
                  }
                />
              ))}
            </MobileList>

            <Pagination page={page} pageCount={pageCount} total={total} pageSize={PAGE_SIZE} onPage={setPage} />
          </div>
        )}
      </Panel>

      {/* Registering uses the multi-step wizard; editing keeps the compact
          modal, because an operator correcting a phone number does not want to
          walk five steps to do it. */}
      <RegistrationWizard open={formOpen && !editing} onClose={() => setFormOpen(false)} />
      <StudentFormModal open={formOpen && Boolean(editing)} onClose={() => setFormOpen(false)} editing={editing} />
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} />

      {/* Export only. See the note above `exportSelected` for why bulk delete
          was removed rather than guarded harder. */}
      <SelectionBar count={selected.size} onClear={() => setSelected(new Set())}>
        <SelectionAction Icon={Download} onClick={exportSelected}>
          Export
        </SelectionAction>
      </SelectionBar>

      {dialog}
    </>
  );
}

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Receipt, Plus, Trash2, Wallet } from 'lucide-react';
import {
  fetchExpenses, recordExpense, deleteExpense, kes,
  EXPENSE_CATEGORIES, expenseCategoryLabel,
  type ExpensePeriod,
} from '@/features/admin/finance';
import { fetchIntakes } from '@/features/admin/api';
import {
  Panel, EmptyState, ErrorNote, TableSkeleton, Toolbar, SearchInput,
  SelectFilter, Field, inputClass, inputErrorClass, Table, Th, Td, Tr,
  MobileList, MobileRow,
} from '@/components/admin/AdminUI';
import { ActionMenu, AdminButton } from '@/components/admin/Menu';
import { Modal, useConfirm } from '@/components/admin/Overlay';
import { useToast } from '@/components/admin/Toast';
import { useAuth } from '@/features/auth/AuthProvider';
import { readableError } from '@/lib/supabase';
import type { ExpenseCategory } from '@/lib/db.types';
import { cn } from '@/lib/utils';

const METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'mpesa', label: 'M-Pesa' },
  { value: 'bank', label: 'Bank transfer' },
  { value: 'card', label: 'Card' },
  { value: 'other', label: 'Other' },
] as const;

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const schema = z.object({
  category: z.enum([
    'ingredients', 'equipment', 'rent', 'utilities', 'salaries',
    'marketing', 'maintenance', 'transport', 'licences', 'other',
  ]),
  description: z.string().trim().min(2, 'What was the money spent on?').max(200),
  amount: z.coerce.number({ invalid_type_error: 'Enter an amount.' })
    .positive('Must be more than zero.')
    .max(99_999_999, 'That looks like a typo.'),
  spent_on: z.string().min(1, 'When was it spent?'),
  vendor: z.string().trim().max(120).optional(),
  method: z.enum(['cash', 'mpesa', 'bank', 'card', 'other']),
  reference: z.string().trim().max(60).optional(),
  intake_id: z.string().optional(),
  note: z.string().trim().max(200).optional(),
});
type Values = z.infer<typeof schema>;

function ExpenseModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const intakes = useQuery({ queryKey: ['intakes'], queryFn: fetchIntakes, enabled: open });

  const { register, handleSubmit, reset, formState: { errors, isDirty } } =
    useForm<Values>({ resolver: zodResolver(schema), mode: 'onBlur' });

  useEffect(() => {
    if (!open) return;
    reset({
      category: 'ingredients',
      description: '',
      amount: 0,
      spent_on: new Date().toISOString().slice(0, 10),
      vendor: '',
      method: 'cash',
      reference: '',
      intake_id: '',
      note: '',
    });
  }, [open, reset]);

  const save = useMutation({
    mutationFn: (v: Values) =>
      recordExpense({
        category: v.category,
        description: v.description,
        amount: v.amount,
        spent_on: v.spent_on,
        vendor: v.vendor || null,
        method: v.method,
        reference: v.reference || null,
        intake_id: v.intake_id || null,
        note: v.note || null,
      }),
    onSuccess: (e) => {
      void qc.invalidateQueries({ queryKey: ['expenses'] });
      void qc.invalidateQueries({ queryKey: ['finance-stats'] });
      void qc.invalidateQueries({ queryKey: ['intake-finance'] });
      toast.success('Expense recorded', `${e.expense_no} · ${kes(e.amount_kes)}`);
      onClose();
    },
    onError: (err) => toast.error('Could not record the expense', readableError(err)),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record an expense"
      description="Money out — stock, equipment, rent, wages."
      dirty={isDirty}
      footer={
        <>
          <AdminButton variant="ghost" onClick={onClose}>Cancel</AdminButton>
          <AdminButton
            variant="primary" disabled={save.isPending}
            onClick={() => void handleSubmit((v) => save.mutate(v))()}
          >
            {save.isPending ? 'Recording…' : 'Record expense'}
          </AdminButton>
        </>
      }
    >
      <form onSubmit={handleSubmit((v) => save.mutate(v))} noValidate className="space-y-4">
        <Field label="What was it for?" htmlFor="description" error={errors.description?.message}>
          <input
            id="description" autoFocus placeholder="e.g. 10kg Arabica beans"
            className={cn(inputClass, errors.description && inputErrorClass)}
            {...register('description')}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category" htmlFor="category">
            <select id="category" className={inputClass} {...register('category')}>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </Field>

          <Field label="Amount (KES)" htmlFor="amount" error={errors.amount?.message}>
            <input
              id="amount" type="number" min={1} step={50} inputMode="numeric"
              className={cn(inputClass, 'tabular-nums', errors.amount && inputErrorClass)}
              {...register('amount')}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date" htmlFor="spent_on" error={errors.spent_on?.message}>
            <input
              id="spent_on" type="date" max={new Date().toISOString().slice(0, 10)}
              className={cn(inputClass, 'tabular-nums', errors.spent_on && inputErrorClass)}
              {...register('spent_on')}
            />
          </Field>

          <Field label="Paid by" htmlFor="method">
            <select id="method" className={inputClass} {...register('method')}>
              {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Supplier" htmlFor="vendor" optional>
            <input id="vendor" placeholder="e.g. Dormans" className={inputClass} {...register('vendor')} />
          </Field>

          <Field label="Reference" htmlFor="reference" optional hint="Invoice or M-Pesa code.">
            <input id="reference" className={cn(inputClass, 'uppercase')} {...register('reference')} />
          </Field>
        </div>

        <Field
          label="For which cohort?" htmlFor="intake_id" optional
          hint="Attribute a direct cost to one intake and it shows in that cohort's margin. Leave blank for shared costs like rent or power."
        >
          <select id="intake_id" className={inputClass} {...register('intake_id')}>
            <option value="">Not cohort-specific</option>
            {(intakes.data ?? []).map((i) => (
              <option key={i.id} value={i.id}>{i.course.title} — {i.code}</option>
            ))}
          </select>
        </Field>

        <Field label="Note" htmlFor="note" optional>
          <input id="note" className={inputClass} {...register('note')} />
        </Field>
      </form>
    </Modal>
  );
}

export function ExpensePanel() {
  const { can } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();

  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<ExpenseCategory | 'all'>('all');
  const [period, setPeriod] = useState<ExpensePeriod>('all');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const query = useQuery({
    queryKey: ['expenses', category, period, debounced],
    queryFn: () => fetchExpenses({ category, period, search: debounced }),
  });

  const remove = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => deleteExpense(id, reason),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['expenses'] });
      void qc.invalidateQueries({ queryKey: ['finance-stats'] });
      void qc.invalidateQueries({ queryKey: ['intake-finance'] });
      toast.success('Expense deleted');
    },
    onError: (e) => toast.error('Could not delete', readableError(e)),
  });

  const rows = query.data ?? [];
  const total = rows.reduce((s, r) => s + r.amount_kes, 0);

  const askDelete = async (id: string, no: string, what: string) => {
    const reason = await confirm({
      title: 'Delete this expense?',
      body: (
        <>
          <strong className="font-medium text-slate-900">{no}</strong> — {what} — will be
          removed and the totals recalculated. The deletion is recorded permanently in the
          audit log.
        </>
      ),
      confirmLabel: 'Delete expense',
      reasonLabel: 'Reason (recorded permanently)',
    });
    if (reason !== null) remove.mutate({ id, reason });
  };

  return (
    <>
      <Toolbar>
        <SearchInput
          id="expense-search" value={search} onChange={setSearch}
          placeholder="Search description, supplier or reference"
        />
        <SelectFilter
          id="expense-category" label="Category" value={category} onChange={setCategory}
          options={[
            { value: 'all', label: 'All categories' },
            ...EXPENSE_CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
          ]}
        />
        <SelectFilter
          id="expense-period" label="Period" value={period} onChange={setPeriod}
          options={[
            { value: 'all', label: 'All time' },
            { value: 'month', label: 'Last month' },
            { value: 'quarter', label: 'Last 3 months' },
            { value: 'year', label: 'Last year' },
          ]}
        />
        {can('admin', 'registrar') && (
          <div className="ml-auto">
            <AdminButton variant="primary" Icon={Plus} onClick={() => setOpen(true)}>
              Record expense
            </AdminButton>
          </div>
        )}
      </Toolbar>

      <Panel
        title="Expenses"
        description={
          query.isLoading
            ? undefined
            : `${rows.length} entr${rows.length === 1 ? 'y' : 'ies'} · ${kes(total)}`
        }
      >
        {query.isError ? (
          <div className="p-5">
            <ErrorNote message={readableError(query.error)} retry={() => void query.refetch()} />
          </div>
        ) : query.isLoading ? (
          <TableSkeleton rows={6} cols={4} />
        ) : !rows.length ? (
          <EmptyState
            Icon={Wallet}
            title={category === 'all' && period === 'all' && !debounced
              ? 'No expenses recorded'
              : 'Nothing matches'}
            body={
              category === 'all' && period === 'all' && !debounced
                ? 'Record what the school spends — beans, milk, equipment, rent — and the Finance page can show what it actually kept.'
                : 'Try a different category or period.'
            }
            action={
              can('admin', 'registrar') && (
                <AdminButton variant="primary" Icon={Plus} onClick={() => setOpen(true)}>
                  Record expense
                </AdminButton>
              )
            }
          />
        ) : (
          <>
            <Table minWidth="44rem" className="hidden md:block">
              <thead>
                <tr>
                  <Th>What</Th>
                  <Th>Category</Th>
                  <Th className="hidden lg:table-cell">Supplier</Th>
                  <Th className="w-px whitespace-nowrap">Date</Th>
                  <Th className="text-right">Amount</Th>
                  <Th className="w-px" />
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <Tr key={e.id}>
                    <Td>
                      <span className="block text-slate-900">{e.description}</span>
                      <span className="block text-[0.75rem] text-slate-500 tabular-nums">
                        {e.expense_no}{e.reference ? ` · ${e.reference}` : ''}
                      </span>
                    </Td>
                    <Td>{expenseCategoryLabel(e.category)}</Td>
                    <Td className="hidden lg:table-cell">{e.vendor ?? '—'}</Td>
                    <Td className="w-px whitespace-nowrap tabular-nums">{fmtDate(e.spent_on)}</Td>
                    <Td className="text-right font-medium text-slate-900 tabular-nums">
                      {kes(e.amount_kes)}
                    </Td>
                    <Td>
                      {can('admin') && (
                        <ActionMenu
                          label={`Actions for ${e.expense_no}`}
                          items={[{
                            label: 'Delete expense', Icon: Trash2, tone: 'danger',
                            onSelect: () => void askDelete(e.id, e.expense_no, e.description),
                          }]}
                        />
                      )}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>

            <MobileList>
              {rows.map((e) => (
                <MobileRow
                  key={e.id}
                  leading={
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600">
                      <Receipt className="size-3.5" />
                    </span>
                  }
                  title={e.description}
                  subtitle={
                    <span className="tabular-nums">
                      {expenseCategoryLabel(e.category)} · {fmtDate(e.spent_on)}
                    </span>
                  }
                  trailing={
                    <span className="font-sans text-[0.8125rem] font-medium text-slate-900 tabular-nums">
                      {kes(e.amount_kes)}
                    </span>
                  }
                />
              ))}
            </MobileList>
          </>
        )}
      </Panel>

      <ExpenseModal open={open} onClose={() => setOpen(false)} />
      {dialog}
    </>
  );
}

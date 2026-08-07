import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Wallet, Receipt, TrendingUp, AlertCircle, Users, ArrowRight,
  ArrowDownRight, Scale, List, CreditCard,
} from 'lucide-react';
import {
  fetchFinanceStats, fetchStudentFinance, fetchRecentPayments, kes, kesShort,
  expenseCategoryLabel, type FeeFilter,
} from '@/features/admin/finance';
import { ExpensePanel } from '@/components/admin/ExpensePanel';
import {
  PageHeader, MetricGrid, Metric, MetricSkeleton, Panel, Table, Th, Td, Tr,
  Avatar, Toolbar, SearchInput, SelectFilter, EmptyState, ErrorNote,
  TableSkeleton, ProgressBar, MobileList, MobileRow, Segmented,
} from '@/components/admin/AdminUI';
import { publicFileUrl, readableError } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const METHOD_LABEL: Record<string, string> = {
  cash: 'Cash', mpesa: 'M-Pesa', bank: 'Bank', card: 'Card', other: 'Other',
};

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export default function Finance() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [filter, setFilter] = useState<FeeFilter>('owing');
  /* Income and expenses are two different jobs — chasing arrears versus
     entering a supplier invoice — so they get one page and two modes rather
     than one very long page. */
  const [view, setView] = useState<'income' | 'expenses'>('income');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const stats = useQuery({ queryKey: ['finance-stats'], queryFn: fetchFinanceStats });
  const rows = useQuery({
    queryKey: ['student-finance', filter, debounced],
    queryFn: () => fetchStudentFinance(filter, debounced),
  });
  const payments = useQuery({
    queryKey: ['recent-payments'],
    queryFn: () => fetchRecentPayments(12),
  });

  const s = stats.data;
  const list = rows.data ?? [];

  /* Collection rate is the one number that says whether the term is going
     well. Guarded against a zero denominator — a school with nothing billed
     is at 0% collected, not NaN%. */
  const collectionRate = s && s.billed > 0 ? Math.round((s.collected / s.billed) * 100) : 0;

  return (
    <>
      <PageHeader
        eyebrow="Money"
        title="Finance"
        subtitle="What the school has taken in, what it has spent, and what it kept."
        actions={
          <Segmented
            label="Finance view"
            value={view}
            onChange={setView}
            options={[
              { value: 'income', label: 'Income & fees', Icon: CreditCard },
              { value: 'expenses', label: 'Expenses', Icon: List },
            ]}
          />
        }
      />

      {stats.isError && (
        <div className="mb-4">
          <ErrorNote message={readableError(stats.error)} retry={() => void stats.refetch()} />
        </div>
      )}

      {stats.isLoading ? (
        <MetricSkeleton count={7} />
      ) : s ? (
        <MetricGrid>
          <Metric index={0} label="Collected" value={kesShort(s.collected)} hint={`${collectionRate}% of ${kesShort(s.billed)} billed`} Icon={Wallet} to="/admin/finance" />
          <Metric index={1} label="Outstanding" value={kesShort(s.outstanding)} hint={`${s.in_arrears} student${s.in_arrears === 1 ? '' : 's'} owing`} Icon={AlertCircle} />
          <Metric index={2} label="Spent" value={kesShort(s.spent)} hint="All recorded costs" Icon={ArrowDownRight} />
          <Metric index={3} label="Net" value={kesShort(s.net)} hint="Collected minus spent" Icon={Scale} />
          <Metric index={4} label="In, 30 days" value={kesShort(s.collected_30d)} hint="Fees received" Icon={TrendingUp} />
          <Metric index={5} label="Out, 30 days" value={kesShort(s.spent_30d)} hint="Costs recorded" Icon={Receipt} />
          {/* Money the school chose not to charge. A discount is real income
              forgone, and one that is never totalled is one nobody notices
              growing. */}
          <Metric
            index={6}
            label="Discounts"
            value={kesShort(s.discounted)}
            hint={`Given on ${s.discount_count} enrolment${s.discount_count === 1 ? '' : 's'}`}
            Icon={Scale}
          />
        </MetricGrid>
      ) : null}

      {/* Collection progress. One bar says more than the three numbers above it
          — it is the only place the ratio is visible rather than inferred. */}
      {view === 'income' && s && s.billed > 0 && (
        <div className="mt-4 rounded-xl bg-white p-4 ring-1 ring-[rgba(9,9,11,0.09)] shadow-[0_1px_1px_rgba(9,9,11,0.03),0_2px_4px_rgba(9,9,11,0.03),0_8px_16px_-6px_rgba(9,9,11,0.07)]">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-sans text-[0.875rem] font-semibold text-slate-900">
              Collection this year
            </span>
            <span className="font-sans text-[0.8125rem] text-slate-500 tabular-nums">
              <span className="font-medium text-slate-900">{kes(s.collected)}</span>
              {' of '}{kes(s.billed)}
            </span>
          </div>
          <ProgressBar value={s.collected} max={s.billed} tone="emerald" />
        </div>
      )}

      {view === 'expenses' && (
        <div className="mt-4">
          <ExpensePanel />

          {/* Where the money went. Sorted biggest first — the point of a
              breakdown is to find the line worth arguing about. */}
          {s && Object.keys(s.by_category).length > 0 && (
            <div className="mt-4">
              <Panel title="Spending by category" description={`${kes(s.spent)} total`}>
                <ul className="divide-y divide-[rgba(9,9,11,0.06)]">
                  {Object.entries(s.by_category)
                    .sort((a, b) => b[1] - a[1])
                    .map(([cat, amount]) => {
                      const share = s.spent > 0 ? (amount / s.spent) * 100 : 0;
                      return (
                        <li key={cat} className="px-4 py-3 sm:px-5">
                          <div className="mb-1.5 flex items-baseline justify-between gap-3">
                            <span className="font-sans text-[0.875rem] text-slate-900">
                              {expenseCategoryLabel(cat as never)}
                            </span>
                            <span className="font-sans text-[0.8125rem] text-slate-500 tabular-nums">
                              <span className="font-medium text-slate-900">{kes(amount)}</span>
                              <span className="ml-2">{Math.round(share)}%</span>
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-400/12">
                            <div
                              className="h-full rounded-full bg-slate-700"
                              style={{ width: `${share}%` }}
                            />
                          </div>
                        </li>
                      );
                    })}
                </ul>
              </Panel>
            </div>
          )}
        </div>
      )}

      <div className={cn('mt-4 grid gap-4 xl:grid-cols-3', view !== 'income' && 'hidden')}>
        {/* ── Student balances ─────────────────────────────────────────── */}
        <div className="xl:col-span-2">
          <Toolbar>
            <SearchInput
              id="finance-search" value={search} onChange={setSearch}
              placeholder="Search name or student number"
            />
            <SelectFilter
              id="fee-filter" label="Showing" value={filter} onChange={setFilter}
              options={[
                { value: 'owing', label: 'Owing' },
                { value: 'paid', label: 'Fully paid' },
                { value: 'unbilled', label: 'No fee set' },
                { value: 'all', label: 'Everyone' },
              ]}
            />
          </Toolbar>

          <Panel
            title="Student balances"
            description={rows.isLoading ? undefined : `${list.length} student${list.length === 1 ? '' : 's'}`}
          >
            {rows.isError ? (
              <div className="p-5">
                <ErrorNote message={readableError(rows.error)} retry={() => void rows.refetch()} />
              </div>
            ) : rows.isLoading ? (
              <TableSkeleton rows={6} cols={4} />
            ) : !list.length ? (
              <EmptyState
                Icon={Wallet}
                title={filter === 'owing' ? 'Nobody owes anything' : 'Nothing to show'}
                body={
                  filter === 'owing'
                    ? 'Every billed student is paid up. Set fees on courses to start tracking tuition.'
                    : 'Try a different filter, or set fees on the courses first.'
                }
              />
            ) : (
              <>
                <Table minWidth="44rem" className="hidden md:block">
                  <thead>
                    <tr>
                      <Th>Student</Th>
                      <Th className="text-right">Fee</Th>
                      <Th className="text-right">Paid</Th>
                      <Th className="text-right">Balance</Th>
                      <Th>Last payment</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((r) => (
                      <Tr key={r.student_id} onClick={() => navigate(`/admin/students/${r.student_id}`)}>
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
                        <Td className="text-right tabular-nums">{kes(r.fee_kes)}</Td>
                        <Td className="text-right tabular-nums">{kes(r.paid_kes)}</Td>
                        <Td className="text-right tabular-nums">
                          <span
                            className={cn(
                              'font-medium',
                              r.balance_kes > 0 ? 'text-red-700'
                                : r.balance_kes < 0 ? 'text-blue-700'
                                : 'text-emerald-700',
                            )}
                          >
                            {r.balance_kes < 0 ? `${kes(-r.balance_kes)} credit` : kes(r.balance_kes)}
                          </span>
                        </Td>
                        <Td className="tabular-nums">{fmtDate(r.last_paid_on)}</Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>

                <MobileList>
                  {list.map((r) => (
                    <MobileRow
                      key={r.student_id}
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
                          {kes(r.paid_kes)} paid of {kes(r.fee_kes)}
                        </span>
                      }
                      trailing={
                        <span
                          className={cn(
                            'font-sans text-[0.8125rem] font-medium tabular-nums',
                            r.balance_kes > 0 ? 'text-red-700' : 'text-emerald-700',
                          )}
                        >
                          {r.balance_kes > 0 ? kes(r.balance_kes) : 'Paid'}
                        </span>
                      }
                    />
                  ))}
                </MobileList>
              </>
            )}
          </Panel>
        </div>

        {/* ── Recent receipts ──────────────────────────────────────────── */}
        <Panel
          title="Recent payments"
          description="Latest receipts"
          className="self-start"
        >
          {payments.isLoading ? (
            <TableSkeleton rows={5} cols={2} />
          ) : !payments.data?.length ? (
            <EmptyState
              Icon={Receipt}
              title="No payments yet"
              body="Record a payment from a student's record and it will appear here."
            />
          ) : (
            <ul className="divide-y divide-[rgba(9,9,11,0.06)]">
              {payments.data.map((p) => (
                <li key={p.id}>
                  <Link
                    to={`/admin/students/${p.student.id}`}
                    className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-slate-50 sm:px-5"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-emerald-600/10 text-emerald-700">
                      <Receipt className="size-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-sans text-[0.875rem] text-slate-900">
                        {p.student.first_name} {p.student.last_name}
                      </span>
                      <span className="block font-sans text-[0.75rem] text-slate-500 tabular-nums">
                        {METHOD_LABEL[p.method] ?? p.method} · {fmtDate(p.paid_on)}
                      </span>
                    </span>
                    <span className="shrink-0 font-sans text-[0.8125rem] font-medium text-slate-900 tabular-nums">
                      {kes(p.amount_kes)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {s && Object.keys(s.by_method).length > 0 && (
            <div className="border-t border-[rgba(9,9,11,0.07)] px-4 py-3 sm:px-5">
              <p className="mb-2 font-sans text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-slate-500">
                By method
              </p>
              <ul className="space-y-1">
                {Object.entries(s.by_method)
                  .sort((a, b) => b[1] - a[1])
                  .map(([method, total]) => (
                    <li key={method} className="flex items-baseline justify-between gap-3">
                      <span className="font-sans text-[0.8125rem] text-slate-500">
                        {METHOD_LABEL[method] ?? method}
                      </span>
                      <span className="font-sans text-[0.8125rem] text-slate-900 tabular-nums">
                        {kes(total)}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          )}

          <div className="border-t border-[rgba(9,9,11,0.07)] px-4 py-3 sm:px-5">
            <Link
              to="/admin/students"
              className="group inline-flex items-center gap-1 font-sans text-[0.8125rem] text-slate-500 transition-colors hover:text-slate-900"
            >
              <Users className="size-3.5" />
              Record a payment from a student
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </Panel>
      </div>
    </>
  );
}

-- ═══════════════════════════════════════════════════════════════════════════
--  ISLII SMS — 0008 EXPENSES
-- ═══════════════════════════════════════════════════════════════════════════
--  Run after 0007.
--
--  Fees told the school what came in. Nothing told it what went out, so the
--  only question it could answer was "who owes us money" — never "did this
--  cohort pay for itself". Beans, milk, gas, a replacement grinder and a
--  tutor's fee are the other half of that sentence.
--
--  Built to mirror `payments` deliberately: same numeric(12,2) money type, same
--  append-only posture, same audited deletion. Two ledgers that behave
--  differently are two ledgers nobody trusts when they disagree.
-- ═══════════════════════════════════════════════════════════════════════════


-- ── Categories ─────────────────────────────────────────────────────────────
--  An enum rather than a lookup table. A school's cost headings do not churn,
--  and a free-text category becomes "beans", "Beans", "coffee beans" and
--  "cofee beans" inside a term — four rows that should have been one, and a
--  breakdown that adds up to nothing useful. `description` carries the detail.
do $$ begin
  create type public.expense_category as enum (
    'ingredients',   -- coffee beans, milk, syrups, flour, tapioca pearls
    'equipment',     -- machines, grinders, glassware, tools
    'rent',
    'utilities',     -- power, water, gas, internet
    'salaries',      -- tutors, assistants, cleaning
    'marketing',
    'maintenance',   -- servicing, repairs
    'transport',
    'licences',      -- permits, registrations, certification bodies
    'other'
  );
exception when duplicate_object then null; end $$;


create table if not exists public.expenses (
  id           uuid primary key default gen_random_uuid(),
  expense_no   text not null unique,
  category     public.expense_category not null default 'other',
  description  text not null,
  amount_kes   numeric(12,2) not null check (amount_kes > 0),
  spent_on     date not null default current_date,

  -- Who it was paid to, and how. `reference` is the supplier's invoice or the
  -- M-Pesa code — the thing you would quote when querying a bill.
  vendor       text,
  method       public.payment_method not null default 'cash',
  reference    text,

  -- Optional: attribute a cost to one cohort. This is what turns the module
  -- from bookkeeping into something the school can actually decide with —
  -- "the beans and milk for BAR-2026-01 came to X against Y in fees".
  -- Nullable because rent and power belong to no single intake.
  intake_id    uuid references public.intakes (id) on delete set null,

  note         text,
  created_at   timestamptz not null default now(),
  created_by   uuid references public.profiles (id) on delete set null
);

create index if not exists expenses_spent_on_idx on public.expenses (spent_on desc);
create index if not exists expenses_category_idx on public.expenses (category, spent_on desc);
create index if not exists expenses_intake_idx   on public.expenses (intake_id)
  where intake_id is not null;

comment on table public.expenses is
  'Money out. Append-only, mirroring `payments`: never updated, deleted only by '
  'an admin with a written reason, and every write audited.';

-- `on delete set null` on intake_id, not cascade: deleting a cohort must never
-- delete the record that the school spent money on it. The cost happened.


-- ── Numbering ──────────────────────────────────────────────────────────────
create or replace function public.allocate_number(p_kind text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year   integer := extract(year from now())::integer;
  v_prefix text;
  v_scope  text;
  v_value  integer;
begin
  v_prefix := case p_kind
                when 'student'     then 'ISLII'
                when 'certificate' then 'ISLII-CERT'
                when 'receipt'     then 'RCT'
                when 'expense'     then 'EXP'
              end;

  if v_prefix is null then
    raise exception 'allocate_number: unknown kind %', p_kind
      using hint = 'expected ''student'', ''certificate'', ''receipt'' or ''expense''';
  end if;

  v_scope := p_kind || ':' || v_year;

  insert into public.counters (scope) values (v_scope)
  on conflict (scope) do nothing;

  update public.counters
     set value = value + 1
   where scope = v_scope
  returning value into v_value;

  return v_prefix || '-' || v_year || '-' || lpad(v_value::text, 4, '0');
end;
$$;

revoke execute on function public.allocate_number(text) from anon, authenticated;


-- ── Record ─────────────────────────────────────────────────────────────────
create or replace function public.record_expense(
  p_category    public.expense_category,
  p_description text,
  p_amount      numeric,
  p_spent_on    date default current_date,
  p_vendor      text default null,
  p_method      public.payment_method default 'cash',
  p_reference   text default null,
  p_intake_id   uuid default null,
  p_note        text default null
)
returns public.expenses
language plpgsql
security definer
set search_path = public
as $$
declare
  v_no  text;
  v_row public.expenses;
begin
  if not public.is_staff() then
    raise exception 'only an admin or registrar may record an expense'
      using errcode = '42501';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'an expense must be greater than zero';
  end if;

  if coalesce(trim(p_description), '') = '' then
    raise exception 'describe what the money was spent on';
  end if;

  -- A future-dated cost is a typo far more often than it is a plan.
  if p_spent_on > current_date then
    raise exception 'an expense cannot be dated in the future';
  end if;

  v_no := public.allocate_number('expense');

  insert into public.expenses (
    expense_no, category, description, amount_kes, spent_on,
    vendor, method, reference, intake_id, note, created_by
  )
  values (
    v_no, p_category, trim(p_description), round(p_amount, 2), p_spent_on,
    nullif(trim(p_vendor), ''), p_method, nullif(trim(p_reference), ''),
    p_intake_id, nullif(trim(p_note), ''), auth.uid()
  )
  returning * into v_row;

  insert into public.audit_log (actor, action, entity, entity_id, detail)
  values (auth.uid(), 'expense.recorded', 'expenses', v_row.id,
          jsonb_build_object('expense_no', v_no,
                             'amount_kes', v_row.amount_kes,
                             'category', v_row.category));

  return v_row;
end;
$$;


create or replace function public.delete_expense(p_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.expenses;
begin
  if not public.is_admin() then
    raise exception 'only an admin may delete an expense' using errcode = '42501';
  end if;

  if coalesce(trim(p_reason), '') = '' then
    raise exception 'a reason is required to delete an expense';
  end if;

  delete from public.expenses where id = p_id returning * into v_row;

  if v_row.id is null then
    raise exception 'expense not found';
  end if;

  -- Written after the delete and holding the whole row, so the audit entry is
  -- a complete record of what disappeared rather than a pointer to nothing.
  insert into public.audit_log (actor, action, entity, entity_id, detail)
  values (auth.uid(), 'expense.deleted', 'expenses', v_row.id,
          jsonb_build_object('expense_no', v_row.expense_no,
                             'amount_kes', v_row.amount_kes,
                             'category', v_row.category,
                             'description', v_row.description,
                             'reason', trim(p_reason)));
end;
$$;


-- ── Stats ──────────────────────────────────────────────────────────────────
--  Extends finance_stats() rather than adding a second function. One call, one
--  consistent picture: a page that fetched income and expenses separately could
--  render a "net" from two different moments.
create or replace function public.finance_stats()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when not public.is_signed_in() then '{}'::jsonb else
    jsonb_build_object(
      'billed',      coalesce((select sum(fee_kes)  from public.enrollment_finance), 0),
      'collected',   coalesce((select sum(paid_kes) from public.enrollment_finance), 0),
      'outstanding', coalesce((select sum(greatest(balance_kes, 0))
                                 from public.enrollment_finance), 0),
      'in_arrears',  (select count(distinct student_id)
                        from public.enrollment_finance where balance_kes > 0),
      'unpriced',    (select count(*) from public.enrollment_finance
                       where payment_status = 'unbilled'),
      'collected_30d', coalesce((select sum(amount_kes) from public.payments
                                  where paid_on >= current_date - interval '30 days'), 0),
      'by_method', coalesce((
        select jsonb_object_agg(method, total)
          from (select method, sum(amount_kes) as total
                  from public.payments group by method) m
      ), '{}'::jsonb),

      -- ── Money out ────────────────────────────────────────────────────
      'spent',       coalesce((select sum(amount_kes) from public.expenses), 0),
      'spent_30d',   coalesce((select sum(amount_kes) from public.expenses
                                where spent_on >= current_date - interval '30 days'), 0),
      -- Net is cash IN minus cash OUT — collected, not billed. Billing a
      -- student does not put beans in the store cupboard, and a "profit" built
      -- on money nobody has paid yet is the classic way a small business
      -- convinces itself it is fine.
      'net',         coalesce((select sum(amount_kes) from public.payments), 0)
                     - coalesce((select sum(amount_kes) from public.expenses), 0),
      'by_category', coalesce((
        select jsonb_object_agg(category, total)
          from (select category, sum(amount_kes) as total
                  from public.expenses group by category) c
      ), '{}'::jsonb)
    )
  end;
$$;


-- ── Per-cohort profitability ───────────────────────────────────────────────
--  Only counts costs actually attributed to an intake. Rent and power are not
--  apportioned, because any split would be invented — so this reads as "direct
--  costs", not "true profit", and the UI says so.
create or replace view public.intake_finance as
select
  i.id                                as intake_id,
  i.code,
  coalesce(f.billed, 0)               as billed_kes,
  coalesce(f.collected, 0)            as collected_kes,
  coalesce(e.spent, 0)                as direct_costs_kes,
  coalesce(f.collected, 0) - coalesce(e.spent, 0) as margin_kes
from public.intakes i
left join (
  select ef.intake_id,
         sum(ef.fee_kes)  as billed,
         sum(ef.paid_kes) as collected
    from public.enrollment_finance ef
   group by ef.intake_id
) f on f.intake_id = i.id
left join (
  select intake_id, sum(amount_kes) as spent
    from public.expenses
   where intake_id is not null
   group by intake_id
) e on e.intake_id = i.id;

alter view public.intake_finance set (security_invoker = on);


-- ── Row-level security ─────────────────────────────────────────────────────
alter table public.expenses enable row level security;

drop policy if exists "signed-in read expenses" on public.expenses;
create policy "signed-in read expenses"
  on public.expenses for select
  using (public.is_signed_in());

-- No INSERT policy: expenses are created only by record_expense(), so a row
-- can never arrive without a number, an actor or an audit entry.
-- No UPDATE policy: append-only, exactly like payments.
-- No DELETE policy: delete_expense() enforces admin plus a written reason.

revoke all on public.expenses from anon;
revoke execute on function public.record_expense(
  public.expense_category, text, numeric, date, text,
  public.payment_method, text, uuid, text
) from anon;
revoke execute on function public.delete_expense(uuid, text) from anon;

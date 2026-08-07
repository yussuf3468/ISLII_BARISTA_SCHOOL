-- ═══════════════════════════════════════════════════════════════════════════
--  ISLII SMS — 0009 DISCOUNTS
-- ═══════════════════════════════════════════════════════════════════════════
--  Run after 0008.
--
--  Per-student pricing already worked: `enrollments.fee_kes` is set per
--  enrolment and staff could type any figure. Two things were missing, and
--  both matter more than the arithmetic.
--
--  1. THE FULL PRICE DISAPPEARED. Typing 24,000 over a 30,000 course left no
--     trace that a discount was ever given. The school could see what a student
--     owes, never what they were let off, and "how much did we give away last
--     term" was unanswerable.
--
--  2. NOTHING RECORDED WHY. A bursary, a staff child, a returning student, a
--     negotiated group rate and a data-entry mistake all looked identical six
--     months later — at exactly the moment somebody asks why two students on
--     the same cohort paid different amounts.
--
--  `fee_kes` keeps its meaning — what the student actually owes — so every
--  existing balance, view and total is untouched. The full price is recorded
--  alongside it.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.enrollments
  add column if not exists discount_kes numeric(12,2) not null default 0
    check (discount_kes >= 0),
  add column if not exists discount_reason text;

comment on column public.enrollments.discount_kes is
  'Amount taken off the full price. The student owes fee_kes; the full price '
  'was fee_kes + discount_kes. Stored as an amount, never a percentage — a '
  'percentage has to be recomputed to be useful and rounds differently every '
  'time it is read.';

comment on column public.enrollments.discount_reason is
  'Why this student pays less. Required whenever discount_kes > 0.';

-- A discount with no explanation is the thing this migration exists to
-- prevent, so the database refuses it rather than trusting the form.
alter table public.enrollments
  drop constraint if exists discount_is_explained;

alter table public.enrollments
  add constraint discount_is_explained check (
    discount_kes = 0
    or (discount_reason is not null and length(trim(discount_reason)) > 0)
  );


-- ── Set the fee and the discount together ──────────────────────────────────
--  One function rather than a bare UPDATE, for the same reason payments go
--  through one: a change to what a student owes is a financial decision and
--  belongs in the audit log. The old client-side `update enrollments set
--  fee_kes` wrote no trail at all.
create or replace function public.set_enrollment_pricing(
  p_enrollment_id uuid,
  p_fee           numeric,
  p_discount      numeric default 0,
  p_reason        text default null
)
returns public.enrollments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old public.enrollments;
  v_row public.enrollments;
  v_reason text := nullif(trim(p_reason), '');
begin
  if not public.is_staff() then
    raise exception 'only an admin or registrar may change a fee'
      using errcode = '42501';
  end if;

  if p_fee is null or p_fee < 0 then
    raise exception 'a fee cannot be negative';
  end if;

  if p_discount is null or p_discount < 0 then
    raise exception 'a discount cannot be negative';
  end if;

  if p_discount > 0 and v_reason is null then
    raise exception 'give a reason for the discount';
  end if;

  select * into v_old from public.enrollments where id = p_enrollment_id;
  if v_old.id is null then
    raise exception 'enrolment not found';
  end if;

  update public.enrollments
     set fee_kes        = round(p_fee, 2),
         discount_kes   = round(p_discount, 2),
         discount_reason = case when p_discount > 0 then v_reason else null end
   where id = p_enrollment_id
  returning * into v_row;

  -- Both figures, before and after. A reader of the audit log should never
  -- have to go and find the row to understand what changed.
  insert into public.audit_log (actor, action, entity, entity_id, detail)
  values (auth.uid(), 'enrollment.repriced', 'enrollments', v_row.id,
          jsonb_build_object(
            'from_fee', v_old.fee_kes,
            'to_fee', v_row.fee_kes,
            'from_discount', v_old.discount_kes,
            'to_discount', v_row.discount_kes,
            'reason', v_row.discount_reason));

  return v_row;
end;
$$;

revoke execute on function public.set_enrollment_pricing(uuid, numeric, numeric, text) from anon;


-- ── Surface it where the money is read ─────────────────────────────────────
--  CREATE OR REPLACE, deliberately NOT a DROP.
--
--  The first draft of this migration dropped and recreated the view, which
--  fails outright: `intake_finance` (0008) is built on top of it, and Postgres
--  refuses to drop a view something else depends on. The suggested `CASCADE`
--  would have "worked" by silently destroying `intake_finance` and leaving the
--  database without it — a migration that removes a working object to add a
--  column is not a migration anyone should run.
--
--  The drop was only needed because the new columns were being inserted in the
--  MIDDLE of the column list. `CREATE OR REPLACE VIEW` cannot rename, reorder
--  or retype existing columns — but it can APPEND new ones, even while other
--  views depend on it. So the original ten columns stay exactly where they
--  were, in the same order, and the three new ones go on the end.
--
--  Nothing reads this view positionally, so the order is invisible to callers.
create or replace view public.enrollment_finance as
select
  e.id                          as enrollment_id,
  e.student_id,
  e.intake_id,
  e.fee_kes                     as fee_raw,
  coalesce(e.fee_kes, 0)        as fee_kes,
  coalesce(p.paid, 0)           as paid_kes,
  coalesce(e.fee_kes, 0) - coalesce(p.paid, 0) as balance_kes,
  case
    when e.fee_kes is null                      then 'unbilled'
    when coalesce(p.paid, 0) >  e.fee_kes       then 'overpaid'
    when e.fee_kes = 0                          then 'free'
    when coalesce(p.paid, 0) = 0                then 'unpaid'
    when coalesce(p.paid, 0) >= e.fee_kes       then 'paid'
    else                                             'partial'
  end as payment_status,
  p.last_paid_on,
  p.receipts,
  /* ── Appended in 0009. Must stay last. ───────────────────────────────── */
  e.discount_kes,
  e.discount_reason,
  -- What it would have cost at full price. Its own column because it is what
  -- makes "how much did we give away" answerable without re-deriving it.
  coalesce(e.fee_kes, 0) + e.discount_kes as list_fee_kes
from public.enrollments e
left join (
  select enrollment_id,
         sum(amount_kes) as paid,
         max(paid_on)    as last_paid_on,
         count(*)        as receipts
    from public.payments
   group by enrollment_id
) p on p.enrollment_id = e.id;

-- Re-asserted because a replaced view keeps its options, and being explicit
-- costs nothing next to the cost of this silently reverting to definer rights.
alter view public.enrollment_finance set (security_invoker = on);


-- ── Stats gain the discount total ──────────────────────────────────────────
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
      -- What the school chose not to charge. Worth a number of its own: a
      -- discount is real money, and one that is never totalled is one nobody
      -- notices growing.
      'discounted',  coalesce((select sum(discount_kes) from public.enrollments), 0),
      'discount_count', (select count(*) from public.enrollments where discount_kes > 0),
      'collected_30d', coalesce((select sum(amount_kes) from public.payments
                                  where paid_on >= current_date - interval '30 days'), 0),
      'by_method', coalesce((
        select jsonb_object_agg(method, total)
          from (select method, sum(amount_kes) as total
                  from public.payments group by method) m
      ), '{}'::jsonb),
      'spent',       coalesce((select sum(amount_kes) from public.expenses), 0),
      'spent_30d',   coalesce((select sum(amount_kes) from public.expenses
                                where spent_on >= current_date - interval '30 days'), 0),
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

import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import {
  Loader2, Search, ArrowUp, ArrowDown, ChevronsUpDown,
  ChevronLeft, ChevronRight, X, Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EASE_LUXE } from '@/lib/motion';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  ADMIN DESIGN SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════
 *  What separates software that looks expensive from software that merely
 *  looks tidy is almost never colour — it is DEPTH, DENSITY and RESTRAINT.
 *
 *  · DEPTH.   A single 1px ring reads flat and templated. Real surfaces use a
 *             stacked shadow: a tight contact shadow, a mid ambient shadow and
 *             a wide soft shadow, all warm-tinted rather than grey. Cards then
 *             sit ON the page rather than being drawn onto it.
 *  · DENSITY. Tight interior rhythm, generous exterior margins. Amateur
 *             dashboards do the opposite — loose interiors, cramped edges.
 *  · RESTRAINT. Almost everything is ink on paper. Gold appears perhaps twice
 *             per screen, which is exactly why it registers as valuable.
 *
 *  The shadow tokens below are the single most load-bearing part of this file.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/* Warm-tinted elevation. Never `shadow-lg` — grey shadows on a cream ground
   look like dirt. Every stop is espresso at low alpha. */
export const ELEVATION = {
  flat: 'shadow-[0_1px_1px_rgba(9,9,11,0.03),0_1px_2px_rgba(9,9,11,0.03)]',
  raised:
    'shadow-[0_1px_1px_rgba(9,9,11,0.03),0_2px_4px_rgba(9,9,11,0.03),0_8px_16px_-6px_rgba(9,9,11,0.07)]',
  lifted:
    'shadow-[0_1px_2px_rgba(9,9,11,0.04),0_4px_8px_rgba(9,9,11,0.04),0_16px_32px_-8px_rgba(9,9,11,0.10)]',
  floating:
    'shadow-[0_2px_4px_rgba(9,9,11,0.04),0_8px_16px_rgba(9,9,11,0.06),0_32px_64px_-12px_rgba(9,9,11,0.16)]',
} as const;

export const HAIRLINE = 'ring-1 ring-[rgba(9,9,11,0.09)]';

/* ── Page header ──────────────────────────────────────────────────────── */

export function PageHeader({
  title, subtitle, actions, eyebrow, meta,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  eyebrow?: string;
  meta?: ReactNode;
}) {
  return (
    /* Sans, not display serif, and 24px rather than 40px.
       A serif headline at brochure scale is right on a marketing page and wrong
       here: an operator opens this screen forty times a day to DO something, and
       a title that occupies a tenth of the viewport pushes the work below the
       fold. Expensive tools are quiet at the top and dense underneath. */
    <motion.header
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE_LUXE }}
      className="mb-5 flex flex-col gap-3 sm:mb-6 lg:flex-row lg:items-center lg:justify-between lg:gap-6"
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1.5 font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-gold-600">
            {eyebrow}
          </p>
        )}
        <h1 className="font-sans text-[1.375rem] font-semibold leading-[1.15] tracking-[-0.02em] text-slate-900 sm:text-[1.5rem]">
          {title}
        </h1>
        {subtitle && (
          <div className="mt-1 font-sans text-[0.875rem] leading-normal text-slate-500">
            {subtitle}
          </div>
        )}
        {meta && <div className="mt-3">{meta}</div>}
      </div>
      {/* On a phone the actions become a full-width row that scrolls rather than
          wrapping into a ragged stack of half-width buttons. */}
      {actions && (
        <div className="-mx-1 flex shrink-0 items-center gap-2 overflow-x-auto px-1 pb-0.5 lg:overflow-visible">
          {actions}
        </div>
      )}
    </motion.header>
  );
}

/* ── Surfaces ─────────────────────────────────────────────────────────── */

export function Card({
  children, className, interactive, elevation = 'raised', inset,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  elevation?: keyof typeof ELEVATION;
  inset?: boolean;
}) {
  return (
    <div
      className={cn(
        'relative rounded-2xl bg-white', HAIRLINE, ELEVATION[elevation],
        interactive &&
          'transition-[transform,box-shadow] duration-300 ease-luxe hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgba(9,9,11,0.04),0_8px_16px_rgba(9,9,11,0.05),0_24px_48px_-12px_rgba(9,9,11,0.13)]',
        inset && 'p-6',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Panel({
  children, className, title, description, action, elevation = 'raised',
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  description?: string;
  action?: ReactNode;
  elevation?: keyof typeof ELEVATION;
}) {
  return (
    <section
      className={cn('overflow-hidden rounded-xl bg-white', HAIRLINE, ELEVATION[elevation], className)}
    >
      {(title || action) && (
        <header className="flex items-center justify-between gap-4 border-b border-[rgba(9,9,11,0.07)] px-4 py-3 sm:px-5">
          <div className="min-w-0">
            {title && (
              <h2 className="truncate font-sans text-[0.875rem] font-semibold tracking-[-0.01em] text-slate-900">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-0.5 truncate font-sans text-[0.75rem] text-slate-500">{description}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

/* ── KPI ──────────────────────────────────────────────────────────────────
   Six separately-floating cards with six shadows and six gaps is the single
   most template-looking thing a dashboard can do — and painting one of them
   black to "anchor" the row just makes the eye land on whichever number the
   designer happened to put first, which is rarely the important one.

   These numbers are one instrument, so they get one surface, divided by
   hairlines. Fewer edges, more density, and every metric weighted the same. */

export function MetricGrid({ children }: { children: ReactNode }) {
  return (
    <div className={cn('overflow-hidden rounded-xl bg-white', HAIRLINE, ELEVATION.raised)}>
      {/* The negative margin + per-cell borders trick: cells draw their own
          top/left hairline and the container clips the outermost ones, so the
          grid stays clean at every breakpoint without :nth-child maths. */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6">{children}</div>
    </div>
  );
}

export function Metric({
  label, value, hint, Icon, index = 0, to,
}: {
  label: string;
  value: string | number;
  hint?: ReactNode;
  Icon?: LucideIcon;
  index?: number;
  /** When present the cell becomes a link — a number you can act on. */
  to?: string;
}) {
  const body = (
    <>
      <div className="flex items-center gap-1.5">
        {Icon && <Icon className="size-3.5 shrink-0 text-slate-400" aria-hidden="true" />}
        <p className="truncate font-sans text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-slate-500">
          {label}
        </p>
      </div>

      {/* Sans + proportional figures. A serif hero number reads as brochure
          decoration, and tabular digits make 121 look loose at display size —
          tabular belongs in columns, not headlines. */}
      <p className="mt-1.5 font-sans text-[1.75rem] font-semibold leading-none tracking-[-0.03em] text-slate-900">
        {value}
      </p>

      {hint && (
        <p className="mt-1.5 truncate font-sans text-[0.75rem] leading-tight text-slate-500">
          {hint}
        </p>
      )}
    </>
  );

  const className = cn(
    'relative block px-4 py-3.5 text-left transition-colors duration-200',
    // Interior hairlines only — the container clips the rest.
    'border-l border-t border-[rgba(9,9,11,0.07)]',
    '[&:nth-child(-n+2)]:border-t-0 [&:nth-child(odd)]:border-l-0',
    'md:[&:nth-child(3)]:border-t-0 md:[&:nth-child(odd)]:border-l md:[&:nth-child(3n+1)]:border-l-0',
    'xl:border-t-0 xl:[&:nth-child(3n+1)]:border-l xl:[&:nth-child(n+2)]:border-l xl:[&:first-child]:border-l-0',
    to && 'hover:bg-slate-50',
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE_LUXE, delay: index * 0.03 }}
      className="contents"
    >
      {to ? (
        <a href={to} className={className}>{body}</a>
      ) : (
        <div className={className}>{body}</div>
      )}
    </motion.div>
  );
}

/** Kept for screens that genuinely want one standalone figure. */
export function StatCard({
  label, value, hint, Icon,
}: {
  label: string;
  value: string | number;
  hint?: ReactNode;
  Icon?: LucideIcon;
}) {
  return (
    <div className={cn('rounded-xl bg-white px-4 py-3.5', HAIRLINE, ELEVATION.raised)}>
      <div className="flex items-center gap-1.5">
        {Icon && <Icon className="size-3.5 shrink-0 text-slate-400" aria-hidden="true" />}
        <p className="truncate font-sans text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-slate-500">
          {label}
        </p>
      </div>
      <p className="mt-1.5 font-sans text-[1.75rem] font-semibold leading-none tracking-[-0.03em] text-slate-900">
        {value}
      </p>
      {hint && <p className="mt-1.5 font-sans text-[0.75rem] text-slate-500">{hint}</p>}
    </div>
  );
}

export function Trend({ value, suffix = '' }: { value: number; suffix?: string }) {
  const up = value >= 0;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-medium',
        up ? 'bg-emerald-600/10 text-emerald-700' : 'bg-red-600/10 text-red-700',
      )}
    >
      {up ? <ArrowUp className="size-2.5" /> : <ArrowDown className="size-2.5" />}
      {Math.abs(value)}{suffix}
    </span>
  );
}

/* ── Badges ───────────────────────────────────────────────────────────── */

const BADGE_TONES = {
  valid: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  revoked: 'bg-red-50 text-red-700 ring-red-600/20',
  enrolled: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  completed: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  withdrawn: 'bg-slate-400/8 text-slate-600 ring-slate-300/20',
  planned: 'bg-slate-400/8 text-slate-600 ring-slate-300/20',
  running: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  cancelled: 'bg-red-50 text-red-700 ring-red-600/20',
  graduate: 'bg-amber-50 text-amber-900 ring-amber-600/25',
  neutral: 'bg-slate-100 text-slate-600 ring-slate-300/50',
} as const;

export type BadgeTone = keyof typeof BADGE_TONES;

export function Badge({
  children, tone = 'neutral', dot,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-[3px] ring-1',
        'font-sans text-[0.6875rem] font-medium capitalize leading-[1.3]',
        BADGE_TONES[tone] ?? BADGE_TONES.neutral,
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current opacity-60" />}
      {children}
    </span>
  );
}

/* ── Avatar ───────────────────────────────────────────────────────────── */

export function Avatar({
  name, src, size = 'md', ring,
}: {
  name: string;
  src?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  ring?: boolean;
}) {
  const dims = {
    xs: 'size-6 text-[0.625rem]',
    sm: 'size-8 text-[0.6875rem]',
    md: 'size-10 text-[0.8125rem]',
    lg: 'size-14 text-base',
    xl: 'size-24 text-2xl',
  }[size];

  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

  if (src) {
    return (
      <img
        src={src} alt="" loading="lazy"
        className={cn('shrink-0 rounded-full object-cover', dims, ring ? 'ring-2 ring-white' : 'ring-1 ring-slate-300/15')}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid shrink-0 place-items-center rounded-full font-sans font-semibold text-gold-300',
        'bg-gradient-to-br from-slate-700 to-slate-900',
        dims, ring && 'ring-2 ring-white',
      )}
    >
      {initials || '?'}
    </span>
  );
}

/* ── Toolbar ──────────────────────────────────────────────────────────── */

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="mb-5 flex flex-wrap items-center gap-2">{children}</div>;
}

export const CONTROL =
  'h-11 rounded-xl bg-white font-sans text-[1rem] text-slate-900 sm:h-9 sm:text-[0.875rem] ' +
  'ring-1 ring-[rgba(9,9,11,0.12)] transition-all duration-200 ' +
  'focus:outline-none focus:ring-2 focus:ring-gold-500/40 ' +
  ELEVATION.flat;

export function SearchInput({
  value, onChange, placeholder = 'Search', id,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  id: string;
}) {
  return (
    /* Full width on its own row on a phone. Sharing a flex row with two select
       filters, `flex-1 min-w-0` let the search collapse to a bare circle — the
       filters have intrinsic width and the search does not, so it lost every
       pixel of the negotiation. */
    <div className="relative w-full min-w-0 sm:w-auto sm:flex-1 sm:max-w-[19rem]">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
      <label htmlFor={id} className="sr-only">{placeholder}</label>
      <input
        id={id} type="search" value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(CONTROL, 'w-full pl-9 pr-8 placeholder:text-slate-400')}
      />
      {value && (
        <button
          type="button" onClick={() => onChange('')} aria-label="Clear search"
          className="absolute right-2.5 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded-md text-slate-400 transition-colors hover:bg-slate-400/10 hover:text-slate-900"
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  );
}

export function SelectFilter<T extends string>({
  value, onChange, options, label, id,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label: string;
  id: string;
}) {
  const active = value !== options[0]?.value;
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">{label}</label>
      <select
        id={id} value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={cn(
          CONTROL, 'cursor-pointer appearance-none pl-3 pr-8',
          active && 'ring-gold-500/40 text-slate-900',
        )}
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronsUpDown className="pointer-events-none absolute right-2.5 top-1/2 size-3 -translate-y-1/2 text-slate-400" aria-hidden="true" />
    </div>
  );
}

/* ── Tables ───────────────────────────────────────────────────────────── */

export function Table({
  children, minWidth = '48rem', className,
}: {
  children: ReactNode;
  minWidth?: string;
  className?: string;
}) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full border-collapse text-left" style={{ minWidth }}>{children}</table>
    </div>
  );
}

/**
 * The phone twin of a table.
 *
 * A data table on a 390px screen is the clearest sign nobody tested the thing
 * on a phone: either it side-scrolls (so a name and its status are never on
 * screen together) or it squeezes to unreadable. Pages render `MobileList` at
 * `< md` and hide the table, which is why `Table` takes a className.
 */
export function MobileList({ children }: { children: ReactNode }) {
  return <ul className="divide-y divide-[rgba(9,9,11,0.06)] md:hidden">{children}</ul>;
}

export function MobileRow({
  onClick, leading, title, subtitle, meta, trailing, selected,
}: {
  onClick?: () => void;
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  trailing?: ReactNode;
  selected?: boolean;
}) {
  return (
    <li className={cn(selected && 'bg-gold-500/[0.06]')}>
      <div className="flex items-center gap-3 px-4 py-3">
        {leading}
        <button
          type="button"
          onClick={onClick}
          disabled={!onClick}
          /* 44px minimum target: the whole text block is the tap area, not just
             the name, so a thumb never has to find a 13px line. */
          className="flex min-h-[2.75rem] min-w-0 flex-1 flex-col justify-center text-left disabled:cursor-default"
        >
          <span className="flex items-center gap-2">
            <span className="min-w-0 truncate font-sans text-[0.9375rem] font-medium text-slate-900">
              {title}
            </span>
            {meta}
          </span>
          {subtitle && (
            <span className="mt-0.5 block truncate font-sans text-[0.8125rem] text-slate-500">
              {subtitle}
            </span>
          )}
        </button>
        {trailing && <div className="shrink-0">{trailing}</div>}
      </div>
    </li>
  );
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={cn(
        'sticky top-0 z-[1] border-b border-[rgba(9,9,11,0.09)] bg-white/95 px-4 py-2.5 backdrop-blur lg:px-5',
        'font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.11em] text-slate-500',
        className,
      )}
    >
      {children}
    </th>
  );
}

export type SortDir = 'asc' | 'desc';

export function SortableTh<K extends string>({
  children, field, sort, onSort, className,
}: {
  children: ReactNode;
  field: K;
  sort: { field: K; dir: SortDir };
  onSort: (field: K) => void;
  className?: string;
}) {
  const active = sort.field === field;
  return (
    <Th className={cn('p-0', className)}>
      <button
        type="button" onClick={() => onSort(field)}
        aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
        className={cn(
          'flex w-full items-center gap-1.5 px-4 py-2.5 text-left transition-colors lg:px-5',
          'font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.11em]',
          active ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700',
        )}
      >
        {children}
        {active
          ? (sort.dir === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)
          : <ChevronsUpDown className="size-3 opacity-35" />}
      </button>
    </Th>
  );
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <td
      className={cn(
        'border-b border-[rgba(9,9,11,0.06)] px-4 py-3 font-sans text-[0.875rem] text-slate-700 lg:px-5',
        className,
      )}
    >
      {children}
    </td>
  );
}

export function Tr({
  children, onClick, selected,
}: {
  children: ReactNode;
  onClick?: () => void;
  selected?: boolean;
}) {
  return (
    <tr
      onClick={onClick}
      data-selected={selected || undefined}
      className={cn(
        'group/row transition-colors duration-150 last:[&>td]:border-b-0',
        selected ? 'bg-gold-500/[0.06]' : 'hover:bg-[rgba(9,9,11,0.025)]',
        onClick && 'cursor-pointer',
      )}
    >
      {children}
    </tr>
  );
}

/** Selection checkbox styled to match the system rather than the OS. */
export function Checkbox({
  checked, indeterminate, onChange, label,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-label={label}
      onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
      className={cn(
        /* An unchecked box was slate-300 at 30% alpha — roughly 1.1:1 against
           the white row, which is not a light control, it is an invisible one.
           WCAG 1.4.11 asks for 3:1 on the boundary of an interactive component
           and slate-400 only reaches 2.6:1, so the border is slate-500 (4.7:1).
           At 1.5px on an 18px box that reads as a checkbox, not a smudge. */
        'grid size-[18px] shrink-0 place-items-center rounded-[5px] transition-all duration-150',
        'ring-[1.5px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/50',
        checked || indeterminate
          ? 'bg-slate-900 text-white ring-slate-900'
          : 'bg-white ring-slate-500 hover:bg-slate-50 hover:ring-slate-700',
      )}
    >
      {indeterminate ? (
        <span className="h-0.5 w-2 rounded-full bg-current" />
      ) : checked ? (
        <Check className="size-3" strokeWidth={3} />
      ) : null}
    </button>
  );
}

/* ── Segmented control ────────────────────────────────────────────────────
   Two or three mutually-exclusive views. A real radiogroup, not a row of
   buttons: arrow keys move between options and only the active one is in the
   tab order, which is what a keyboard user expects from a segmented control. */
export function Segmented<T extends string>({
  value, onChange, options, label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string; Icon: LucideIcon }>;
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        'inline-flex shrink-0 items-center gap-0.5 rounded-xl bg-white p-0.5',
        'ring-1 ring-[rgba(9,9,11,0.12)]', ELEVATION.flat,
      )}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={o.label}
            title={o.label}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => {
              if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
              e.preventDefault();
              const i = options.findIndex((x) => x.value === value);
              const next = e.key === 'ArrowRight' ? i + 1 : i - 1;
              const target = options[(next + options.length) % options.length];
              if (target) onChange(target.value);
            }}
            className={cn(
              'grid size-8 place-items-center rounded-[10px] transition-colors duration-150',
              active
                ? 'bg-slate-900 text-white'
                : 'text-slate-500 hover:bg-slate-900/[0.06] hover:text-slate-900',
            )}
          >
            <o.Icon className="size-4" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}

/* ── Selection bar ────────────────────────────────────────────────────────
   Selecting rows should not push the table down or swap the toolbar out from
   under the operator's cursor — both make the page jump at the exact moment
   they are aiming at something. The bar floats instead: the table never
   reflows, and the actions land in the same place every time.

   It is dark on a light page deliberately. This is a transient mode, and the
   inversion says so more clearly than any label. */
export function SelectionBar({
  count, onClear, children,
}: {
  count: number;
  onClear: () => void;
  children: ReactNode;
}) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: 0.22, ease: EASE_LUXE }}
          role="region"
          aria-label={`${count} selected`}
          /* Sits above the mobile FAB, clear of the safe area on phones. */
          className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] sm:pb-6"
        >
          <div
            className={cn(
              'pointer-events-auto flex max-w-[calc(100vw-2rem)] items-center gap-1 overflow-x-auto',
              'rounded-full bg-slate-900 py-1.5 pl-1.5 pr-2 text-white',
              'ring-1 ring-white/10',
              ELEVATION.floating,
            )}
          >
            <span className="flex shrink-0 items-center gap-2 rounded-full bg-white/[0.07] py-1.5 pl-3 pr-3.5">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-gold-500 font-sans text-[0.6875rem] font-semibold text-slate-900 tabular-nums">
                {count > 99 ? '99+' : count}
              </span>
              <span className="whitespace-nowrap font-sans text-[0.8125rem] text-slate-200">
                selected
              </span>
            </span>

            {children}

            <span aria-hidden="true" className="mx-0.5 h-5 w-px shrink-0 bg-white/12" />

            <button
              type="button"
              onClick={onClear}
              aria-label="Clear selection"
              className="grid size-8 shrink-0 place-items-center rounded-full text-slate-300/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="size-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** An action inside `SelectionBar`. Dark-surface sibling of `AdminButton`. */
export function SelectionAction({
  Icon, children, onClick, tone = 'default', disabled,
}: {
  Icon: LucideIcon;
  children: ReactNode;
  onClick: () => void;
  tone?: 'default' | 'danger';
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2',
        'font-sans text-[0.8125rem] transition-colors duration-150 disabled:opacity-40',
        tone === 'danger'
          ? 'text-red-300 hover:bg-red-500/15 hover:text-red-200'
          : 'text-slate-200 hover:bg-white/10',
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      {children}
    </button>
  );
}

/* ── Pagination ───────────────────────────────────────────────────────── */

export function Pagination({
  page, pageCount, total, pageSize, onPage,
}: {
  page: number; pageCount: number; total: number; pageSize: number;
  onPage: (p: number) => void;
}) {
  if (total === 0) return null;
  const from = page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[rgba(9,9,11,0.07)] px-4 py-3 sm:px-5">
      <p className="font-sans text-[0.8125rem] text-slate-500">
        <span className="font-medium text-slate-700 tabular-nums">{from}–{to}</span>
        {' of '}
        <span className="tabular-nums">{total.toLocaleString('en-KE')}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button" onClick={() => onPage(Math.max(0, page - 1))} disabled={page === 0}
          aria-label="Previous page"
          className={cn('grid size-8 place-items-center rounded-lg text-slate-500 transition-colors',
            'hover:bg-slate-400/10 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-30')}
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="px-2.5 font-sans text-[0.8125rem] text-slate-500 tabular-nums">
          {page + 1} <span className="text-slate-400">/</span> {pageCount}
        </span>
        <button
          type="button" onClick={() => onPage(Math.min(pageCount - 1, page + 1))}
          disabled={page >= pageCount - 1} aria-label="Next page"
          className={cn('grid size-8 place-items-center rounded-lg text-slate-500 transition-colors',
            'hover:bg-slate-400/10 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-30')}
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}

/* ── States ───────────────────────────────────────────────────────────── */

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'relative overflow-hidden rounded-lg bg-[rgba(9,9,11,0.07)]',
        // A travelling sheen rather than a pulse. Pulsing opacity reads as a
        // broken element; a sweep reads as work in progress.
        'after:absolute after:inset-0 after:-translate-x-full after:animate-[shimmer-sweep_1.8s_infinite]',
        'after:bg-gradient-to-r after:from-transparent after:via-white/55 after:to-transparent',
        className,
      )}
    />
  );
}

export function TableSkeleton({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="px-4 sm:px-5" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 border-b border-[rgba(9,9,11,0.06)] py-3 last:border-0">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={cn('h-3', c === 0 ? 'w-28' : c === 1 ? 'flex-1' : 'w-16')} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Placeholder for a grid of content cards (intakes, courses) — not metrics. */
export function CardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={cn('rounded-xl bg-white p-4', HAIRLINE, ELEVATION.raised)}>
          <Skeleton className="h-2.5 w-20" />
          <Skeleton className="mt-3 h-5 w-32" />
          <Skeleton className="mt-3 h-2.5 w-24" />
        </div>
      ))}
    </>
  );
}

export function MetricSkeleton({ count = 6 }: { count?: number }) {
  return (
    <MetricGrid>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="border-l border-t border-[rgba(9,9,11,0.07)] px-4 py-3.5 [&:nth-child(-n+2)]:border-t-0 [&:nth-child(odd)]:border-l-0 md:[&:nth-child(3)]:border-t-0 md:[&:nth-child(3n+1)]:border-l-0 md:[&:nth-child(odd)]:border-l xl:border-t-0 xl:[&:first-child]:border-l-0"
        >
          <Skeleton className="h-2.5 w-20" />
          <Skeleton className="mt-2.5 h-6 w-12" />
          <Skeleton className="mt-2.5 h-2.5 w-16" />
        </div>
      ))}
    </MetricGrid>
  );
}

/**
 * Empty state.
 *
 * The illustration is a soft concentric halo behind the icon rather than a
 * stock graphic — it costs nothing, never looks dated, and keeps the palette
 * intact. A flat icon in a grey circle is the single clearest tell of a
 * template.
 */
export function EmptyState({
  title, body, action, secondaryAction, Icon,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  Icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE_LUXE }}
      className="flex flex-col items-center px-6 py-12 text-center sm:py-14"
    >
      {Icon && (
        <div className="relative mb-5 grid place-items-center">
          <span
            aria-hidden="true"
            className="absolute size-28 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(200,161,90,0.14) 0%, transparent 68%)' }}
          />
          <span aria-hidden="true" className="absolute size-20 rounded-full ring-1 ring-[rgba(200,161,90,0.18)]" />
          <span aria-hidden="true" className="absolute size-14 rounded-full ring-1 ring-[rgba(200,161,90,0.26)]" />
          <span className={cn('relative grid size-11 place-items-center rounded-full bg-white text-gold-600', HAIRLINE, ELEVATION.raised)}>
            <Icon className="size-5" />
          </span>
        </div>
      )}
      <p className="font-sans text-[0.9375rem] font-semibold tracking-[-0.01em] text-slate-900">
        {title}
      </p>
      {body && (
        <p className="mt-1.5 max-w-sm font-sans text-[0.8125rem] leading-relaxed text-slate-500">{body}</p>
      )}
      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
          {action}{secondaryAction}
        </div>
      )}
    </motion.div>
  );
}

export function Loading({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2.5 px-6 py-14" role="status" aria-live="polite">
      <Loader2 className="size-4 animate-spin text-gold-600" aria-hidden="true" />
      <span className="font-sans text-[0.875rem] text-slate-500">{label}…</span>
    </div>
  );
}

export function ErrorNote({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-red-50 px-4 py-3 ring-1 ring-red-600/15">
      <span className="font-sans text-[0.875rem] text-red-800">{message}</span>
      {retry && (
        <button
          type="button" onClick={retry}
          className="rounded-lg bg-white px-3 py-1.5 font-sans text-[0.8125rem] font-medium text-red-800 ring-1 ring-red-600/20 transition-colors hover:bg-red-50"
        >
          Try again
        </button>
      )}
    </div>
  );
}

/* ── Forms ────────────────────────────────────────────────────────────── */

export function Field({
  label, htmlFor, error, hint, optional, children,
}: {
  label: string; htmlFor: string; error?: string; hint?: string; optional?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-2 flex items-baseline gap-2 font-sans text-[0.8125rem] font-medium text-slate-900">
        {label}
        {optional && <span className="font-normal text-slate-400">optional</span>}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 font-sans text-[0.8125rem] text-red-700">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 font-sans text-[0.75rem] text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

export const inputClass =
  'w-full rounded-xl bg-white px-3.5 font-sans text-slate-900 ' +
  // 16px on a phone is not a style choice: iOS zooms the viewport whenever a
  // focused input is smaller, and the user is then left pinching back out.
  'min-h-[2.75rem] py-2.5 text-[1rem] sm:min-h-0 sm:text-[0.9375rem] ' +
  'ring-1 ring-[rgba(9,9,11,0.12)] transition-all duration-200 placeholder:text-slate-400 ' +
  'focus:outline-none focus:ring-2 focus:ring-gold-500/45 ' +
  'shadow-[0_1px_1px_rgba(9,9,11,0.03)]';

export const inputErrorClass = 'ring-red-500/50 focus:ring-red-500/50';

/* ── Detail list ──────────────────────────────────────────────────────── */

export function DetailRow({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-[rgba(9,9,11,0.06)] py-3 last:border-0">
      <dt className="font-sans text-[0.8125rem] text-slate-500">{label}</dt>
      <dd className="font-sans text-[0.875rem] font-medium text-slate-900">{value || '—'}</dd>
    </div>
  );
}

/* ── Progress ─────────────────────────────────────────────────────────── */

export function ProgressBar({
  value, max, tone = 'gold', size = 'md',
}: {
  value: number; max: number; tone?: 'gold' | 'emerald'; size?: 'sm' | 'md';
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={cn('w-full overflow-hidden rounded-full bg-[rgba(9,9,11,0.09)]', size === 'sm' ? 'h-1' : 'h-1.5')}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.9, ease: EASE_LUXE }}
        className={cn(
          'h-full rounded-full',
          tone === 'gold'
            ? 'bg-gradient-to-r from-gold-600 to-gold-400'
            : 'bg-gradient-to-r from-emerald-600 to-emerald-400',
        )}
      />
    </div>
  );
}

/* ── Section heading inside a page ────────────────────────────────────── */

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <h2 className="font-sans text-[0.9375rem] font-semibold tracking-[-0.01em] text-slate-900">
        {children}
      </h2>
      {action}
    </div>
  );
}

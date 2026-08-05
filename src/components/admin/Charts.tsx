import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Table2, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EASE_LUXE } from '@/lib/motion';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Dashboard charts — hand-built SVG, no charting library.
 * ─────────────────────────────────────────────────────────────────────────────
 *  Decisions worth recording, because each was a real fork:
 *
 *  · MARK COLOUR IS gold-600 (#a8813f), NOT the brand gold-500 (#c8a15a).
 *    Measured, not eyeballed: gold-500 on the cream admin surface is 2.31:1,
 *    under the 3:1 floor for a non-text mark. gold-600 clears it and is still
 *    unmistakably the brand accent.
 *
 *  · COURSE DISTRIBUTION IS A BAR LIST, NOT A DONUT. Six segments of similar
 *    size is precisely what a donut is worst at — angle is far harder to
 *    compare than length. Bars also give every category a direct value label,
 *    so the numbers never hide inside a tooltip.
 *
 *  · ONE HUE PER CHART. Colouring six bars six different ways would burn the
 *    only free channel on information the bar length already carries. Category
 *    identity comes from the label beside each bar.
 *
 *  · EVERY CHART HAS A TABLE TWIN. A tooltip must enhance, never gate — the
 *    toggle exposes the same numbers as text for screen readers, print, and
 *    anyone who would simply rather read them.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const MARK = '#a8813f'; // gold-600 — validated ≥3:1 on the cream surface
const GRID = 'rgba(122,94,66,0.14)';
const AXIS_TEXT = '#9a7754';

/** Width of the element, tracked so labels stay at a fixed pixel size. */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry!.contentRect.width));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  return { ref, width };
}

export interface SeriesPoint {
  label: string;
  value: number;
}

/* ═══════════════════════════════════════════════════════════════════════════
   AREA CHART — change over time, single series
   ═══════════════════════════════════════════════════════════════════════════ */

export function AreaChart({
  data, title, caption, height = 180,
}: {
  data: SeriesPoint[];
  title: string;
  caption?: string;
  height?: number;
}) {
  const { ref, width } = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);
  const gradientId = useRef(`area-${Math.random().toString(36).slice(2, 9)}`).current;

  // The x-axis band lives INSIDE this height, so the card never grows a nested
  // scrollbar just to show its month labels.
  const AXIS_BAND = 22;
  const PAD_L = 34;
  const PAD_R = 12;
  const PAD_T = 10;
  const plotH = height - AXIS_BAND - PAD_T;
  const plotW = Math.max(0, width - PAD_L - PAD_R);

  const max = Math.max(1, ...data.map((d) => d.value));
  // A "nice" ceiling: the smallest 1/2/5×10ⁿ at or above the peak. The old
  // `ceil(max/4)*4` sent a peak of 2 to a ceiling of 4, drawing the only real
  // data point at half height — which is what made a live chart look empty.
  const ceiling = useMemo(() => {
    const mag = 10 ** Math.floor(Math.log10(max));
    const norm = max / mag;
    return (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  }, [max]);

  const points = useMemo(
    () =>
      data.map((d, i) => ({
        ...d,
        x: PAD_L + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW),
        y: PAD_T + plotH - (d.value / ceiling) * plotH,
      })),
    [data, plotW, plotH, ceiling],
  );

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath =
    points.length > 0
      ? `${linePath} L${points[points.length - 1]!.x},${PAD_T + plotH} L${points[0]!.x},${PAD_T + plotH} Z`
      : '';

  const total = data.reduce((s, d) => s + d.value, 0);
  const last = points[points.length - 1];

  return (
    <div>
      <div className="mb-3.5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-sans text-[0.875rem] font-semibold text-slate-900">{title}</h3>
          {caption && (
            <p className="mt-0.5 font-sans text-[0.75rem] text-slate-500">{caption}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setAsTable((v) => !v)}
          aria-pressed={asTable}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 font-sans text-[0.75rem] text-slate-500 transition-colors hover:bg-slate-400/10 hover:text-slate-900"
        >
          {asTable ? <BarChart3 className="size-3.5" /> : <Table2 className="size-3.5" />}
          {asTable ? 'Chart' : 'Table'}
        </button>
      </div>

      {asTable ? (
        <div className="max-h-[180px] overflow-y-auto">
          <table className="w-full text-left">
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr>
                <th scope="col" className="pb-2 font-sans text-[0.6875rem] uppercase tracking-[0.12em] text-slate-500">
                  Month
                </th>
                <th scope="col" className="pb-2 text-right font-sans text-[0.6875rem] uppercase tracking-[0.12em] text-slate-500">
                  Count
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.label} className="border-t border-slate-200/8">
                  <td className="py-1.5 font-sans text-[0.8125rem] text-slate-700">{d.label}</td>
                  <td className="py-1.5 text-right font-sans text-[0.8125rem] text-slate-900 tabular-nums">
                    {d.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div ref={ref} className="relative">
          {total === 0 ? (
            <div
              style={{ height }}
              className="flex items-center justify-center rounded-lg bg-slate-400/[0.04] font-sans text-[0.8125rem] text-slate-500"
            >
              No registrations in this period yet
            </div>
          ) : (
            width > 0 && (
              <svg
                width={width}
                height={height}
                role="img"
                aria-label={`${title}. ${data.map((d) => `${d.label}: ${d.value}`).join(', ')}`}
                onMouseLeave={() => setHover(null)}
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  let nearest = 0;
                  let best = Infinity;
                  points.forEach((p, i) => {
                    const d = Math.abs(p.x - x);
                    if (d < best) {
                      best = d;
                      nearest = i;
                    }
                  });
                  setHover(nearest);
                }}
              >
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={MARK} stopOpacity="0.22" />
                    <stop offset="100%" stopColor={MARK} stopOpacity="0.02" />
                  </linearGradient>
                </defs>

                {/* Grid — solid hairlines, one shade off the surface. Never dashed. */}
                {[0, 0.5, 1].map((t) => {
                  /* Two decimals never appear because the ceiling is always a
                     nice number, so halving it stays whole for even ceilings
                     and lands on .5 only for 1 and 5 — both of which read fine. */
                  const y = PAD_T + plotH * t;
                  return (
                    <g key={t}>
                      <line x1={PAD_L} y1={y} x2={width - PAD_R} y2={y} stroke={GRID} strokeWidth="1" />
                      <text
                        x={PAD_L - 8}
                        y={y + 3}
                        textAnchor="end"
                        className="tabular-nums"
                        style={{ fontSize: 10, fill: AXIS_TEXT }}
                      >
                        {Number((ceiling * (1 - t)).toFixed(1))}
                      </text>
                    </g>
                  );
                })}

                <motion.path
                  d={areaPath}
                  fill={`url(#${gradientId})`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, ease: EASE_LUXE }}
                />
                <motion.path
                  d={linePath}
                  fill="none"
                  stroke={MARK}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.9, ease: EASE_LUXE }}
                />

                {/* Endpoint marker — the one point worth labelling directly. */}
                {last && (
                  <>
                    <circle cx={last.x} cy={last.y} r="4" fill={MARK} stroke="#fcfaf5" strokeWidth="2" />
                  </>
                )}

                {/* Hover crosshair. Hit area is the whole svg, so there is no
                    pinpoint target to land on. */}
                {hover !== null && points[hover] && (
                  <g>
                    <line
                      x1={points[hover]!.x}
                      y1={PAD_T}
                      x2={points[hover]!.x}
                      y2={PAD_T + plotH}
                      stroke={MARK}
                      strokeWidth="1"
                      strokeOpacity="0.35"
                    />
                    <circle
                      cx={points[hover]!.x}
                      cy={points[hover]!.y}
                      r="5"
                      fill={MARK}
                      stroke="#fcfaf5"
                      strokeWidth="2"
                    />
                  </g>
                )}

                {/* X labels — thinned so they never collide. */}
                {points.map((p, i) => {
                  const step = Math.ceil(points.length / Math.max(1, Math.floor(plotW / 56)));
                  if (i % step !== 0 && i !== points.length - 1) return null;
                  return (
                    <text
                      key={p.label}
                      x={p.x}
                      y={height - 6}
                      textAnchor={i === points.length - 1 ? 'end' : 'middle'}
                      style={{ fontSize: 10, fill: AXIS_TEXT }}
                    >
                      {p.label}
                    </text>
                  );
                })}
              </svg>
            )
          )}

          {hover !== null && data[hover] && (
            <div
              className="pointer-events-none absolute -translate-x-1/2 rounded-md bg-slate-900 px-2.5 py-1.5 shadow-lg"
              style={{ left: points[hover]!.x, top: Math.max(0, points[hover]!.y - 44) }}
            >
              <p className="whitespace-nowrap font-sans text-[0.75rem] text-white">
                <span className="tabular-nums">{data[hover]!.value}</span>
                <span className="ml-1.5 text-slate-300/60">{data[hover]!.label}</span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   BAR LIST — magnitude across nominal categories
   ═══════════════════════════════════════════════════════════════════════════ */

export function BarList({
  data, title, caption, emptyLabel = 'No data yet',
}: {
  data: SeriesPoint[];
  title: string;
  caption?: string;
  emptyLabel?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div>
      <div className="mb-3.5">
        <h3 className="font-sans text-[0.875rem] font-semibold text-slate-900">{title}</h3>
        {caption && <p className="mt-0.5 font-sans text-[0.75rem] text-slate-500">{caption}</p>}
      </div>

      {total === 0 ? (
        <div className="flex h-[140px] items-center justify-center rounded-lg bg-slate-400/[0.04] font-sans text-[0.8125rem] text-slate-500">
          {emptyLabel}
        </div>
      ) : (
        // A definition list rather than divs: the category/value pairing is
        // real structure, and it reads correctly without any extra ARIA.
        //
        // Bars are scaled to SHARE OF TOTAL, not to the largest value. Scaling
        // to the max means the leader is always pinned at 100% — and when two
        // categories tie, every bar runs the full width and the chart reads as
        // broken rather than as "evenly split". Share is also the question
        // someone actually asks of a programme breakdown.
        <dl className="space-y-2.5">
          {data.map((d, i) => {
            const share = (d.value / total) * 100;
            return (
              <div key={d.label}>
                <div className="mb-1 flex items-baseline justify-between gap-3">
                  <dt className="min-w-0 truncate font-sans text-[0.8125rem] text-slate-700">
                    {d.label}
                  </dt>
                  {/* Direct label on every bar — never hidden in a tooltip. */}
                  <dd className="shrink-0 font-sans text-[0.8125rem] text-slate-500 tabular-nums">
                    <span className="font-medium text-slate-900">{d.value}</span>
                    <span className="ml-1.5">{Math.round(share)}%</span>
                  </dd>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-400/12">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${share}%` }}
                    transition={{ duration: 0.7, ease: EASE_LUXE, delay: i * 0.05 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: MARK }}
                  />
                </div>
              </div>
            );
          })}
        </dl>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SPARK BARS — compact monthly counts, used inside a stat panel
   ═══════════════════════════════════════════════════════════════════════════ */

export function SparkBars({ data, ariaLabel }: { data: SeriesPoint[]; ariaLabel: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div
      className="flex h-10 items-end gap-[2px]"
      role="img"
      aria-label={`${ariaLabel}: ${data.map((d) => `${d.label} ${d.value}`).join(', ')}`}
    >
      {data.map((d, i) => (
        <motion.div
          key={d.label}
          initial={{ height: 0 }}
          animate={{ height: `${Math.max(6, (d.value / max) * 100)}%` }}
          transition={{ duration: 0.5, ease: EASE_LUXE, delay: i * 0.03 }}
          className={cn('flex-1 rounded-t-[2px]')}
          style={{ backgroundColor: MARK, opacity: d.value === 0 ? 0.18 : 0.85 }}
          title={`${d.label}: ${d.value}`}
        />
      ))}
    </div>
  );
}

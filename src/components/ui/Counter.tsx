import { useEffect, useRef, useState } from 'react';
import { animate, useInView, useReducedMotion } from 'framer-motion';
import { EASE_LUXE } from '@/lib/motion';
import { formatNumber } from '@/lib/utils';

export interface CounterProps {
  /** Final value. */
  to: number;
  /** Rendered before the number, e.g. "KES ". */
  prefix?: string;
  /** Rendered after the number, e.g. "+" or "%". */
  suffix?: string;
  /** Seconds. Longer than ~2.4s and people stop watching. */
  duration?: number;
  className?: string;
}

/**
 * Counts up once, when scrolled into view.
 *
 * Uses `tabular-nums` (see `.tabular` in globals.css) so the digits occupy a
 * fixed width — otherwise the number visibly jitters left and right as it
 * counts, which undoes the whole effect.
 *
 * Screen readers get the final value immediately via `aria-label` rather than
 * being read a stream of intermediate numbers.
 */
export function Counter({ to, prefix = '', suffix = '', duration = 2, className }: CounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const prefersReduced = useReducedMotion();
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;

    if (prefersReduced) {
      setValue(to);
      return;
    }

    const controls = animate(0, to, {
      duration,
      ease: EASE_LUXE,
      onUpdate: (latest) => setValue(latest),
    });

    return () => controls.stop();
  }, [inView, to, duration, prefersReduced]);

  return (
    <span ref={ref} className={className} aria-label={`${prefix}${formatNumber(to)}${suffix}`}>
      <span aria-hidden="true" className="tabular">
        {prefix}
        {formatNumber(Math.round(value))}
        {suffix}
      </span>
    </span>
  );
}

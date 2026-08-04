import type { Transition, Variants } from 'framer-motion';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  MOTION LANGUAGE
 * ─────────────────────────────────────────────────────────────────────────────
 *  One curve, one set of durations, one stagger rhythm — reused everywhere.
 *  This is what separates "animated" from "art-directed": the whole site moves
 *  with a single hand.
 *
 *  Rule of thumb applied throughout:
 *    · Entrances are slow and confident (0.9–1.2s) — luxury never rushes.
 *    · Interactions are fast (0.2–0.4s) — the interface must feel instant.
 *    · Nothing travels more than ~40px. Big journeys read as cheap.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** The house curve — a strong ease-out that decelerates into place. */
export const EASE_LUXE = [0.16, 1, 0.3, 1] as const;
export const EASE_SWIFT = [0.4, 0, 0.2, 1] as const;

export const DURATION = {
  instant: 0.2,
  fast: 0.35,
  base: 0.6,
  slow: 0.9,
  cinematic: 1.2,
} as const;

export const transitions = {
  luxe: { duration: DURATION.slow, ease: EASE_LUXE },
  cinematic: { duration: DURATION.cinematic, ease: EASE_LUXE },
  swift: { duration: DURATION.fast, ease: EASE_SWIFT },
  spring: { type: 'spring', stiffness: 320, damping: 30, mass: 0.6 },
  softSpring: { type: 'spring', stiffness: 140, damping: 22, mass: 0.9 },
} satisfies Record<string, Transition>;

/* ── Reveal variants ──────────────────────────────────────────────────────
   `custom` on the motion element carries the index for manual stagger when
   a parent container isn't practical (e.g. across grid boundaries). */

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { ...transitions.luxe, delay: i * 0.08 },
  }),
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: (i: number = 0) => ({
    opacity: 1,
    transition: { ...transitions.luxe, delay: i * 0.08 },
  }),
};

export const fadeRight: Variants = {
  hidden: { opacity: 0, x: -32 },
  visible: (i: number = 0) => ({
    opacity: 1,
    x: 0,
    transition: { ...transitions.luxe, delay: i * 0.08 },
  }),
};

export const fadeLeft: Variants = {
  hidden: { opacity: 0, x: 32 },
  visible: (i: number = 0) => ({
    opacity: 1,
    x: 0,
    transition: { ...transitions.luxe, delay: i * 0.08 },
  }),
};

/** Scale-in used for imagery and cards — starts slightly large, settles. */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 1.06 },
  visible: (i: number = 0) => ({
    opacity: 1,
    scale: 1,
    transition: { ...transitions.cinematic, delay: i * 0.08 },
  }),
};

/** Parent container that staggers its children. */
export const staggerParent = (stagger = 0.08, delayChildren = 0): Variants => ({
  hidden: {},
  visible: {
    transition: { staggerChildren: stagger, delayChildren },
  },
});

/** Child of `staggerParent` — no custom index needed. */
export const staggerChild: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: transitions.luxe },
};

/**
 * Per-line mask reveal for display headings. The parent clips overflow and the
 * child slides up from beneath — the classic editorial entrance.
 */
export const maskLine: Variants = {
  hidden: { y: '110%' },
  visible: (i: number = 0) => ({
    y: '0%',
    transition: { duration: DURATION.cinematic, ease: EASE_LUXE, delay: 0.1 + i * 0.09 },
  }),
};

/* ── Viewport defaults ────────────────────────────────────────────────────
   `once: true` is deliberate: re-animating on every scroll-past is the single
   most common tell of an amateur site. */
export const viewportOnce = { once: true, amount: 0.25 } as const;
export const viewportEarly = { once: true, amount: 0.1 } as const;

/* ── Page transitions ─────────────────────────────────────────────────── */
/* Entrance only — there is deliberately no `exit`. An exit animation keeps the
   outgoing route mounted while it plays, emptying <main> before the new one
   arrives, which makes the footer visibly jump up and back on every navigation.
   Opacity only, and short: each route's own scroll reveals carry it from there. */
export const pageTransition: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: DURATION.fast, ease: EASE_LUXE } },
};

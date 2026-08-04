import type { ReactNode } from 'react';
import { motion, type Variants } from 'framer-motion';
import { fadeUp, fadeIn, fadeLeft, fadeRight, scaleIn, viewportOnce } from '@/lib/motion';

const VARIANT_MAP = {
  up: fadeUp,
  in: fadeIn,
  left: fadeLeft,
  right: fadeRight,
  scale: scaleIn,
} satisfies Record<string, Variants>;

export interface RevealProps {
  children: ReactNode;
  /** Direction of travel. `up` is the default and should stay the default. */
  variant?: keyof typeof VARIANT_MAP;
  /** Stagger index — multiplied by 80ms inside the variant. */
  index?: number;
  /** Fraction of the element that must be visible before firing. */
  amount?: number;
  className?: string;
}

/**
 * Scroll-triggered entrance. Wraps children in a single motion.div — cheap
 * enough to use liberally, and `once: true` means it never re-fires (the
 * fastest way to make a site feel amateur is to re-animate on every pass).
 *
 * Framer Motion reads `prefers-reduced-motion` internally and collapses these
 * transforms to a plain opacity change, so no extra guard is needed here.
 */
export function Reveal({ children, variant = 'up', index = 0, amount, className }: RevealProps) {
  return (
    <motion.div
      className={className}
      variants={VARIANT_MAP[variant]}
      custom={index}
      initial="hidden"
      whileInView="visible"
      viewport={amount ? { once: true, amount } : viewportOnce}
    >
      {children}
    </motion.div>
  );
}

/**
 * Container that staggers its `<Reveal.Item>` children. Use when items sit in
 * one grid and should cascade; use bare <Reveal index={i}> when they don't.
 */
export function RevealGroup({
  children,
  stagger = 0.08,
  delayChildren = 0,
  className,
  amount,
}: {
  children: ReactNode;
  stagger?: number;
  delayChildren?: number;
  className?: string;
  amount?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={amount ? { once: true, amount } : viewportOnce}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger, delayChildren } },
      }}
    >
      {children}
    </motion.div>
  );
}

const ITEM_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] } },
};

export function RevealItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={ITEM_VARIANTS}>
      {children}
    </motion.div>
  );
}

import { useRef, type ReactNode } from 'react';
import { motion, useScroll, useTransform, useSpring, useReducedMotion } from 'framer-motion';

export interface ParallaxProps {
  children: ReactNode;
  /**
   * Travel distance as a fraction of the element's height across the full
   * scroll pass. 0.15 is subtle; above ~0.35 it starts to read as a bug.
   * Negative values move against the scroll direction.
   */
  speed?: number;
  className?: string;
}

/**
 * Depth on scroll. Deliberately conservative: the difference between "premium"
 * and "gimmick" here is entirely a question of amplitude.
 *
 * The output is spring-smoothed because raw scroll-linked transforms judder on
 * trackpads that emit high-frequency deltas.
 */
export function Parallax({ children, speed = 0.15, className }: ParallaxProps) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const distance = speed * 100;
  const raw = useTransform(scrollYProgress, [0, 1], [`${distance}%`, `${-distance}%`]);
  const y = useSpring(raw, { stiffness: 220, damping: 40, mass: 0.4 });

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div ref={ref} style={{ y }} className={className}>
      {children}
    </motion.div>
  );
}

/**
 * Parallax for a background image inside a clipped frame. The child is scaled
 * beyond its container so the movement never exposes an empty edge — the
 * mistake that makes most parallax implementations show a white sliver.
 */
export function ParallaxImage({
  children,
  speed = 0.12,
  className,
}: {
  children: ReactNode;
  speed?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const raw = useTransform(scrollYProgress, [0, 1], [`${-speed * 100}%`, `${speed * 100}%`]);
  const y = useSpring(raw, { stiffness: 220, damping: 40, mass: 0.4 });

  // Over-scale by exactly the travel range, plus a hair for rounding.
  const overscale = 1 + speed * 2 + 0.02;

  return (
    <div ref={ref} className={className} style={{ overflow: 'hidden' }}>
      <motion.div
        style={prefersReduced ? undefined : { y, scale: overscale, height: '100%' }}
        className="size-full"
      >
        {children}
      </motion.div>
    </div>
  );
}

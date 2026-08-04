import { useCallback, useEffect, useRef, useState } from 'react';
import { useMotionValue, useSpring, useReducedMotion, type MotionValue } from 'framer-motion';

/**
 * ── useMagnetic ───────────────────────────────────────────────────────────
 * Pulls an element toward the cursor while the pointer is nearby, then springs
 * home on leave. The effect that makes buttons feel physical.
 *
 * Disabled outright for coarse pointers (no cursor to be magnetic toward) and
 * for users who asked for reduced motion.
 *
 * @param strength How far the element travels, as a fraction of pointer offset.
 */
export function useMagnetic<T extends HTMLElement>(strength = 0.35): {
  ref: React.RefObject<T>;
  x: MotionValue<number>;
  y: MotionValue<number>;
} {
  const ref = useRef<T>(null);
  const prefersReduced = useReducedMotion();

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, { stiffness: 260, damping: 22, mass: 0.5 });
  const y = useSpring(rawY, { stiffness: 260, damping: 22, mass: 0.5 });

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReduced) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;

    const onMove = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const offsetX = event.clientX - (rect.left + rect.width / 2);
      const offsetY = event.clientY - (rect.top + rect.height / 2);
      rawX.set(offsetX * strength);
      rawY.set(offsetY * strength);
    };

    const onLeave = () => {
      rawX.set(0);
      rawY.set(0);
    };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [prefersReduced, rawX, rawY, strength]);

  return { ref, x, y };
}

/** Subscribe to a media query. SSR-safe and cleans up after itself. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(query).matches,
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    setMatches(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/**
 * Freeze background scrolling while a modal/menu is open, compensating for the
 * scrollbar's width so the page doesn't visibly jump sideways.
 */
export function useLockBodyScroll(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;

    const { overflow, paddingRight } = document.body.style;
    const gap = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = 'hidden';
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;

    return () => {
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
    };
  }, [locked]);
}

/**
 * Tracks scroll direction and whether the page has scrolled past a threshold.
 * Drives the header's hide-on-scroll-down / reveal-on-scroll-up behaviour.
 */
export function useScrollState(threshold = 24): { scrolled: boolean; direction: 'up' | 'down' } {
  const [scrolled, setScrolled] = useState(false);
  const [direction, setDirection] = useState<'up' | 'down'>('up');
  const lastY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;

      requestAnimationFrame(() => {
        const y = window.scrollY;
        setScrolled(y > threshold);
        // Ignore sub-pixel jitter and rubber-band overscroll at the top.
        if (Math.abs(y - lastY.current) > 6 && y > 0) {
          setDirection(y > lastY.current ? 'down' : 'up');
          lastY.current = y;
        }
        ticking.current = false;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  return { scrolled, direction };
}

/** Trap Tab focus inside a container — required for accessible modals/menus. */
export function useFocusTrap<T extends HTMLElement>(active: boolean) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!active) return;
    const container = ref.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const selector =
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const focusables = Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
        (el) => el.offsetParent !== null,
      );
      if (focusables.length === 0) return;

      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [active]);

  return ref;
}

/** Copy text to the clipboard and report success for ~2s. */
export function useCopy(): { copied: boolean; copy: (text: string) => void } {
  const [copied, setCopied] = useState(false);

  const copy = useCallback((text: string) => {
    navigator.clipboard?.writeText(text).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      },
      () => setCopied(false),
    );
  }, []);

  return { copied, copy };
}

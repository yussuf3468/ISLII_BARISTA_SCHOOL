import { createElement, type ElementType } from 'react';
import { motion } from 'framer-motion';
import { EASE_LUXE } from '@/lib/motion';
import { cn, toWords } from '@/lib/utils';

export interface MaskedTextProps {
  /** The text to reveal. Wrapped per word so it survives responsive rewrapping. */
  text: string;
  as?: ElementType;
  className?: string;
  /** Seconds before the first word begins. */
  delay?: number;
  /** Seconds between consecutive words. */
  stagger?: number;
  /** Fire on mount instead of on scroll — used for the hero. */
  immediate?: boolean;
  /** Words matching these strings render in gold. Case-sensitive. */
  accentWords?: readonly string[];
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  MaskedText — the editorial headline entrance.
 * ─────────────────────────────────────────────────────────────────────────────
 *  Each word sits in an overflow-clipped box and slides up from beneath it.
 *
 *  Two details do the heavy lifting:
 *
 *  1. Masking per WORD, not per line. Line-based masking needs the browser's
 *     final line boxes, which don't exist until after layout — so it breaks
 *     the moment the viewport changes. Words re-wrap freely and stay correct.
 *
 *  2. The clip box is padded downward and pulled back with a negative margin.
 *     Without it, `overflow: hidden` shears the descenders off g, j, p, q, y —
 *     a subtle wrongness that's very hard to un-see once noticed.
 *
 *  Accessibility: the full string is exposed to screen readers as one label and
 *  the decorative word spans are hidden, so assistive tech reads a clean
 *  sentence rather than 9 disconnected fragments.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function MaskedText({
  text,
  as = 'span',
  className,
  delay = 0,
  stagger = 0.055,
  immediate = false,
  accentWords = [],
}: MaskedTextProps) {
  const words = toWords(text);
  const accents = new Set(accentWords);

  const animationProps = immediate
    ? { initial: 'hidden' as const, animate: 'visible' as const }
    : {
        initial: 'hidden' as const,
        whileInView: 'visible' as const,
        viewport: { once: true, amount: 0.4 },
      };

  return createElement(
    as,
    { className: cn('block', className), 'aria-label': text },
    <motion.span aria-hidden="true" className="inline" {...animationProps}>
      {words.map((word, i) => {
        const isAccent = accents.has(word);
        return (
          <span
            key={`${word}-${i}`}
            className={cn(
              // -mb pulls the layout box back so the extra pb doesn't add leading.
              'inline-flex overflow-hidden pb-[0.14em] -mb-[0.14em] align-bottom',
              // Word spacing is an explicit margin, NOT a &nbsp; child. Inside a
              // flex clip box a nbsp collapses to almost nothing, which lets a
              // display face with heavy side bearing (Fraunces italic especially)
              // run its last glyph straight into the next word.
              i < words.length - 1 && 'mr-[0.26em]',
              // Italics lean past their advance width; without the extra right
              // padding the overhang gets sheared off by `overflow-hidden`.
              isAccent && 'pr-[0.08em]',
            )}
          >
            <motion.span
              className={cn('inline-block', isAccent && 'italic text-gold-500')}
              variants={{
                hidden: { y: '108%' },
                visible: {
                  y: '0%',
                  transition: { duration: 1.05, ease: EASE_LUXE, delay: delay + i * stagger },
                },
              }}
            >
              {word}
            </motion.span>
          </span>
        );
      })}
    </motion.span>,
  );
}

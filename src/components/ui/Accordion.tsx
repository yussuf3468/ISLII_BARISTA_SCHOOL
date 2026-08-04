import { useId, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { EASE_LUXE } from '@/lib/motion';
import { cn } from '@/lib/utils';

export interface AccordionItemData {
  question: string;
  answer: ReactNode;
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Accordion — used for the FAQ.
 * ─────────────────────────────────────────────────────────────────────────────
 *  Accessibility is the whole job here, and it is done properly:
 *    · The trigger is a real <button> inside an <h3> — so screen-reader users
 *      can jump between questions with heading navigation
 *    · `aria-expanded` reflects state; `aria-controls` points at the panel
 *    · The panel is labelled back at its trigger via `aria-labelledby`
 *    · Collapsed panels are removed from the tree entirely, so their content
 *      can't be reached by Tab while invisible
 *
 *  The "+" rotates 45° into an "×" rather than swapping icons — one element,
 *  no layout shift, and the rotation carries the state change legibly.
 * ─────────────────────────────────────────────────────────────────────────────
 */

function AccordionRow({
  item,
  isOpen,
  onToggle,
  index,
}: {
  item: AccordionItemData;
  isOpen: boolean;
  onToggle: () => void;
  index: number;
}) {
  const uid = useId();
  const triggerId = `faq-trigger-${uid}`;
  const panelId = `faq-panel-${uid}`;

  return (
    <div className="border-b border-coffee-400/20">
      <h3>
        <button
          id={triggerId}
          type="button"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={onToggle}
          className={cn(
            'group flex w-full items-start justify-between gap-6 py-7 text-left md:py-9',
            'transition-colors duration-300',
          )}
        >
          <span className="flex items-start gap-5 md:gap-8">
            <span
              aria-hidden="true"
              className="mt-1.5 shrink-0 font-sans text-[0.6875rem] tracking-[0.18em] text-gold-600/70 tabular"
            >
              {String(index + 1).padStart(2, '0')}
            </span>
            <span
              className={cn(
                'font-display text-xl leading-snug transition-colors duration-300 md:text-2xl',
                isOpen ? 'text-gold-600' : 'text-espresso-950 group-hover:text-coffee-500',
              )}
            >
              {item.question}
            </span>
          </span>

          <span
            aria-hidden="true"
            className={cn(
              'mt-1 grid size-9 shrink-0 place-items-center rounded-full border transition-all duration-500 ease-luxe',
              isOpen
                ? 'rotate-[135deg] border-gold-500 bg-gold-500 text-espresso-950'
                : 'border-coffee-400/35 text-coffee-500 group-hover:border-coffee-400 group-hover:bg-coffee-400/10',
            )}
          >
            <Plus className="size-4" />
          </span>
        </button>
      </h3>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={panelId}
            role="region"
            aria-labelledby={triggerId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration: 0.5, ease: EASE_LUXE },
              opacity: { duration: 0.32, ease: EASE_LUXE },
            }}
            className="overflow-hidden"
          >
            <div className="pb-8 text-lead text-coffee-500 md:pb-10 md:pl-[3.75rem] md:pr-16">
              {item.answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Accordion({
  items,
  /** Index open on first paint. `null` opens nothing. */
  defaultOpen = 0,
  className,
}: {
  items: readonly AccordionItemData[];
  defaultOpen?: number | null;
  className?: string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(defaultOpen);

  return (
    <div className={cn('border-t border-coffee-400/20', className)}>
      {items.map((item, i) => (
        <AccordionRow
          key={item.question}
          item={item}
          index={i}
          isOpen={openIndex === i}
          onToggle={() => setOpenIndex(openIndex === i ? null : i)}
        />
      ))}
    </div>
  );
}

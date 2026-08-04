import { useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { getPhoto, type PhotoKey } from '@/lib/images';
import { useFocusTrap, useLockBodyScroll } from '@/lib/hooks';
import { EASE_LUXE } from '@/lib/motion';

export interface LightboxProps {
  items: readonly { photo: PhotoKey; caption?: string; category?: string }[];
  /** Index of the open item, or null when closed. */
  index: number | null;
  onClose: () => void;
  onNavigate: (nextIndex: number) => void;
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Lightbox — full-screen gallery viewer.
 * ─────────────────────────────────────────────────────────────────────────────
 *  Behaves like a real dialog, because it is one:
 *    · role="dialog" + aria-modal, labelled by the current caption
 *    · Focus is trapped inside while open and restored to the trigger on close
 *    · Escape closes; ← / → navigate
 *    · Background scroll is locked, with scrollbar-width compensation so the
 *      page doesn't jolt sideways as it opens
 *    · The backdrop is a real <button> so it's reachable without a mouse
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function Lightbox({ items, index, onClose, onNavigate }: LightboxProps) {
  const isOpen = index !== null;
  const current = isOpen ? items[index] : undefined;

  useLockBodyScroll(isOpen);
  const trapRef = useFocusTrap<HTMLDivElement>(isOpen);

  const goPrev = useCallback(() => {
    if (index === null) return;
    onNavigate((index - 1 + items.length) % items.length);
  }, [index, items.length, onNavigate]);

  const goNext = useCallback(() => {
    if (index === null) return;
    onNavigate((index + 1) % items.length);
  }, [index, items.length, onNavigate]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') goPrev();
      if (event.key === 'ArrowRight') goNext();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose, goPrev, goNext]);

  const photo = current ? getPhoto(current.photo, { width: 1920 }) : null;

  return (
    <AnimatePresence>
      {isOpen && current && photo && (
        <motion.div
          ref={trapRef}
          role="dialog"
          aria-modal="true"
          aria-label={current.caption ?? photo.alt}
          className="fixed inset-0 z-[70] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: EASE_LUXE }}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close gallery"
            className="absolute inset-0 cursor-zoom-out bg-espresso-950/94 backdrop-blur-sm"
          />

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close gallery"
            className="absolute right-4 top-4 z-10 grid size-12 place-items-center rounded-full border border-cream-50/20 text-cream-50 transition-colors duration-300 hover:border-cream-50/60 hover:bg-cream-50/10 md:right-8 md:top-8"
          >
            <X className="size-5" />
          </button>

          {/* Prev / Next */}
          {items.length > 1 && (
            <>
              <button
                type="button"
                onClick={goPrev}
                aria-label="Previous photograph"
                className="absolute left-3 z-10 grid size-12 place-items-center rounded-full border border-cream-50/20 text-cream-50 transition-colors duration-300 hover:border-cream-50/60 hover:bg-cream-50/10 md:left-8"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                onClick={goNext}
                aria-label="Next photograph"
                className="absolute right-3 z-10 grid size-12 place-items-center rounded-full border border-cream-50/20 text-cream-50 transition-colors duration-300 hover:border-cream-50/60 hover:bg-cream-50/10 md:right-8"
              >
                <ChevronRight className="size-5" />
              </button>
            </>
          )}

          {/* Stage */}
          <motion.figure
            key={index}
            className="relative z-[1] mx-auto flex max-h-[88dvh] w-[min(92vw,72rem)] flex-col items-center gap-5"
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.45, ease: EASE_LUXE }}
          >
            <img
              src={photo.src}
              srcSet={photo.srcSet}
              sizes="92vw"
              alt={photo.alt}
              className="max-h-[76dvh] w-auto rounded-sm object-contain shadow-[0_40px_120px_-20px_rgba(0,0,0,0.8)]"
            />
            <figcaption className="text-center">
              {current.category && (
                <span className="block text-eyebrow font-medium uppercase text-gold-500">
                  {current.category}
                </span>
              )}
              <span className="mt-2 block font-display text-lg text-cream-100">
                {current.caption ?? photo.alt}
              </span>
              <span className="mt-1 block font-sans text-xs tracking-[0.14em] text-cream-200/45 tabular">
                {(index ?? 0) + 1} / {items.length}
              </span>
            </figcaption>
          </motion.figure>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

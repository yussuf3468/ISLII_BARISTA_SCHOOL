import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import { Section } from '@/components/ui/Section';
import { testimonials } from '@/data/testimonials';
import { Photo } from '@/components/ui/Photo';
import { EASE_LUXE } from '@/lib/motion';
import { cn } from '@/lib/utils';

const AUTOPLAY_MS = 7500;

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Testimonials carousel
 * ─────────────────────────────────────────────────────────────────────────────
 *  Direction-aware: slides enter from the side you navigated toward, which is
 *  what makes a carousel feel like a physical object rather than a crossfade.
 *
 *  Autoplay pauses on hover AND on keyboard focus. Focus is the one everybody
 *  forgets, and without it a keyboard user gets the content yanked out from
 *  under them mid-read — a genuine WCAG failure, not a nicety.
 *
 *  Graduates are represented by a gold monogram rather than a stock portrait.
 *  See `data/testimonials.ts` for why; the `photo` field is already wired for
 *  real graduate photography when it exists.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function Testimonials() {
  const [[index, direction], setState] = useState<[number, number]>([0, 0]);
  const [paused, setPaused] = useState(false);

  const paginate = useCallback((delta: number) => {
    setState(([current]) => [
      (current + delta + testimonials.length) % testimonials.length,
      delta,
    ]);
  }, []);

  const goTo = useCallback((next: number) => {
    setState(([current]) => [next, next > current ? 1 : -1]);
  }, []);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => paginate(1), AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [paused, paginate]);

  const active = testimonials[index];
  if (!active) return null;

  return (
    <Section
      tone="dark"
      align="center"
      eyebrow="Graduate Stories"
      title="They came to learn coffee. They left with careers."
    >
      <div
        className="relative mx-auto max-w-4xl"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
      >
        <Quote
          aria-hidden="true"
          className="mx-auto size-10 text-gold-500/25 md:size-12"
          strokeWidth={1.25}
        />

        {/* Fixed min-height stops the section from jolting as quotes of
            different lengths swap in. */}
        <div className="relative mt-8 min-h-[24rem] sm:min-h-[21rem] md:min-h-[19rem]">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.figure
              key={index}
              custom={direction}
              initial={{ opacity: 0, x: direction >= 0 ? 48 : -48 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction >= 0 ? -48 : 48 }}
              transition={{ duration: 0.55, ease: EASE_LUXE }}
              className="absolute inset-0 flex flex-col items-center text-center"
            >
              <div
                className="flex items-center gap-1.5"
                role="img"
                aria-label="Rated 5 out of 5 stars"
              >
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} aria-hidden="true" className="size-4 fill-gold-500 text-gold-500" />
                ))}
              </div>

              <blockquote className="mt-7">
                <p className="font-display text-[clamp(1.35rem,1rem+1.3vw,2.125rem)] leading-[1.35] text-cream-50">
                  &ldquo;{active.quote}&rdquo;
                </p>
              </blockquote>

              <figcaption className="mt-9 flex items-center gap-4">
                {active.photo ? (
                  <Photo
                    name={active.photo}
                    ratio={1}
                    width={120}
                    sizes="56px"
                    className="size-14 rounded-full"
                    alt=""
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="grid size-14 shrink-0 place-items-center rounded-full border border-gold-500/35 bg-gold-500/10 font-display text-lg text-gold-400"
                  >
                    {active.name.charAt(0)}
                  </span>
                )}

                <span className="text-left">
                  <span className="block font-sans text-[0.9375rem] font-medium text-cream-50">
                    {active.name}
                  </span>
                  <span className="block font-sans text-[0.8125rem] text-cream-200/55">
                    {active.role}
                  </span>
                  <span className="mt-1 block font-sans text-[0.6875rem] uppercase tracking-[0.16em] text-gold-500/75">
                    {active.course}
                  </span>
                </span>
              </figcaption>
            </motion.figure>
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div className="mt-10 flex items-center justify-center gap-6">
          <button
            type="button"
            onClick={() => paginate(-1)}
            aria-label="Previous testimonial"
            className="grid size-11 place-items-center rounded-full border border-cream-50/20 text-cream-100 transition-colors duration-300 hover:border-gold-500 hover:bg-gold-500/10 hover:text-gold-400"
          >
            <ChevronLeft className="size-4" />
          </button>

          <ul className="flex items-center gap-2.5">
            {testimonials.map((testimonial, i) => (
              <li key={testimonial.name}>
                <button
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Show testimonial ${i + 1} of ${testimonials.length}`}
                  aria-current={i === index}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-500 ease-luxe',
                    i === index ? 'w-7 bg-gold-500' : 'w-1.5 bg-cream-50/25 hover:bg-cream-50/50',
                  )}
                />
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => paginate(1)}
            aria-label="Next testimonial"
            className="grid size-11 place-items-center rounded-full border border-cream-50/20 text-cream-100 transition-colors duration-300 hover:border-gold-500 hover:bg-gold-500/10 hover:text-gold-400"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </Section>
  );
}

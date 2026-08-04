import { Link } from 'react-router-dom';
import { ArrowUpRight, Clock, SignalHigh, Award } from 'lucide-react';
import { Photo } from '@/components/ui/Photo';
import type { Course } from '@/data/courses';
import { formatKes, site } from '@/config/site';
import { cn } from '@/lib/utils';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  CourseCard
 * ─────────────────────────────────────────────────────────────────────────────
 *  Used identically on the home showcase and the courses index — one component,
 *  so the two can never drift apart visually.
 *
 *  The whole card is a single <Link>. Nested interactive elements inside a link
 *  are invalid HTML and produce genuinely confusing screen-reader output, so
 *  the "Explore" affordance is decorative text, not a second button.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export type CourseCardSize = 'default' | 'feature' | 'wide';

export function CourseCard({
  course,
  /**
   * `default` — one column of the grid.
   * `feature` — two columns; taller image, larger type.
   * `wide`    — the FULL grid width, laid out horizontally.
   *
   * `wide` exists because a full-width card stacked vertically produces an
   * absurd result: at 1440px a 4:3 image becomes a ~1390×1040px slab that
   * pushes every word of the card below the fold. Once a card is wider than it
   * is tall, the image belongs beside the text, not above it.
   */
  size = 'default',
  className,
}: {
  course: Course;
  size?: CourseCardSize;
  className?: string;
}) {
  const feature = size === 'feature';
  const wide = size === 'wide';

  return (
    <Link
      to={`/courses/${course.slug}`}
      className={cn(
        'group relative flex overflow-hidden rounded-sm bg-linen',
        wide ? 'flex-col md:flex-row' : 'flex-col',
        'ring-1 ring-coffee-400/15 transition-all duration-500 ease-luxe',
        'hover:-translate-y-1.5 hover:shadow-raise hover:ring-coffee-400/30',
        'motion-reduce:hover:translate-y-0',
        className,
      )}
      aria-label={`${course.title} — ${course.duration}, ${course.level}`}
    >
      {/* Image */}
      <div className={cn('relative overflow-hidden', wide && 'md:w-[44%] md:shrink-0')}>
        <Photo
          name={course.photo}
          ratio={wide ? 4 / 3 : feature ? 4 / 3 : 3 / 2}
          width={wide ? 1100 : feature ? 1200 : 900}
          sizes={
            wide
              ? '(max-width: 768px) 100vw, 44vw'
              : '(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw'
          }
          zoom
          overlay="soft"
          alt=""
          className={wide ? 'md:h-full' : undefined}
        />

        {/* Course number, set into the image corner. */}
        <span
          aria-hidden="true"
          className="absolute left-5 top-5 font-display text-sm text-cream-50/85 tabular"
        >
          {course.number}
        </span>

        {/* Duration chip */}
        <span className="absolute bottom-5 left-5 inline-flex items-center gap-2 rounded-full glass px-3.5 py-1.5 font-sans text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-cream-50">
          <Clock className="size-3" aria-hidden="true" />
          {course.duration}
        </span>
      </div>

      {/* Body */}
      <div
        className={cn(
          'flex flex-1 flex-col p-6 md:p-7',
          wide && 'md:justify-center md:p-10 lg:p-12',
        )}
      >
        {course.overline && (
          <span className="mb-3 font-sans text-[0.625rem] uppercase tracking-[0.2em] text-gold-600">
            {course.overline}
          </span>
        )}

        <h3
          className={cn(
            'text-espresso-950 transition-colors duration-300 group-hover:text-coffee-500',
            wide
              ? 'text-heading-1'
              : feature
                ? 'text-heading-2'
                : 'font-display text-2xl leading-tight',
          )}
        >
          {course.title}
        </h3>

        <p
          className={cn(
            'mt-3 font-sans leading-relaxed text-coffee-500',
            wide ? 'max-w-xl text-lead' : 'flex-1 text-[0.9375rem]',
          )}
        >
          {course.kicker}
        </p>

        {/* Meta */}
        <dl className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-coffee-400/15 pt-5 font-sans text-[0.75rem] text-coffee-400">
          <div className="flex items-center gap-1.5">
            <dt className="sr-only">Level</dt>
            <SignalHigh className="size-3.5" aria-hidden="true" />
            <dd>{course.level}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <dt className="sr-only">Certification</dt>
            <Award className="size-3.5" aria-hidden="true" />
            <dd>Certificate</dd>
          </div>
        </dl>

        {/* Fees are not published (see `site.showPrices`) — the slot carries a
            conversion prompt instead, which is the whole reason for hiding them. */}
        <div className="mt-6 flex items-end justify-between gap-4">
          <span className="font-sans text-[0.8125rem] leading-snug text-coffee-400">
            {site.showPrices && course.priceKes ? (
              <>
                <span className="block text-[0.625rem] uppercase tracking-[0.16em]">Course fee</span>
                <span className="mt-1 block font-display text-2xl leading-none text-espresso-950 tabular">
                  {formatKes(course.priceKes)}
                </span>
              </>
            ) : (
              'Fees & dates on enquiry'
            )}
          </span>

          <span
            aria-hidden="true"
            className="inline-flex shrink-0 items-center gap-1.5 font-sans text-[0.8125rem] font-medium text-espresso-950"
          >
            Explore
            <ArrowUpRight className="size-4 transition-transform duration-400 ease-luxe group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

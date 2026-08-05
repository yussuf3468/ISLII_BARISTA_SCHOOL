import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { site } from '@/config/site';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Logo — the school's real crest, locked up with a typographic wordmark.
 * ─────────────────────────────────────────────────────────────────────────────
 *  The crest was extracted from a photograph of the printed backdrop the school
 *  photographs its graduates against (see media-originals/). It is served as
 *  transparent WebP so it sits correctly on both the espresso header and the
 *  cream sections — 26 KB at the size the header actually uses.
 *
 *  The wordmark stays alongside it deliberately. The crest carries the school's
 *  name inside the artwork, but at a 40px header height that lettering is
 *  physically unreadable, and a logo nobody can read is decoration rather than
 *  branding. The badge supplies recognition; the type supplies legibility.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function Logo({
  tone = 'dark',
  className,
  asLink = true,
  /** Hide the wordmark and show the crest alone — for tight or large-format use. */
  markOnly = false,
}: {
  /** `dark` = dark type for light backgrounds. `light` = cream type for dark. */
  tone?: 'dark' | 'light';
  className?: string;
  asLink?: boolean;
  markOnly?: boolean;
}) {
  const content = (
    <span className={cn('group inline-flex items-center gap-3', className)}>
      <img
        src="/brand/islii-crest-256.webp"
        srcSet="/brand/islii-crest-256.webp 256w, /brand/islii-crest-512.webp 512w"
        sizes="56px"
        alt={markOnly ? `${site.name} crest` : ''}
        width={256}
        height={278}
        // Eager + high priority: this sits in the header, above the fold on
        // every single page, so lazy-loading it only guarantees a visible pop-in.
        loading="eager"
        fetchPriority="high"
        decoding="sync"
        className="h-10 w-auto shrink-0 md:h-11 3xl:h-12"
      />

      {!markOnly && (
        <span className="flex flex-col leading-none">
          <span
            className={cn(
              'font-display text-[1.32rem] leading-none tracking-[-0.02em] transition-colors duration-500 md:text-[1.5rem]',
              tone === 'light' ? 'text-cream-50' : 'text-espresso-950',
            )}
          >
            ISLII
          </span>
          <span
            className={cn(
              'mt-1 font-sans text-[0.5rem] font-medium uppercase leading-none tracking-[0.3em] transition-colors duration-500 md:text-[0.5625rem]',
              tone === 'light' ? 'text-cream-200/60' : 'text-coffee-400',
            )}
          >
            Barista School
          </span>
        </span>
      )}
    </span>
  );

  if (!asLink) return content;

  return (
    <Link to="/" aria-label={`${site.name} — home`} className="shrink-0">
      {content}
    </Link>
  );
}

/**
 * The crest on its own, at display size. Used where the badge is the point
 * rather than a navigational mark — the About panel and the closing CTA seal.
 */
/**
 * NOTE: the caller supplies the width (`w-16`, `w-24`, …) and it is required.
 *
 * The base class list used to include `w-full`, which quietly broke every
 * caller: Tailwind emits utilities in its own sort order, not the order they
 * appear in the class attribute, so `w-full` won over a caller's `w-16` and the
 * crest rendered at whatever its parent was wide — 340px on the sign-in screen.
 * It only looked correct where the parent happened to be shrink-to-fit.
 */
export function Crest({
  className,
  sizes = '160px',
}: {
  /** Must include a width utility. */
  className?: string;
  sizes?: string;
}) {
  return (
    <img
      src="/brand/islii-crest-512.webp"
      srcSet="/brand/islii-crest-256.webp 256w, /brand/islii-crest-512.webp 512w, /brand/islii-crest-1024.webp 1024w"
      sizes={sizes}
      alt={`${site.name} official crest`}
      width={512}
      height={557}
      loading="lazy"
      decoding="async"
      className={cn('h-auto max-w-full', className)}
    />
  );
}

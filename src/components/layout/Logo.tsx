import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { site } from '@/config/site';

/**
 * The wordmark. Typographic rather than an image file, which means it stays
 * razor-sharp at any density, costs zero bytes and recolours with a class.
 *
 * The coffee-bean glyph replaces the dot of the "I" — a small piece of brand
 * craft that reads as intentional rather than decorative.
 */
export function Logo({
  tone = 'dark',
  className,
  asLink = true,
}: {
  /** `dark` = dark type for light backgrounds. `light` = cream type for dark. */
  tone?: 'dark' | 'light';
  className?: string;
  asLink?: boolean;
}) {
  const content = (
    <span className={cn('group inline-flex items-center gap-3', className)}>
      <span
        aria-hidden="true"
        className={cn(
          'grid size-9 shrink-0 place-items-center rounded-full transition-colors duration-500 md:size-10',
          tone === 'light' ? 'bg-gold-500/15' : 'bg-espresso-950',
        )}
      >
        <svg viewBox="0 0 24 24" className="size-4.5 md:size-5" fill="none">
          <ellipse
            cx="12"
            cy="12"
            rx="5.4"
            ry="7.8"
            transform="rotate(-38 12 12)"
            fill={tone === 'light' ? '#d9b878' : '#c8a15a'}
          />
          <path
            d="M12 5.1c-2.1 2.9-2.1 11 0 13.8"
            transform="rotate(-38 12 12)"
            stroke={tone === 'light' ? '#120d0a' : '#0a0705'}
            strokeWidth="1.35"
            strokeLinecap="round"
          />
        </svg>
      </span>

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
    </span>
  );

  if (!asLink) return content;

  return (
    <Link to="/" aria-label={`${site.name} — home`} className="shrink-0">
      {content}
    </Link>
  );
}

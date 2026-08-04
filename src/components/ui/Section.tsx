import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Reveal } from './Reveal';

/* ── Eyebrow ─────────────────────────────────────────────────────────────
   The small tracked-out label above a heading. Used on every section — it's
   the typographic device that ties the whole site together. */

export function Eyebrow({
  children,
  className,
  tone = 'gold',
}: {
  children: ReactNode;
  className?: string;
  tone?: 'gold' | 'muted' | 'light';
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-3 text-eyebrow font-sans font-medium uppercase',
        tone === 'gold' && 'text-gold-600',
        tone === 'muted' && 'text-coffee-400',
        tone === 'light' && 'text-gold-400',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'h-px w-8',
          tone === 'gold' && 'bg-gold-600/50',
          tone === 'muted' && 'bg-coffee-400/50',
          tone === 'light' && 'bg-gold-400/50',
        )}
      />
      {children}
    </span>
  );
}

/* ── Container ───────────────────────────────────────────────────────── */

/**
 * Container widths, exported so the header and footer share the exact same
 * measure as page content. If these drift apart, the logo stops aligning with
 * the first section on wide screens — a small misalignment that reads as
 * sloppiness on a large display.
 *
 * They step up twice above Tailwind's 2xl. A 1440px measure centred in a
 * 3440px ultrawide leaves ~1000px of dead gutter on each side and makes the
 * whole site look like it was designed for a laptop and left there. Widening
 * to ~1824px keeps generous margins (which suit the brand) without the layout
 * looking abandoned in the middle of the screen.
 */
export const CONTAINER = {
  narrow: 'max-w-3xl 3xl:max-w-4xl',
  default: 'max-w-[90rem] 3xl:max-w-[102rem] 4xl:max-w-[114rem]',
  wide: 'max-w-[104rem] 3xl:max-w-[120rem] 4xl:max-w-[140rem]',
} as const;

export function Container({
  children,
  className,
  size = 'default',
}: {
  children: ReactNode;
  className?: string;
  /** `narrow` for prose, `default` for most, `wide` for full-bleed grids. */
  size?: keyof typeof CONTAINER;
}) {
  return (
    <div className={cn('mx-auto w-full px-gutter', CONTAINER[size], className)}>{children}</div>
  );
}

/* ── Section ─────────────────────────────────────────────────────────── */

export interface SectionProps {
  children: ReactNode;
  /** Rendered as an <h2>. Omit for sections that supply their own heading. */
  title?: ReactNode;
  eyebrow?: string;
  lead?: ReactNode;
  /** Content pinned to the right of the header row on wide screens. */
  aside?: ReactNode;
  id?: string;
  className?: string;
  headerClassName?: string;
  /** Dark sections flip type colours and enable the film-grain overlay. */
  tone?: 'light' | 'cream' | 'dark' | 'none';
  align?: 'left' | 'center';
  containerSize?: 'narrow' | 'default' | 'wide';
  /** Remove the standard vertical rhythm (for sections that manage their own). */
  flush?: boolean;
}

const TONES: Record<NonNullable<SectionProps['tone']>, string> = {
  light: 'bg-linen text-espresso-900',
  cream: 'bg-cream-50 text-espresso-900',
  dark: 'on-dark grain bg-espresso-900 text-cream-100',
  none: '',
};

/**
 * The standard section shell: consistent vertical rhythm, an optional
 * eyebrow/title/lead header block that reveals on scroll, and tone theming.
 *
 * Every section on the site uses this — which is precisely why the spacing and
 * type hierarchy stay identical from page to page.
 */
export function Section({
  children,
  title,
  eyebrow,
  lead,
  aside,
  id,
  className,
  headerClassName,
  tone = 'light',
  align = 'left',
  containerSize = 'default',
  flush = false,
}: SectionProps) {
  const hasHeader = Boolean(eyebrow || title || lead || aside);
  const dark = tone === 'dark';

  return (
    <section
      id={id}
      className={cn('relative', TONES[tone], !flush && 'py-section', className)}
    >
      <Container size={containerSize}>
        {hasHeader && (
          <div
            className={cn(
              'relative z-[1] mb-14 md:mb-20',
              align === 'center' && 'mx-auto max-w-3xl text-center',
              aside && 'lg:flex lg:items-end lg:justify-between lg:gap-12',
              headerClassName,
            )}
          >
            <div className={cn(aside && 'lg:max-w-2xl')}>
              {eyebrow && (
                <Reveal>
                  <Eyebrow
                    tone={dark ? 'light' : 'gold'}
                    className={align === 'center' ? 'justify-center' : undefined}
                  >
                    {eyebrow}
                  </Eyebrow>
                </Reveal>
              )}

              {title && (
                <Reveal index={1}>
                  <h2
                    className={cn(
                      'mt-6 text-heading-1',
                      dark ? 'text-cream-50' : 'text-espresso-950',
                    )}
                  >
                    {title}
                  </h2>
                </Reveal>
              )}

              {lead && (
                <Reveal index={2}>
                  <p
                    className={cn(
                      'mt-6 max-w-2xl text-lead',
                      align === 'center' && 'mx-auto',
                      dark ? 'text-cream-200/75' : 'text-coffee-500',
                    )}
                  >
                    {lead}
                  </p>
                </Reveal>
              )}
            </div>

            {aside && (
              <Reveal index={3} className="mt-8 shrink-0 lg:mt-0">
                {aside}
              </Reveal>
            )}
          </div>
        )}

        {children}
      </Container>
    </section>
  );
}

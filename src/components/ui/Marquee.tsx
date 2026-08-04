import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface MarqueeProps {
  children: ReactNode;
  /** Seconds for one full pass. Higher = slower. */
  duration?: number;
  reverse?: boolean;
  /** Fade the leading and trailing edges into the background. */
  fade?: boolean;
  className?: string;
}

/**
 * Infinite horizontal ticker.
 *
 * The content is rendered twice and translated by exactly -50%, which is what
 * makes the loop seamless — at the moment the animation resets, copy two sits
 * precisely where copy one began. Rendering it once and translating -100%
 * produces the visible "snap" you see on most implementations.
 *
 * The duplicate is `aria-hidden` so screen readers read the content once.
 */
export function Marquee({
  children,
  duration = 42,
  reverse = false,
  fade = true,
  className,
}: MarqueeProps) {
  return (
    <div
      className={cn('group relative flex overflow-hidden', className)}
      style={
        fade
          ? {
              maskImage:
                'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
              WebkitMaskImage:
                'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
            }
          : undefined
      }
    >
      {[0, 1].map((copy) => (
        <div
          key={copy}
          aria-hidden={copy === 1 ? 'true' : undefined}
          className="flex shrink-0 items-center motion-reduce:animate-none"
          style={{
            animation: `marquee ${duration}s linear infinite`,
            animationDirection: reverse ? 'reverse' : 'normal',
          }}
        >
          {children}
        </div>
      ))}
    </div>
  );
}

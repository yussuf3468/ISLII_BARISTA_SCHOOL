import { forwardRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useMagnetic } from '@/lib/hooks';
import { cn } from '@/lib/utils';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Button — the single interactive control used across the entire site.
 * ─────────────────────────────────────────────────────────────────────────────
 *  Polymorphic by intent, not by generics gymnastics:
 *    · `to`   → react-router <Link>   (internal navigation)
 *    · `href` → <a>                   (tel:, mailto:, wa.me, external)
 *    · neither → <button>             (form submit, dialogs)
 *
 *  Renders the correct semantic element every time, which is what actually
 *  makes it accessible — a <div onClick> with role="button" is not the same
 *  thing and never will be.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type ButtonVariant = 'gold' | 'ink' | 'cream' | 'outline' | 'outlineLight' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Pull the button toward the cursor on hover. Auto-disabled on touch. */
  magnetic?: boolean;
  /** Show a trailing arrow that slides on hover. */
  withArrow?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
  className?: string;
  children: ReactNode;
}

type ButtonAsLink = CommonProps & { to: string; href?: never } & Omit<
    React.AnchorHTMLAttributes<HTMLAnchorElement>,
    keyof CommonProps | 'href'
  >;

type ButtonAsAnchor = CommonProps & { href: string; to?: never } & Omit<
    React.AnchorHTMLAttributes<HTMLAnchorElement>,
    keyof CommonProps | 'href'
  >;

type ButtonAsButton = CommonProps & { to?: never; href?: never } & Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    keyof CommonProps
  >;

export type ButtonProps = ButtonAsLink | ButtonAsAnchor | ButtonAsButton;

const BASE = [
  'group relative inline-flex items-center justify-center gap-2.5 isolate',
  'rounded-full font-sans font-medium leading-none whitespace-nowrap',
  'transition-[background-color,color,border-color,box-shadow,transform] duration-300',
  'ease-luxe',
  'select-none overflow-hidden',
  'disabled:pointer-events-none disabled:opacity-45',
  'active:scale-[0.98]',
].join(' ');

const VARIANTS: Record<ButtonVariant, string> = {
  /* The primary conversion action. Used sparingly — one per viewport. */
  gold: 'bg-gold-500 text-espresso-950 hover:bg-gold-400 shadow-[0_1px_2px_rgba(26,22,20,0.08),0_10px_28px_-10px_rgba(168,129,63,0.65)] hover:shadow-[0_2px_4px_rgba(26,22,20,0.1),0_18px_40px_-12px_rgba(168,129,63,0.8)]',
  ink: 'bg-espresso-900 text-cream-50 hover:bg-espresso-800 shadow-lift hover:shadow-raise',
  cream: 'bg-cream-50 text-espresso-950 hover:bg-linen shadow-lift hover:shadow-raise',
  outline:
    'border border-coffee-400/40 text-espresso-900 hover:border-espresso-900 hover:bg-espresso-900 hover:text-cream-50',
  outlineLight:
    'border border-cream-50/30 text-cream-50 hover:border-cream-50 hover:bg-cream-50 hover:text-espresso-950',
  ghost: 'text-espresso-900 hover:text-gold-600 px-0!',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-10 px-5 text-[0.8125rem] tracking-[0.01em]',
  md: 'h-12 px-7 text-[0.9375rem] tracking-[0.005em]',
  lg: 'h-14 px-9 text-base md:h-[3.75rem] md:px-11',
};

/** A light sweep that crosses the button on hover. Only on filled variants —
 *  on outlines it reads as a glitch rather than a sheen. */
function Sheen({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-0 -z-10',
        'bg-gradient-to-r from-transparent via-white/30 to-transparent',
        '-translate-x-[150%] group-hover:translate-x-[150%]',
        'transition-transform duration-[900ms] ease-luxe',
        'motion-reduce:hidden',
      )}
    />
  );
}

export const Button = forwardRef<HTMLElement, ButtonProps>(function Button(props, _forwardedRef) {
  const {
    variant = 'gold',
    size = 'md',
    magnetic = false,
    withArrow = false,
    icon,
    fullWidth = false,
    className,
    children,
    ...rest
  } = props as CommonProps & Record<string, unknown>;

  const magnet = useMagnetic<HTMLSpanElement>(0.28);
  const filled = variant === 'gold' || variant === 'ink' || variant === 'cream';

  const classes = cn(
    BASE,
    VARIANTS[variant],
    SIZES[size],
    fullWidth && 'w-full',
    className,
  );

  const inner = (
    <>
      <Sheen show={filled} />
      {icon}
      <span className="relative">{children}</span>
      {withArrow && (
        <ArrowRight
          aria-hidden="true"
          className="size-4 shrink-0 transition-transform duration-300 ease-luxe group-hover:translate-x-1 motion-reduce:transition-none"
        />
      )}
    </>
  );

  // `rest` is deliberately loose here: the public API is the discriminated
  // union above, and this internal cast is the price of collapsing three
  // element types into one implementation. Each branch narrows before use.
  const { to, href, ...domProps } = rest as {
    to?: string;
    href?: string;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement> &
    React.ButtonHTMLAttributes<HTMLButtonElement>;

  let element: ReactNode;

  if (to) {
    const anchorRest = domProps as React.AnchorHTMLAttributes<HTMLAnchorElement>;
    element = (
      <Link to={to} className={classes} {...anchorRest}>
        {inner}
      </Link>
    );
  } else if (href) {
    const anchorRest = domProps as React.AnchorHTMLAttributes<HTMLAnchorElement>;
    const external = /^https?:/.test(href);
    element = (
      <a
        href={href}
        className={classes}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        {...anchorRest}
      >
        {inner}
      </a>
    );
  } else {
    const buttonRest = domProps as React.ButtonHTMLAttributes<HTMLButtonElement>;
    element = (
      <button type={buttonRest.type ?? 'button'} className={classes} {...buttonRest}>
        {inner}
      </button>
    );
  }

  if (!magnetic) return <>{element}</>;

  return (
    <motion.span
      ref={magnet.ref}
      style={{ x: magnet.x, y: magnet.y }}
      className={cn('inline-block', fullWidth && 'w-full')}
    >
      {element}
    </motion.span>
  );
});

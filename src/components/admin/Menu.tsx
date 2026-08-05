import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { MoreHorizontal } from 'lucide-react';
import { EASE_LUXE } from '@/lib/motion';
import { cn } from '@/lib/utils';

export interface MenuItem {
  label: string;
  Icon?: React.ComponentType<{ className?: string }>;
  onSelect: () => void;
  tone?: 'default' | 'danger';
  disabled?: boolean;
  separatorBefore?: boolean;
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Row action menu
 * ─────────────────────────────────────────────────────────────────────────────
 *  Rendered into a portal and positioned from the trigger's viewport rect.
 *
 *  That matters here specifically: these menus live in table rows inside an
 *  `overflow-x-auto` scroller. An absolutely-positioned menu would be clipped
 *  by that scroll container the moment it opened on the last row or the last
 *  column — the classic "my dropdown is cut in half" bug. A portal escapes the
 *  clip entirely, and flipping upward near the viewport bottom keeps it on
 *  screen.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function ActionMenu({ items, label = 'Actions' }: { items: MenuItem[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; flip: boolean }>({
    top: 0, left: 0, flip: false,
  });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const place = () => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const estimatedHeight = items.length * 38 + 12;
    const flip = r.bottom + estimatedHeight > window.innerHeight - 12;
    setPos({
      top: flip ? r.top - estimatedHeight - 6 : r.bottom + 6,
      left: Math.max(12, r.right - 200),
      flip,
    });
  };

  useEffect(() => {
    if (!open) return;
    place();

    const close = (e: MouseEvent) => {
      if (
        !menuRef.current?.contains(e.target as Node) &&
        !triggerRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);

    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    // Reposition rather than drift: the trigger moves when anything scrolls.
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);

    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, items.length]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        className={cn(
          'grid size-8 place-items-center rounded-md ring-1 ring-transparent transition-colors',
          open
            ? 'bg-slate-400/12 text-slate-900 ring-slate-300/20'
            : 'text-slate-500 hover:bg-slate-400/10 hover:text-slate-900',
        )}
      >
        <MoreHorizontal className="size-4" />
      </button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={menuRef}
              role="menu"
              initial={{ opacity: 0, y: pos.flip ? 6 : -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.15, ease: EASE_LUXE }}
              style={{ top: pos.top, left: pos.left }}
              className={cn(
                'fixed z-[130] w-[12.5rem] overflow-hidden rounded-lg bg-white p-1.5',
                'ring-1 ring-slate-300/15',
                'shadow-[0_4px_6px_-2px_rgba(9,9,11,0.05),0_16px_32px_-8px_rgba(26,22,20,0.18)]',
              )}
            >
              {items.map((item, i) => (
                <div key={item.label}>
                  {item.separatorBefore && i > 0 && (
                    <div className="my-1.5 h-px bg-slate-400/12" role="separator" />
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    disabled={item.disabled}
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpen(false);
                      item.onSelect();
                    }}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left',
                      'font-sans text-[0.8125rem] transition-colors',
                      'disabled:pointer-events-none disabled:opacity-40',
                      item.tone === 'danger'
                        ? 'text-red-700 hover:bg-red-600/10'
                        : 'text-slate-700 hover:bg-slate-400/10',
                    )}
                  >
                    {item.Icon && <item.Icon className="size-3.5 shrink-0 opacity-70" />}
                    {item.label}
                  </button>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}

/** Compact button used across admin toolbars. */
export function AdminButton({
  children, onClick, variant = 'secondary', Icon, disabled, type = 'button', as, to, size = 'md',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  Icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
  type?: 'button' | 'submit';
  as?: 'link';
  to?: string;
  size?: 'sm' | 'md';
}) {
  const classes = cn(
    'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md font-sans font-medium',
    'transition-all duration-150 disabled:pointer-events-none disabled:opacity-40',
    size === 'sm'
      ? 'h-9 px-3 text-[0.8125rem] sm:h-8'
      : 'h-11 px-4 text-[0.875rem] sm:h-9 sm:px-3.5',
    {
      primary:
        'bg-slate-900 text-white hover:bg-slate-800 shadow-[0_1px_2px_rgba(26,22,20,0.1)]',
      secondary:
        'bg-white text-slate-900 ring-1 ring-slate-300/25 hover:bg-slate-50 hover:ring-slate-300/40',
      ghost: 'text-slate-500 hover:bg-slate-400/10 hover:text-slate-900',
      danger: 'bg-red-700 text-white hover:bg-red-800',
    }[variant],
  );

  if (as === 'link' && to) {
    return (
      <a href={to} className={classes}>
        {Icon && <Icon className="size-3.5" />}
        {children}
      </a>
    );
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={classes}>
      {Icon && <Icon className="size-3.5" />}
      {children}
    </button>
  );
}

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { EASE_LUXE } from '@/lib/motion';
import { cn } from '@/lib/utils';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Toasts
 * ─────────────────────────────────────────────────────────────────────────────
 *  Every mutation in the admin reports its outcome here. Silent success is the
 *  most common reason software feels broken — the user clicks, something
 *  happens somewhere, and they are left guessing.
 *
 *  Accessibility: the region is a polite live region, so a screen reader
 *  announces the message without stealing focus mid-task. Errors are given a
 *  longer dwell time than successes, because they usually need reading twice.
 * ─────────────────────────────────────────────────────────────────────────────
 */

type ToastKind = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  description?: string;
}

interface ToastApi {
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const STYLES: Record<ToastKind, { Icon: typeof CheckCircle2; ring: string; icon: string }> = {
  success: { Icon: CheckCircle2, ring: 'ring-emerald-600/20', icon: 'text-emerald-600' },
  error: { Icon: AlertCircle, ring: 'ring-red-600/25', icon: 'text-red-600' },
  info: { Icon: Info, ring: 'ring-gold-600/25', icon: 'text-gold-600' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (kind: ToastKind, title: string, description?: string) => {
      const id = nextId.current++;
      setToasts((list) => [...list.slice(-3), { id, kind, title, description }]);
      const ms = kind === 'error' ? 7000 : 4000;
      timers.current.set(id, window.setTimeout(() => dismiss(id), ms));
    },
    [dismiss],
  );

  // Clear pending timers if the provider unmounts mid-flight.
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((t) => window.clearTimeout(t));
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (t, d) => push('success', t, d),
      error: (t, d) => push('error', t, d),
      info: (t, d) => push('info', t, d),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}

      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-[120] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2.5"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const { Icon, ring, icon } = STYLES[t.kind];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 24, scale: 0.97 }}
                transition={{ duration: 0.35, ease: EASE_LUXE }}
                className={cn(
                  'pointer-events-auto flex items-start gap-3 rounded-lg bg-white p-3.5 pr-2.5',
                  'shadow-[0_4px_6px_-2px_rgba(9,9,11,0.04),0_16px_32px_-8px_rgba(9,9,11,0.13)]',
                  'ring-1', ring,
                )}
              >
                <Icon className={cn('mt-0.5 size-4 shrink-0', icon)} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="font-sans text-[0.875rem] font-medium leading-snug text-slate-900">
                    {t.title}
                  </p>
                  {t.description && (
                    <p className="mt-1 font-sans text-[0.8125rem] leading-relaxed text-slate-500">
                      {t.description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  aria-label="Dismiss"
                  className="grid size-6 shrink-0 place-items-center rounded text-slate-400 transition-colors hover:bg-slate-400/10 hover:text-slate-900"
                >
                  <X className="size-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

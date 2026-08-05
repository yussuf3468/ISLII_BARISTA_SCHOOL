import { useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Clock } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthProvider';
import { useIdleTimeout } from '@/features/auth/useIdleTimeout';
import { ELEVATION } from '@/components/admin/AdminUI';
import { EASE_LUXE } from '@/lib/motion';
import { cn } from '@/lib/utils';

/**
 * Signs a staff member out after 30 minutes of inactivity, warning at 28.
 *
 * Thirty minutes is chosen against the actual job: taking a register or
 * entering a column of marks involves long stretches of looking at paper rather
 * than touching the keyboard, and being logged out mid-cohort would be worse
 * than the risk it prevents. Two minutes of warning is enough to notice and
 * reach for the mouse without being a nag.
 *
 * The countdown is rendered rather than described, because "your session is
 * about to expire" without a number gives someone no way to judge whether they
 * have time to finish the row they are on.
 */
export function SessionGuard() {
  const { session, signOut } = useAuth();

  const onTimeout = useCallback(() => {
    void signOut();
  }, [signOut]);

  const { secondsLeft, staySignedIn } = useIdleTimeout({
    timeoutMs: 30 * 60_000,
    warnMs: 2 * 60_000,
    onTimeout,
    enabled: Boolean(session),
  });

  return (
    <AnimatePresence>
      {secondsLeft !== null && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.2, ease: EASE_LUXE }}
          role="alertdialog"
          aria-live="assertive"
          aria-label="Session about to expire"
          className="fixed inset-x-0 bottom-0 z-[120] flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:pb-6"
        >
          <div
            className={cn(
              'flex w-full max-w-md flex-col gap-3 rounded-xl bg-slate-900 p-4 text-white',
              'ring-1 ring-white/10 sm:flex-row sm:items-center sm:gap-4',
              ELEVATION.floating,
            )}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-amber-400/15 text-amber-300">
              <Clock className="size-4" />
            </span>

            <div className="min-w-0 flex-1">
              <p className="font-sans text-[0.875rem] font-semibold">
                Signing you out in {secondsLeft}s
              </p>
              <p className="mt-0.5 font-sans text-[0.8125rem] text-slate-300/70">
                You have been inactive. Unsaved work will be lost.
              </p>
            </div>

            <button
              type="button"
              onClick={staySignedIn}
              autoFocus
              className="h-10 shrink-0 rounded-lg bg-white px-4 font-sans text-[0.875rem] font-medium text-slate-900 transition-colors hover:bg-slate-100 sm:h-9"
            >
              Stay signed in
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

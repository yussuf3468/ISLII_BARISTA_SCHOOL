import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Idle timeout
 * ─────────────────────────────────────────────────────────────────────────────
 *  Supabase keeps a session alive indefinitely: the access token expires
 *  hourly, but `autoRefreshToken` silently renews it for as long as the refresh
 *  token is valid. Sign in once and you are signed in for weeks. For a consumer
 *  app that is the right default. For this one it is not.
 *
 *  The admin holds students' national ID numbers, phone numbers, photographs
 *  and the school's fee ledger, and it will be used on a shared front-desk
 *  machine. "Signed in forever" means the next person to touch that keyboard is
 *  signed in as the registrar.
 *
 *  So: sign out after a period with no interaction, and WARN FIRST. A silent
 *  sign-out mid-task is its own kind of data loss — someone halfway through a
 *  register or a payment gets bounced to a login screen with no explanation and
 *  no idea whether their work saved. The warning window is there so they can
 *  reach for the mouse and keep what they were doing.
 *
 *  Activity is tracked with passive, capture-phase listeners so nothing in the
 *  app has to opt in, and the timer resets at most once a second — resetting on
 *  every mousemove would be thousands of state writes a minute.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface IdleOptions {
  /** Total idle time before sign-out. */
  timeoutMs?: number;
  /** How long the warning is visible before that happens. */
  warnMs?: number;
  onTimeout: () => void;
  /** Skip everything when nobody is signed in. */
  enabled?: boolean;
}

const ACTIVITY_EVENTS = [
  'mousedown', 'keydown', 'wheel', 'touchstart', 'pointerdown', 'scroll',
] as const;

/** Shared so a second tab's activity keeps the first tab alive. */
const LAST_ACTIVE_KEY = 'islii.admin.lastActive';

export function useIdleTimeout({
  timeoutMs = 30 * 60_000,
  warnMs = 2 * 60_000,
  onTimeout,
  enabled = true,
}: IdleOptions) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const lastActive = useRef(Date.now());
  const firedRef = useRef(false);

  const markActive = useCallback(() => {
    lastActive.current = Date.now();
    firedRef.current = false;
    setSecondsLeft(null);
    try {
      // Storage events only fire in OTHER tabs, which is exactly what is
      // wanted: work in one tab keeps every tab's session alive.
      localStorage.setItem(LAST_ACTIVE_KEY, String(lastActive.current));
    } catch { /* private mode — the in-memory timer still works */ }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setSecondsLeft(null);
      return;
    }

    markActive();

    let lastWrite = 0;
    const onActivity = () => {
      const now = Date.now();
      if (now - lastWrite < 1000) {
        // Still count it locally; just don't thrash storage or state.
        lastActive.current = now;
        return;
      }
      lastWrite = now;
      markActive();
    };

    for (const ev of ACTIVITY_EVENTS) {
      window.addEventListener(ev, onActivity, { passive: true, capture: true });
    }

    const onStorage = (e: StorageEvent) => {
      if (e.key !== LAST_ACTIVE_KEY || !e.newValue) return;
      const t = Number(e.newValue);
      if (Number.isFinite(t) && t > lastActive.current) {
        lastActive.current = t;
        firedRef.current = false;
        setSecondsLeft(null);
      }
    };
    window.addEventListener('storage', onStorage);

    /* A single one-second tick rather than a chain of setTimeouts. Timers are
       throttled in background tabs and do not run at all while a laptop is
       asleep, so anything that counts *down* drifts. Comparing against a
       wall-clock timestamp is correct after any gap — close the lid for an
       hour and the session is already over when you open it. */
    const id = window.setInterval(() => {
      const idle = Date.now() - lastActive.current;

      if (idle >= timeoutMs) {
        if (firedRef.current) return;
        firedRef.current = true;
        setSecondsLeft(null);
        onTimeout();
        return;
      }

      if (idle >= timeoutMs - warnMs) {
        setSecondsLeft(Math.ceil((timeoutMs - idle) / 1000));
      } else {
        setSecondsLeft((prev) => (prev === null ? prev : null));
      }
    }, 1000);

    return () => {
      window.clearInterval(id);
      window.removeEventListener('storage', onStorage);
      for (const ev of ACTIVITY_EVENTS) {
        window.removeEventListener(ev, onActivity, { capture: true } as EventListenerOptions);
      }
    };
  }, [enabled, timeoutMs, warnMs, onTimeout, markActive]);

  return { secondsLeft, staySignedIn: markActive };
}

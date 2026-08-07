import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, isBackendConfigured, readableError } from '@/lib/supabase';
import type { Profile, StaffRole } from '@/lib/db.types';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  /**
   * Set when the profile could not be READ, which is a different thing from
   * the user having no profile. Without this the two are indistinguishable and
   * an admin whose profile request failed gets told they are a viewer.
   */
  profileError: string | null;
  /** Re-run the session + profile bootstrap without a full page reload. */
  retryProfile: () => void;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  /** True when the signed-in user holds at least one of the given roles. */
  can: (...roles: StaffRole[]) => boolean;
}

const AuthContext = createContext<AuthState | null>(null);

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  AuthProvider
 * ─────────────────────────────────────────────────────────────────────────────
 *  Holds the Supabase session and the matching `profiles` row, which is where
 *  the role lives.
 *
 *  `can()` exists to hide controls a user cannot use — nothing more. Every
 *  privileged operation is independently enforced by RLS or inside a SECURITY
 *  DEFINER function, so a tampered client gains exactly nothing. Treating this
 *  as the security boundary would be a mistake; treating it as UX is correct.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(isBackendConfigured);
  /** Set when the profile could NOT be read — distinct from "has no profile". */
  const [profileError, setProfileError] = useState<string | null>(null);
  /** Bumped by retryProfile() to re-run the bootstrap effect. */
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    // Captured into a local so the async callbacks below narrow correctly —
    // TypeScript cannot prove the module-level `supabase` is still non-null
    // inside a promise continuation.
    const client = supabase;
    if (!client) return;

    let cancelled = false;

    /**
     * Loading the profile has THREE outcomes, and the first version collapsed
     * two of them into one.
     *
     * It read `const { data } = await …`, discarding `error`. A profile that
     * failed to load and a user with no profile row both came back as `null`,
     * so an admin on a flaky connection was told they were a read-only viewer
     * and every button vanished. That is not a degraded experience, it is a
     * lie about the user's own permissions.
     *
     * `profileError` keeps the two apart so the UI can say "we could not read
     * your permissions, retry" instead of "you are a viewer".
     */
    const loadProfile = async (userId: string | undefined) => {
      if (!userId) {
        if (!cancelled) { setProfile(null); setProfileError(null); }
        return;
      }
      try {
        const { data, error } = await client
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (cancelled) return;
        if (error) {
          setProfileError(readableError(error));
          setProfile(null);
          return;
        }
        setProfileError(null);
        setProfile((data as Profile) ?? null);
      } catch (err) {
        // A rejected promise — offline, DNS, a browser blocking storage. The
        // query path above returns `{ error }`; only the transport throws.
        if (!cancelled) {
          setProfileError(readableError(err));
          setProfile(null);
        }
      }
    };

    /**
     * `loading` MUST end, on every path.
     *
     * It used to be set false only inside `.then()`. With no `.catch()`, a
     * rejected `getSession()` — a network blip, storage the browser refuses to
     * read — skipped it entirely and left `loading` true for ever. The admin
     * then rendered its spinner and never stopped: the "stuck loading" screen,
     * and the reason a hard refresh made it worse rather than better.
     *
     * try/finally guarantees the flag clears whatever happens.
     */
    const bootstrap = async () => {
      try {
        const { data } = await client.auth.getSession();
        if (cancelled) return;
        setSession(data.session);
        await loadProfile(data.session?.user.id);
      } catch (err) {
        if (!cancelled) setProfileError(readableError(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void bootstrap();

    /* Belt and braces. If some future call hangs rather than rejecting — a
       promise that simply never settles is not caught by try/finally — the app
       still becomes usable and shows a real error rather than a spinner. */
    const failsafe = window.setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 12000);

    const { data: sub } = client.auth.onAuthStateChange(async (_event, next) => {
      if (cancelled) return;
      setSession(next);
      try {
        await loadProfile(next?.user.id);
      } finally {
        if (!cancelled) setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      window.clearTimeout(failsafe);
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey]);

  const value = useMemo<AuthState>(
    () => ({
      session,
      profile,
      loading,
      profileError,
      retryProfile: () => { setLoading(true); setReloadKey((k) => k + 1); },

      async signIn(email, password) {
        if (!supabase) return { error: 'The backend is not configured.' };
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return error ? { error: readableError(error) } : {};
      },

      async signOut() {
        await supabase?.auth.signOut();
        setProfile(null);
      },

      can(...roles) {
        return Boolean(profile && roles.includes(profile.role));
      },
    }),
    [session, profile, loading, profileError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

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

  useEffect(() => {
    // Captured into a local so the async callbacks below narrow correctly —
    // TypeScript cannot prove the module-level `supabase` is still non-null
    // inside a promise continuation.
    const client = supabase;
    if (!client) return;

    let cancelled = false;

    const loadProfile = async (userId: string | undefined) => {
      if (!userId) {
        if (!cancelled) setProfile(null);
        return;
      }
      const { data } = await client
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (!cancelled) setProfile((data as Profile) ?? null);
    };

    client.auth.getSession().then(async ({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      await loadProfile(data.session?.user.id);
      if (!cancelled) setLoading(false);
    });

    const { data: sub } = client.auth.onAuthStateChange(async (_event, next) => {
      if (cancelled) return;
      setSession(next);
      await loadProfile(next?.user.id);
      setLoading(false);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      session,
      profile,
      loading,

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
    [session, profile, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

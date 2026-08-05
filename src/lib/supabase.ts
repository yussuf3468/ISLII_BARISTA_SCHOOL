import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Supabase client
 * ─────────────────────────────────────────────────────────────────────────────
 *  The URL and anon key ship in the browser bundle, and that is correct — the
 *  anon key is a public identifier, not a secret. It can only do what
 *  Row-Level Security permits, and 0003_rls.sql grants anonymous callers no
 *  table access at all.
 *
 *  The SERVICE ROLE key bypasses RLS entirely. It must never appear in this
 *  file, in any `VITE_`-prefixed variable, or anywhere else the bundler can
 *  reach. It exists only in Edge Function secrets.
 *
 *  ── Why this can be missing ─────────────────────────────────────────────
 *  The marketing site is deployable without a backend. Rather than crashing
 *  the whole app when the env vars are absent, `supabase` is null and
 *  `isBackendConfigured` is false — the public site works untouched, and the
 *  admin and verification routes explain what needs configuring.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isBackendConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isBackendConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // The app owns routing; letting the client rewrite the URL on token
        // recovery fights react-router.
        detectSessionInUrl: false,
      },
    })
  : null;

/**
 * Narrowing helper. Every call site needs the non-null client, and repeating
 * the same guard everywhere buries the actual logic.
 */
export function db(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY ' +
        'in .env.local — see supabase/README.md.',
    );
  }
  return supabase;
}

/** Public URL for a file in a public bucket. */
export function publicFileUrl(bucket: string, path: string | null): string | null {
  if (!path || !supabase) return null;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/** Short-lived signed URL for a private bucket (certificate PDFs). */
export async function signedFileUrl(
  bucket: string,
  path: string,
  expiresInSeconds = 60,
): Promise<string | null> {
  const { data, error } = await db().storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  return error ? null : data.signedUrl;
}

/**
 * Supabase surfaces Postgres exceptions with the message we raised in the
 * function, but wrapped in machinery that is meaningless to a user. This
 * pulls out something worth showing.
 */
export function readableError(error: unknown): string {
  if (!error) return 'Something went wrong.';
  const e = error as { message?: string; error_description?: string; hint?: string };
  const raw = e.error_description ?? e.message ?? String(error);

  if (/duplicate key value/i.test(raw)) return 'That record already exists.';
  if (/not authorised|42501|permission denied/i.test(raw))
    return 'Your account does not have permission to do that.';
  if (/JWT|session/i.test(raw)) return 'Your session has expired. Please sign in again.';
  if (/Failed to fetch|NetworkError/i.test(raw))
    return 'Could not reach the server. Check your connection.';

  return raw;
}

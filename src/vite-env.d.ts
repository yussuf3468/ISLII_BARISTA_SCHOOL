/// <reference types="vite/client" />

/**
 * Typed environment variables.
 *
 * Only `VITE_`-prefixed values are exposed to the browser bundle by Vite, which
 * is exactly the boundary we want: the Supabase anon key belongs here, and the
 * service role key must never be added to this interface — putting it behind a
 * VITE_ prefix would publish it to every visitor.
 */
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

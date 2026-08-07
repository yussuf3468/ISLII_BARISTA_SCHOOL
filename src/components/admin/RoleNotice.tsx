import { useState } from 'react';
import { ShieldAlert, Copy, Check, ChevronDown } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthProvider';
import { useCopy } from '@/lib/hooks';
import { cn } from '@/lib/utils';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  RoleNotice
 * ─────────────────────────────────────────────────────────────────────────────
 *  Shown when the signed-in account cannot actually do anything.
 *
 *  This exists because of a genuine product failure: every create/edit control
 *  is gated on role, so a `viewer` — or an account whose profile row never got
 *  created — saw a polished application with no buttons anywhere and no clue
 *  why. Hiding controls a user cannot use is correct; hiding them *silently*
 *  makes working software look broken.
 *
 *  So the app now says what is wrong, and hands over the exact SQL to fix it.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function RoleNotice() {
  const { profile, session, profileError, retryProfile } = useAuth();
  const { copied, copy } = useCopy();
  const [open, setOpen] = useState(false);

  // Nothing to say for accounts that can work.
  if (profile && (profile.role === 'admin' || profile.role === 'registrar')) return null;
  if (!session) return null;

  /* A profile that FAILED TO LOAD is not a profile that says "viewer".
     Telling an admin on a bad connection that they have no permissions is
     worse than saying nothing: they go and ask someone to change a role that
     was never wrong. This branch says what actually happened and offers a
     retry that does not need a full page reload. */
  if (profileError) {
    return (
      <div
        role="alert"
        className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-50 px-4 py-3 ring-1 ring-amber-600/20"
      >
        <div className="min-w-0">
          <p className="font-sans text-[0.875rem] font-semibold text-amber-900">
            Could not load your permissions
          </p>
          <p className="mt-0.5 font-sans text-[0.8125rem] text-amber-800">
            This is a connection problem, not a change to your account — your role is
            unchanged. Actions stay hidden until it loads.
          </p>
        </div>
        <button
          type="button"
          onClick={retryProfile}
          className="h-9 shrink-0 rounded-lg bg-amber-900 px-4 font-sans text-[0.875rem] font-medium text-white transition-colors hover:bg-amber-800"
        >
          Try again
        </button>
      </div>
    );
  }

  const email = profile?.email ?? session.user.email ?? 'your@email.com';
  const missingProfile = !profile;

  const sql = missingProfile
    ? `-- No profile row exists for this account, so it has no role at all.\n` +
      `insert into public.profiles (id, email, full_name, role)\n` +
      `select id, email, '', 'admin'\n` +
      `from auth.users where email = '${email}'\n` +
      `on conflict (id) do update set role = 'admin';`
    : `update public.profiles\n   set role = 'admin'\n where email = '${email}';`;

  return (
    <div className="mb-6 overflow-hidden rounded-xl bg-amber-500/[0.07] ring-1 ring-amber-600/25">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-amber-500/15 text-amber-700">
          <ShieldAlert className="size-4" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="font-sans text-[0.9375rem] font-medium text-amber-900">
            {missingProfile
              ? 'This account has no staff profile yet'
              : 'You are signed in with read-only access'}
          </p>
          <p className="mt-1 font-sans text-[0.875rem] leading-relaxed text-amber-900/80">
            {missingProfile
              ? 'Because there is no row in the profiles table, the app cannot determine a role — so every action is hidden.'
              : (
                <>
                  Your role is <strong className="font-medium">viewer</strong>, which can read records
                  but not create or edit them. Registering students, creating intakes and issuing
                  certificates all require <strong className="font-medium">registrar</strong> or{' '}
                  <strong className="font-medium">admin</strong>.
                </>
              )}
          </p>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="mt-2.5 inline-flex items-center gap-1.5 font-sans text-[0.8125rem] font-medium text-amber-900 underline underline-offset-4"
          >
            How to fix this
            <ChevronDown className={cn('size-3.5 transition-transform', open && 'rotate-180')} />
          </button>

          {open && (
            <div className="mt-3">
              <p className="font-sans text-[0.8125rem] text-amber-900/80">
                Run this once in the Supabase <strong className="font-medium">SQL Editor</strong>, then
                sign out and back in:
              </p>
              <div className="mt-2 flex items-start gap-2">
                <pre className="min-w-0 flex-1 overflow-x-auto rounded-lg bg-slate-900 p-3 font-mono text-[0.75rem] leading-relaxed text-slate-200">
                  {sql}
                </pre>
                <button
                  type="button"
                  onClick={() => copy(sql)}
                  aria-label="Copy SQL"
                  className="grid size-8 shrink-0 place-items-center rounded-md bg-white text-slate-500 ring-1 ring-amber-600/25 transition-colors hover:text-slate-900"
                >
                  {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                </button>
              </div>
              <p className="mt-2 font-sans text-[0.75rem] text-amber-900/70">
                The first account created on a fresh database becomes admin automatically. Later
                accounts start as viewer so that access is granted deliberately.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

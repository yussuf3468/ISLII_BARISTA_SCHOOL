import { Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'framer-motion';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { ToastProvider } from '@/components/admin/Toast';
import { SessionGuard } from '@/components/admin/SessionGuard';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  AdminRoot — the boundary that keeps the admin out of the public bundle.
 * ─────────────────────────────────────────────────────────────────────────────
 *  AuthProvider and QueryClientProvider used to sit at the very top of App.tsx,
 *  which looked tidy and cost 64 KB gzip on every marketing page: mounting
 *  AuthProvider at the root pulls @supabase/supabase-js into the shared chunk,
 *  and mounting QueryClientProvider there pulls in TanStack Query, whether or
 *  not the visitor will ever see /admin.
 *
 *  Moving both behind this lazily-loaded route element means a visitor reading
 *  about the Boba course downloads neither. They load the first time someone
 *  navigates to /admin — which is staff, on purpose.
 *
 *  It wraps the login screen as well as the authenticated area, because signing
 *  in needs the same session context.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Staff move between the student list and a record constantly; refetching
      // on every mount makes the admin feel sluggish for no benefit.
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function AdminRoot() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* `reducedMotion="user"` makes Framer honour the OS setting instead of
          animating regardless. Entrance animations are decoration — they must
          never be the thing that makes content visible. */}
      <MotionConfig reducedMotion="user">
      <AuthProvider>
        {/* Toasts live inside the admin boundary too — the marketing site has
            no mutations to report on, so it should not carry the provider. */}
        <ToastProvider>
          {/* Inside AuthProvider so it can read the session, and inside
              ToastProvider so a sign-out can still announce itself. */}
          <SessionGuard />
          <Outlet />
        </ToastProvider>
      </AuthProvider>
      </MotionConfig>
    </QueryClientProvider>
  );
}

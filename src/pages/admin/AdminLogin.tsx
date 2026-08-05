import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthProvider';
import { Crest } from '@/components/layout/Logo';
import { Button } from '@/components/ui/Button';
import { Seo } from '@/components/seo/Seo';
import { isBackendConfigured } from '@/lib/supabase';
import { site } from '@/config/site';
import { EASE_LUXE } from '@/lib/motion';
import { cn } from '@/lib/utils';

const schema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(6, 'Enter your password.'),
});

type Values = z.infer<typeof schema>;

const inputClass =
  'w-full rounded-sm border bg-slate-900/60 px-4 py-3 font-sans text-[0.9375rem] text-white ' +
  'placeholder:text-slate-300/30 transition-colors duration-200 focus:outline-none';

export default function AdminLogin() {
  const { session, signIn } = useAuth();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), mode: 'onBlur' });


  if (session) {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from && from !== '/admin/login' ? from : '/admin'} replace />;
  }

  const onSubmit = async (values: Values) => {
    setFormError(null);
    const { error } = await signIn(values.email, values.password);
    // Deliberately generic: distinguishing "no such account" from "wrong
    // password" tells an attacker which staff emails are real.
    if (error) setFormError('Those details were not recognised.');
  };

  return (
    <>
      <Seo title="Staff Sign In" description="ISLII Barista School staff access." path="/admin/login" noindex />

      <div className="on-dark grain relative grid min-h-svh place-items-center overflow-hidden bg-slate-900 px-5 py-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(60% 45% at 50% 0%, rgba(200,161,90,0.16) 0%, transparent 65%)',
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE_LUXE }}
          className="relative w-full max-w-sm"
        >
          <div className="mb-9 text-center">
            <Crest className="mx-auto w-16" sizes="64px" />
            <h1 className="mt-6 font-display text-3xl text-white">Staff sign in</h1>
            <p className="mt-2.5 font-sans text-[0.875rem] text-slate-300/55">
              {site.name} — student management
            </p>
          </div>

          {!isBackendConfigured ? (
            <p className="rounded-sm border border-amber-400/35 bg-amber-400/10 p-4 text-center font-sans text-[0.875rem] text-amber-200">
              The backend is not configured yet. See <code>supabase/README.md</code>.
            </p>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block font-sans text-[0.6875rem] uppercase tracking-[0.16em] text-gold-500/75"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  aria-invalid={Boolean(errors.email)}
                  className={cn(
                    inputClass,
                    errors.email ? 'border-red-400/60' : 'border-slate-100/15 focus:border-gold-500',
                  )}
                  {...register('email')}
                />
                {errors.email && (
                  <p className="mt-1.5 font-sans text-[0.8125rem] text-red-300">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block font-sans text-[0.6875rem] uppercase tracking-[0.16em] text-gold-500/75"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  aria-invalid={Boolean(errors.password)}
                  className={cn(
                    inputClass,
                    errors.password
                      ? 'border-red-400/60'
                      : 'border-slate-100/15 focus:border-gold-500',
                  )}
                  {...register('password')}
                />
                {errors.password && (
                  <p className="mt-1.5 font-sans text-[0.8125rem] text-red-300">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {formError && (
                <p
                  role="alert"
                  className="flex items-center gap-2 rounded-sm border border-red-400/35 bg-red-400/10 px-3.5 py-3 font-sans text-[0.875rem] text-red-200"
                >
                  <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
                  {formError}
                </p>
              )}

              <Button type="submit" variant="gold" size="lg" fullWidth disabled={isSubmitting}>
                {isSubmitting ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
          )}

          <p className="mt-8 text-center font-sans text-[0.75rem] text-slate-300/35">
            Staff access only. Accounts are created by an administrator.
          </p>
        </motion.div>
      </div>
    </>
  );
}

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { BadgeCheck, Ban, SearchX, ScanLine, AlertCircle } from 'lucide-react';
import { Seo } from '@/components/seo/Seo';
import { Container } from '@/components/ui/Section';
import { Crest } from '@/components/layout/Logo';
import { Button } from '@/components/ui/Button';
import { findByNumber } from '@/features/verify/api';
import type { FoundCertificate } from '@/lib/db.types';
import { site } from '@/config/site';
import { EASE_LUXE } from '@/lib/motion';
import { cn } from '@/lib/utils';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  /verify — manual lookup, for when the QR won't scan.
 * ─────────────────────────────────────────────────────────────────────────────
 *  Asks for the certificate number AND the holder's surname.
 *
 *  The second field is not bureaucracy. Certificate numbers run in sequence, so
 *  a number-only form is an invitation to iterate through the entire register
 *  and harvest every graduate's name and qualification. Requiring a detail the
 *  enquirer already has in front of them costs a legitimate employer three
 *  seconds and costs a scraper the whole exercise.
 *
 *  This path also returns less than the QR path — no photograph, no student
 *  number, no grade.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const schema = z.object({
  certificateNo: z
    .string()
    .trim()
    .min(4, 'Enter the certificate number exactly as printed.')
    .max(40),
  surname: z
    .string()
    .trim()
    .min(2, "Enter the holder's surname.")
    .max(60),
});

type Values = z.infer<typeof schema>;

type Result =
  | { state: 'valid' | 'revoked'; record: FoundCertificate }
  | { state: 'not-found' }
  | { state: 'error'; message: string };

const fieldClass =
  'w-full rounded-sm border bg-espresso-900/60 px-4 py-3.5 font-sans text-[0.9375rem] ' +
  'text-cream-50 placeholder:text-cream-200/30 transition-colors duration-300 focus:outline-none';

export default function VerifySearch() {
  const [result, setResult] = useState<Result | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: { certificateNo: '', surname: '' },
  });

  const onSubmit = async (values: Values) => {
    setResult(null);
    setResult(await findByNumber(values.certificateNo, values.surname));
  };

  return (
    <>
      <Seo
        title="Verify a Certificate"
        description="Confirm the authenticity of a certificate issued by ISLII Barista School, Nairobi. Enter the certificate number and the holder's surname."
        path="/verify"
      />

      <section className="on-dark grain relative min-h-svh overflow-hidden bg-espresso-950 pb-20 pt-28 md:pt-32">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(70% 50% at 50% 0%, rgba(200,161,90,0.14) 0%, transparent 65%)',
          }}
        />

        <Container size="narrow" className="relative">
          <div className="flex flex-col items-center text-center">
            <Crest className="w-16 md:w-20" sizes="80px" />
            <p className="mt-4 font-sans text-[0.625rem] uppercase tracking-[0.24em] text-gold-500/70">
              {site.name} · Certificate Register
            </p>
            <h1 className="mt-6 text-heading-1 text-cream-50">Verify a certificate</h1>
            <p className="mx-auto mt-5 max-w-md text-lead text-cream-200/70">
              Scanning the QR code on the certificate is the fastest route. If that isn't possible,
              enter the details below exactly as they appear on the document.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-12 space-y-5">
            <div>
              <label
                htmlFor="cert-no"
                className="mb-2 block font-sans text-[0.6875rem] uppercase tracking-[0.18em] text-gold-500/75"
              >
                Certificate number
              </label>
              <input
                id="cert-no"
                type="text"
                autoComplete="off"
                spellCheck={false}
                placeholder="ISLII-CERT-2026-0001"
                aria-invalid={Boolean(errors.certificateNo)}
                aria-describedby={errors.certificateNo ? 'cert-no-error' : undefined}
                className={cn(
                  fieldClass,
                  'tabular',
                  errors.certificateNo
                    ? 'border-red-400/60 focus:border-red-400'
                    : 'border-cream-50/15 focus:border-gold-500',
                )}
                {...register('certificateNo')}
              />
              {errors.certificateNo && (
                <p id="cert-no-error" className="mt-2 flex items-center gap-1.5 font-sans text-[0.8125rem] text-red-300">
                  <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
                  {errors.certificateNo.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="surname"
                className="mb-2 block font-sans text-[0.6875rem] uppercase tracking-[0.18em] text-gold-500/75"
              >
                Holder's surname
              </label>
              <input
                id="surname"
                type="text"
                autoComplete="off"
                placeholder="As printed on the certificate"
                aria-invalid={Boolean(errors.surname)}
                aria-describedby={errors.surname ? 'surname-error' : 'surname-hint'}
                className={cn(
                  fieldClass,
                  errors.surname
                    ? 'border-red-400/60 focus:border-red-400'
                    : 'border-cream-50/15 focus:border-gold-500',
                )}
                {...register('surname')}
              />
              {errors.surname ? (
                <p id="surname-error" className="mt-2 flex items-center gap-1.5 font-sans text-[0.8125rem] text-red-300">
                  <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
                  {errors.surname.message}
                </p>
              ) : (
                <p id="surname-hint" className="mt-2 font-sans text-[0.75rem] text-cream-200/40">
                  Required so that certificate numbers cannot be guessed in sequence.
                </p>
              )}
            </div>

            <Button type="submit" variant="gold" size="lg" fullWidth disabled={isSubmitting}>
              {isSubmitting ? 'Checking the register…' : 'Verify certificate'}
            </Button>
          </form>

          {/* Result */}
          <AnimatePresence mode="wait">
            {result && (
              <motion.div
                key={JSON.stringify(result)}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: EASE_LUXE }}
                className="mt-10"
                role="status"
                aria-live="polite"
              >
                {result.state === 'valid' || result.state === 'revoked' ? (
                  <div
                    className={cn(
                      'rounded-sm border p-6 md:p-8',
                      result.state === 'valid'
                        ? 'border-emerald-400/35 bg-emerald-400/[0.07]'
                        : 'border-red-400/35 bg-red-400/[0.07]',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {result.state === 'valid' ? (
                        <BadgeCheck className="size-6 shrink-0 text-emerald-300" strokeWidth={1.6} />
                      ) : (
                        <Ban className="size-6 shrink-0 text-red-300" strokeWidth={1.6} />
                      )}
                      <p
                        className={cn(
                          'font-display text-xl',
                          result.state === 'valid' ? 'text-emerald-200' : 'text-red-200',
                        )}
                      >
                        {result.state === 'valid' ? 'Certificate verified' : 'Certificate revoked'}
                      </p>
                    </div>

                    <dl className="mt-6 space-y-3.5">
                      {[
                        ['Holder', result.record.full_name],
                        ['Programme', result.record.course_title],
                        ['Certificate No.', result.record.certificate_no],
                        [
                          'Date of issue',
                          new Date(result.record.issued_on).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          }),
                        ],
                      ].map(([label, value]) => (
                        <div key={label} className="flex flex-wrap justify-between gap-x-6 gap-y-1">
                          <dt className="font-sans text-[0.8125rem] text-cream-200/50">{label}</dt>
                          <dd className="font-sans text-[0.9375rem] text-cream-50">{value}</dd>
                        </div>
                      ))}
                    </dl>

                    {result.state === 'revoked' && (
                      <p className="mt-6 border-t border-red-400/20 pt-5 font-sans text-[0.875rem] leading-relaxed text-red-200/90">
                        This certificate has been withdrawn by the school and should not be accepted
                        as proof of qualification.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="rounded-sm border border-amber-400/35 bg-amber-400/[0.07] p-6 md:p-8">
                    <div className="flex items-center gap-3">
                      <SearchX className="size-6 shrink-0 text-amber-300" strokeWidth={1.6} />
                      <p className="font-display text-xl text-amber-200">
                        {result.state === 'not-found' ? 'No match found' : 'Verification unavailable'}
                      </p>
                    </div>
                    <p className="mt-4 font-sans text-[0.875rem] leading-relaxed text-amber-100/80">
                      {result.state === 'error'
                        ? result.message
                        : 'No certificate matches that number and surname together. Check both against the printed document — the surname must match the holder exactly.'}
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-12 flex items-start gap-3 border-t border-cream-50/10 pt-8">
            <ScanLine className="mt-0.5 size-4 shrink-0 text-gold-500/60" aria-hidden="true" />
            <p className="font-sans text-[0.8125rem] leading-relaxed text-cream-200/45">
              Every certificate issued by {site.name} carries a QR code linking directly to its
              record. Scanning it shows the full verification, including the holder's photograph.
            </p>
          </div>
        </Container>
      </section>
    </>
  );
}

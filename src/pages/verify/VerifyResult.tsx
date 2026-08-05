import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BadgeCheck, Ban, SearchX, AlertTriangle, ArrowRight } from 'lucide-react';
import { Seo } from '@/components/seo/Seo';
import { Container } from '@/components/ui/Section';
import { Crest } from '@/components/layout/Logo';
import { Button } from '@/components/ui/Button';
import { verifyByToken, type VerifyOutcome } from '@/features/verify/api';
import { publicFileUrl, isBackendConfigured } from '@/lib/supabase';
import { site } from '@/config/site';
import { EASE_LUXE } from '@/lib/motion';
import { cn } from '@/lib/utils';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  /verify/:token — what opens when an employer scans the QR.
 * ─────────────────────────────────────────────────────────────────────────────
 *  This page has one job, and it is not to be pretty: it must let someone
 *  holding a printed certificate decide, in about two seconds, whether it is
 *  genuine. So the verdict is the largest thing on the screen, the supporting
 *  record is directly beneath it, and there is nothing else to read.
 *
 *  It is mobile-first in the truest sense — essentially every visit arrives
 *  from a phone camera.
 * ─────────────────────────────────────────────────────────────────────────────
 */

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="border-t border-cream-50/10 py-4">
      <dt className="font-sans text-[0.625rem] uppercase tracking-[0.2em] text-gold-500/70">
        {label}
      </dt>
      <dd className="mt-1.5 font-sans text-[0.9375rem] leading-snug text-cream-50">{value}</dd>
    </div>
  );
}

function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** The verdict banner — status colour, icon and headline in one place. */
function Verdict({ state }: { state: VerifyOutcome['state'] }) {
  const map = {
    valid: {
      Icon: BadgeCheck,
      title: 'Certificate Verified',
      body: 'This certificate was issued by ISLII Barista School and remains valid.',
      ring: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300',
      glow: 'rgba(52,211,153,0.18)',
    },
    revoked: {
      Icon: Ban,
      title: 'Certificate Revoked',
      body: 'This certificate was issued by ISLII Barista School but has since been withdrawn. It should not be accepted as proof of qualification.',
      ring: 'border-red-400/40 bg-red-400/10 text-red-300',
      glow: 'rgba(248,113,113,0.16)',
    },
    'not-found': {
      Icon: SearchX,
      title: 'No Certificate Found',
      body: 'No certificate matches this code. It may have been mistyped, or the certificate may not have been issued by ISLII Barista School.',
      ring: 'border-amber-400/40 bg-amber-400/10 text-amber-300',
      glow: 'rgba(251,191,36,0.14)',
    },
    error: {
      Icon: AlertTriangle,
      title: 'Verification Unavailable',
      body: 'We could not reach the certificate register just now. Please try again shortly.',
      ring: 'border-amber-400/40 bg-amber-400/10 text-amber-300',
      glow: 'rgba(251,191,36,0.12)',
    },
  } as const;

  const { Icon, title, body, ring, glow } = map[state];

  return (
    <div className="relative text-center">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-10 h-56"
        style={{ background: `radial-gradient(50% 60% at 50% 40%, ${glow} 0%, transparent 70%)` }}
      />
      <motion.span
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: EASE_LUXE }}
        className={cn(
          'relative mx-auto grid size-20 place-items-center rounded-full border md:size-24',
          ring,
        )}
      >
        <Icon className="size-9 md:size-11" strokeWidth={1.5} />
      </motion.span>

      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE_LUXE, delay: 0.1 }}
        className="relative mt-7 text-heading-1 text-cream-50"
      >
        {title}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE_LUXE, delay: 0.18 }}
        className="relative mx-auto mt-4 max-w-md font-sans text-[0.9375rem] leading-relaxed text-cream-200/70"
      >
        {body}
      </motion.p>
    </div>
  );
}

export default function VerifyResult() {
  const { token = '' } = useParams<{ token: string }>();
  const [outcome, setOutcome] = useState<VerifyOutcome | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!isBackendConfigured) {
      setOutcome({ state: 'error', message: 'not configured' });
      return;
    }

    verifyByToken(token).then((result) => {
      if (!cancelled) setOutcome(result);
    });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const record = outcome && 'record' in outcome ? outcome.record : null;
  const photo = record?.photo_path ? publicFileUrl('student-photos', record.photo_path) : null;

  return (
    <>
      <Seo
        title="Certificate Verification"
        description="Verify the authenticity of a certificate issued by ISLII Barista School, Nairobi."
        path={`/verify/${token}`}
        noindex
      />

      <section className="on-dark grain relative min-h-svh overflow-hidden bg-espresso-950 pb-20 pt-28 md:pt-32">
        <Container size="narrow" className="relative">
          {/* Issuer identity first — an employer needs to know who is making
              the claim before they read the claim itself. */}
          <div className="mb-12 flex flex-col items-center text-center">
            <Crest className="w-16 md:w-20" sizes="80px" />
            <p className="mt-4 font-sans text-[0.625rem] uppercase tracking-[0.24em] text-gold-500/70">
              {site.name} · Certificate Register
            </p>
          </div>

          {!outcome ? (
            <div className="flex flex-col items-center py-16" role="status" aria-live="polite">
              <span
                aria-hidden="true"
                className="size-9 animate-spin rounded-full border-2 border-gold-500/25 border-t-gold-500"
              />
              <p className="mt-5 font-sans text-sm text-cream-200/60">Checking the register…</p>
            </div>
          ) : (
            <>
              <Verdict state={outcome.state} />

              {record && (
                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, ease: EASE_LUXE, delay: 0.26 }}
                  className={cn(
                    'mt-12 rounded-sm border border-cream-50/12 bg-espresso-900/70 p-6 backdrop-blur-sm md:p-9',
                    outcome.state === 'revoked' && 'opacity-90',
                  )}
                >
                  {/* Holder */}
                  <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
                    {photo ? (
                      <img
                        src={photo}
                        alt={`${record.full_name}, holder of certificate ${record.certificate_no}`}
                        className="size-24 shrink-0 rounded-full object-cover ring-2 ring-gold-500/40"
                        loading="eager"
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="grid size-24 shrink-0 place-items-center rounded-full border border-gold-500/30 bg-gold-500/10 font-display text-3xl text-gold-400"
                      >
                        {record.full_name.charAt(0)}
                      </span>
                    )}

                    <div className="min-w-0">
                      <p className="font-sans text-[0.625rem] uppercase tracking-[0.2em] text-gold-500/70">
                        Certificate holder
                      </p>
                      <p className="mt-1.5 font-display text-3xl leading-tight text-cream-50 md:text-4xl">
                        {record.full_name}
                      </p>
                      <p className="mt-2 font-sans text-[0.8125rem] text-cream-200/55 tabular">
                        Student No. {record.student_no}
                      </p>
                    </div>
                  </div>

                  {record.status === 'revoked' && (
                    <p className="mt-7 rounded-sm border border-red-400/30 bg-red-400/10 p-4 font-sans text-[0.875rem] leading-relaxed text-red-200">
                      Withdrawn on {formatDate(record.revoked_on)}. Contact the school on{' '}
                      <a href={site.phone.href} className="underline underline-offset-4">
                        {site.phone.display}
                      </a>{' '}
                      if you need more information.
                    </p>
                  )}

                  {/* Record */}
                  <dl className="mt-8 grid gap-x-10 sm:grid-cols-2">
                    <Field label="Programme" value={record.course_title} />
                    <Field label="Level" value={record.course_level} />
                    <Field label="Certification" value={record.certification} />
                    <Field label="Duration" value={record.course_duration} />
                    <Field label="Training period" value={
                      record.intake_started
                        ? `${formatDate(record.intake_started)} — ${formatDate(record.intake_ended) ?? 'present'}`
                        : null
                    } />
                    <Field label="Grade" value={record.grade} />
                    <Field label="Certificate No." value={record.certificate_no} />
                    <Field label="Date of issue" value={formatDate(record.issued_on)} />
                  </dl>
                </motion.div>
              )}

              {/* Onward */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="mt-12 flex flex-col items-center gap-5 border-t border-cream-50/10 pt-10 text-center"
              >
                <p className="max-w-md font-sans text-[0.8125rem] leading-relaxed text-cream-200/50">
                  Verification is provided directly by {site.name}. To confirm anything on this
                  record, call{' '}
                  <a href={site.phone.href} className="text-cream-200/80 underline underline-offset-4">
                    {site.phone.display}
                  </a>
                  .
                </p>

                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Button to="/verify" variant="outlineLight" size="sm">
                    Verify another certificate
                  </Button>
                  <Link
                    to="/"
                    className="group inline-flex items-center gap-1.5 font-sans text-[0.8125rem] text-cream-200/60 transition-colors hover:text-gold-400"
                  >
                    Visit {site.shortName}
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </motion.div>
            </>
          )}
        </Container>
      </section>
    </>
  );
}

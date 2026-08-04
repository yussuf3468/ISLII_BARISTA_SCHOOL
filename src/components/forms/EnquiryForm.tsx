import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { WhatsAppGlyph } from '@/components/ui/Glyphs';
import { courseOptions } from '@/data/courses';
import { site, whatsappLink } from '@/config/site';
import { EASE_LUXE } from '@/lib/motion';
import { cn } from '@/lib/utils';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  EnquiryForm
 * ─────────────────────────────────────────────────────────────────────────────
 *  Validates with Zod, then hands off to WhatsApp with a fully formatted
 *  message. No backend, no third-party form service, no monthly cost — and in
 *  Kenya it lands in the channel people actually reply on.
 *
 *  Accessibility notes, because forms are where sites usually fail an audit:
 *    · Every control has a real <label> bound by `htmlFor` — no placeholders
 *      standing in for labels
 *    · Errors are wired via `aria-describedby` and `aria-invalid`, so a screen
 *      reader announces the message when focus lands on the broken field
 *    · The error summary is a live region, announced without stealing focus
 *    · Required fields are marked in text, not by colour alone
 * ─────────────────────────────────────────────────────────────────────────────
 */

/* Kenyan mobile numbers: +254 7xx/1xx, 07xx/01xx, or bare 7xx/1xx. */
const KENYAN_PHONE = /^(?:\+?254|0)?[17]\d{8}$/;

const enquirySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Please tell us your name.')
    .max(80, 'That name is longer than we can store.'),
  phone: z
    .string()
    .trim()
    .transform((value) => value.replace(/[\s()-]/g, ''))
    .pipe(
      z
        .string()
        .regex(KENYAN_PHONE, 'Enter a valid Kenyan number, e.g. 0712 345678 or +254 712 345678.'),
    ),
  email: z
    .string()
    .trim()
    .email('That email address does not look right.')
    .optional()
    .or(z.literal('')),
  course: z.string().min(1, 'Choose the programme you are interested in.'),
  experience: z.enum(['none', 'some', 'working', 'owner'], {
    errorMap: () => ({ message: 'Let us know your experience level.' }),
  }),
  message: z.string().trim().max(600, 'Please keep this under 600 characters.').optional(),
});

type EnquiryValues = z.infer<typeof enquirySchema>;

const EXPERIENCE_LABELS: Record<EnquiryValues['experience'], string> = {
  none: 'Complete beginner',
  some: 'Some home / hobby experience',
  working: 'Currently working as a barista',
  owner: 'Café owner or opening one',
};

/** Compose the WhatsApp message. Formatted for a phone screen, not an inbox. */
function buildMessage(values: EnquiryValues): string {
  const courseLabel =
    courseOptions.find((option) => option.value === values.course)?.label ?? values.course;

  const lines = [
    `Hello ISLII Barista School,`,
    ``,
    `My name is ${values.name} and I would like to enrol.`,
    ``,
    `• Programme: ${courseLabel}`,
    `• Experience: ${EXPERIENCE_LABELS[values.experience]}`,
    `• Phone: ${values.phone}`,
  ];

  if (values.email) lines.push(`• Email: ${values.email}`);
  if (values.message) lines.push(``, `${values.message}`);

  lines.push(``, `Could you send me the fees and the next intake dates? Thank you.`);

  return lines.join('\n');
}

/* ── Field primitives ─────────────────────────────────────────────────── */

const fieldBase =
  'w-full rounded-sm border bg-linen px-4 py-3.5 font-sans text-[0.9375rem] text-espresso-950 transition-colors duration-300 placeholder:text-coffee-300 focus:outline-none focus:ring-0';

function fieldClasses(hasError: boolean) {
  return cn(
    fieldBase,
    hasError
      ? 'border-red-700/60 focus:border-red-700'
      : 'border-coffee-400/30 focus:border-gold-500',
  );
}

function Label({
  htmlFor,
  children,
  optional,
}: {
  htmlFor: string;
  children: React.ReactNode;
  optional?: boolean;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-2 block font-sans text-[0.75rem] font-medium uppercase tracking-[0.14em] text-coffee-500"
    >
      {children}
      {optional && <span className="ml-1.5 normal-case tracking-normal text-coffee-300">(optional)</span>}
    </label>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-2 flex items-start gap-1.5 font-sans text-[0.8125rem] text-red-800">
      <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden="true" />
      {message}
    </p>
  );
}

/* ── Form ─────────────────────────────────────────────────────────────── */

export function EnquiryForm() {
  const [sentLink, setSentLink] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EnquiryValues>({
    resolver: zodResolver(enquirySchema),
    mode: 'onBlur',
    defaultValues: { name: '', phone: '', email: '', course: '', message: '' },
  });

  const onSubmit = (values: EnquiryValues) => {
    const link = whatsappLink(buildMessage(values));
    setSentLink(link);
    // Opened inside the submit handler so it counts as a user gesture and
    // isn't treated as an unsolicited pop-up. The success panel repeats the
    // link regardless, in case a blocker still intervenes.
    window.open(link, '_blank', 'noopener,noreferrer');
    reset();
  };

  const errorCount = Object.keys(errors).length;

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {sentLink ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: EASE_LUXE }}
            className="rounded-sm border border-gold-500/40 bg-cream-50 p-8 text-center md:p-12"
            role="status"
          >
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-gold-500/15 text-gold-600">
              <CheckCircle2 className="size-7" strokeWidth={1.5} />
            </span>

            <h3 className="mt-6 font-display text-2xl text-espresso-950">
              WhatsApp is opening now
            </h3>
            <p className="mx-auto mt-3 max-w-md font-sans text-[0.9375rem] leading-relaxed text-coffee-500">
              Your enquiry is pre-written and ready — just press send. If nothing opened, your
              browser blocked the tab; use the button below instead.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                href={sentLink}
                variant="gold"
                icon={<WhatsAppGlyph className="size-4" />}
              >
                Open WhatsApp
                <ExternalLink className="ml-1 size-3.5" aria-hidden="true" />
              </Button>
              <Button variant="outline" onClick={() => setSentLink(null)}>
                Send another enquiry
              </Button>
            </div>

            <p className="mt-7 font-sans text-[0.8125rem] text-coffee-400">
              Prefer to talk?{' '}
              <a href={site.phone.href} className="text-espresso-950 underline underline-offset-4">
                {site.phone.display}
              </a>
            </p>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4, ease: EASE_LUXE }}
            className="space-y-6"
          >
            {/* Live error summary */}
            <div aria-live="polite" className="sr-only">
              {errorCount > 0
                ? `${errorCount} field${errorCount > 1 ? 's need' : ' needs'} attention.`
                : ''}
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              {/* Name */}
              <div>
                <Label htmlFor="enq-name">Full name</Label>
                <input
                  id="enq-name"
                  type="text"
                  autoComplete="name"
                  placeholder="Amina Wanjiru"
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? 'enq-name-error' : undefined}
                  className={fieldClasses(Boolean(errors.name))}
                  {...register('name')}
                />
                <FieldError id="enq-name-error" message={errors.name?.message} />
              </div>

              {/* Phone */}
              <div>
                <Label htmlFor="enq-phone">Phone / WhatsApp</Label>
                <input
                  id="enq-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="0712 345678"
                  aria-invalid={Boolean(errors.phone)}
                  aria-describedby={errors.phone ? 'enq-phone-error' : undefined}
                  className={fieldClasses(Boolean(errors.phone))}
                  {...register('phone')}
                />
                <FieldError id="enq-phone-error" message={errors.phone?.message} />
              </div>
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="enq-email" optional>
                Email
              </Label>
              <input
                id="enq-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'enq-email-error' : undefined}
                className={fieldClasses(Boolean(errors.email))}
                {...register('email')}
              />
              <FieldError id="enq-email-error" message={errors.email?.message} />
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              {/* Course */}
              <div>
                <Label htmlFor="enq-course">Programme of interest</Label>
                <select
                  id="enq-course"
                  aria-invalid={Boolean(errors.course)}
                  aria-describedby={errors.course ? 'enq-course-error' : undefined}
                  className={cn(fieldClasses(Boolean(errors.course)), 'appearance-none pr-10')}
                  {...register('course')}
                >
                  <option value="">Select a programme…</option>
                  {courseOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <FieldError id="enq-course-error" message={errors.course?.message} />
              </div>

              {/* Experience */}
              <div>
                <Label htmlFor="enq-experience">Your experience</Label>
                <select
                  id="enq-experience"
                  defaultValue=""
                  aria-invalid={Boolean(errors.experience)}
                  aria-describedby={errors.experience ? 'enq-experience-error' : undefined}
                  className={cn(fieldClasses(Boolean(errors.experience)), 'appearance-none pr-10')}
                  {...register('experience')}
                >
                  <option value="" disabled>
                    Select your level…
                  </option>
                  {(Object.keys(EXPERIENCE_LABELS) as EnquiryValues['experience'][]).map((key) => (
                    <option key={key} value={key}>
                      {EXPERIENCE_LABELS[key]}
                    </option>
                  ))}
                </select>
                <FieldError id="enq-experience-error" message={errors.experience?.message} />
              </div>
            </div>

            {/* Message */}
            <div>
              <Label htmlFor="enq-message" optional>
                Anything else we should know
              </Label>
              <textarea
                id="enq-message"
                rows={4}
                placeholder="Your goals, preferred start date, or any questions…"
                aria-invalid={Boolean(errors.message)}
                aria-describedby={errors.message ? 'enq-message-error' : undefined}
                className={cn(fieldClasses(Boolean(errors.message)), 'resize-y')}
                {...register('message')}
              />
              <FieldError id="enq-message-error" message={errors.message?.message} />
            </div>

            <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-center">
              <Button
                type="submit"
                variant="gold"
                size="lg"
                disabled={isSubmitting}
                icon={<WhatsAppGlyph className="size-4" />}
              >
                {isSubmitting ? 'Preparing…' : 'Send Enquiry'}
              </Button>

              <p className="font-sans text-[0.8125rem] leading-relaxed text-coffee-400">
                Opens WhatsApp with your details filled in.
                <br className="hidden sm:block" /> No spam, ever.
              </p>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

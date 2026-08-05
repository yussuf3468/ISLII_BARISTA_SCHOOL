import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { z } from 'zod';
import {
  User, GraduationCap, LifeBuoy, Camera, ClipboardCheck, Check, ArrowRight, ArrowLeft,
  Upload, X, PartyPopper, Copy, ExternalLink,
} from 'lucide-react';
import { registerStudent, uploadStudentPhoto, enrollStudent, fetchIntakes } from '@/features/admin/api';
import { Modal } from './Overlay';
import { useToast } from './Toast';
import { Field, inputClass, inputErrorClass, Avatar, Badge, ELEVATION, HAIRLINE } from './AdminUI';
import { AdminButton } from './Menu';
import { readableError } from '@/lib/supabase';
import { useCopy } from '@/lib/hooks';
import { EASE_LUXE } from '@/lib/motion';
import { cn } from '@/lib/utils';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  REGISTRATION WIZARD
 * ═══════════════════════════════════════════════════════════════════════════
 *  A single long form is faster to build and worse to use. Splitting
 *  registration into named steps does three things a modal form cannot:
 *  it shows how much is left, it validates in small honest chunks, and it puts
 *  a review step between the operator and an irreversible write.
 *
 *  The database is untouched by this. Emergency contact and photo have no
 *  columns of their own, so the contact is folded into the existing `notes`
 *  field in a clearly-labelled block, and the photo uses the storage bucket
 *  that already exists. No migration, no schema change.
 * ═══════════════════════════════════════════════════════════════════════════
 */

const KENYAN_PHONE = /^(?:\+?254|0)?[17]\d{8}$/;

const personal = z.object({
  first_name: z.string().trim().min(2, 'Required'),
  last_name: z.string().trim().min(2, 'Required'),
  phone: z.string().trim().refine((v) => v === '' || KENYAN_PHONE.test(v.replace(/[\s()-]/g, '')), 'Enter a valid Kenyan number'),
  email: z.string().trim().refine((v) => v === '' || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), 'Invalid email'),
  national_id: z.string().trim(),
});

const emergency = z.object({
  kin_name: z.string().trim(),
  kin_relation: z.string().trim(),
  kin_phone: z.string().trim().refine((v) => v === '' || KENYAN_PHONE.test(v.replace(/[\s()-]/g, '')), 'Enter a valid Kenyan number'),
});

interface WizardData {
  first_name: string; last_name: string; phone: string; email: string; national_id: string;
  intake_id: string;
  kin_name: string; kin_relation: string; kin_phone: string;
  notes: string;
  photo: File | null;
}

const EMPTY: WizardData = {
  first_name: '', last_name: '', phone: '', email: '', national_id: '',
  intake_id: '', kin_name: '', kin_relation: '', kin_phone: '', notes: '', photo: null,
};

const STEPS = [
  { key: 'personal', label: 'Personal', Icon: User },
  { key: 'course', label: 'Programme', Icon: GraduationCap },
  { key: 'kin', label: 'Emergency', Icon: LifeBuoy },
  { key: 'photo', label: 'Photo', Icon: Camera },
  { key: 'review', label: 'Review', Icon: ClipboardCheck },
] as const;

/* ── Progress rail ────────────────────────────────────────────────────── */

function Steps({ current }: { current: number }) {
  return (
    <div className="mb-7">
      <div className="flex items-center">
        {STEPS.map((s, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <div key={s.key} className={cn('flex items-center', i < STEPS.length - 1 && 'flex-1')}>
              <div className="flex flex-col items-center gap-2">
                <motion.span
                  animate={{ scale: active ? 1.06 : 1 }}
                  transition={{ duration: 0.3, ease: EASE_LUXE }}
                  className={cn(
                    'grid size-9 place-items-center rounded-xl transition-colors duration-300',
                    done && 'bg-emerald-600 text-white',
                    active && cn('bg-slate-900 text-gold-400', ELEVATION.raised),
                    !done && !active && 'bg-white text-slate-400 ring-1 ring-[rgba(9,9,11,0.12)]',
                  )}
                >
                  {done ? <Check className="size-4" strokeWidth={3} /> : <s.Icon className="size-4" />}
                </motion.span>
                <span
                  className={cn(
                    'hidden font-sans text-[0.6875rem] font-medium transition-colors sm:block',
                    active ? 'text-slate-900' : done ? 'text-emerald-700' : 'text-slate-400',
                  )}
                >
                  {s.label}
                </span>
              </div>

              {i < STEPS.length - 1 && (
                <div className="mx-2 h-[2px] flex-1 overflow-hidden rounded-full bg-[rgba(122,94,66,0.14)]">
                  <motion.div
                    initial={false}
                    animate={{ width: done ? '100%' : '0%' }}
                    transition={{ duration: 0.45, ease: EASE_LUXE }}
                    className="h-full rounded-full bg-emerald-600"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Wizard ───────────────────────────────────────────────────────────── */

export function RegistrationWizard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();
  const { copied, copy } = useCopy();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<string | null>(null);
  const [done, setDone] = useState<{ id: string; no: string; name: string } | null>(null);

  const intakes = useQuery({ queryKey: ['intakes'], queryFn: fetchIntakes, enabled: open });

  useEffect(() => {
    if (open) { setStep(0); setData(EMPTY); setErrors({}); setPreview(null); setDone(null); }
  }, [open]);

  // Object URLs leak if they are not revoked when the file changes.
  useEffect(() => {
    if (!data.photo) return setPreview(null);
    const url = URL.createObjectURL(data.photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [data.photo]);

  const set = (patch: Partial<WizardData>) => setData((d) => ({ ...d, ...patch }));

  /* The wizard holds plain state rather than a form library, so "has the user
     entered anything" is a comparison against the blank shape. Photo is checked
     separately — a File never equals another File, so a spread compare would
     report dirty forever once one was picked, and never before. */
  const dirty = useMemo(() => {
    if (data.photo) return true;
    return (Object.keys(EMPTY) as Array<keyof WizardData>).some(
      (k) => k !== 'photo' && data[k] !== EMPTY[k],
    );
  }, [data]);

  const available = useMemo(
    () => (intakes.data ?? []).filter((i) => i.status !== 'cancelled' && i.status !== 'completed'),
    [intakes.data],
  );

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (step === 0) {
      const r = personal.safeParse(data);
      if (!r.success) for (const issue of r.error.issues) next[issue.path[0] as string] = issue.message;
    }
    if (step === 2) {
      const r = emergency.safeParse(data);
      if (!r.success) for (const issue of r.error.issues) next[issue.path[0] as string] = issue.message;
      // A name without a number is not a usable emergency contact.
      if (data.kin_name && !data.kin_phone) next.kin_phone = 'Add a number for this contact';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = useMutation({
    mutationFn: async () => {
      // Emergency contact is appended to `notes` — the schema has no column for
      // it and adding one was explicitly out of scope.
      const kin = data.kin_name
        ? `Emergency contact: ${data.kin_name}${data.kin_relation ? ` (${data.kin_relation})` : ''}${data.kin_phone ? ` — ${data.kin_phone}` : ''}`
        : '';
      const notes = [data.notes.trim(), kin].filter(Boolean).join('\n');

      const student = await registerStudent({
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone || undefined,
        email: data.email || undefined,
        national_id: data.national_id || undefined,
        notes: notes || undefined,
      });

      // Photo and enrolment are best-effort: the student exists either way, and
      // failing the whole registration because an upload hiccuped would be
      // worse than reporting it and moving on.
      if (data.photo) {
        try { await uploadStudentPhoto(student.id, data.photo); }
        catch { toast.info('Student saved', 'The photo could not be uploaded — add it from their profile.'); }
      }
      if (data.intake_id) {
        try { await enrollStudent(student.id, data.intake_id); }
        catch { toast.info('Student saved', 'They could not be enrolled — do it from their profile.'); }
      }
      return student;
    },
    onSuccess: (student) => {
      void qc.invalidateQueries({ queryKey: ['students'] });
      void qc.invalidateQueries({ queryKey: ['overview'] });
      void qc.invalidateQueries({ queryKey: ['activity'] });
      void qc.invalidateQueries({ queryKey: ['intake-stats'] });
      setDone({ id: student.id, no: student.student_no, name: `${student.first_name} ${student.last_name}` });
      toast.success('Student registered', `${student.student_no} allocated`);
    },
    onError: (e) => toast.error('Registration failed', readableError(e)),
  });

  const next = () => { if (validate()) setStep((s) => Math.min(STEPS.length - 1, s + 1)); };
  const back = () => setStep((s) => Math.max(0, s - 1));

  const selectedIntake = available.find((i) => i.id === data.intake_id);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      // Five steps of typing is the worst thing in this app to lose to a stray
      // click. Anything entered past the first field arms the guard; the
      // success screen releases it, because by then the record is saved.
      dirty={!done && dirty}
      title={done ? 'Registration complete' : 'Register a student'}
      description={done ? undefined : `Step ${step + 1} of ${STEPS.length} · ${STEPS[step]!.label}`}
      footer={
        done ? (
          <>
            <AdminButton onClick={() => { setDone(null); setStep(0); setData(EMPTY); }}>
              Register another
            </AdminButton>
            <AdminButton variant="primary" Icon={ExternalLink} onClick={() => { navigate(`/admin/students/${done.id}`); onClose(); }}>
              Open profile
            </AdminButton>
          </>
        ) : (
          <>
            {step > 0 && <AdminButton variant="ghost" Icon={ArrowLeft} onClick={back}>Back</AdminButton>}
            <div className="flex-1" />
            {step < STEPS.length - 1 ? (
              <AdminButton variant="primary" onClick={next}>
                Continue <ArrowRight className="size-3.5" />
              </AdminButton>
            ) : (
              <AdminButton variant="primary" Icon={Check} disabled={submit.isPending} onClick={() => submit.mutate()}>
                {submit.isPending ? 'Registering…' : 'Register student'}
              </AdminButton>
            )}
          </>
        )
      }
    >
      {done ? (
        <div className="py-6 text-center">
          <motion.span
            initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.45, ease: EASE_LUXE }}
            className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-600 text-white"
          >
            <PartyPopper className="size-6" />
          </motion.span>
          <p className="mt-5 font-display text-2xl text-slate-900">{done.name}</p>
          <p className="mt-1 font-sans text-[0.875rem] text-slate-500">is now on the register</p>

          <div className={cn('mx-auto mt-6 max-w-xs rounded-2xl bg-white p-4', HAIRLINE, ELEVATION.raised)}>
            <p className="font-sans text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Student number
            </p>
            <p className="mt-2 font-sans text-3xl font-semibold tracking-[-0.02em] text-slate-900">{done.no}</p>
            <button
              type="button"
              onClick={() => { copy(done.no); toast.success('Copied'); }}
              className="mt-3 inline-flex items-center gap-1.5 font-sans text-[0.75rem] text-slate-500 transition-colors hover:text-slate-900"
            >
              {copied ? <Check className="size-3" /> : <Copy className="size-3" />} {copied ? 'Copied' : 'Copy number'}
            </button>
          </div>

          {selectedIntake && (
            <p className="mt-4 font-sans text-[0.8125rem] text-slate-500">
              Enrolled into <span className="font-medium text-slate-900">{selectedIntake.code}</span>
            </p>
          )}
        </div>
      ) : (
        <>
          <Steps current={step} />

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.25, ease: EASE_LUXE }}
              className="min-h-[17rem]"
            >
              {step === 0 && (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="First name" htmlFor="w-first" error={errors.first_name}>
                      <input id="w-first" autoFocus value={data.first_name}
                        onChange={(e) => set({ first_name: e.target.value })}
                        className={cn(inputClass, errors.first_name && inputErrorClass)} />
                    </Field>
                    <Field label="Last name" htmlFor="w-last" error={errors.last_name}>
                      <input id="w-last" value={data.last_name}
                        onChange={(e) => set({ last_name: e.target.value })}
                        className={cn(inputClass, errors.last_name && inputErrorClass)} />
                    </Field>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Phone" htmlFor="w-phone" optional error={errors.phone}>
                      <input id="w-phone" inputMode="tel" placeholder="0712 345678" value={data.phone}
                        onChange={(e) => set({ phone: e.target.value })}
                        className={cn(inputClass, errors.phone && inputErrorClass)} />
                    </Field>
                    <Field label="Email" htmlFor="w-email" optional error={errors.email}>
                      <input id="w-email" type="email" value={data.email}
                        onChange={(e) => set({ email: e.target.value })}
                        className={cn(inputClass, errors.email && inputErrorClass)} />
                    </Field>
                  </div>
                  <Field label="National ID" htmlFor="w-id" optional hint="Never shown publicly. Visible to admins only.">
                    <input id="w-id" value={data.national_id}
                      onChange={(e) => set({ national_id: e.target.value })} className={inputClass} />
                  </Field>
                </div>
              )}

              {step === 1 && (
                <div>
                  <p className="mb-4 font-sans text-[0.875rem] text-slate-500">
                    Choose an intake to enrol them into now, or skip and do it later from their profile.
                  </p>
                  {intakes.isLoading ? (
                    <p className="font-sans text-[0.875rem] text-slate-500">Loading intakes…</p>
                  ) : !available.length ? (
                    <div className={cn('rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-600/15')}>
                      <p className="font-sans text-[0.875rem] text-amber-900">
                        No open intakes. You can still register the student and enrol them once an
                        intake exists.
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => set({ intake_id: '' })}
                        className={cn(
                          'rounded-2xl p-3.5 text-left transition-all duration-200',
                          data.intake_id === ''
                            ? cn('bg-slate-900 text-white', ELEVATION.raised)
                            : cn('bg-white', HAIRLINE, 'hover:ring-[rgba(122,94,66,0.3)]'),
                        )}
                      >
                        <p className="font-sans text-[0.875rem] font-medium">Register only</p>
                        <p className={cn('mt-0.5 font-sans text-[0.75rem]', data.intake_id === '' ? 'text-slate-300/60' : 'text-slate-500')}>
                          Enrol later
                        </p>
                      </button>

                      {available.map((i) => {
                        const on = data.intake_id === i.id;
                        return (
                          <button
                            key={i.id} type="button" onClick={() => set({ intake_id: i.id })}
                            className={cn(
                              'rounded-2xl p-3.5 text-left transition-all duration-200',
                              on ? cn('bg-slate-900 text-white', ELEVATION.raised)
                                 : cn('bg-white', HAIRLINE, 'hover:ring-[rgba(122,94,66,0.3)]'),
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-sans text-[0.875rem] font-medium tabular-nums">{i.code}</p>
                              {on && <Check className="size-3.5 shrink-0 text-gold-400" />}
                            </div>
                            <p className={cn('mt-0.5 truncate font-sans text-[0.75rem]', on ? 'text-slate-300/70' : 'text-slate-500')}>
                              {i.course.title}
                            </p>
                            <p className={cn('mt-1 font-sans text-[0.6875rem] tabular-nums', on ? 'text-slate-300/45' : 'text-slate-400')}>
                              {new Date(i.starts_on).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <p className="font-sans text-[0.875rem] text-slate-500">
                    Who should be contacted in an emergency? Saved to the student's notes.
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Full name" htmlFor="w-kin" optional>
                      <input id="w-kin" value={data.kin_name}
                        onChange={(e) => set({ kin_name: e.target.value })} className={inputClass} />
                    </Field>
                    <Field label="Relationship" htmlFor="w-rel" optional hint="Parent, spouse, sibling…">
                      <input id="w-rel" value={data.kin_relation}
                        onChange={(e) => set({ kin_relation: e.target.value })} className={inputClass} />
                    </Field>
                  </div>
                  <Field label="Contact number" htmlFor="w-kinphone" optional error={errors.kin_phone}>
                    <input id="w-kinphone" inputMode="tel" placeholder="0712 345678" value={data.kin_phone}
                      onChange={(e) => set({ kin_phone: e.target.value })}
                      className={cn(inputClass, errors.kin_phone && inputErrorClass)} />
                  </Field>
                  <Field label="Other notes" htmlFor="w-notes" optional>
                    <textarea id="w-notes" rows={2} value={data.notes}
                      onChange={(e) => set({ notes: e.target.value })}
                      className={cn(inputClass, 'resize-y')} />
                  </Field>
                </div>
              )}

              {step === 3 && (
                <div className="flex flex-col items-center py-4">
                  <input ref={fileRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => e.target.files?.[0] && set({ photo: e.target.files[0] })} />

                  {preview ? (
                    <div className="relative">
                      <img src={preview} alt="" className="size-36 rounded-full object-cover ring-4 ring-white shadow-[0_8px_24px_-6px_rgba(26,22,20,0.25)]" />
                      <button
                        type="button" onClick={() => set({ photo: null })} aria-label="Remove photo"
                        className="absolute -right-1 -top-1 grid size-8 place-items-center rounded-full bg-slate-900 text-white ring-2 ring-white"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button" onClick={() => fileRef.current?.click()}
                      className={cn(
                        'grid size-36 place-items-center rounded-full border-2 border-dashed border-[rgba(122,94,66,0.28)]',
                        'text-slate-400 transition-colors hover:border-gold-500/60 hover:text-gold-600',
                      )}
                    >
                      <span className="flex flex-col items-center gap-2">
                        <Upload className="size-6" />
                        <span className="font-sans text-[0.75rem]">Add photo</span>
                      </span>
                    </button>
                  )}

                  <p className="mt-5 max-w-xs text-center font-sans text-[0.8125rem] leading-relaxed text-slate-500">
                    A photograph appears on the public verification page, which is what stops someone
                    using this graduate's certificate number as their own.
                  </p>
                  {!preview && (
                    <button type="button" onClick={() => fileRef.current?.click()}
                      className="mt-3 font-sans text-[0.8125rem] text-gold-700 underline underline-offset-4">
                      Choose a file
                    </button>
                  )}
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    {preview
                      ? <img src={preview} alt="" className="size-16 rounded-full object-cover ring-1 ring-slate-300/15" />
                      : <Avatar name={`${data.first_name} ${data.last_name}`} size="lg" />}
                    <div className="min-w-0">
                      <p className="font-display text-xl text-slate-900">
                        {data.first_name} {data.last_name}
                      </p>
                      <p className="font-sans text-[0.8125rem] text-slate-500">
                        A student number will be allocated on save
                      </p>
                    </div>
                  </div>

                  <dl className={cn('divide-y divide-[rgba(9,9,11,0.06)] rounded-2xl bg-white px-4', HAIRLINE)}>
                    {[
                      ['Phone', data.phone],
                      ['Email', data.email],
                      ['National ID', data.national_id],
                      ['Programme', selectedIntake ? `${selectedIntake.code} — ${selectedIntake.course.title}` : 'Not enrolled yet'],
                      ['Emergency contact', data.kin_name ? `${data.kin_name}${data.kin_relation ? ` (${data.kin_relation})` : ''}${data.kin_phone ? ` — ${data.kin_phone}` : ''}` : ''],
                      ['Photo', data.photo ? data.photo.name : ''],
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-baseline justify-between gap-6 py-2.5">
                        <dt className="font-sans text-[0.8125rem] text-slate-500">{label}</dt>
                        <dd className={cn('text-right font-sans text-[0.875rem]', value ? 'text-slate-900' : 'text-slate-400')}>
                          {value || 'Not provided'}
                        </dd>
                      </div>
                    ))}
                  </dl>

                  <p className="flex items-center gap-2 font-sans text-[0.75rem] text-slate-500">
                    <Badge tone="neutral">Atomic</Badge>
                    The student number is allocated under a database lock, so two people registering
                    at once can never receive the same one.
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </>
      )}
    </Modal>
  );
}

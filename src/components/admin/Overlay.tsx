import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, AlertTriangle } from 'lucide-react';
import { useFocusTrap, useLockBodyScroll } from '@/lib/hooks';
import { EASE_LUXE } from '@/lib/motion';
import { cn } from '@/lib/utils';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Modal + ConfirmDialog
 * ─────────────────────────────────────────────────────────────────────────────
 *  Real dialogs: focus is trapped and restored, Escape closes, background
 *  scroll is locked, the backdrop is a reachable button, and the panel is
 *  labelled by its own heading.
 *
 *  ConfirmDialog is separate from Modal on purpose. Destructive actions get a
 *  narrower, blunter presentation with the consequence spelled out, and — where
 *  it matters — a typed confirmation, so "revoke" can never be a slip of the
 *  mouse.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  dirty = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /**
   * True once the user has typed something worth keeping. When set, a click on
   * the backdrop or a press of Escape asks before throwing the work away.
   */
  dirty?: boolean;
}) {
  const trapRef = useFocusTrap<HTMLDivElement>(open);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  useLockBodyScroll(open);

  /**
   * Accidental dismissal is the single most expensive interaction bug in an
   * admin: someone fills in eight fields of a registration, brushes the
   * backdrop, and starts over. Nothing warns them, and nothing brings it back.
   *
   * So a dismissal gesture on a dirty form becomes a question rather than an
   * action. An empty form still closes instantly — guarding a form nobody has
   * touched is its own kind of annoying.
   */
  const requestClose = useCallback(() => {
    if (dirty) setConfirmingDiscard(true);
    else onClose();
  }, [dirty, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // Escape backs out of the discard prompt first, rather than skipping past
      // the question it just asked.
      if (confirmingDiscard) setConfirmingDiscard(false);
      else requestClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, requestClose, confirmingDiscard]);

  // A reopened dialog must never inherit the previous one's prompt.
  useEffect(() => {
    if (!open) setConfirmingDiscard(false);
  }, [open]);

  const width = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-3xl' }[size];

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[110]">
          {/* Presentation only. It used to be the clickable backdrop, which
              never actually worked: the centring wrapper below is also full
              screen and sits on top, so every "click outside" landed on that
              instead and silently did nothing. The dismissal handler belongs on
              the element the pointer really hits. */}
          <motion.div
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
          />

          {/* Bottom sheet on a phone, centred dialog from `sm` up.
              A centred box on a 390px screen puts its actions in the middle of
              the display, above the keyboard, and often off-screen entirely
              once the keyboard opens. A sheet anchored to the bottom keeps the
              buttons under the thumb where they belong. */}
          <div
            onMouseDown={(e) => {
              // mousedown, not click: a click fires on the element the pointer
              // is released over, so selecting text inside a field and drifting
              // outside before letting go would read as "clicked the backdrop"
              // and bin the form. Only a press that STARTS outside counts.
              if (e.target === e.currentTarget) requestClose();
            }}
            className="absolute inset-0 flex items-end justify-center sm:items-center sm:p-4">
            <motion.div
              ref={trapRef}
              role="dialog"
              aria-modal="true"
              aria-label={title}
              initial={{ opacity: 0, y: 24, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.99 }}
              transition={{ duration: 0.26, ease: EASE_LUXE }}
              className={cn(
                'relative flex w-full flex-col bg-slate-50 ring-1 ring-slate-300/15',
                'shadow-[0_8px_16px_-4px_rgba(9,9,11,0.06),0_32px_64px_-12px_rgba(9,9,11,0.2)]',
                'rounded-t-2xl sm:rounded-xl',
                // Never taller than the viewport. On a 1366×768 laptop a long
                // form used to push its own Save button below the fold; the
                // body scrolls internally now and the footer stays put.
                'max-h-[92svh] sm:max-h-[calc(100svh-2rem)]',
                width,
              )}
            >
              {/* Grab handle — the universal "this sheet can be dismissed" cue,
                  and a wide, forgiving target for the gesture. */}
              <button
                type="button"
                onClick={requestClose}
                aria-label="Close"
                className="mx-auto mt-2.5 h-1 w-9 shrink-0 rounded-full bg-slate-300 sm:hidden"
              />

              <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200/70 px-5 py-4 sm:px-6 sm:py-5">
                <div className="min-w-0">
                  <h2 className="font-sans text-[1.0625rem] font-semibold leading-snug tracking-[-0.01em] text-slate-900 sm:text-[1.125rem]">
                    {title}
                  </h2>
                  {description && (
                    <p className="mt-1 font-sans text-[0.8125rem] leading-relaxed text-slate-500">
                      {description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={requestClose}
                  aria-label="Close"
                  className="hidden size-8 shrink-0 place-items-center rounded-md text-slate-500 transition-colors hover:bg-slate-400/10 hover:text-slate-900 sm:grid"
                >
                  <X className="size-4" />
                </button>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6 sm:py-5">
                {children}
              </div>

              {footer && (
                <footer
                  className={cn(
                    'flex shrink-0 items-center justify-end gap-2.5 border-t border-slate-200/70 bg-slate-50',
                    'px-5 py-3.5 sm:px-6 sm:py-4',
                    // Clears the home indicator on iOS.
                    'pb-[calc(0.875rem+var(--safe-bottom))] sm:pb-4',
                    // On a phone the actions go full width and stack big.
                    '[&>*]:flex-1 sm:[&>*]:flex-none',
                  )}
                >
                  {footer}
                </footer>
              )}

              {/* Discard confirmation, drawn over the sheet rather than as a
                  second stacked dialog — nested modals are where focus
                  management goes to die. */}
              <AnimatePresence>
                {confirmingDiscard && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="absolute inset-0 z-10 flex items-end justify-center rounded-t-2xl bg-slate-900/35 p-3 backdrop-blur-[1px] sm:items-center sm:rounded-xl sm:p-6"
                  >
                    {/* A compact card over a scrim, not a full white wash. The
                        form staying faintly visible behind is the point: it is
                        still there, and this is a question about it — not a new
                        screen that has replaced it. */}
                    <motion.div
                      initial={{ y: 12, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.18, ease: EASE_LUXE }}
                      className="w-full max-w-sm rounded-xl bg-white p-4 shadow-[0_16px_40px_-8px_rgba(9,9,11,0.28)] sm:p-5"
                    >
                      <p className="font-sans text-[0.9375rem] font-semibold text-slate-900">
                        Discard your changes?
                      </p>
                      <p className="mt-1 font-sans text-[0.8125rem] leading-relaxed text-slate-500">
                        What you have entered will be lost.
                      </p>

                      {/* Keeping the work is what almost everyone who lands here
                          wants, so it is the solid button AND the one nearest
                          the thumb. Discard is deliberately quiet — a
                          destructive default dressed as the primary action is
                          how people lose work twice. */}
                      <div className="mt-4 flex flex-col gap-2 sm:flex-row-reverse sm:justify-start">
                        <button
                          type="button"
                          autoFocus
                          onClick={() => setConfirmingDiscard(false)}
                          className="h-11 rounded-lg bg-slate-900 px-4 font-sans text-[0.875rem] font-medium text-white transition-colors hover:bg-slate-800 sm:h-9"
                        >
                          Keep editing
                        </button>
                        <button
                          type="button"
                          onClick={() => { setConfirmingDiscard(false); onClose(); }}
                          className="h-11 rounded-lg px-4 font-sans text-[0.875rem] font-medium text-red-700 transition-colors hover:bg-red-50 sm:h-9"
                        >
                          Discard
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}

export interface ConfirmOptions {
  title: string;
  body: ReactNode;
  confirmLabel?: string;
  /** Require the user to type this exact string. Use for irreversible actions. */
  typeToConfirm?: string;
  /** Collect a free-text reason and pass it to onConfirm. */
  reasonLabel?: string;
  tone?: 'danger' | 'default';
}

export function ConfirmDialog({
  open,
  options,
  busy,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  options: ConfirmOptions | null;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [typed, setTyped] = useState('');
  const [reason, setReason] = useState('');
  const firstField = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTyped('');
      setReason('');
      // Focus the first input so a keyboard user isn't hunting for it.
      window.setTimeout(() => firstField.current?.focus(), 60);
    }
  }, [open]);

  if (!options) return null;

  const danger = options.tone !== 'default';
  const typeOk = !options.typeToConfirm || typed.trim() === options.typeToConfirm;
  const reasonOk = !options.reasonLabel || reason.trim().length >= 3;
  const canConfirm = typeOk && reasonOk && !busy;

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={options.title}
      size="sm"
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-4 py-2 font-sans text-[0.875rem] text-slate-500 transition-colors hover:bg-slate-400/10 hover:text-slate-900"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canConfirm}
            onClick={() => onConfirm(reason.trim())}
            className={cn(
              'rounded-md px-4 py-2 font-sans text-[0.875rem] font-medium text-white transition-all',
              'disabled:cursor-not-allowed disabled:opacity-40',
              danger ? 'bg-red-700 hover:bg-red-800' : 'bg-slate-900 hover:bg-slate-800',
            )}
          >
            {busy ? 'Working…' : (options.confirmLabel ?? 'Confirm')}
          </button>
        </>
      }
    >
      <div className="flex gap-4">
        {danger && (
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-red-600/10 text-red-700">
            <AlertTriangle className="size-4" />
          </span>
        )}
        <div className="min-w-0 flex-1 space-y-4">
          <div className="font-sans text-[0.9375rem] leading-relaxed text-slate-600">
            {options.body}
          </div>

          {options.reasonLabel && (
            <div>
              <label
                htmlFor="confirm-reason"
                className="mb-1.5 block font-sans text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-slate-500"
              >
                {options.reasonLabel}
              </label>
              <input
                id="confirm-reason"
                ref={options.typeToConfirm ? undefined : firstField}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-md border border-slate-200/30 bg-white px-3 py-2 font-sans text-[0.875rem] text-slate-900 focus:border-gold-500 focus:outline-none"
              />
            </div>
          )}

          {options.typeToConfirm && (
            <div>
              <label
                htmlFor="confirm-type"
                className="mb-1.5 block font-sans text-[0.8125rem] text-slate-500"
              >
                Type <strong className="font-medium text-slate-900">{options.typeToConfirm}</strong> to confirm
              </label>
              <input
                id="confirm-type"
                ref={firstField}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
                className="w-full rounded-md border border-slate-200/30 bg-white px-3 py-2 font-sans text-[0.875rem] text-slate-900 focus:border-gold-500 focus:outline-none"
              />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

/** Drives a ConfirmDialog from anywhere without prop-drilling open state. */
export function useConfirm() {
  const [state, setState] = useState<{
    options: ConfirmOptions;
    resolve: (reason: string | null) => void;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  const confirm = (options: ConfirmOptions) =>
    new Promise<string | null>((resolve) => setState({ options, resolve }));

  const dialog = (
    <ConfirmDialog
      open={state !== null}
      options={state?.options ?? null}
      busy={busy}
      onCancel={() => {
        state?.resolve(null);
        setState(null);
      }}
      onConfirm={(reason) => {
        state?.resolve(reason);
        setState(null);
      }}
    />
  );

  return { confirm, dialog, setBusy };
}

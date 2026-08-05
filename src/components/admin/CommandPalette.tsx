import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Search, LayoutDashboard, Users, CalendarRange, Award, UserPlus, Plus,
  CornerDownLeft, ArrowUp, ArrowDown, Settings, ScrollText, ExternalLink,
} from 'lucide-react';
import { fetchStudents } from '@/features/admin/api';
import { useLockBodyScroll } from '@/lib/hooks';
import { isBackendConfigured } from '@/lib/supabase';
import { EASE_LUXE } from '@/lib/motion';
import { Avatar, ELEVATION } from './AdminUI';
import { cn } from '@/lib/utils';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Command palette (⌘K / Ctrl-K)
 * ─────────────────────────────────────────────────────────────────────────────
 *  Arguably the single feature that most separates software people describe as
 *  "expensive" from software they describe as "a dashboard". Linear, Vercel,
 *  Notion, Arc, Attio all lead with one.
 *
 *  It does real work here rather than being decoration: it searches the live
 *  student register (debounced, against the same API the list page uses) and it
 *  runs the actions those pages expose. Everything is keyboard-driven — ↑ ↓ to
 *  move, ↵ to run, esc to dismiss — with the pointer as the secondary input.
 * ─────────────────────────────────────────────────────────────────────────────
 */

interface Command {
  id: string;
  label: string;
  hint?: string;
  group: string;
  Icon: React.ComponentType<{ className?: string }>;
  run: () => void;
  avatar?: { name: string; src?: string | null };
}

export function CommandPalette({
  open, onClose, canManage,
}: {
  open: boolean;
  onClose: () => void;
  canManage: boolean;
}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useLockBodyScroll(open);

  useEffect(() => {
    if (open) {
      setQuery(''); setDebounced(''); setActive(0);
      window.setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [open]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 220);
    return () => clearTimeout(t);
  }, [query]);

  // Only hits the network once there is something worth searching for.
  const students = useQuery({
    queryKey: ['cmdk-students', debounced],
    queryFn: () => fetchStudents({ search: debounced, pageSize: 6 }),
    enabled: open && isBackendConfigured && debounced.length >= 2,
    staleTime: 15_000,
  });

  const commands = useMemo<Command[]>(() => {
    const go = (to: string) => () => { navigate(to); onClose(); };

    const nav: Command[] = [
      { id: 'dash', label: 'Dashboard', group: 'Navigate', Icon: LayoutDashboard, run: go('/admin') },
      { id: 'students', label: 'Students', group: 'Navigate', Icon: Users, run: go('/admin/students') },
      { id: 'intakes', label: 'Intakes', group: 'Navigate', Icon: CalendarRange, run: go('/admin/intakes') },
      { id: 'certs', label: 'Certificates', group: 'Navigate', Icon: Award, run: go('/admin/certificates') },
      { id: 'audit', label: 'Audit log', group: 'Navigate', Icon: ScrollText, run: go('/admin/audit') },
      { id: 'settings', label: 'Settings & team', group: 'Navigate', Icon: Settings, run: go('/admin/settings') },
    ];

    const actions: Command[] = canManage
      ? [
          { id: 'new-student', label: 'Register a student', hint: 'Opens the wizard', group: 'Actions', Icon: UserPlus, run: go('/admin/students?new=1') },
          { id: 'new-intake', label: 'Create an intake', group: 'Actions', Icon: Plus, run: go('/admin/intakes?new=1') },
        ]
      : [];

    const found: Command[] = (students.data?.rows ?? []).map((s) => ({
      id: `s-${s.id}`,
      label: `${s.first_name} ${s.last_name}`,
      hint: s.student_no,
      group: 'Students',
      Icon: Users,
      avatar: { name: `${s.first_name} ${s.last_name}` },
      run: go(`/admin/students/${s.id}`),
    }));

    const site: Command[] = [
      { id: 'site', label: 'Open the public website', group: 'Elsewhere', Icon: ExternalLink,
        run: () => { window.open('/', '_blank', 'noopener,noreferrer'); onClose(); } },
    ];

    const q = debounced.toLowerCase();
    const matches = (c: Command) =>
      !q || c.label.toLowerCase().includes(q) || c.hint?.toLowerCase().includes(q);

    return [...actions.filter(matches), ...found, ...nav.filter(matches), ...site.filter(matches)];
  }, [navigate, onClose, canManage, students.data, debounced]);

  useEffect(() => { setActive(0); }, [commands.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(commands.length - 1, i + 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
      if (e.key === 'Enter') { e.preventDefault(); commands[active]?.run(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, commands, active, onClose]);

  // Keep the highlighted row in view when navigating by keyboard.
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  let lastGroup = '';

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[140] flex items-start justify-center p-4 pt-[12vh]">
          <motion.button
            type="button" aria-label="Close command palette" onClick={onClose}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 bg-slate-900/45 backdrop-blur-[3px]"
          />

          <motion.div
            role="dialog" aria-modal="true" aria-label="Command palette"
            initial={{ opacity: 0, y: -8, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.99 }}
            transition={{ duration: 0.22, ease: EASE_LUXE }}
            className={cn(
              'relative w-full max-w-[34rem] overflow-hidden rounded-2xl bg-white/95 backdrop-blur-xl',
              'ring-1 ring-[rgba(9,9,11,0.12)]', ELEVATION.floating,
            )}
          >
            <div className="flex items-center gap-3 border-b border-[rgba(9,9,11,0.07)] px-4">
              <Search className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search students, jump to a page, run an action…"
                aria-label="Command"
                className="h-14 w-full bg-transparent font-sans text-[0.9375rem] text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
              <kbd className="hidden shrink-0 rounded-md bg-slate-400/10 px-1.5 py-1 font-sans text-[0.625rem] font-medium text-slate-500 sm:block">
                ESC
              </kbd>
            </div>

            <div ref={listRef} className="max-h-[22rem] overflow-y-auto p-2">
              {commands.length === 0 ? (
                <p className="px-3 py-10 text-center font-sans text-[0.875rem] text-slate-500">
                  {students.isFetching ? 'Searching…' : `No results for “${query}”`}
                </p>
              ) : (
                commands.map((c, i) => {
                  const header = c.group !== lastGroup ? c.group : null;
                  lastGroup = c.group;
                  return (
                    <div key={c.id}>
                      {header && (
                        <p className="px-3 pb-1.5 pt-3 font-sans text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-slate-400">
                          {header}
                        </p>
                      )}
                      <button
                        type="button"
                        data-index={i}
                        onMouseMove={() => setActive(i)}
                        onClick={c.run}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                          i === active ? 'bg-slate-900 text-white' : 'text-slate-700',
                        )}
                      >
                        {c.avatar ? (
                          <Avatar name={c.avatar.name} src={c.avatar.src} size="xs" />
                        ) : (
                          <c.Icon className={cn('size-4 shrink-0', i === active ? 'text-gold-400' : 'text-slate-500')} />
                        )}
                        <span className="min-w-0 flex-1 truncate font-sans text-[0.875rem]">{c.label}</span>
                        {c.hint && (
                          <span className={cn('shrink-0 font-sans text-[0.75rem] tabular-nums',
                            i === active ? 'text-slate-300/60' : 'text-slate-400')}>
                            {c.hint}
                          </span>
                        )}
                        {i === active && <CornerDownLeft className="size-3.5 shrink-0 text-slate-300/50" />}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <footer className="flex items-center gap-4 border-t border-[rgba(9,9,11,0.07)] bg-[rgba(122,94,66,0.03)] px-4 py-2.5">
              {[
                { Icon: ArrowUp, label: 'Move' },
                { Icon: ArrowDown, label: '' },
                { Icon: CornerDownLeft, label: 'Select' },
              ].map(({ Icon, label }, i) => (
                <span key={i} className="flex items-center gap-1.5 font-sans text-[0.6875rem] text-slate-500">
                  <kbd className="grid size-4 place-items-center rounded bg-white ring-1 ring-slate-300/20">
                    <Icon className="size-2.5" />
                  </kbd>
                  {label}
                </span>
              ))}
            </footer>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/** Global ⌘K / Ctrl-K listener. Returns palette open state. */
export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return { open, setOpen };
}

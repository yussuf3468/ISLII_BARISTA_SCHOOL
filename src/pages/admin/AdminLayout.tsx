import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, Navigate, Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard, Users, Award, CalendarRange, LogOut, Menu, X, ShieldAlert,
  ExternalLink, Search, Settings, ScrollText, ChevronRight, ChevronsUpDown, Command,
  PanelLeftClose, PanelLeftOpen, BookOpen, Wallet, CalendarCheck, ClipboardList,
} from 'lucide-react';
import { useAuth } from '@/features/auth/AuthProvider';
import { Logo, Crest } from '@/components/layout/Logo';
import { RoleNotice } from '@/components/admin/RoleNotice';
import { Avatar, ELEVATION } from '@/components/admin/AdminUI';
import { CommandPalette, useCommandPalette } from '@/components/admin/CommandPalette';
import { isBackendConfigured } from '@/lib/supabase';
import { useLockBodyScroll } from '@/lib/hooks';
import { EASE_LUXE } from '@/lib/motion';
import { site } from '@/config/site';
import { cn } from '@/lib/utils';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  ADMIN SHELL
 * ═══════════════════════════════════════════════════════════════════════════
 *  Three deliberate structural choices, each of which is what separates real
 *  product chrome from a template sidebar:
 *
 *  1. A TOPBAR WITH BREADCRUMBS. Without one, every page floats with no sense
 *     of place — the single biggest tell of an unfinished admin. It also gives
 *     the command trigger and account menu a permanent home.
 *  2. A GROUPED SIDEBAR. A flat list of five links reads as a menu; labelled
 *     sections read as an information architecture.
 *  3. AN ACTIVE STATE WITH A LIGHT SOURCE. The current item gets a gold rail,
 *     a tinted plate and an inner highlight, so it looks lit rather than
 *     merely filled.
 * ═══════════════════════════════════════════════════════════════════════════
 */

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [{ to: '/admin', label: 'Dashboard', Icon: LayoutDashboard, end: true }],
  },
  {
    label: 'Manage',
    items: [
      { to: '/admin/students', label: 'Students', Icon: Users },
      { to: '/admin/courses', label: 'Courses', Icon: BookOpen },
      { to: '/admin/intakes', label: 'Intakes', Icon: CalendarRange },
      { to: '/admin/certificates', label: 'Certificates', Icon: Award },
    ],
  },
  {
    label: 'Teaching',
    items: [
      { to: '/admin/attendance', label: 'Attendance', Icon: CalendarCheck },
      { to: '/admin/grades', label: 'Grades', Icon: ClipboardList },
    ],
  },
  {
    label: 'Money',
    items: [
      { to: '/admin/finance', label: 'Finance', Icon: Wallet },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/admin/audit', label: 'Audit log', Icon: ScrollText },
      { to: '/admin/settings', label: 'Settings', Icon: Settings },
    ],
  },
] as const;

const CRUMB_LABELS: Record<string, string> = {
  admin: 'Home',
  students: 'Students',
  courses: 'Courses',
  intakes: 'Intakes',
  certificates: 'Certificates',
  attendance: 'Attendance',
  grades: 'Grades',
  finance: 'Finance',
  audit: 'Audit log',
  settings: 'Settings',
};

function NotConfigured() {
  return (
    <div className="grid min-h-svh place-items-center bg-slate-900 px-6">
      <div className="max-w-lg text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-amber-400/10 text-amber-300 ring-1 ring-amber-400/30">
          <ShieldAlert className="size-6" />
        </span>
        <h1 className="mt-6 font-display text-3xl text-white">Backend not configured</h1>
        <p className="mt-4 font-sans text-[0.9375rem] leading-relaxed text-slate-300/65">
          Add <code className="rounded bg-slate-50/10 px-1.5 py-0.5 text-gold-400">VITE_SUPABASE_URL</code>{' '}
          and <code className="rounded bg-slate-50/10 px-1.5 py-0.5 text-gold-400">VITE_SUPABASE_ANON_KEY</code>{' '}
          to <code className="text-gold-400">.env.local</code>, then restart the dev server.
        </p>
        <Link to="/" className="mt-8 inline-flex items-center gap-2 font-sans text-sm text-gold-400 underline underline-offset-4">
          Back to the website
        </Link>
      </div>
    </div>
  );
}

function SidebarContent({
  onNavigate, collapsed = false,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const { profile, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex h-full flex-col">
      {/* `shrink-0` on the brand and the account block, `min-h-0` + scroll on
          the nav between them. Without min-h-0 a flex child refuses to shrink
          below its content, so the nav pushes the account menu off the bottom
          of a 13" laptop instead of scrolling — and there is now enough nav to
          do exactly that. */}
      <div className={cn('relative shrink-0 pb-7 pt-6', collapsed ? 'px-3' : 'px-5')}>
        {collapsed ? <Crest className="mx-auto w-8" sizes="32px" /> : <Logo tone="light" />}
      </div>

      <nav
        aria-label="Admin"
        className={cn(
          'relative min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain py-1',
          // No scrollbar at all. Every engine draws one differently and a thin
          // grey bar on a near-black panel reads as a rendering artefact rather
          // than a control. The affordance is a fade at the edges instead —
          // content dissolving into the panel says "more below" without
          // drawing a widget nobody wants to look at.
          'no-scrollbar fade-y',
          collapsed ? 'px-2' : 'px-3',
        )}
      >
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            {/* Collapsed, a group label would be an unreadable stub, so the
                spacing between groups carries the grouping on its own. */}
            <p
              className={cn(
                'mb-1.5 px-3 font-sans text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-slate-300/25',
                collapsed && 'sr-only',
              )}
            >
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map(({ to, label, Icon, ...rest }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={'end' in rest ? rest.end : undefined}
                    onClick={onNavigate}
                    title={collapsed ? label : undefined}
                    className={({ isActive }) =>
                      cn(
                        'group relative flex items-center rounded-xl py-2 font-sans text-[0.875rem] transition-all duration-200',
                        collapsed ? 'justify-center px-0' : 'gap-3 px-3',
                        isActive
                          ? 'bg-gold-500/[0.13] text-gold-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                          : 'text-slate-300/55 hover:bg-slate-50/[0.05] hover:text-slate-200',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {/* The rail. Small detail, does most of the work. */}
                        <span
                          aria-hidden="true"
                          className={cn(
                            'absolute left-0 top-1/2 h-4 w-[2.5px] -translate-y-1/2 rounded-r-full bg-gold-400 transition-all duration-300',
                            isActive ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                        <Icon className={cn('size-[15px] shrink-0 transition-colors', isActive ? 'text-gold-400' : 'text-slate-300/40 group-hover:text-slate-300/70')} />
                        {collapsed ? <span className="sr-only">{label}</span> : label}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Account */}
      <div className="relative shrink-0 border-t border-slate-100/[0.07] p-3">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          title={collapsed ? (profile?.full_name || profile?.email || 'Account') : undefined}
          className={cn(
            'flex w-full items-center rounded-xl py-2 text-left transition-colors hover:bg-slate-50/[0.05]',
            collapsed ? 'justify-center px-0' : 'gap-2.5 px-2',
          )}
        >
          <Avatar name={profile?.full_name || profile?.email || '?'} size="sm" />
          {!collapsed && (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-sans text-[0.8125rem] text-slate-200">
                  {profile?.full_name || profile?.email || 'Account'}
                </span>
                <span className="block font-sans text-[0.625rem] uppercase tracking-[0.12em] text-gold-500/60">
                  {profile?.role ?? '—'}
                </span>
              </span>
              <ChevronsUpDown className="size-3.5 shrink-0 text-slate-300/30" />
            </>
          )}
        </button>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.16, ease: EASE_LUXE }}
              className="mt-1 space-y-0.5 rounded-xl bg-slate-50/[0.05] p-1.5"
            >
              <Link
                to="/" onClick={onNavigate} title="View website"
                className={cn(
                  'flex items-center rounded-lg py-2 font-sans text-[0.8125rem] text-slate-300/60 transition-colors hover:bg-slate-50/[0.06] hover:text-white',
                  collapsed ? 'justify-center px-0' : 'gap-2.5 px-2.5',
                )}
              >
                <ExternalLink className="size-3.5 shrink-0" />
                {collapsed ? <span className="sr-only">View website</span> : 'View website'}
              </Link>
              <button
                type="button"
                onClick={() => void signOut()}
                title="Sign out"
                className={cn(
                  'flex w-full items-center rounded-lg py-2 font-sans text-[0.8125rem] text-slate-300/60 transition-colors hover:bg-red-500/10 hover:text-red-300',
                  collapsed ? 'justify-center px-0' : 'gap-2.5 px-2.5',
                )}
              >
                <LogOut className="size-3.5 shrink-0" />
                {collapsed ? <span className="sr-only">Sign out</span> : 'Sign out'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* Persisted so the choice survives a reload. Someone who collapses the rail to
   get more table width does not want it back every time they refresh. */
const RAIL_KEY = 'islii.admin.rail';

export default function AdminLayout() {
  const { session, profile, loading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(RAIL_KEY) === 'collapsed';
    } catch {
      // Private mode / blocked storage — default to expanded rather than throw.
      return false;
    }
  });

  const toggleRail = () =>
    setCollapsed((v) => {
      const next = !v;
      try {
        localStorage.setItem(RAIL_KEY, next ? 'collapsed' : 'open');
      } catch { /* not worth failing a click over */ }
      return next;
    });
  const location = useLocation();
  const navigate = useNavigate();
  const palette = useCommandPalette();

  useLockBodyScroll(menuOpen);
  useEffect(() => setMenuOpen(false), [location.pathname]);

  /**
   * The admin owns its own tab title.
   *
   * It never did, and that produced a genuinely confusing bug: refreshing any
   * `/admin/...` route showed "Page Not Found" in the tab while the page itself
   * rendered perfectly.
   *
   * The cause is the static build. Marketing routes are prerendered to real
   * files, `/admin/*` deliberately is not, so a host asked for
   * `/admin/students/<uuid>` finds no file and serves `404.html` — which is
   * still the full app, so React boots and renders the right screen. But the
   * title came baked into that shell, and nothing here ever replaced it.
   *
   * Setting it from the route fixes it whichever shell the host happened to
   * serve, rather than depending on every host being configured with an SPA
   * fallback. `<Seo>` is not used: it also writes canonical and Open Graph tags
   * for crawlers, and the admin is `noindex` — it needs a title, not an
   * identity on the web.
   */
  useEffect(() => {
    const segments = location.pathname.split('/').filter(Boolean);
    const last = segments[segments.length - 1] ?? 'admin';
    const label =
      CRUMB_LABELS[last] ??
      // A trailing UUID is a record, not a page name; use its section instead.
      (last.length > 20 ? CRUMB_LABELS[segments[segments.length - 2] ?? ''] ?? 'Record' : last);

    document.title = `${label} — ${site.shortName} Admin`;
  }, [location.pathname]);

  if (!isBackendConfigured) return <NotConfigured />;

  if (loading) {
    return (
      <div className="grid min-h-svh place-items-center bg-slate-900">
        <span aria-hidden="true" className="size-8 animate-spin rounded-full border-2 border-gold-500/25 border-t-gold-500" />
        <span className="sr-only">Checking your session</span>
      </div>
    );
  }

  if (!session) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;

  const canManage = profile?.role === 'admin' || profile?.role === 'registrar';

  const segments = location.pathname.split('/').filter(Boolean);
  const crumbs = segments.map((seg, i) => ({
    label: CRUMB_LABELS[seg] ?? (seg.length > 20 ? 'Record' : seg),
    to: '/' + segments.slice(0, i + 1).join('/'),
    last: i === segments.length - 1,
  }));

  return (
    <div className="min-h-svh bg-slate-100">
      {/* There used to be a gold radial bloom across the whole page here. On a
          marketing hero that reads as atmosphere; behind a grid of white cards
          it just tints every surface warm, which is most of what made the admin
          look rusted. The ground is a flat neutral now. */}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 hidden overflow-hidden bg-slate-950 lg:block',
          'transition-[width] duration-300 ease-luxe',
          collapsed ? 'w-[68px]' : 'w-[248px]',
        )}
      >
        <SidebarContent collapsed={collapsed} />
      </aside>

      {/* Topbar */}
      <header
        className={cn(
          'sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-[rgba(9,9,11,0.09)]',
          'bg-slate-100/85 px-4 backdrop-blur-xl transition-[padding] duration-300 ease-luxe md:px-6',
          collapsed ? 'lg:pl-[84px]' : 'lg:pl-[264px]',
        )}
      >
        <button
          type="button" onClick={() => setMenuOpen(true)} aria-label="Open menu"
          className="grid size-9 shrink-0 place-items-center rounded-xl text-slate-500 ring-1 ring-[rgba(9,9,11,0.12)] transition-colors hover:bg-white lg:hidden"
        >
          <Menu className="size-4" />
        </button>

        {/* Rail toggle — desktop only; on a phone the rail is already a drawer. */}
        <button
          type="button"
          onClick={toggleRail}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-pressed={collapsed}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden size-8 shrink-0 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-900/[0.06] hover:text-slate-900 lg:grid"
        >
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
        </button>

        <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
          <ol className="flex items-center gap-1.5 overflow-hidden">
            {crumbs.map((c) => (
              <li key={c.to} className="flex min-w-0 items-center gap-1.5">
                {c.last ? (
                  <span aria-current="page" className="truncate font-sans text-[0.8125rem] font-medium capitalize text-slate-900">
                    {c.label}
                  </span>
                ) : (
                  <>
                    <Link to={c.to} className="truncate font-sans text-[0.8125rem] capitalize text-slate-500 transition-colors hover:text-slate-900">
                      {c.label}
                    </Link>
                    <ChevronRight className="size-3 shrink-0 text-slate-400" aria-hidden="true" />
                  </>
                )}
              </li>
            ))}
          </ol>
        </nav>

        <button
          type="button"
          onClick={() => palette.setOpen(true)}
          className={cn(
            'group flex h-9 items-center gap-2 rounded-xl bg-white px-2.5 pr-2 text-slate-500 transition-all',
            'ring-1 ring-[rgba(9,9,11,0.12)] hover:ring-[rgba(122,94,66,0.3)]', ELEVATION.flat,
          )}
        >
          <Search className="size-3.5" />
          <span className="hidden font-sans text-[0.8125rem] sm:block">Search…</span>
          <kbd className="hidden items-center gap-0.5 rounded-md bg-slate-400/10 px-1.5 py-1 font-sans text-[0.625rem] font-medium text-slate-500 sm:flex">
            <Command className="size-2.5" />K
          </kbd>
        </button>
      </header>

      {/* ── Mobile drawer ──────────────────────────────────────────────────
          Always mounted, slid off-screen when closed, driven by CSS.

          This was `<AnimatePresence>{menuOpen && <motion.div … exit={{x:'-100%'}}>}`
          and tapping a nav link navigated the page underneath a menu that
          stayed open. Instrumenting it showed the link handler ran, the
          pathname effect ran, and `menuOpen` went false — and AnimatePresence
          still did not unmount the child. (The closing X worked, because that
          path happens not to race the route change.) The likely culprit is the
          un-keyed conditional child reconciling badly while React Router
          re-renders the tree mid-exit, but the precise cause stopped mattering
          once the conclusion was clear:

          NOTHING ABOUT DISMISSAL SHOULD DEPEND ON AN ANIMATION FINISHING.

          So visibility is state, the slide is decoration, and a failure to
          animate can no longer strand the menu open. `invisible` is also doing
          real work — visibility:hidden takes the links out of the tab order,
          which a plain opacity-0 would not. */}
      <div
        className={cn(
          'fixed inset-0 z-50 transition-[opacity,visibility] duration-200 lg:hidden',
          menuOpen ? 'visible opacity-100' : 'pointer-events-none invisible opacity-0',
        )}
      >
        <button
          type="button" aria-label="Close menu" tabIndex={menuOpen ? 0 : -1}
          onClick={() => setMenuOpen(false)}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />
        <div
          className={cn(
            'relative h-full w-[270px] max-w-[85vw] overflow-hidden bg-slate-950',
            'transition-transform duration-300 ease-luxe motion-reduce:transition-none',
            menuOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <button
            type="button" onClick={() => setMenuOpen(false)} aria-label="Close menu"
            tabIndex={menuOpen ? 0 : -1}
            className="absolute right-3 top-5 z-10 grid size-8 place-items-center rounded-lg text-slate-300/50 transition-colors hover:bg-slate-50/10"
          >
            <X className="size-4" />
          </button>
          <SidebarContent onNavigate={() => setMenuOpen(false)} />
        </div>
      </div>

      <main
        className={cn(
          'relative transition-[padding] duration-300 ease-luxe',
          collapsed ? 'lg:pl-[68px]' : 'lg:pl-[248px]',
        )}
      >
        <div className="mx-auto max-w-[96rem] px-4 py-6 md:px-8 md:py-8">
          <RoleNotice />
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: EASE_LUXE }}
          >
            <Outlet />
          </motion.div>
        </div>
      </main>

      <CommandPalette open={palette.open} onClose={() => palette.setOpen(false)} canManage={canManage} />

      {/* Floating action on mobile, where the topbar has no room for it. */}
      {canManage && (
        <button
          type="button"
          onClick={() => navigate('/admin/students?new=1')}
          aria-label="Register a student"
          className={cn(
            'fixed bottom-5 right-5 z-30 grid size-13 place-items-center rounded-2xl',
            'bg-slate-900 text-gold-400 lg:hidden', ELEVATION.floating,
          )}
        >
          <Users className="size-5" />
        </button>
      )}
    </div>
  );
}

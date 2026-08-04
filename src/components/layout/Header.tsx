import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X, Phone } from 'lucide-react';
import { Logo } from './Logo';
import { Button } from '@/components/ui/Button';
import { CONTAINER } from '@/components/ui/Section';
import { primaryNav } from '@/config/navigation';
import { site } from '@/config/site';
import { useScrollState, useLockBodyScroll, useFocusTrap } from '@/lib/hooks';
import { EASE_LUXE } from '@/lib/motion';
import { cn } from '@/lib/utils';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Header
 * ─────────────────────────────────────────────────────────────────────────────
 *  Three states, and the transitions between them are the whole design:
 *
 *   1. AT REST (over the hero) — fully transparent, cream type. The hero is
 *      never cropped by a bar sitting on top of it.
 *   2. SCROLLED — frosted cream panel, dark type, hairline border.
 *   3. SCROLLING DOWN — retracts entirely, returning the full viewport to
 *      the content; returns the instant the user scrolls up.
 *
 *  The mobile menu is designed as its own thing rather than a squeezed copy of
 *  the desktop nav: full-bleed espresso, display-scale type, generous hit
 *  areas, and the phone number promoted to a primary action.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function Header() {
  const { scrolled, direction } = useScrollState(40);
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  useLockBodyScroll(menuOpen);
  const menuRef = useFocusTrap<HTMLDivElement>(menuOpen);

  // Close the menu whenever navigation happens.
  useEffect(() => setMenuOpen(false), [pathname]);

  // Escape closes the menu.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const solid = scrolled && !menuOpen;
  const hidden = scrolled && direction === 'down' && !menuOpen;

  return (
    <>
      {/* Skip link — the first thing a keyboard user meets on the page. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[120] focus:rounded-full focus:bg-gold-500 focus:px-6 focus:py-3 focus:font-sans focus:text-sm focus:font-medium focus:text-espresso-950"
      >
        Skip to main content
      </a>

      <motion.header
        initial={false}
        animate={{ y: hidden ? '-105%' : '0%' }}
        transition={{ duration: 0.5, ease: EASE_LUXE }}
        className={cn(
          'fixed inset-x-0 top-0 z-[80]',
          'transition-[background-color,backdrop-filter,border-color,box-shadow] duration-500',
          solid
            ? 'border-b border-coffee-400/15 bg-linen/85 shadow-[0_1px_20px_-8px_rgba(26,22,20,0.15)] backdrop-blur-xl backdrop-saturate-150'
            : 'border-b border-transparent bg-transparent',
        )}
      >
        <div
          className={cn(
            'mx-auto flex items-center justify-between px-gutter',
            CONTAINER.default,
            // Header height grows a little on very large displays so the bar
            // doesn't look like a thin strip across a 4K panel.
            'h-20 md:h-24 3xl:h-28',
          )}
        >
          <Logo tone={solid ? 'dark' : 'light'} />

          {/* ── Desktop navigation ───────────────────────────────────── */}
          <nav aria-label="Primary" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {primaryNav.map((item) => (
                <li key={item.href}>
                  <NavLink
                    to={item.href}
                    end={item.href === '/'}
                    className={({ isActive }) =>
                      cn(
                        'group relative block px-4 py-2 font-sans text-[0.875rem] tracking-[0.01em] transition-colors duration-300',
                        solid
                          ? isActive
                            ? 'text-espresso-950'
                            : 'text-coffee-500 hover:text-espresso-950'
                          : isActive
                            ? 'text-cream-50'
                            : 'text-cream-200/70 hover:text-cream-50',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {item.label}
                        {/* Underline grows from the centre on hover, and stays
                            put when the route is active. */}
                        <span
                          aria-hidden="true"
                          className={cn(
                            'absolute inset-x-4 -bottom-0.5 h-px origin-center bg-gold-500 transition-transform duration-400 ease-luxe',
                            isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100',
                          )}
                        />
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          {/* ── Desktop actions ──────────────────────────────────────── */}
          <div className="hidden items-center gap-5 lg:flex">
            <a
              href={site.phone.href}
              className={cn(
                'group inline-flex items-center gap-2 font-sans text-[0.8125rem] tracking-[0.02em] transition-colors duration-300',
                solid ? 'text-coffee-500 hover:text-espresso-950' : 'text-cream-200/70 hover:text-cream-50',
              )}
            >
              <Phone className="size-3.5 transition-transform duration-300 group-hover:-rotate-12" />
              {site.phone.display}
            </a>

            <Button
              to="/contact#enrol"
              variant={solid ? 'gold' : 'gold'}
              size="sm"
              magnetic
              withArrow
            >
              Enrol Now
            </Button>
          </div>

          {/* ── Mobile trigger ───────────────────────────────────────── */}
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            className={cn(
              'grid size-11 place-items-center rounded-full border transition-colors duration-300 lg:hidden',
              menuOpen
                ? 'border-cream-50/25 text-cream-50'
                : solid
                  ? 'border-coffee-400/25 text-espresso-950'
                  : 'border-cream-50/25 text-cream-50',
            )}
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </motion.header>

      {/* ── Mobile menu ────────────────────────────────────────────── */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            id="mobile-menu"
            ref={menuRef}
            className="fixed inset-0 z-[75] grain flex flex-col bg-espresso-950 lg:hidden"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.45, ease: EASE_LUXE }}
          >
            <nav
              aria-label="Mobile"
              className="flex flex-1 flex-col justify-center px-gutter pt-24"
            >
              <ul className="space-y-1">
                {primaryNav.map((item, i) => (
                  <motion.li
                    key={item.href}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: EASE_LUXE, delay: 0.08 + i * 0.06 }}
                  >
                    <NavLink
                      to={item.href}
                      end={item.href === '/'}
                      className={({ isActive }) =>
                        cn(
                          'flex items-baseline justify-between gap-4 border-b border-cream-50/8 py-4 transition-colors duration-300',
                          isActive ? 'text-gold-400' : 'text-cream-50',
                        )
                      }
                    >
                      <span className="font-display text-4xl tracking-[-0.02em] sm:text-5xl">
                        {item.label}
                      </span>
                      {item.hint && (
                        <span className="font-sans text-[0.625rem] uppercase tracking-[0.2em] text-cream-200/35">
                          {item.hint}
                        </span>
                      )}
                    </NavLink>
                  </motion.li>
                ))}
              </ul>
            </nav>

            <motion.div
              className="px-gutter pb-[max(2rem,env(safe-area-inset-bottom))] pt-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.42, duration: 0.5 }}
            >
              <Button to="/contact#enrol" variant="gold" size="lg" fullWidth withArrow>
                Enrol Now
              </Button>

              <div className="mt-6 flex items-center justify-between">
                <a
                  href={site.phone.href}
                  className="inline-flex items-center gap-2.5 font-sans text-sm text-cream-200/70"
                >
                  <Phone className="size-4 text-gold-500" />
                  {site.phone.display}
                </a>
                <Link
                  to="/courses"
                  className="font-sans text-[0.6875rem] uppercase tracking-[0.2em] text-cream-200/45"
                >
                  View Courses
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

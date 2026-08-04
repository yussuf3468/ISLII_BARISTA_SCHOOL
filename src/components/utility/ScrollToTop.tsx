import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Resets scroll position on route change — the single most common bug in
 * client-routed sites, where navigating to a new page leaves you halfway down it.
 *
 * Hash links are exempted so `/contact#enrol` still jumps to the enrolment form
 * rather than the top of the page.
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      // Wait a frame for the target to exist in the DOM before seeking it.
      requestAnimationFrame(() => {
        document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      return;
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname, hash]);

  return null;
}

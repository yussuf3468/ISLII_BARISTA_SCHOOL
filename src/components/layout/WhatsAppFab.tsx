import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { WhatsAppGlyph } from '@/components/ui/Glyphs';
import { whatsappLink } from '@/config/site';
import { EASE_LUXE } from '@/lib/motion';

/**
 * Persistent WhatsApp action.
 *
 * In Kenya, WhatsApp is the default channel for a business enquiry — a contact
 * form is the polite option, WhatsApp is the one people actually use. So it
 * gets a permanent, thumb-reachable affordance.
 *
 * It appears only after the user has scrolled past the hero, so it never
 * competes with the hero's own primary call to action.
 */
export function WhatsAppFab() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > window.innerHeight * 0.6);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.a
          href={whatsappLink()}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat with ISLII Barista School on WhatsApp"
          onHoverStart={() => setExpanded(true)}
          onHoverEnd={() => setExpanded(false)}
          initial={{ opacity: 0, scale: 0.85, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 16 }}
          transition={{ duration: 0.4, ease: EASE_LUXE }}
          className="group fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-5 z-[60] flex items-center gap-3 rounded-full bg-[#25D366] py-3.5 pl-3.5 pr-4 text-espresso-950 shadow-[0_10px_36px_-8px_rgba(37,211,102,0.6)] transition-shadow duration-300 hover:shadow-[0_14px_44px_-8px_rgba(37,211,102,0.85)] md:bottom-8 md:right-8"
        >
          <WhatsAppGlyph className="size-6 shrink-0" />

          {/* The label expands on hover only — on mobile it stays a compact
              circle so it never covers content. */}
          <motion.span
            initial={false}
            animate={{
              width: expanded ? 'auto' : 0,
              opacity: expanded ? 1 : 0,
            }}
            transition={{ duration: 0.35, ease: EASE_LUXE }}
            className="hidden overflow-hidden whitespace-nowrap font-sans text-sm font-medium md:block"
          >
            Chat with us
          </motion.span>
        </motion.a>
      )}
    </AnimatePresence>
  );
}

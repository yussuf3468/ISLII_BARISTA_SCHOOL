import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { Photo } from '@/components/ui/Photo';
import { MaskedText } from '@/components/ui/MaskedText';
import { ParallaxImage } from '@/components/ui/Parallax';
import { Container } from '@/components/ui/Section';
import type { PhotoKey } from '@/lib/images';
import { EASE_LUXE } from '@/lib/motion';

export interface PageHeroProps {
  eyebrow: string;
  title: string;
  lead?: ReactNode;
  photo: PhotoKey;
  /** Trailing crumb. "Home" is prepended automatically. */
  crumb: string;
  /** Extra crumb between Home and the current page, e.g. Courses → Latte Art. */
  parentCrumb?: { label: string; href: string };
  children?: ReactNode;
}

/**
 * Shared hero for every page that isn't Home.
 *
 * Giving all inner pages the same dark, cinematic opening does two jobs at
 * once: it holds the brand together page to page, and it means the transparent
 * header state is always legible — the header never has to guess what's behind it.
 *
 * The breadcrumb is a real <nav> with an ordered list and `aria-current`, so it
 * works as navigation for assistive tech rather than being decorative text.
 */
export function PageHero({
  eyebrow,
  title,
  lead,
  photo,
  crumb,
  parentCrumb,
  children,
}: PageHeroProps) {
  return (
    <section className="on-dark grain relative isolate flex min-h-[68vh] flex-col justify-end overflow-hidden bg-espresso-950 pb-16 pt-36 md:min-h-[76vh] md:pb-24 md:pt-44">
      <ParallaxImage speed={0.08} className="absolute inset-0 -z-20">
        <Photo
          name={photo}
          priority
          ratio={16 / 9}
          width={2400}
          sizes="100vw"
          className="size-full"
          alt=""
        />
      </ParallaxImage>

      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-t from-espresso-950 via-espresso-950/78 to-espresso-950/55"
      />

      <Container className="relative">
        {/* Breadcrumb */}
        <motion.nav
          aria-label="Breadcrumb"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE_LUXE, delay: 0.1 }}
        >
          <ol className="flex flex-wrap items-center gap-1.5 font-sans text-[0.6875rem] uppercase tracking-[0.18em] text-cream-200/45">
            <li>
              <Link to="/" className="transition-colors duration-300 hover:text-gold-400">
                Home
              </Link>
            </li>
            {parentCrumb && (
              <>
                <li aria-hidden="true">
                  <ChevronRight className="size-3" />
                </li>
                <li>
                  <Link
                    to={parentCrumb.href}
                    className="transition-colors duration-300 hover:text-gold-400"
                  >
                    {parentCrumb.label}
                  </Link>
                </li>
              </>
            )}
            <li aria-hidden="true">
              <ChevronRight className="size-3" />
            </li>
            <li aria-current="page" className="text-gold-400">
              {crumb}
            </li>
          </ol>
        </motion.nav>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE_LUXE, delay: 0.2 }}
          className="mt-8 flex items-center gap-4"
        >
          <span aria-hidden="true" className="h-px w-10 bg-gold-500/60" />
          <span className="font-sans text-eyebrow font-medium uppercase text-gold-400">
            {eyebrow}
          </span>
        </motion.div>

        <MaskedText
          as="h1"
          text={title}
          immediate
          delay={0.32}
          className="mt-6 max-w-4xl text-display-2 text-cream-50"
        />

        {lead && (
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE_LUXE, delay: 0.75 }}
            className="mt-8 max-w-2xl text-lead text-cream-200/72"
          >
            {lead}
          </motion.p>
        )}

        {children && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE_LUXE, delay: 0.9 }}
            className="mt-10"
          >
            {children}
          </motion.div>
        )}
      </Container>
    </section>
  );
}

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Expand } from 'lucide-react';
import { Seo } from '@/components/seo/Seo';
import { PageHero } from '@/components/sections/PageHero';
import { CtaBand } from '@/components/sections/CtaBand';
import { Photo } from '@/components/ui/Photo';
import { Lightbox } from '@/components/ui/Lightbox';
import { Container } from '@/components/ui/Section';
import { galleryItems, galleryCategories, type GalleryCategory } from '@/data/gallery';
import { PHOTOS } from '@/lib/images';
import { organizationSchema, breadcrumbSchema } from '@/lib/schema';
import { EASE_LUXE } from '@/lib/motion';
import { cn } from '@/lib/utils';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Gallery
 * ─────────────────────────────────────────────────────────────────────────────
 *  True masonry via CSS `columns`, not a JS layout library. It reflows natively
 *  at every viewport width, costs nothing at runtime, and never needs a
 *  re-measure on image load.
 *
 *  Tile heights are driven by each photo's real aspect ratio (from the image
 *  registry), so portraits stay portrait — forcing everything into one ratio is
 *  what makes most "masonry" galleries look like a spreadsheet.
 *
 *  Each tile is a <button> that opens the lightbox, so the whole gallery is
 *  operable from the keyboard.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default function Gallery() {
  const [filter, setFilter] = useState<GalleryCategory>('All');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const visible = useMemo(
    () => (filter === 'All' ? galleryItems : galleryItems.filter((i) => i.category === filter)),
    [filter],
  );

  return (
    <>
      <Seo
        title="Gallery — Inside The School"
        description="Espresso, latte art, brewing, bubble tea, milkshakes, tea and training at ISLII Barista School in Nairobi. See what the coursework actually looks like."
        path="/gallery"
        jsonLd={[
          organizationSchema(),
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Gallery', path: '/gallery' },
          ]),
        ]}
      />

      <PageHero
        eyebrow="Gallery"
        title="Inside the school."
        lead="Espresso, milk, latte art, brew bar, cold drinks and live service — the work our students do every day, and the standard they're held to."
        photo="latteOnBeans"
        crumb="Gallery"
      />

      <section className="bg-linen py-section">
        <Container size="wide">
          {/* ── Filters ─────────────────────────────────────────────── */}
          <div
            role="group"
            aria-label="Filter gallery by category"
            className="mb-12 flex flex-wrap items-center gap-2.5 md:mb-16"
          >
            {galleryCategories.map((category) => {
              const active = filter === category;
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => {
                    setFilter(category);
                    setLightboxIndex(null);
                  }}
                  aria-pressed={active}
                  className={cn(
                    'rounded-full border px-5 py-2.5 font-sans text-[0.8125rem] tracking-[0.01em]',
                    'transition-all duration-400 ease-luxe',
                    active
                      ? 'border-espresso-950 bg-espresso-950 text-cream-50'
                      : 'border-coffee-400/30 text-coffee-500 hover:border-coffee-400 hover:bg-cream-50',
                  )}
                >
                  {category}
                </button>
              );
            })}
          </div>

          {/* Announce result count to assistive tech on filter change. */}
          <p aria-live="polite" className="sr-only">
            Showing {visible.length} photograph{visible.length === 1 ? '' : 's'}
            {filter !== 'All' ? ` in ${filter}` : ''}.
          </p>

          {/* ── Masonry ─────────────────────────────────────────────── */}
          <div className="columns-2 gap-3 md:columns-3 md:gap-4 xl:columns-4">
            {visible.map((item, i) => (
              <motion.div
                // Keying on filter forces a fresh mount per category, so the
                // entrance animation replays instead of items silently swapping.
                key={`${filter}-${item.photo}`}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.7,
                  ease: EASE_LUXE,
                  // Cap the stagger so late tiles don't wait seconds to appear.
                  delay: Math.min(i * 0.035, 0.5),
                }}
                className="mb-3 break-inside-avoid md:mb-4"
              >
                <button
                  type="button"
                  onClick={() => setLightboxIndex(i)}
                  className="group relative block w-full overflow-hidden rounded-sm text-left"
                  aria-label={`View larger: ${item.caption}`}
                >
                  <Photo
                    name={item.photo}
                    ratio={PHOTOS[item.photo].ar}
                    width={900}
                    sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
                    zoom
                    alt=""
                  />

                  {/* Caption scrim — appears on hover and on keyboard focus. */}
                  <span
                    className={cn(
                      'absolute inset-0 flex flex-col justify-end p-5',
                      'bg-gradient-to-t from-espresso-950/92 via-espresso-950/25 to-transparent',
                      'opacity-0 transition-opacity duration-500',
                      'group-hover:opacity-100 group-focus-visible:opacity-100',
                    )}
                  >
                    <span className="font-sans text-[0.625rem] uppercase tracking-[0.18em] text-gold-400">
                      {item.category}
                    </span>
                    <span className="mt-1.5 font-display text-[0.9375rem] leading-snug text-cream-50">
                      {item.caption}
                    </span>
                  </span>

                  <span
                    aria-hidden="true"
                    className="absolute right-4 top-4 grid size-9 place-items-center rounded-full glass text-cream-50 opacity-0 transition-all duration-500 group-hover:opacity-100 group-focus-visible:opacity-100"
                  >
                    <Expand className="size-3.5" />
                  </span>
                </button>
              </motion.div>
            ))}
          </div>
        </Container>
      </section>

      <Lightbox
        items={visible}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onNavigate={setLightboxIndex}
      />

      <CtaBand
        title="Come and see it in person."
        lead="Photographs only go so far. Arrange a visit, watch a session, and talk to the trainers before you commit to anything."
      />
    </>
  );
}

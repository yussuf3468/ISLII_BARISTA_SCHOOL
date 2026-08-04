import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { Photo } from '@/components/ui/Photo';
import { Parallax } from '@/components/ui/Parallax';
import { Reveal } from '@/components/ui/Reveal';
import { Container, Eyebrow } from '@/components/ui/Section';
import { galleryHighlights } from '@/data/gallery';

/**
 * Home-page gallery teaser.
 *
 * Four columns drifting at different parallax speeds. The staggered top offsets
 * are what stop it reading as a grid — a plain 4×2 grid of photos is a
 * contact sheet; offset columns moving at different rates is a composition.
 *
 * On mobile the parallax is dropped entirely (it fights with touch momentum
 * scrolling and reads as lag) in favour of a clean two-column mosaic.
 */

const COLUMN_SPEEDS = [0.07, -0.05, 0.1, -0.03];
const COLUMN_OFFSETS = ['mt-0', 'mt-14', 'mt-4', 'mt-20'];

export function GalleryPreview() {
  const columns = [0, 1, 2, 3].map((col) => galleryHighlights.slice(col * 2, col * 2 + 2));

  return (
    <section className="relative overflow-hidden bg-linen py-section">
      <Container>
        <div className="mb-14 flex flex-col gap-8 md:mb-20 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <Reveal>
              <Eyebrow>Inside The School</Eyebrow>
            </Reveal>
            <Reveal index={1}>
              <h2 className="mt-6 text-heading-1 text-espresso-950">
                This is what the training
                <span className="block text-coffee-400">actually looks like.</span>
              </h2>
            </Reveal>
          </div>

          <Reveal index={2}>
            <Link
              to="/gallery"
              className="group inline-flex items-center gap-2.5 font-sans text-[0.9375rem] font-medium text-espresso-950"
            >
              <span className="relative">
                View the full gallery
                <span
                  aria-hidden="true"
                  className="absolute -bottom-1 left-0 h-px w-full origin-right scale-x-0 bg-gold-500 transition-transform duration-500 ease-luxe group-hover:origin-left group-hover:scale-x-100"
                />
              </span>
              <ArrowUpRight className="size-4 transition-transform duration-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </Reveal>
        </div>
      </Container>

      {/* Mobile / tablet — static mosaic */}
      <Container className="lg:hidden">
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {galleryHighlights.map((photo, i) => (
            <Reveal key={photo} index={i % 4} variant="scale">
              <Link to="/gallery" className="group block overflow-hidden rounded-sm">
                <Photo
                  name={photo}
                  ratio={i % 3 === 0 ? 3 / 4 : 1}
                  width={800}
                  sizes="50vw"
                  zoom
                  overlay="soft"
                />
              </Link>
            </Reveal>
          ))}
        </div>
      </Container>

      {/* Desktop — parallax columns */}
      <Container size="wide" className="hidden lg:block">
        <div className="grid grid-cols-4 gap-5">
          {columns.map((column, colIndex) => (
            <Parallax
              key={colIndex}
              speed={COLUMN_SPEEDS[colIndex]}
              className={COLUMN_OFFSETS[colIndex]}
            >
              <div className="space-y-5">
                {column.map((photo, i) => (
                  <Reveal key={photo} variant="scale" index={i}>
                    <Link
                      to="/gallery"
                      className="group block overflow-hidden rounded-sm"
                      aria-label="Open the ISLII gallery"
                    >
                      <Photo
                        name={photo}
                        ratio={(colIndex + i) % 2 === 0 ? 3 / 4 : 1}
                        width={800}
                        sizes="24vw"
                        zoom
                        overlay="soft"
                      />
                    </Link>
                  </Reveal>
                ))}
              </div>
            </Parallax>
          ))}
        </div>
      </Container>
    </section>
  );
}

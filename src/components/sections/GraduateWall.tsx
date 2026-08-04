import { Photo } from '@/components/ui/Photo';
import { Marquee } from '@/components/ui/Marquee';
import { Button } from '@/components/ui/Button';
import { Reveal } from '@/components/ui/Reveal';
import { Container, Eyebrow } from '@/components/ui/Section';
import { GRADUATE_PORTRAITS } from '@/lib/images';
import { site } from '@/config/site';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  GraduateWall — real ISLII graduates, photographed at the school.
 * ─────────────────────────────────────────────────────────────────────────────
 *  This is the single most persuasive block on the site, and it earns that
 *  purely by being true: every face here is an actual person who completed an
 *  actual programme, shot at the school's own certification backdrop.
 *
 *  Presented as a moving wall rather than a static grid for two reasons. It
 *  shows all eleven portraits without demanding eleven rows of vertical space,
 *  and continuous motion reads as "there are many more of these" — which is
 *  precisely the impression the section exists to create.
 *
 *  Deliberately NOT used as testimonial avatars: attaching invented quotes and
 *  invented names to real identifiable people would be a misrepresentation.
 *  The portraits speak for themselves; the quotes stay typographic until real
 *  permissioned testimonials arrive.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function GraduateWall() {
  return (
    <section className="on-dark grain relative overflow-hidden bg-espresso-900 py-section">
      <Container>
        <div className="mb-14 max-w-3xl md:mb-18">
          <Reveal>
            <Eyebrow tone="light">Our Graduates</Eyebrow>
          </Reveal>

          <Reveal index={1}>
            <h2 className="mt-6 text-heading-1 text-cream-50">
              Real students. Real certificates.
              <span className="block text-cream-200/45">Real jobs behind the bar.</span>
            </h2>
          </Reveal>

          <Reveal index={2}>
            <p className="mt-6 max-w-xl text-lead text-cream-200/65">
              Every photograph below was taken at our school, on certification day. These are the
              people who walked in with no experience and walked out ready to run a bar.
            </p>
          </Reveal>
        </div>
      </Container>

      {/* Portrait wall — full-bleed so it runs past the container edges. */}
      <Reveal variant="in" amount={0.05}>
        <Marquee duration={70} className="py-2">
          {GRADUATE_PORTRAITS.map((portrait) => (
            <figure
              key={portrait}
              className="mr-4 w-[clamp(9rem,20vw,14rem)] shrink-0 md:mr-5"
            >
              <div className="overflow-hidden rounded-sm ring-1 ring-cream-50/10">
                <Photo
                  name={portrait}
                  ratio={9 / 16}
                  width={640}
                  sizes="(max-width: 768px) 40vw, 14rem"
                />
              </div>
            </figure>
          ))}
        </Marquee>
      </Reveal>

      <Container>
        <Reveal index={1}>
          <div className="mt-14 flex flex-col items-start gap-6 border-t border-cream-50/10 pt-10 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-md font-sans text-[0.9375rem] leading-relaxed text-cream-200/55">
              Over {site.stats.studentsTrained.toLocaleString('en-KE')} students have now trained
              with us. The next intake could include you.
            </p>
            <Button to="/contact#enrol" variant="gold" size="lg" magnetic withArrow>
              Join The Next Intake
            </Button>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

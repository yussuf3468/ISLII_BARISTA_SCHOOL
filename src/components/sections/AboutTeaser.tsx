import { Check } from 'lucide-react';
import { Photo } from '@/components/ui/Photo';
import { Button } from '@/components/ui/Button';
import { Reveal } from '@/components/ui/Reveal';
import { Parallax } from '@/components/ui/Parallax';
import { Container, Eyebrow } from '@/components/ui/Section';
import { Crest } from '@/components/layout/Logo';

const pillars = [
  'Live commercial equipment from day one',
  'Intakes capped so everyone gets machine time',
  'Assessed on practical skill, not attendance',
  'Career support that continues after you graduate',
];

/**
 * The "who we are" beat on the home page.
 *
 * Two photographs offset on opposing parallax speeds, which produces real
 * depth as the section scrolls past — cheaper and far more convincing than
 * a drop shadow.
 */
export function AboutTeaser() {
  return (
    <section className="relative overflow-hidden bg-linen py-section">
      <Container>
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
          {/* ── Imagery ─────────────────────────────────────────────── */}
          <div className="relative">
            {/* Real ISLII photography — a genuine classroom beats any stock
                equivalent for the section that asks "who are you?". */}
            <Parallax speed={-0.06}>
              <Photo
                name="classroomOne"
                ratio={4 / 5}
                width={1200}
                sizes="(max-width: 1024px) 90vw, 42vw"
                className="rounded-sm shadow-raise"
              />
            </Parallax>

            {/* Overlapping second frame. Hidden on small screens, where two
                stacked images would just push the copy off the fold. */}
            <Parallax
              speed={0.13}
              className="absolute -bottom-12 -right-4 hidden w-[52%] sm:block lg:-right-12"
            >
              <Photo
                name="studentsTasting"
                ratio={3 / 4}
                width={900}
                sizes="26vw"
                className="rounded-sm shadow-hero ring-8 ring-linen"
              />
            </Parallax>

            {/* The school's real crest, floated over the classroom photograph.
                This is the badge students are certified under and photographed
                against, so it belongs here rather than as generic decoration. */}
            <div className="absolute -left-4 top-6 hidden rounded-sm bg-espresso-950/95 p-4 text-center shadow-raise backdrop-blur-sm lg:block xl:-left-8">
              <Crest className="w-24 xl:w-28" sizes="(min-width: 1280px) 112px, 96px" />
              <span className="mt-2 block font-sans text-[0.5rem] uppercase tracking-[0.22em] text-gold-500/80">
                Established 2024
              </span>
            </div>
          </div>

          {/* ── Copy ────────────────────────────────────────────────── */}
          <div className="lg:pl-6">
            <Reveal>
              <Eyebrow>About ISLII</Eyebrow>
            </Reveal>

            <Reveal index={1}>
              <h2 className="mt-6 text-heading-1 text-espresso-950">
                We don't teach coffee.
                <span className="block text-coffee-400">We build careers in it.</span>
              </h2>
            </Reveal>

            <Reveal index={2}>
              <div className="mt-7 space-y-5 text-lead text-coffee-500">
                <p>
                  Nairobi's coffee scene has grown faster than the talent to staff it. Cafés open
                  every month and struggle to find people who can hold a bar together on a busy
                  Saturday — and that gap is exactly what ISLII exists to close.
                </p>
                <p>
                  We train the way the trade actually works: on live commercial equipment, in small
                  groups, with repetition until technique becomes instinct. Our students leave able
                  to walk into a trial and hold a station from the first shift.
                </p>
              </div>
            </Reveal>

            <Reveal index={3}>
              <ul className="mt-9 space-y-3.5">
                {pillars.map((pillar) => (
                  <li key={pillar} className="flex items-start gap-3.5">
                    <span
                      aria-hidden="true"
                      className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-gold-500/15 text-gold-600"
                    >
                      <Check className="size-3" strokeWidth={3} />
                    </span>
                    <span className="font-sans text-[0.9375rem] text-espresso-800">{pillar}</span>
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal index={4}>
              <div className="mt-11 flex flex-wrap items-center gap-4">
                <Button to="/about" variant="ink" magnetic withArrow>
                  Our Story
                </Button>
                <Button to="/courses" variant="outline">
                  Browse Courses
                </Button>
              </div>
            </Reveal>
          </div>
        </div>
      </Container>
    </section>
  );
}

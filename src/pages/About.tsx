import { Seo } from '@/components/seo/Seo';
import { PageHero } from '@/components/sections/PageHero';
import { StatBand } from '@/components/sections/StatBand';
import { WhyChooseUs } from '@/components/sections/WhyChooseUs';
import { CtaBand } from '@/components/sections/CtaBand';
import { Photo } from '@/components/ui/Photo';
import { Parallax } from '@/components/ui/Parallax';
import { Section, Container, Eyebrow } from '@/components/ui/Section';
import { Reveal, RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { Button } from '@/components/ui/Button';
import { MaskedText } from '@/components/ui/MaskedText';
import { site } from '@/config/site';
import { organizationSchema, breadcrumbSchema } from '@/lib/schema';

const principles = [
  {
    number: '01',
    title: 'Repetition over theory',
    body: "You cannot read your way to a good rosetta. We build the syllabus around volume of practice, because technique in this trade lives in your hands, not your notes. Students pour, dial in and steam every single day they're with us.",
  },
  {
    number: '02',
    title: 'Assessed, not attended',
    body: 'Every programme ends in a practical assessment on live equipment. If you cannot demonstrate the outcome, you do not get the certificate — which is the only thing that makes the certificate worth anything to an employer.',
  },
  {
    number: '03',
    title: 'Trained for the rush',
    body: 'Anyone can make one good drink in a quiet room. We train under time pressure, with ticket queues and simulated service, because that is the condition the job is actually performed in.',
  },
];

const facilities = [
  { photo: 'classroomTwo', label: 'The classroom', detail: 'Theory sessions on extraction, ratios, menu costing and hygiene' },
  { photo: 'cafeInteriorMachine', label: 'The training bar', detail: 'Multi-group commercial espresso machines and on-demand grinders' },
  { photo: 'juicesJars', label: 'The cold station', detail: 'Blenders, juicers, shakers and sealing equipment for the full cold menu' },
] as const;

export default function About() {
  return (
    <>
      <Seo
        title="About Us — Nairobi's Professional Coffee Academy"
        description={`${site.name} trains baristas to international standards in Nairobi. Small classes, commercial equipment, practical assessment, and career support that continues after graduation.`}
        path="/about"
        jsonLd={[
          organizationSchema(),
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'About', path: '/about' },
          ]),
        ]}
      />

      <PageHero
        eyebrow="Our Story"
        title="Built for the trade, by the trade."
        lead="ISLII exists because Nairobi's coffee scene grew faster than the talent to staff it. We train the people that gap is waiting for."
        photo="classGroup"
        crumb="About"
      />

      {/* ── Story ────────────────────────────────────────────────────── */}
      <Section tone="light">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-20">
          <div className="lg:col-span-6">
            <Reveal>
              <Eyebrow>Why We Exist</Eyebrow>
            </Reveal>

            <Reveal index={1}>
              <h2 className="mt-6 text-heading-1 text-espresso-950">
                Kenya grows some of the world's best coffee.
                <span className="block text-coffee-400">
                  For years, almost none of it was served properly at home.
                </span>
              </h2>
            </Reveal>

            <Reveal index={2}>
              <div className="mt-8 space-y-5 text-lead leading-relaxed text-coffee-500">
                <p>
                  That gap is what started this school. Cafés were opening across Nairobi faster
                  than anyone could staff them — and owners kept telling the same story: they could
                  buy a good machine, but they could not find people who knew how to run it.
                </p>
                <p>
                  So we built the training that was missing. Not a lecture course with a certificate
                  at the end, but a working bar where students spend their days doing the actual
                  job: dialling in grinders, texturing milk, pouring under pressure, resetting a
                  station, holding a queue together.
                </p>
                <p className="text-espresso-800">
                  We opened in {site.foundingYear}, and in that time more than{' '}
                  {site.stats.studentsTrained.toLocaleString('en-KE')} students have trained with
                  us — going on to work as baristas and supervisors across Nairobi, and in a
                  growing number of cases to open cafés of their own.
                </p>
              </div>
            </Reveal>

            <Reveal index={3}>
              <div className="mt-10 flex flex-wrap gap-4">
                <Button to="/courses" variant="ink" magnetic withArrow>
                  See The Programmes
                </Button>
                <Button to="/gallery" variant="outline">
                  Inside The School
                </Button>
              </div>
            </Reveal>
          </div>

          {/* Imagery */}
          <div className="relative lg:col-span-6">
            <Parallax speed={-0.05}>
              <Photo
                name="studentsTasting"
                ratio={4 / 5}
                width={1200}
                sizes="(max-width: 1024px) 90vw, 45vw"
                className="rounded-sm shadow-raise"
              />
            </Parallax>

            <Parallax
              speed={0.12}
              className="absolute -bottom-10 left-0 hidden w-[48%] sm:block lg:-left-14"
            >
              <Photo
                name="classGroup"
                ratio={4 / 3}
                width={900}
                sizes="24vw"
                className="rounded-sm shadow-hero ring-8 ring-linen"
              />
            </Parallax>
          </div>
        </div>
      </Section>

      <StatBand />

      {/* ── Principles ───────────────────────────────────────────────── */}
      <Section
        tone="cream"
        eyebrow="How We Teach"
        title={
          <>
            Three principles.
            <span className="block text-coffee-400">Everything else follows from them.</span>
          </>
        }
      >
        <RevealGroup stagger={0.1} className="grid gap-10 md:grid-cols-3 md:gap-8">
          {principles.map((principle) => (
            <RevealItem key={principle.number} className="border-t border-coffee-400/25 pt-8">
              <span
                aria-hidden="true"
                className="font-display text-4xl leading-none text-gold-500/45 tabular"
              >
                {principle.number}
              </span>
              <h3 className="mt-6 font-display text-2xl leading-snug text-espresso-950">
                {principle.title}
              </h3>
              <p className="mt-4 font-sans text-[0.9375rem] leading-relaxed text-coffee-500">
                {principle.body}
              </p>
            </RevealItem>
          ))}
        </RevealGroup>
      </Section>

      {/* ── Pull quote ───────────────────────────────────────────────── */}
      <section className="on-dark grain relative isolate overflow-hidden bg-espresso-950">
        <div className="absolute inset-0 -z-20 opacity-25">
          <Photo name="beansTexture" ratio={16 / 9} width={2000} sizes="100vw" className="size-full" alt="" />
        </div>
        <Container className="relative py-section">
          <blockquote className="mx-auto max-w-4xl text-center">
            <MaskedText
              as="p"
              text="We are not trying to produce people who can make coffee. We are trying to produce people a café cannot run without."
              className="font-display text-[clamp(1.5rem,1rem+2.2vw,3rem)] leading-[1.28] text-cream-50"
              stagger={0.035}
            />
            <Reveal index={3}>
              <footer className="mt-10 font-sans text-[0.6875rem] uppercase tracking-[0.22em] text-gold-500/75">
                The ISLII teaching philosophy
              </footer>
            </Reveal>
          </blockquote>
        </Container>
      </section>

      {/* ── Facilities ───────────────────────────────────────────────── */}
      <Section
        tone="light"
        eyebrow="The Facilities"
        title="You train on what you'll be hired to run."
        lead="There is no teaching-grade equipment here. Everything in the building is the same class of kit you will meet in a working café on your first shift."
      >
        <RevealGroup stagger={0.09} className="grid gap-6 md:grid-cols-3 lg:gap-7">
          {facilities.map((facility) => (
            <RevealItem key={facility.label} className="group">
              <div className="overflow-hidden rounded-sm">
                <Photo
                  name={facility.photo}
                  ratio={4 / 5}
                  width={900}
                  sizes="(max-width: 768px) 90vw, 30vw"
                  zoom
                  overlay="soft"
                />
              </div>
              <h3 className="mt-6 font-display text-xl text-espresso-950">{facility.label}</h3>
              <p className="mt-2.5 font-sans text-[0.9375rem] leading-relaxed text-coffee-500">
                {facility.detail}
              </p>
            </RevealItem>
          ))}
        </RevealGroup>
      </Section>

      <WhyChooseUs />

      <CtaBand
        title="Come and see for yourself."
        lead="Book a visit, watch a live session, and talk to the trainers before you commit to anything. No pressure, no sales pitch."
      />
    </>
  );
}

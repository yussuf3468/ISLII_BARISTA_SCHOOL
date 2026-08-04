import { Link, Navigate, useParams } from 'react-router-dom';
import { Check, Clock, SignalHigh, Award, Users, Wallet } from 'lucide-react';
import { Seo } from '@/components/seo/Seo';
import { PageHero } from '@/components/sections/PageHero';
import { CtaBand } from '@/components/sections/CtaBand';
import { CourseCard } from '@/components/ui/CourseCard';
import { Section, Container, Eyebrow } from '@/components/ui/Section';
import { Reveal, RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { Button } from '@/components/ui/Button';
import { WhatsAppGlyph } from '@/components/ui/Glyphs';
import { courses, getCourseBySlug, getIncludedCourses } from '@/data/courses';
import { site, whatsappLink, formatKes } from '@/config/site';
import { courseSchema, organizationSchema, breadcrumbSchema } from '@/lib/schema';

export default function CourseDetail() {
  const { slug } = useParams<{ slug: string }>();
  const course = getCourseBySlug(slug);

  // Unknown slug → send them to the catalogue rather than a dead end.
  // `replace` keeps the broken URL out of history, so Back still works.
  if (!course) return <Navigate to="/courses" replace />;

  const included = getIncludedCourses(course);
  // For a bundle, "related" would just repeat what it already contains.
  const related = courses
    .filter((c) => c.slug !== course.slug && !course.includes?.includes(c.slug))
    .slice(0, 3);

  const facts = [
    { Icon: Clock, label: 'Duration', value: course.duration },
    ...(site.showPrices && course.priceKes
      ? [{ Icon: Wallet, label: 'Course fee', value: formatKes(course.priceKes) }]
      : []),
    { Icon: SignalHigh, label: 'Level', value: course.level },
    { Icon: Users, label: 'Format', value: course.format },
    { Icon: Award, label: 'Certification', value: course.certification },
  ];

  const enquiryMessage = `Hello ISLII Barista School, I'd like to enrol in the ${course.title}. Could you send me the fees and the next intake dates?`;

  return (
    <>
      <Seo
        title={`${course.title} — ${course.duration}`}
        description={course.overview.slice(0, 300)}
        path={`/courses/${course.slug}`}
        type="article"
        jsonLd={[
          organizationSchema(),
          courseSchema(course),
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Courses', path: '/courses' },
            { name: course.title, path: `/courses/${course.slug}` },
          ]),
        ]}
      />

      <PageHero
        eyebrow={`Programme ${course.number}`}
        title={course.title}
        lead={course.kicker}
        photo={course.photo}
        crumb={course.title}
        parentCrumb={{ label: 'Courses', href: '/courses' }}
      >
        <Button to="/contact#enrol" variant="gold" size="lg" magnetic withArrow>
          Enrol In This Course
        </Button>
      </PageHero>

      {/* ── Fact strip ───────────────────────────────────────────────── */}
      <section className="border-b border-coffee-400/15 bg-cream-50">
        <Container>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-8 py-10 lg:grid-cols-5 lg:gap-x-8">
            {facts.map(({ Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3.5">
                <Icon className="mt-0.5 size-4 shrink-0 text-gold-600" aria-hidden="true" />
                <div>
                  <dt className="font-sans text-[0.625rem] uppercase tracking-[0.18em] text-coffee-400">
                    {label}
                  </dt>
                  <dd className="mt-1.5 font-sans text-[0.9375rem] leading-snug text-espresso-950">
                    {value}
                  </dd>
                </div>
              </div>
            ))}
          </dl>
        </Container>
      </section>

      {/* ── Overview + outcomes + modules ────────────────────────────── */}
      <Section tone="light">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <Reveal>
              <Eyebrow>Overview</Eyebrow>
              <p className="mt-7 text-lead leading-relaxed text-espresso-800">{course.overview}</p>
            </Reveal>

            {/* Bundle contents — only rendered for the Full Barista Course. */}
            {included.length > 0 && (
              <Reveal index={1}>
                <div className="mt-12 rounded-sm border border-gold-500/30 bg-cream-50 p-7 md:p-8">
                  <h2 className="font-sans text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-gold-600">
                    This programme includes all three disciplines
                  </h2>

                  <ul className="mt-6 divide-y divide-coffee-400/15">
                    {included.map((part) => (
                      <li key={part.slug} className="py-4 first:pt-0 last:pb-0">
                        <Link
                          to={`/courses/${part.slug}`}
                          className="group flex items-baseline justify-between gap-4"
                        >
                          <span className="flex items-baseline gap-3">
                            <span className="font-sans text-[0.6875rem] text-gold-600/70 tabular">
                              {part.number}
                            </span>
                            <span className="font-display text-xl text-espresso-950 transition-colors duration-300 group-hover:text-coffee-500">
                              {part.title}
                            </span>
                          </span>
                          <span className="shrink-0 font-sans text-[0.8125rem] text-coffee-400">
                            {part.duration}
                          </span>
                        </Link>
                        <p className="mt-1.5 pl-8 font-sans text-[0.875rem] leading-relaxed text-coffee-500">
                          {part.kicker}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            )}

            {/* Outcomes */}
            <Reveal index={1}>
              <h2 className="mt-16 text-heading-2 text-espresso-950">What you'll be able to do</h2>
              <p className="mt-4 max-w-xl font-sans text-[0.9375rem] text-coffee-500">
                Every outcome below is assessed practically before your certificate is issued.
              </p>
            </Reveal>

            <RevealGroup stagger={0.06} className="mt-9 space-y-4">
              {course.outcomes.map((outcome) => (
                <RevealItem key={outcome} className="flex items-start gap-4">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-gold-500/15 text-gold-600"
                  >
                    <Check className="size-3.5" strokeWidth={2.5} />
                  </span>
                  <span className="font-sans text-[1.0625rem] leading-relaxed text-espresso-800">
                    {outcome}
                  </span>
                </RevealItem>
              ))}
            </RevealGroup>

            {/* Full item list — pastry classes only. Prospective bakers judge a
                course almost entirely on what they will physically be able to
                make, so the whole list gets shown rather than summarised. */}
            {course.menu && (
              <>
                <Reveal index={1}>
                  <h2 className="mt-20 text-heading-2 text-espresso-950">
                    What you'll learn to make
                  </h2>
                  <p className="mt-4 max-w-xl font-sans text-[0.9375rem] text-coffee-500">
                    All {course.menu.length} items, baked by you, during the programme.
                  </p>
                </Reveal>

                <Reveal index={2}>
                  <ol className="mt-9 grid gap-x-8 gap-y-0 border-t border-coffee-400/20 sm:grid-cols-2">
                    {course.menu.map((item, i) => (
                      <li
                        key={item}
                        className="flex items-baseline gap-4 border-b border-coffee-400/15 py-3.5"
                      >
                        <span
                          aria-hidden="true"
                          className="shrink-0 font-sans text-[0.6875rem] text-gold-600/70 tabular"
                        >
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span className="font-sans text-[0.9375rem] text-espresso-800">{item}</span>
                      </li>
                    ))}
                  </ol>
                </Reveal>
              </>
            )}

            {/* Modules */}
            <Reveal index={1}>
              <h2 className="mt-20 text-heading-2 text-espresso-950">How the programme runs</h2>
            </Reveal>

            <RevealGroup stagger={0.08} className="mt-9 border-t border-coffee-400/20">
              {course.modules.map((module, i) => (
                <RevealItem
                  key={module.title}
                  className="group flex gap-6 border-b border-coffee-400/20 py-8 md:gap-10"
                >
                  <span
                    aria-hidden="true"
                    className="shrink-0 font-display text-3xl leading-none text-coffee-400/35 transition-colors duration-500 group-hover:text-gold-500 tabular"
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <h3 className="font-display text-xl text-espresso-950 md:text-2xl">
                      {module.title}
                    </h3>
                    <p className="mt-3 max-w-2xl font-sans text-[0.9375rem] leading-relaxed text-coffee-500">
                      {module.detail}
                    </p>
                  </div>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>

          {/* ── Sticky enrol card ──────────────────────────────────── */}
          <aside className="lg:col-span-5">
            <Reveal index={2}>
              <div className="on-dark grain sticky top-32 rounded-sm bg-espresso-950 p-8 md:p-10">
                <Eyebrow tone="light">Enrol</Eyebrow>

                <h2 className="mt-6 font-display text-3xl leading-tight text-cream-50">
                  {course.title}
                </h2>

                <p className="mt-4 font-sans text-[0.9375rem] leading-relaxed text-cream-200/65">
                  {course.duration} · {course.level}
                </p>

                {site.showPrices && course.priceKes ? (
                  <p className="mt-7 border-y border-cream-50/12 py-5">
                    <span className="block font-sans text-[0.625rem] uppercase tracking-[0.18em] text-gold-500/75">
                      Course fee
                    </span>
                    <span className="mt-1.5 block font-display text-4xl leading-none text-gold-400 tabular">
                      {formatKes(course.priceKes)}
                    </span>
                  </p>
                ) : (
                  <p className="mt-7 border-y border-cream-50/12 py-5 font-sans text-[0.9375rem] leading-relaxed text-cream-200/70">
                    Fees and upcoming intake dates are sent on enquiry — message us and we will
                    reply the same day.
                  </p>
                )}

                <div className="mt-8 rounded-sm border border-cream-50/12 p-5">
                  <p className="font-sans text-[0.6875rem] uppercase tracking-[0.18em] text-gold-500/75">
                    Ideal for
                  </p>
                  <p className="mt-2.5 font-sans text-[0.9375rem] leading-relaxed text-cream-200/70">
                    {course.idealFor}
                  </p>
                </div>

                <div className="mt-8 space-y-3">
                  <Button to="/contact#enrol" variant="gold" size="lg" fullWidth withArrow>
                    Request Fees & Dates
                  </Button>
                  <Button
                    href={whatsappLink(enquiryMessage)}
                    variant="outlineLight"
                    fullWidth
                    icon={<WhatsAppGlyph className="size-4" />}
                  >
                    Ask About This Course
                  </Button>
                </div>

                <p className="mt-7 border-t border-cream-50/10 pt-6 text-center font-sans text-[0.8125rem] text-cream-200/45">
                  Or call{' '}
                  <a
                    href={site.phone.href}
                    className="text-cream-200/80 underline underline-offset-4 transition-colors hover:text-gold-400"
                  >
                    {site.phone.display}
                  </a>
                </p>
              </div>
            </Reveal>
          </aside>
        </div>
      </Section>

      {/* ── Related ──────────────────────────────────────────────────── */}
      <Section
        tone="cream"
        eyebrow="Continue"
        title="Pair it with these."
        lead="Most students combine two or three programmes. These are the ones that stack best with this course."
        aside={
          <Button to="/courses" variant="outline" withArrow>
            All Courses
          </Button>
        }
      >
        <RevealGroup stagger={0.08} className="grid gap-6 md:grid-cols-3 lg:gap-7">
          {related.map((item) => (
            <RevealItem key={item.slug}>
              <CourseCard course={item} className="h-full" />
            </RevealItem>
          ))}
        </RevealGroup>
      </Section>

      <CtaBand
        title={`Ready to start ${course.title}?`}
        lead="Places are capped so every student gets machine time. Send an enquiry and we'll confirm the next available intake."
      />
    </>
  );
}

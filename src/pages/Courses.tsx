import { Seo } from '@/components/seo/Seo';
import { PageHero } from '@/components/sections/PageHero';
import { CtaBand } from '@/components/sections/CtaBand';
import { CourseCard } from '@/components/ui/CourseCard';
import { Section } from '@/components/ui/Section';
import { RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { Button } from '@/components/ui/Button';
import { courses } from '@/data/courses';
import { courseListSchema, organizationSchema, breadcrumbSchema } from '@/lib/schema';

export default function Courses() {
  return (
    <>
      <Seo
        title="Barista, Beverage & Pastry Courses in Nairobi"
        description="Professional training in Nairobi: the Full Barista & Beverage Course covering coffee, mixology and boba, plus two Pastry & Bakery classes. Hands-on, small groups, practical certification."
        path="/courses"
        jsonLd={[
          organizationSchema(),
          courseListSchema(courses),
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Courses', path: '/courses' },
          ]),
        ]}
      />

      <PageHero
        eyebrow="Programmes"
        title="Two schools. One standard."
        lead="Our Barista & Beverage programme covers coffee, mixology and boba end to end. Alongside it, ISLII Pastry & Bakery runs two classes of its own. Every programme is hands-on, capped for equipment time, and ends in a practical assessment rather than an attendance certificate."
        photo="classGroup"
        crumb="Courses"
      >
        <Button to="/contact#enrol" variant="gold" size="lg" magnetic withArrow>
          Request Fees & Dates
        </Button>
      </PageHero>

      <Section
        tone="light"
        eyebrow="The Catalogue"
        title="Choose where you want to start."
        lead="Not sure which one fits? Tell us your experience level and your goal, and we'll recommend the right route — including whether you need more than one programme."
      >
        <RevealGroup stagger={0.07} className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-7">
          {courses.map((course) => (
            // The bundle is promoted to feature size and given the full width of
            // the first row — it is the route most students take, and a grid
            // that weights all four equally makes no recommendation at all.
            <RevealItem
              key={course.slug}
              className={course.isBundle ? 'md:col-span-2 lg:col-span-3' : undefined}
            >
              <CourseCard
                course={course}
                size={course.isBundle ? 'feature' : 'default'}
                className="h-full"
              />
            </RevealItem>
          ))}
        </RevealGroup>
      </Section>

      {/* ── Comparison table ─────────────────────────────────────────── */}
      <Section
        tone="cream"
        eyebrow="At A Glance"
        title="Compare every programme."
        lead="Durations, levels and what each one certifies — side by side."
      >
        {/* Wide tables must scroll inside their own container, never push the
            page sideways. */}
        <div className="-mx-gutter overflow-x-auto px-gutter">
          <table className="w-full min-w-[46rem] border-collapse text-left">
            <caption className="sr-only">
              Comparison of all {courses.length} programmes at ISLII Barista School
            </caption>
            <thead>
              <tr className="border-b border-coffee-400/30">
                {['Programme', 'Duration', 'Level', 'Certificate', ''].map((heading, i) => (
                  <th
                    key={heading || i}
                    scope="col"
                    className="pb-4 pr-6 font-sans text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-coffee-400"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {courses.map((course) => (
                <tr
                  key={course.slug}
                  className="group border-b border-coffee-400/15 transition-colors duration-300 hover:bg-linen"
                >
                  <th scope="row" className="py-5 pr-6 font-normal">
                    <span className="flex items-baseline gap-3">
                      <span className="font-sans text-[0.6875rem] text-gold-600/70 tabular">
                        {course.number}
                      </span>
                      <span className="font-display text-lg text-espresso-950">{course.title}</span>
                    </span>
                  </th>
                  <td className="py-5 pr-6 font-sans text-[0.875rem] text-coffee-500">
                    {course.duration}
                  </td>
                  <td className="py-5 pr-6 font-sans text-[0.875rem] text-coffee-500">
                    {course.level}
                  </td>
                  <td className="py-5 pr-6 font-sans text-[0.875rem] text-coffee-500">
                    {course.certification}
                  </td>
                  <td className="py-5 text-right">
                    <Button to={`/courses/${course.slug}`} variant="ghost" size="sm" withArrow>
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <CtaBand
        title="Still deciding?"
        lead="Send us one message describing where you are now and where you want to be. We'll tell you exactly which programme to take — and in what order."
      />
    </>
  );
}

import { Section } from '@/components/ui/Section';
import { RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { CourseCard } from '@/components/ui/CourseCard';
import { Button } from '@/components/ui/Button';
import { featuredCourses, courses } from '@/data/courses';

/**
 * Home-page course showcase.
 *
 * Shows the featured subset rather than all eight — a home page that dumps the
 * entire catalogue gives the visitor a filing task instead of a decision. The
 * index page exists for people who want the full list.
 *
 * The first card is promoted to feature size because the Professional Barista
 * Course is the flagship, and a grid where everything is equally weighted makes
 * no recommendation at all.
 */
export function CourseShowcase() {
  const [flagship, ...rest] = featuredCourses;

  return (
    <Section
      id="courses"
      tone="light"
      eyebrow="Programmes"
      title={
        <>
          Coffee, beverage,
          <span className="block text-coffee-400">pastry and bakery.</span>
        </>
      }
      lead="The Full Barista & Beverage Course covers coffee, mixology and boba in one programme — and ISLII Pastry & Bakery runs two classes alongside it."
      aside={
        <Button to="/courses" variant="outline" withArrow>
          All {courses.length} Programmes
        </Button>
      }
    >
      <RevealGroup stagger={0.09} className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-7">
        {flagship && (
          <RevealItem className="md:col-span-2 lg:row-span-2">
            <CourseCard course={flagship} size="feature" className="h-full" />
          </RevealItem>
        )}

        {rest.map((course) => (
          <RevealItem key={course.slug}>
            <CourseCard course={course} className="h-full" />
          </RevealItem>
        ))}
      </RevealGroup>
    </Section>
  );
}

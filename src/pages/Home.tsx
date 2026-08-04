import { Seo } from '@/components/seo/Seo';
import { Hero } from '@/components/sections/Hero';
import { StatBand } from '@/components/sections/StatBand';
import { SkillsMarquee } from '@/components/sections/SkillsMarquee';
import { GraduateWall } from '@/components/sections/GraduateWall';
import { AboutTeaser } from '@/components/sections/AboutTeaser';
import { WhyChooseUs } from '@/components/sections/WhyChooseUs';
import { CourseShowcase } from '@/components/sections/CourseShowcase';
import { GalleryPreview } from '@/components/sections/GalleryPreview';
import { Testimonials } from '@/components/sections/Testimonials';
import { FaqSection } from '@/components/sections/FaqSection';
import { CtaBand } from '@/components/sections/CtaBand';
import { organizationSchema, websiteSchema, courseListSchema } from '@/lib/schema';
import { courses } from '@/data/courses';
import { site } from '@/config/site';

/**
 * Home page.
 *
 * The section order is a deliberate conversion sequence, not a menu:
 *   Hero          — the promise
 *   Stats         — the numbers behind the promise
 *   Skills        — the breadth, absorbed without reading
 *   Graduates     — REAL photographs of real students; the hardest proof we have
 *   About         — who is making the promise
 *   Why ISLII     — objection handling
 *   Courses       — the offer
 *   Gallery       — the evidence
 *   Testimonials  — social proof, once they are already interested
 *   FAQ           — the last objections before the ask
 *   CTA           — the ask
 *
 * Tone alternates dark → light → dark down the page so no two adjacent
 * sections read as one undifferentiated block.
 */
export default function Home() {
  return (
    <>
      <Seo
        title={`${site.name} — Become a World-Class Barista | Nairobi, Kenya`}
        description={site.description}
        path="/"
        jsonLd={[organizationSchema(), websiteSchema(), courseListSchema(courses)]}
      />

      <Hero />
      <StatBand />
      <SkillsMarquee />
      <GraduateWall />
      <AboutTeaser />
      <WhyChooseUs />
      <CourseShowcase />
      <GalleryPreview />
      <Testimonials />
      <FaqSection limit={6} showAllLink tone="cream" />
      <CtaBand />
    </>
  );
}

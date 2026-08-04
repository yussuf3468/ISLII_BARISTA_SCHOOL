import { Seo } from '@/components/seo/Seo';
import { PageHero } from '@/components/sections/PageHero';
import { FaqSection } from '@/components/sections/FaqSection';
import { CtaBand } from '@/components/sections/CtaBand';
import { faqs } from '@/data/faq';
import { faqSchema, organizationSchema, breadcrumbSchema } from '@/lib/schema';

export default function Faq() {
  return (
    <>
      <Seo
        title="Frequently Asked Questions"
        description="Fees, enrolment, class sizes, equipment, certification and careers — everything prospective students ask before joining ISLII Barista School in Nairobi."
        path="/faq"
        jsonLd={[
          organizationSchema(),
          // Drives the expandable Q&A that can appear directly in Google results.
          faqSchema(faqs),
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'FAQ', path: '/faq' },
          ]),
        ]}
      />

      <PageHero
        eyebrow="Answers"
        title="Ask us anything."
        lead="The questions we get most, answered properly. If yours isn't here, message us on WhatsApp — a real person replies, usually within the hour."
        photo="cupsOverheadCircle"
        crumb="FAQ"
      />

      <FaqSection tone="light" />

      <CtaBand
        title="Question answered? Good."
        lead="Send us your details and we'll come back with fees, the next intake date, and which programme actually suits where you're starting from."
      />
    </>
  );
}

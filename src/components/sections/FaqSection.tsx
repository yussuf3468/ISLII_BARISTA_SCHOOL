import { Accordion } from '@/components/ui/Accordion';
import { Section } from '@/components/ui/Section';
import { Button } from '@/components/ui/Button';
import { Reveal } from '@/components/ui/Reveal';
import { WhatsAppGlyph } from '@/components/ui/Glyphs';
import { faqs } from '@/data/faq';
import { site, whatsappLink } from '@/config/site';

/**
 * FAQ block. Used twice — a trimmed six-question version on the home page and
 * the complete set on /faq — from one component, so the two can't diverge.
 */
export function FaqSection({
  /** Cap the number shown. Omit for all of them. */
  limit,
  showAllLink = false,
  tone = 'light',
}: {
  limit?: number;
  showAllLink?: boolean;
  tone?: 'light' | 'cream';
}) {
  const items = limit ? faqs.slice(0, limit) : faqs;

  return (
    <Section
      tone={tone}
      eyebrow="Questions"
      title={
        <>
          Everything you need to know
          <span className="block text-coffee-400">before you enrol.</span>
        </>
      }
      lead="Still unsure after reading these? Message us on WhatsApp — a real person answers, usually within the hour."
      aside={
        showAllLink ? (
          <Button to="/faq" variant="outline" withArrow>
            All Questions
          </Button>
        ) : undefined
      }
    >
      <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-8">
          <Accordion
            items={items.map((faq) => ({ question: faq.question, answer: faq.answer }))}
          />
        </div>

        {/* Sticky helper panel — keeps a contact route visible for the whole
            length of the accordion, which is where questions actually arise. */}
        <aside className="lg:col-span-4">
          <Reveal>
            <div className="sticky top-32 rounded-sm border border-coffee-400/20 bg-cream-50 p-8">
              <h3 className="font-display text-2xl leading-snug text-espresso-950">
                Still have a question?
              </h3>
              <p className="mt-4 font-sans text-[0.9375rem] leading-relaxed text-coffee-500">
                Tell us your experience level and what you want to do with it. We will point you at
                the right programme — even if that turns out not to be one of ours.
              </p>

              <div className="mt-7 space-y-3">
                <Button
                  href={whatsappLink()}
                  variant="ink"
                  fullWidth
                  icon={<WhatsAppGlyph className="size-4" />}
                >
                  Ask on WhatsApp
                </Button>
                <Button href={site.phone.href} variant="outline" fullWidth>
                  {site.phone.display}
                </Button>
              </div>
            </div>
          </Reveal>
        </aside>
      </div>
    </Section>
  );
}

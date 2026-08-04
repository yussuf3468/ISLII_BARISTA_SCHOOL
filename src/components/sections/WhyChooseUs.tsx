import { Section } from '@/components/ui/Section';
import { RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { Button } from '@/components/ui/Button';
import { features } from '@/data/features';
import { cn } from '@/lib/utils';

/**
 * "Why choose us", built as a hairline grid rather than seven floating cards.
 *
 * Boxed cards with shadows are the default look of every template on earth.
 * A single ruled grid — where the dividers belong to the layout instead of to
 * each item — reads as editorial, and it's what makes this section feel
 * designed rather than assembled.
 *
 * Seven items divide badly into three columns, so the last is promoted to a
 * full-width row carrying the section's call to action. That turns an awkward
 * orphan into the strongest element on the grid.
 */
export function WhyChooseUs() {
  const gridFeatures = features.slice(0, 6);
  const wideFeature = features[6];

  return (
    <Section
      tone="cream"
      eyebrow="Why ISLII"
      title={
        <>
          Seven reasons students choose us
          <span className="block text-coffee-400">over everywhere else.</span>
        </>
      }
      lead="Anyone can rent a machine and call it a school. These are the things that decide whether you actually leave employable."
    >
      <RevealGroup
        stagger={0.07}
        className="grid border-l border-t border-coffee-400/18 sm:grid-cols-2 lg:grid-cols-3"
      >
        {gridFeatures.map(({ Icon, title, description }, i) => (
          <RevealItem
            key={title}
            className="group relative border-b border-r border-coffee-400/18 p-8 transition-colors duration-500 hover:bg-linen md:p-10"
          >
            {/* Index numeral, faint until hover. */}
            <span
              aria-hidden="true"
              className="absolute right-7 top-7 font-display text-sm text-coffee-400/30 transition-colors duration-500 group-hover:text-gold-500/70 tabular"
            >
              {String(i + 1).padStart(2, '0')}
            </span>

            <span
              aria-hidden="true"
              className="inline-grid size-12 place-items-center rounded-full bg-espresso-950 text-gold-500 transition-transform duration-500 ease-luxe group-hover:-translate-y-1 motion-reduce:group-hover:translate-y-0"
            >
              <Icon className="size-5" strokeWidth={1.5} />
            </span>

            <h3 className="mt-7 font-display text-xl leading-snug text-espresso-950">{title}</h3>

            <p className="mt-3.5 font-sans text-[0.9375rem] leading-relaxed text-coffee-500">
              {description}
            </p>
          </RevealItem>
        ))}

        {/* Full-width finisher */}
        {wideFeature && (
          <RevealItem
            className={cn(
              'border-b border-r border-coffee-400/18 bg-espresso-950 p-8 md:p-12',
              'sm:col-span-2 lg:col-span-3',
              'on-dark grain relative overflow-hidden',
            )}
          >
            <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-6">
                <span
                  aria-hidden="true"
                  className="inline-grid size-12 shrink-0 place-items-center rounded-full bg-gold-500 text-espresso-950"
                >
                  <wideFeature.Icon className="size-5" strokeWidth={1.5} />
                </span>

                <div>
                  <h3 className="font-display text-2xl leading-snug text-cream-50 md:text-3xl">
                    {wideFeature.title}
                  </h3>
                  <p className="mt-3 max-w-2xl font-sans text-[0.9375rem] leading-relaxed text-cream-200/65">
                    {wideFeature.description}
                  </p>
                </div>
              </div>

              <Button to="/contact#enrol" variant="gold" size="lg" magnetic withArrow className="shrink-0">
                Reserve Your Place
              </Button>
            </div>
          </RevealItem>
        )}
      </RevealGroup>
    </Section>
  );
}

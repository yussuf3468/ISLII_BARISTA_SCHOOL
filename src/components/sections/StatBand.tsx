import { Counter } from '@/components/ui/Counter';
import { RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { Container } from '@/components/ui/Section';
import { stats } from '@/data/stats';

/**
 * The credibility band, placed immediately under the hero.
 *
 * Position is the point: a visitor who has just been told they can become
 * world-class needs evidence in the very next scroll, before scepticism sets in.
 *
 * Hairline dividers rather than boxed cards — four floating cards here would
 * read as a dashboard, not a statement.
 */
export function StatBand() {
  return (
    <section
      aria-label="ISLII Barista School by the numbers"
      className="on-dark grain relative border-t border-cream-50/8 bg-espresso-900 py-16 md:py-20"
    >
      <Container>
        <RevealGroup
          stagger={0.1}
          className="grid grid-cols-2 gap-x-6 gap-y-12 lg:grid-cols-4 lg:gap-x-0"
        >
          {stats.map((stat, i) => (
            <RevealItem
              key={stat.label}
              className={
                // Vertical hairlines between columns on wide screens only —
                // on a 2-up mobile grid they'd cut the layout awkwardly.
                i > 0 ? 'lg:border-l lg:border-cream-50/10 lg:pl-10' : 'lg:pr-10'
              }
            >
              <p className="font-display text-[clamp(2.75rem,1.5rem+3.4vw,4.5rem)] leading-none text-gold-500">
                <Counter to={stat.value} suffix={stat.suffix} />
              </p>

              <p className="mt-4 font-sans text-sm font-medium uppercase tracking-[0.16em] text-cream-50">
                {stat.label}
              </p>

              <p className="mt-2 max-w-[22ch] font-sans text-[0.8125rem] leading-relaxed text-cream-200/50">
                {stat.detail}
              </p>
            </RevealItem>
          ))}
        </RevealGroup>
      </Container>
    </section>
  );
}

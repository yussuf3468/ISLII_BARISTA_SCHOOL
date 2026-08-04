import { Marquee } from '@/components/ui/Marquee';

/**
 * Every skill a graduate leaves with, as an endless ticker.
 *
 * This does a specific job: the list is long and impressive, but as a bulleted
 * column it would read as a syllabus dump and get skipped. Moving it turns the
 * same information into a texture the eye follows — and quietly communicates
 * breadth without asking anyone to read all fourteen items.
 */

const skills = [
  'Professional Barista Skills',
  'Espresso Preparation',
  'Latte Art',
  'Milk Steaming',
  'Coffee Brewing',
  'Coffee Bean Knowledge',
  'Mocktails & Mojitos',
  'Fresh Juice Preparation',
  'Smoothies',
  'Milkshakes',
  'Bubble Tea',
  'Tea Preparation',
  'Café Customer Service',
  'Coffee Shop Management',
  'Hospitality Skills',
] as const;

function BeanMark() {
  return (
    <span aria-hidden="true" className="mx-8 shrink-0 md:mx-12">
      <svg viewBox="0 0 24 24" className="size-3 text-gold-500/60" fill="none">
        <ellipse
          cx="12"
          cy="12"
          rx="5"
          ry="7.4"
          transform="rotate(-38 12 12)"
          fill="currentColor"
        />
        <path
          d="M12 5.4c-2 2.8-2 10.4 0 13.2"
          transform="rotate(-38 12 12)"
          stroke="#f7f1e6"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

export function SkillsMarquee() {
  return (
    <section
      aria-label="Skills taught at ISLII Barista School"
      className="border-y border-coffee-400/15 bg-cream-50 py-7 md:py-9"
    >
      <Marquee duration={64}>
        {skills.map((skill) => (
          <span key={skill} className="flex shrink-0 items-center">
            <span className="whitespace-nowrap font-display text-lg text-espresso-800/85 md:text-2xl">
              {skill}
            </span>
            <BeanMark />
          </span>
        ))}
      </Marquee>
    </section>
  );
}

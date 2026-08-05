import { site } from '@/config/site';
import { courses } from '@/data/courses';

export interface Stat {
  value: number;
  suffix?: string;
  label: string;
  /** The line that turns a number into a claim. */
  detail: string;
}

/**
 * The credibility band.
 *
 * ── Why there is no graduation or employment rate here ─────────────────────
 * There used to be: 98% graduation and 92% employment. Both were OUR drafts —
 * plausible-looking numbers written to show the design working, never measured
 * by anyone. They have been removed rather than left for the school to confirm.
 *
 * A published statistic is a claim a business has to be able to defend. These
 * two would have been read by prospective students deciding where to spend
 * real money, and neither had a source. Marking them `TODO_CLIENT` protected
 * the developer, not the reader — the site could still have gone live with
 * them intact, and the person harmed would have been a student who enrolled on
 * the strength of a number nobody ever calculated.
 *
 * If the school starts tracking either figure, add it back with the cohort and
 * period it was measured over. Until then the band says only things that are
 * true, and it is not weaker for it.
 *
 * "Years of experience" was dropped for a different reason: ISLII opened in
 * 2024, and a young school advertising "1 Year" argues against itself — where
 * 500+ students trained inside that same year says the identical thing far
 * more persuasively.
 */
export const stats: readonly Stat[] = [
  {
    value: site.stats.studentsTrained,
    suffix: '+',
    label: 'Students Trained',
    detail: 'Graduates working across Nairobi and beyond',
  },
  {
    value: courses.length,
    label: 'Programmes',
    detail: 'Across coffee, beverage, pastry and bakery',
  },
  {
    // True by construction, not by assertion: every certificate this school
    // issues carries a QR that resolves to a public verification page, and an
    // employer can check it in seconds. Most schools cannot say this.
    value: 100,
    suffix: '%',
    label: 'Verifiable Certificates',
    detail: 'Every certificate carries a QR an employer can check',
  },
] as const;

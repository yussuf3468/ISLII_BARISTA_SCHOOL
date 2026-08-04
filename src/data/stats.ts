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
 * "Years of experience" was deliberately dropped from this set. ISLII opened in
 * 2024, and a young school advertising "1 Year" is arguing against itself —
 * whereas 500+ students trained inside that same year is genuinely impressive
 * and says the identical thing far more persuasively.
 *
 * ⚠️  TODO_CLIENT — graduation and employment rates are OUR drafts, not measured
 *     figures. Published statistics are a claim the business has to be able to
 *     stand behind, so please confirm or correct both before launch. Students
 *     trained (500+) is your own figure and the programme count is derived from
 *     the catalogue, so those two are safe.
 */
export const stats: readonly Stat[] = [
  {
    value: site.stats.studentsTrained,
    suffix: '+',
    label: 'Students Trained',
    detail: 'Graduates working across Nairobi and beyond',
  },
  {
    value: site.stats.graduationRate,
    suffix: '%',
    label: 'Graduation Rate',
    detail: 'Assessed on practical competence, not attendance',
  },
  {
    value: site.stats.employmentRate,
    suffix: '%',
    label: 'Employment Rate',
    detail: 'Hired or self-employed after certification',
  },
  {
    value: courses.length,
    label: 'Programmes',
    detail: 'Across coffee, beverage, pastry and bakery',
  },
] as const;

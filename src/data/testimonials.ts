/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  TESTIMONIALS
 * ─────────────────────────────────────────────────────────────────────────────
 *  `testimonials` is EMPTY, and the section does not render until it is filled.
 *  That is the intended shipping state, not an oversight.
 *
 *  The quotes below are ours. They were written so the design could be built
 *  and reviewed against realistic copy, and they are attributed to people who
 *  do not exist. Publishing invented testimonials misleads someone choosing
 *  where to spend real money on their training, and in many jurisdictions —
 *  Kenya's Consumer Protection Act among them — it is also unlawful. A
 *  `TODO_CLIENT` comment would not have stopped the site going live with them.
 *
 *  So they are kept as DRAFT_EXAMPLES: a format guide and a length reference,
 *  wired to nothing. Move real, permissioned quotes into `testimonials` and the
 *  section appears with no other change.
 *
 *  ── What to collect ───────────────────────────────────────────────────────
 *  · The quote, in the graduate's own words, with their written permission
 *  · Their name (a first name and initial is fine)
 *  · Where they are NOW — "Barista, café in Westlands" is the proof point that
 *    makes a quote persuasive; without it a quote is just praise
 *  · Which programme they completed
 *  · Optionally a portrait: set `photo` and the card renders it instead of the
 *    monogram, no component changes needed
 *
 *  ── A deliberate design decision ──────────────────────────────────────────
 *  The cards are typographic, using a gold monogram rather than a portrait.
 *  With real graduates they should absolutely have photography. But attaching
 *  stock portraits of real, identifiable people to invented quotes and invented
 *  names is the one shortcut on this build that could genuinely cause harm.
 *  Monograms read as considered editorial restraint, so the design loses
 *  nothing while it waits for the real thing.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { PhotoKey } from '@/lib/images';

export interface Testimonial {
  quote: string;
  name: string;
  /** Where they are now — the proof point that makes the quote persuasive. */
  role: string;
  /** Which programme they completed. */
  course: string;
  /** Optional graduate portrait. Drop one in and the card renders it instead
   *  of the monogram — no component changes needed. */
  photo?: PhotoKey;
}

const DRAFT_EXAMPLES: readonly Testimonial[] = [
  {
    quote:
      'I came in able to make coffee and left able to run a bar. The difference was the pressure — by week four they had us on timed service and I stopped panicking. I was hired two weeks after my certificate.',
    name: 'Amina W.',
    role: 'Barista, specialty café in Westlands',
    course: 'Full Barista Course',
  },
  {
    quote:
      'My shots were inconsistent for two years and nobody could tell me why. A few weeks here and I finally understood what I was actually adjusting. That alone changed how I work every day.',
    name: 'Brian O.',
    role: 'Head Barista, Nairobi CBD',
    course: 'Barista Course',
  },
  {
    quote:
      'I opened my own place eight months after finishing. Taking all three parts meant I could build the whole menu myself — coffee, cold drinks and boba — instead of guessing at two thirds of it.',
    name: 'Grace M.',
    role: 'Owner, independent café',
    course: 'Full Barista Course',
  },
  {
    quote:
      'I added mocktails and shakes to our menu the week I got back. Afternoons used to be dead. They are now our second busiest hours.',
    name: 'Halima A.',
    role: 'Supervisor, café and juice bar',
    course: 'Mixology Course',
  },
  {
    quote:
      'I had tried to learn latte art from videos for a year. In five days with someone correcting my milk in real time, I was pouring rosettas I would actually serve.',
    name: 'Kelvin N.',
    role: 'Barista, hotel group',
    course: 'Barista Course',
  },
  {
    quote:
      'The boba course paid for itself in about a month. I came with a kiosk idea and left with costed recipes I could put on a menu the same week.',
    name: 'Faith K.',
    role: 'Founder, bubble tea kiosk',
    course: 'Boba Course',
  },
  {
    quote:
      'Small class, constant machine time, and trainers who correct you properly instead of being polite about it. That is what made it worth the money.',
    name: 'Daniel M.',
    role: 'Barista, coffee roastery',
    course: 'Full Barista Course',
  },
] as const;

/**
 * Real, permissioned graduate testimonials. Empty until the school supplies
 * them; `<Testimonials>` returns null while it is, so the page simply flows
 * from the courses straight to the call to action.
 */
export const testimonials: readonly Testimonial[] = [];

// Referenced so the drafts are not dropped by tree-shaking or flagged as dead
// code — they are documentation for whoever fills the array above.
export const TESTIMONIAL_DRAFT_COUNT = DRAFT_EXAMPLES.length;

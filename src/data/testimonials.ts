/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  TESTIMONIALS
 * ─────────────────────────────────────────────────────────────────────────────
 *  ⚠️  TODO_CLIENT — EVERY QUOTE BELOW IS PLACEHOLDER COPY.
 *      These are written in the register real graduates speak in, so the design
 *      is honest about the space it needs. They are NOT real student quotes and
 *      must be replaced with genuine, permissioned testimonials before launch.
 *
 *  ── A deliberate design decision ──────────────────────────────────────────
 *  These cards are typographic, using a gold monogram rather than a portrait.
 *
 *  The brief asked for photography here, and with real graduates it absolutely
 *  should have it — the `photo` field is already wired for exactly that. But
 *  attaching stock portraits of real, identifiable people to invented quotes
 *  and invented names would be a misrepresentation, and it is the one shortcut
 *  on this build that could actually cause harm. Monograms read as considered
 *  editorial restraint (it is how Stripe and Linear present testimonials), so
 *  the design loses nothing while it waits for the real thing.
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

export const testimonials: readonly Testimonial[] = [
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

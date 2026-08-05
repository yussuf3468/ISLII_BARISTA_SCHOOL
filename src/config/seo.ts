import { site } from './site';
import { courses } from '@/data/courses';
import { photoSrc } from '@/lib/images';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Per-route SEO metadata — one source of truth.
 * ─────────────────────────────────────────────────────────────────────────────
 *  These strings used to live inline in each page component, which was fine
 *  while the browser was the only thing reading them. It stopped being fine the
 *  moment the site needed PRERENDERING.
 *
 *  `<Seo>` writes tags with JavaScript, and social scrapers do not run
 *  JavaScript. Facebook, WhatsApp, LinkedIn, X and Slack fetch the raw HTML and
 *  read what is there — which, for an SPA, is one identical `index.html` for
 *  every URL. Every shared link therefore produced the same card, or none.
 *  For a school whose enquiries arrive over WhatsApp, that is the difference
 *  between a link that sells a course and a link that looks like spam.
 *
 *  `scripts/prerender.mjs` now bakes a real, correct `<head>` into a static
 *  file per route at build time. It reads THIS module, so the tags a scraper
 *  sees and the tags React writes can never drift apart.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface PageSeo {
  title: string;
  description: string;
  path: string;
  image?: string;
}

/** Every statically-known route. Order is the crawl priority we want. */
export const PAGE_SEO = {
  home: {
    title: `${site.name} — Become a World-Class Barista | Nairobi, Kenya`,
    description: site.description,
    path: '/',
  },
  courses: {
    title: 'Barista, Beverage & Pastry Courses in Nairobi',
    description:
      'Professional training in Nairobi: the Full Barista & Beverage Course covering coffee, ' +
      'mixology and boba, plus two Pastry & Bakery classes. Hands-on, small groups, practical ' +
      'certification.',
    path: '/courses',
  },
  about: {
    title: "About Us — Nairobi's Professional Coffee Academy",
    description:
      `${site.name} trains baristas to international standards in Nairobi. Small classes, ` +
      'commercial equipment, practical assessment, and career support that continues after ' +
      'graduation.',
    path: '/about',
  },
  gallery: {
    title: 'Gallery — Inside The School',
    description:
      'Espresso, latte art, brewing, bubble tea, milkshakes, tea and training at ' +
      `${site.name} in Nairobi. See what the coursework actually looks like.`,
    path: '/gallery',
  },
  faq: {
    title: 'Frequently Asked Questions',
    description:
      'Fees, enrolment, class sizes, equipment, certification and careers — everything ' +
      `prospective students ask before joining ${site.name} in Nairobi.`,
    path: '/faq',
  },
  contact: {
    title: 'Contact & Enrol',
    description:
      `Enrol at ${site.name} in Nairobi. Call ${site.phone.display}, message us on WhatsApp, ` +
      'or send an enquiry and we will reply with fees and the next intake dates.',
    path: '/contact',
  },
  verify: {
    title: 'Verify a Certificate',
    description:
      `Confirm that an ${site.name} certificate is genuine. Enter the certificate number and ` +
      'the graduate’s surname, or scan the QR code printed on the certificate itself.',
    path: '/verify',
  },
  notFound: {
    title: 'Page Not Found',
    description:
      "That page doesn't exist. Browse our barista courses, gallery or contact us to enrol.",
    path: '/404',
  },
} as const satisfies Record<string, PageSeo>;

/**
 * A course page's metadata.
 *
 * The share image is the course's own photograph rather than the site-wide
 * card. On a channel where the picture is most of the click, sending the same
 * generic image for six different programmes wastes the strongest signal the
 * link has.
 */
export function courseSeo(course: (typeof courses)[number]): PageSeo {
  return {
    title: `${course.title} — ${course.duration}`,
    description: course.overview.slice(0, 300),
    path: `/courses/${course.slug}`,
    // 1200×630 is the card size every platform crops to.
    image: photoSrc(course.photo, { width: 1200, ratio: 1200 / 630 }),
  };
}

/** Every URL the prerenderer should emit. Consumed by scripts/prerender.mjs. */
export function allRoutes(): PageSeo[] {
  return [
    PAGE_SEO.home,
    PAGE_SEO.courses,
    ...courses.map(courseSeo),
    PAGE_SEO.about,
    PAGE_SEO.gallery,
    PAGE_SEO.faq,
    PAGE_SEO.contact,
    PAGE_SEO.verify,
  ];
}

import { site, absoluteUrl } from '@/config/site';
import type { Course } from '@/data/courses';
import type { FaqItem } from '@/data/faq';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  JSON-LD STRUCTURED DATA
 * ─────────────────────────────────────────────────────────────────────────────
 *  Everything here is generated from `config/site.ts` and the content files, so
 *  the structured data can never drift out of sync with the visible page —
 *  which is both a maintenance win and exactly what Google checks for.
 *
 *  Courses that carry a published brochure fee emit a full `offers` node with
 *  a real price — which is what makes a course eligible to show its fee
 *  directly in search results. Courses without a separately published fee emit
 *  no offer at all, rather than an Offer with a fabricated or empty price
 *  (invalid markup at best, a misrepresentation at worst).
 * ─────────────────────────────────────────────────────────────────────────────
 */

type JsonLd = Record<string, unknown>;

const ORG_ID = `${site.url}/#organization`;
const WEBSITE_ID = `${site.url}/#website`;

/**
 * Only include social profiles that actually exist. `site.social` is `as const`,
 * so its values are string literals — widened here before filtering, otherwise
 * a `url is string` predicate is narrower than its own parameter type.
 */
function socialProfiles(): string[] {
  return (Object.values(site.social) as string[]).filter((url) => url.length > 0);
}

function postalAddress(): JsonLd {
  return {
    '@type': 'PostalAddress',
    streetAddress: site.address.street,
    addressLocality: site.address.locality,
    addressRegion: site.address.region,
    postalCode: site.address.postalCode,
    addressCountry: site.address.countryCode,
  };
}

/**
 * The school itself. Typed as BOTH an EducationalOrganization and a
 * LocalBusiness: the first is what it is, the second is what makes it eligible
 * for the local pack on searches like "barista school near me".
 */
export function organizationSchema(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': ['EducationalOrganization', 'LocalBusiness'],
    '@id': ORG_ID,
    name: site.name,
    legalName: site.legalName,
    alternateName: 'ISLII Barista Academy',
    description: site.description,
    url: site.url,
    telephone: `+${site.phone.e164}`,
    email: site.email.display,
    foundingDate: String(site.foundingYear),
    logo: {
      '@type': 'ImageObject',
      url: absoluteUrl('/favicon.svg'),
      caption: site.name,
    },
    image: absoluteUrl('/og-image.jpg'),
    address: postalAddress(),
    geo: {
      '@type': 'GeoCoordinates',
      latitude: site.address.geo.latitude,
      longitude: site.address.geo.longitude,
    },
    areaServed: {
      '@type': 'City',
      name: site.address.locality,
    },
    openingHoursSpecification: site.hours.map((slot) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: slot.days,
      opens: slot.opens,
      closes: slot.closes,
    })),
    sameAs: socialProfiles(),
    knowsAbout: [
      'Barista training',
      'Espresso preparation',
      'Latte art',
      'Coffee brewing',
      'Milk steaming',
      'Coffee bean knowledge',
      'Café operations',
      'Bubble tea preparation',
      'Tea brewing',
      'Hospitality training',
    ],
  };
}

export function websiteSchema(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: site.url,
    name: site.name,
    description: site.description,
    inLanguage: site.language,
    publisher: { '@id': ORG_ID },
  };
}

/**
 * Convert a human duration ("4 Weeks", "6 Days") into an ISO-8601 duration,
 * which is the only format `courseWorkload` accepts.
 */
function toIsoDuration(duration: string): string | undefined {
  const match = /^(\d+)\s*(week|day|month|hour)s?$/i.exec(duration.trim());
  if (!match) return undefined;

  const amount = match[1];
  const unit = match[2]?.toLowerCase();

  switch (unit) {
    case 'week':
      return `P${amount}W`;
    case 'day':
      return `P${amount}D`;
    case 'month':
      return `P${amount}M`;
    case 'hour':
      return `PT${amount}H`;
    default:
      return undefined;
  }
}

export function courseSchema(course: Course): JsonLd {
  const workload = toIsoDuration(course.duration);

  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    '@id': absoluteUrl(`/courses/${course.slug}#course`),
    name: course.title,
    description: course.overview,
    url: absoluteUrl(`/courses/${course.slug}`),
    inLanguage: site.language,
    educationalLevel: course.level,
    teaches: course.outcomes,
    coursePrerequisites:
      course.level === 'Beginner' || course.level === 'Beginner → Professional'
        ? 'No prior experience required.'
        : 'Some existing barista or café experience is recommended.',
    occupationalCredentialAwarded: course.certification,
    provider: { '@id': ORG_ID },
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: 'Onsite',
      ...(workload ? { courseWorkload: workload } : {}),
      location: {
        '@type': 'Place',
        name: site.name,
        address: postalAddress(),
      },
    },
    // Only emitted when fees are published on the site. Advertising a price in
    // structured data that the page itself does not show is a mismatch Google
    // treats as a violation — and it would leak a figure the client has chosen
    // to keep to a conversation.
    ...(site.showPrices && course.priceKes
      ? {
          offers: {
            '@type': 'Offer',
            price: course.priceKes,
            priceCurrency: 'KES',
            category: 'Paid',
            availability: 'https://schema.org/InStock',
            url: absoluteUrl(`/courses/${course.slug}`),
          },
        }
      : {}),
  };
}

/** An ItemList of every course — used on the /courses index. */
export function courseListSchema(courses: readonly Course[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Courses at ${site.name}`,
    numberOfItems: courses.length,
    itemListElement: courses.map((course, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: course.title,
      url: absoluteUrl(`/courses/${course.slug}`),
    })),
  };
}

export function faqSchema(items: readonly FaqItem[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

export function breadcrumbSchema(trail: readonly { name: string; path: string }[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

/** Marks a page as the site's contact point. */
export function contactPageSchema(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: `Contact ${site.name}`,
    url: absoluteUrl('/contact'),
    mainEntity: {
      '@id': ORG_ID,
    },
  };
}

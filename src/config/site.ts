/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  ISLII BARISTA SCHOOL — SINGLE SOURCE OF TRUTH
 * ─────────────────────────────────────────────────────────────────────────────
 *  Every business-critical detail lives here and ONLY here. No component, page,
 *  schema or meta tag hardcodes a phone number, address or URL. Change a value
 *  in this file and it propagates across the entire site, sitemap and
 *  structured data.
 *
 *  ⚠️  ITEMS MARKED `TODO_CLIENT` ARE PLACEHOLDERS AWAITING REAL VALUES.
 *      Search the codebase for "TODO_CLIENT" before going live.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * ONE number for everything — calls, WhatsApp and the enquiry form all route
 * here. Raw digits, no spaces or plus, so it can be dropped straight into both
 * `tel:` and `wa.me/` links.
 */
const PHONE_E164 = "254746487878";

export const site = {
  /* ── Identity ────────────────────────────────────────────────────────── */
  name: "ISLII BARISTA SCHOOL",
  shortName: "ISLII",
  legalName: "ISLII Barista School",
  tagline: "Become a World-Class Barista",
  /** Used in <title> suffix and schema. Keep under 60 chars total with page title. */
  titleSuffix: "ISLII Barista School · Nairobi",
  description:
    "Kenya's premier professional barista academy. Master espresso, latte art, brewing, bubble tea and café operations with hands-on training built to international standards. Graduate job-ready.",
  url: "https://isliibarista.com",
  locale: "en_KE",
  language: "en",
  foundingYear: 2024,

  /**
   * Course fees are NOT shown anywhere on the site — that is a deliberate
   * commercial decision, not an oversight. Every price question is routed into
   * a WhatsApp conversation instead, which converts far better for training at
   * this value and keeps the site correct when fees change.
   *
   * Flip this to `true` and the brochure fees already stored in
   * `data/courses.ts` appear on the cards, the detail pages, the comparison
   * table and the Course structured data. Nothing else needs editing.
   */
  showPrices: false,

  /* ── Contact ─────────────────────────────────────────────────────────── */
  phone: {
    /** Human-readable, used in visible copy. */
    display: "+254 746 487 878",
    /** tel: href */
    href: `tel:+${PHONE_E164}`,
    /** E.164 without the plus — used for both tel: and wa.me links. */
    e164: PHONE_E164,
  },

  email: {
    display: "isliibaristaschool@gmail.com",
    href: "mailto:isliibaristaschool@gmail.com",
  },

  /**
   * Confirmed from the school's Google Business listing.
   *
   * `geo` was derived from the listing's Plus Code `PRHW+9V5` (full code
   * `6GCRPRHW+9V5`), which is exact to about 3 metres — considerably better
   * than a street name alone, since Major Muriithi Street runs for some
   * distance. `mapQuery` uses the same coordinates rather than the street
   * name, so the pin lands on the building and not on the middle of the road.
   *
   * `postalCode` is intentionally empty: nobody supplied one, and inventing a
   * plausible Eastleigh code would put a wrong value into the LocalBusiness
   * structured data that Google reads. The field is optional there.
   */
  address: {
    street: "Major Muriithi Street",
    neighbourhood: "Eastleigh",
    locality: "Nairobi",
    region: "Nairobi County",
    postalCode: "",
    country: "Kenya",
    countryCode: "KE",
    /** Full one-line address for display + schema. */
    full: "Major Muriithi Street, Eastleigh, Nairobi, Kenya",
    /** Google Maps Plus Code from the business listing. */
    plusCode: "PRHW+9V5",
    /** Coordinates, URL-encoded — the most precise thing to point a map at. */
    mapQuery: "-1.271612,36.847234",
    geo: { latitude: -1.271612, longitude: 36.847234 },
  },

  /** Opening hours — drives both the Contact page and LocalBusiness schema.
   *  Confirmed by the school: weekdays only, 9am to 10pm. Weekends closed. */
  hours: [
    {
      days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "09:00",
      closes: "22:00",
    },
  ] as const,
  hoursDisplay: [
    { label: "Monday — Friday", value: "9:00 AM — 10:00 PM" },
    { label: "Saturday & Sunday", value: "Closed" },
  ],

  /* ── Social ──────────────────────────────────────────────────────────── */
  social: {
    tiktok: "https://www.tiktok.com/@isliibaristaschool",
    /** TODO_CLIENT — add real handles, or leave empty to hide the icon. */
    instagram: "",
    facebook: "",
  },

  /* ── Conversion ──────────────────────────────────────────────────────── */
  /** Default message pre-filled when someone taps a bare WhatsApp button. */
  whatsappDefaultMessage:
    "Hello ISLII Barista School — I'd like to know more about your training programmes and fees.",

  /* ── Credibility figures (surfaced in the animated stat band) ─────────── */
  stats: {
    /** Confirmed by the school. */
    studentsTrained: 500,
    // `graduationRate` and `employmentRate` used to live here at 98% and 92%.
    // Both were invented for the design and neither was ever measured, so they
    // were removed rather than shipped behind a TODO. See src/data/stats.ts.
  },
} as const;

export type Site = typeof site;

/* ─────────────────────────────────────────────────────────────────────────
   Derived helpers — keep link construction in one place.
   ───────────────────────────────────────────────────────────────────────── */

/** Build a WhatsApp deep link with a pre-filled, URL-encoded message. */
export function whatsappLink(
  message: string = site.whatsappDefaultMessage,
): string {
  return `https://wa.me/${site.phone.e164}?text=${encodeURIComponent(message)}`;
}

/** Format a KES figure the way Kenyan price lists do: "KES 35,000". */
export function formatKes(amount: number): string {
  return `KES ${new Intl.NumberFormat("en-KE").format(amount)}`;
}

/** Absolute URL for canonical tags, OG images and sitemap entries. */
export function absoluteUrl(pathname: string): string {
  const clean = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${site.url}${clean === "/" ? "" : clean.replace(/\/$/, "")}`;
}

/** Google Maps embed src (keyless — no API key or billing required). */
export const mapEmbedSrc = `https://www.google.com/maps?q=${site.address.mapQuery}&output=embed`;

/** "Open in Google Maps" link for the directions button. */
export const mapDirectionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${site.address.mapQuery}`;

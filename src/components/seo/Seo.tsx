import { useLayoutEffect } from 'react';
import { site, absoluteUrl } from '@/config/site';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  SEO — dependency-free document head manager.
 * ─────────────────────────────────────────────────────────────────────────────
 *  Deliberately not `react-helmet-async`: that library is unmaintained against
 *  modern React and ships a context provider we don't need for a site with one
 *  <Seo> per route. This is ~80 lines, fully typed, and has zero peer-dep risk.
 *
 *  Every tag it creates is stamped with `data-seo` so cleanup is exact — it can
 *  never leak tags between route changes or fight with tags in index.html.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface SeoProps {
  /** Page-specific title. The site name is appended automatically. */
  title: string;
  description?: string;
  /** Route path, e.g. "/courses". Drives the canonical URL and og:url. */
  path: string;
  /** Absolute or root-relative social share image. */
  image?: string;
  type?: 'website' | 'article' | 'profile';
  noindex?: boolean;
  /** JSON-LD blocks injected as <script type="application/ld+json">. */
  jsonLd?: Array<Record<string, unknown>>;
}

const MANAGED = 'data-seo';
const DEFAULT_OG_IMAGE = '/og-image.jpg';

function upsertMeta(attr: 'name' | 'property', key: string, content: string): void {
  const el = document.createElement('meta');
  el.setAttribute(attr, key);
  el.setAttribute('content', content);
  el.setAttribute(MANAGED, '');
  document.head.appendChild(el);
}

function upsertLink(rel: string, href: string): void {
  const el = document.createElement('link');
  el.setAttribute('rel', rel);
  el.setAttribute('href', href);
  el.setAttribute(MANAGED, '');
  document.head.appendChild(el);
}

export function Seo({
  title,
  description = site.description,
  path,
  image = DEFAULT_OG_IMAGE,
  type = 'website',
  noindex = false,
  jsonLd = [],
}: SeoProps): null {
  useLayoutEffect(() => {
    // Titles read best as "Specific Thing — Brand". Home passes its own full
    // title and opts out of the suffix by including the brand already.
    const fullTitle = title.includes(site.shortName) ? title : `${title} — ${site.titleSuffix}`;
    const canonical = absoluteUrl(path);
    const imageUrl = image.startsWith('http') ? image : absoluteUrl(image);

    document.title = fullTitle;

    // Clear anything a previous route left behind.
    document.head.querySelectorAll(`[${MANAGED}]`).forEach((n) => n.remove());

    /* ── Core ─────────────────────────────────────────────────────────── */
    upsertMeta('name', 'description', description);
    upsertLink('canonical', canonical);
    if (noindex) {
      upsertMeta('name', 'robots', 'noindex, nofollow');
    } else {
      upsertMeta('name', 'robots', 'index, follow, max-image-preview:large, max-snippet:-1');
    }

    /* ── Open Graph ───────────────────────────────────────────────────── */
    upsertMeta('property', 'og:site_name', site.name);
    upsertMeta('property', 'og:title', fullTitle);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:type', type);
    upsertMeta('property', 'og:url', canonical);
    upsertMeta('property', 'og:image', imageUrl);
    upsertMeta('property', 'og:image:width', '1200');
    upsertMeta('property', 'og:image:height', '630');
    upsertMeta('property', 'og:image:alt', `${site.name} — ${site.tagline}`);
    upsertMeta('property', 'og:locale', site.locale);

    /* ── Twitter / X ──────────────────────────────────────────────────── */
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', fullTitle);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', imageUrl);
    upsertMeta('name', 'twitter:image:alt', `${site.name} — ${site.tagline}`);

    /* ── Geo (helps local pack relevance for "barista school Nairobi") ── */
    upsertMeta('name', 'geo.region', 'KE-30');
    upsertMeta('name', 'geo.placename', site.address.locality);
    upsertMeta(
      'name',
      'geo.position',
      `${site.address.geo.latitude};${site.address.geo.longitude}`,
    );

    /* ── Structured data ──────────────────────────────────────────────── */
    for (const block of jsonLd) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute(MANAGED, '');
      script.textContent = JSON.stringify(block);
      document.head.appendChild(script);
    }

    return () => {
      document.head.querySelectorAll(`[${MANAGED}]`).forEach((n) => n.remove());
    };
    // `jsonLd` is an inline array at every call site; serialising it keeps the
    // effect from re-running on every render without forcing callers to memo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, path, image, type, noindex, JSON.stringify(jsonLd)]);

  return null;
}

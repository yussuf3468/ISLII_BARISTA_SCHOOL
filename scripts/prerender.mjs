/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Post-build prerenderer — a real <head> per URL.
 * ─────────────────────────────────────────────────────────────────────────────
 *  THE PROBLEM
 *
 *  This is a single-page app: the server hands out one identical `index.html`
 *  for every URL, and React fills in the title, description and Open Graph tags
 *  once it boots. Browsers are fine with that. Social scrapers are not — they
 *  fetch the raw HTML and never execute JavaScript.
 *
 *  So before this script existed, pasting ANY page of this site into WhatsApp,
 *  Facebook, LinkedIn, X or Slack produced the same card, built from whatever
 *  was hard-coded in index.html. Six different courses shared as one generic
 *  link. For a school in Kenya, where enquiries arrive over WhatsApp more than
 *  anywhere else, that is the most expensive line of missing markup on the site.
 *
 *  THE FIX
 *
 *  For each known route, write a static file with the correct <head> baked in.
 *  The app still hydrates and takes over; the difference is only visible to
 *  something that reads HTML without running it — which is exactly the audience
 *  that was being failed.
 *
 *  No headless browser is involved. Metadata comes from `src/config/seo.ts`,
 *  the same module the React components read, so the two cannot drift.
 *
 *  HOSTING NOTE: this emits `dist/courses/barista-course/index.html`. Every
 *  static host serves that for `/courses/barista-course` automatically, and
 *  falls back to the SPA for anything not prerendered.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { build } from 'esbuild';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');

/** Bundle the TS config to a temp ESM file so Node can import it. */
async function loadConfig() {
  const tmp = join(ROOT, 'node_modules', '.seo-config.mjs');
  await build({
    entryPoints: [join(ROOT, 'src/config/seo.ts')],
    outfile: tmp,
    bundle: true,
    format: 'esm',
    platform: 'node',
    logLevel: 'silent',
    // Mirror the alias in vite.config.ts.
    alias: { '@': join(ROOT, 'src') },
  });
  const mod = await import(pathToFileURL(tmp).href + `?t=${Date.now()}`);
  await rm(tmp, { force: true });
  return mod;
}

const escape = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function headFor({ title, description, path, image }, site) {
  const canonical = new URL(path, site.url).href;
  const img = image
    ? new URL(image, site.url).href
    : new URL('/og-image.jpg', site.url).href;
  const full = title.includes(site.shortName) ? title : `${title} — ${site.titleSuffix}`;

  return [
    `<title>${escape(full)}</title>`,
    `<meta name="description" content="${escape(description)}" />`,
    `<link rel="canonical" href="${escape(canonical)}" />`,
    `<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />`,
    `<meta property="og:site_name" content="${escape(site.name)}" />`,
    `<meta property="og:title" content="${escape(full)}" />`,
    `<meta property="og:description" content="${escape(description)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:url" content="${escape(canonical)}" />`,
    `<meta property="og:image" content="${escape(img)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${escape(site.name)} — ${escape(site.tagline)}" />`,
    `<meta property="og:locale" content="${escape(site.locale)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escape(full)}" />`,
    `<meta name="twitter:description" content="${escape(description)}" />`,
    `<meta name="twitter:image" content="${escape(img)}" />`,
  ].join('\n    ');
}

const { PAGE_SEO, allRoutes } = await loadConfig();
const { site } = await (async () => {
  const tmp = join(ROOT, 'node_modules', '.site-config.mjs');
  await build({
    entryPoints: [join(ROOT, 'src/config/site.ts')],
    outfile: tmp, bundle: true, format: 'esm', platform: 'node', logLevel: 'silent',
    alias: { '@': join(ROOT, 'src') },
  });
  const m = await import(pathToFileURL(tmp).href + `?t=${Date.now()}`);
  await rm(tmp, { force: true });
  return m;
})();

const template = await readFile(join(DIST, 'index.html'), 'utf8');

// The placeholder title/description in index.html are replaced, not appended —
// two <title> tags is a mess and scrapers pick unpredictably.
const STRIP = /\s*<title>[\s\S]*?<\/title>|\s*<meta\s+name="description"[\s\S]*?\/>/g;

let count = 0;
for (const route of allRoutes()) {
  const head = headFor(route, site);
  const html = template.replace(STRIP, '').replace('</head>', `  ${head}\n  </head>`);

  const outDir = route.path === '/' ? DIST : join(DIST, route.path);
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, 'index.html'), html, 'utf8');
  count += 1;
}

// The 404 gets the same treatment but must never be indexed.
{
  const head = headFor(PAGE_SEO.notFound, site).replace(
    'content="index, follow, max-image-preview:large, max-snippet:-1"',
    'content="noindex, follow"',
  );
  const html = template.replace(STRIP, '').replace('</head>', `  ${head}\n  </head>`);
  await writeFile(join(DIST, '404.html'), html, 'utf8');
}

console.log(`prerendered ${count} routes + 404.html`);

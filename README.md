# ISLII BARISTA SCHOOL — Website

Production website for ISLII Barista School, Nairobi.
React 18 · TypeScript · Vite 6 · Tailwind CSS v4 · Framer Motion 11.

```bash
npm install
npm run dev        # dev server
npm run build      # typecheck + production build → dist/
npm run preview    # serve dist/ locally
npm run typecheck  # types only
```

---

## ⚠️ Before you go live

Everything below is a real value that needs confirming. Search the codebase for
`TODO_CLIENT` to find them all in context.

| # | Item | Where | Status |
|---|------|-------|--------|
| 1 | **Street address** | `src/config/site.ts` → `address` | Placeholder — currently "Nairobi CBD". Drives the Google Map, the Contact page and LocalBusiness schema. Add the exact address **and** the lat/lng (right-click the pin in Google Maps → copy coordinates). |
| 2 | **Graduation / employment rates** | `src/config/site.ts` → `stats` | 98% and 92% are **our drafts, not measured figures**. Published statistics are a claim you have to be able to stand behind. Confirm, correct, or tell us to remove them. |
| 3 | **Testimonials** | `src/data/testimonials.ts` | Every quote is **placeholder copy**. Replace with real, permissioned quotes before launch. |
| 4 | **Standalone course fees** | `src/data/courses.ts` | The brochures price the Full Course + the two Pastry classes. If Barista / Mixology / Boba can be booked separately, send fees + durations. |
| 5 | **"Chantilly Butter"** | `src/data/courses.ts` → Class Two menu | The brochure reads "Chande / Chanade Butter". Confirm the correct name. |
| 6 | **Mojito / Piña Colada** | `src/data/courses.ts` | Written as the **non-alcoholic** café versions. Say the word if that's wrong. |
| 7 | **Instagram / Facebook** | `src/config/site.ts` → `social` | Empty, so the icons are hidden. Add URLs and they appear automatically. |

Confirmed and already live: email `isliibaristaschool@gmail.com`, one number for
both calls and WhatsApp (`+254 746 487 878`), TikTok, 500+ students, opened
2024, and all six programmes with brochure durations.

---

## Everything is driven from four files

There is no CMS, so content lives in typed data files. Editing one of these
updates every page, menu, sitemap entry and structured-data block that uses it.

| File | Controls |
|------|----------|
| `src/config/site.ts` | Name, phone, WhatsApp, email, address, hours, social, stats, price toggle |
| `src/config/navigation.ts` | Header, footer and mobile menus, plus sitemap routes |
| `src/data/courses.ts` | The whole catalogue: cards, detail pages, footer list, enquiry dropdown, Course schema |
| `src/data/faq.ts` · `gallery.ts` · `testimonials.ts` · `features.ts` | FAQ (+ FAQ rich results), gallery, quotes, "why us" |

### Course fees are hidden by design

`site.showPrices` is `false`. The real brochure fees are already stored in
`src/data/courses.ts` (KES 35,000 / 30,000 / 20,000) — they simply are not
rendered, so every price question becomes a WhatsApp conversation instead of a
bounce. Flip that one flag to `true` and fees appear on the cards, detail pages,
comparison table **and** in the Course structured data, all at once.

---

## Photography

### Your own photos

15 originals were supplied. They are optimised into **WebP at six widths**
(400–2000px) in `public/images/islii/`, so a phone downloads roughly 35 KB
instead of 3.5 MB — a 51 MB → 15 MB reduction overall.

The camera originals are preserved in **`media-originals/`**, deliberately
*outside* `public/` so they are never shipped to a browser.

> One photo (`IMG_1990`) was dropped: it is a near-identical frame to
> `IMG_1989` — same uniform, same pose — and side by side in the graduate wall
> it read as a duplicate. 10 distinct portraits remain, ordered so no two
> similar-looking shots sit next to each other.

**To add more photos:** drop the originals in `media-originals/`, re-run the
optimiser, then add an entry to `PHOTOS` in `src/lib/images.ts` with
`kind: 'islii'`.

### Stock photography

Craft and product shots (espresso pours, latte art, boba, pastry) use licensed
Unsplash imagery via their CDN until ISLII has its own. Every one was visually
reviewed before its alt text was written. Replace any of them by changing that
entry in `src/lib/images.ts` from `kind: 'unsplash'` to `kind: 'islii'` — no
component changes needed.

---

## Deployment

The build output in `dist/` is a static site. **It is a single-page app**, so
the host must serve `index.html` for unknown paths, or a hard refresh on
`/courses/boba-course` returns a 404.

- **Netlify** — add `public/_redirects` containing `/*  /index.html  200`
- **Vercel** — auto-detected, no config needed
- **Apache** — `.htaccess` with `FallbackResource /index.html`
- **Nginx** — `try_files $uri $uri/ /index.html;`

`sitemap.xml` is generated at build time from the real routes and courses (see
the plugin in `vite.config.ts`), so it can never drift out of sync.

---

## Packaging this for the client

Zip **the project folder without `node_modules/`** — it's ~300 MB of
reinstallable dependencies. `npm install` rebuilds it from `package-lock.json`.

```bash
# from the parent folder
zip -r islii-website.zip Website -x "Website/node_modules/*" "Website/dist/*"
```

`media-originals/` (~51 MB of the school's camera originals) is worth keeping in
the archive — it's their own photography, and it's the source for regenerating
image derivatives. Exclude it if you'd rather keep the zip small; nothing in the
build depends on it.

If you're handing over the **built site** rather than the source, ship `dist/`
on its own and read the Deployment section above.

---

## Responsive behaviour

Verified by rendering at **320, 390, 768, 1024, 1440, 1920, 2560 and 3440px**
and measuring real overflow at each — not by eyeballing a browser resize.

- **320px (iPhone SE)** is the floor. The display type bottoms out at 40px so
  "World-Class" clears the 280px of usable width with room to spare.
- **Ultra-wide (1920 / 2560 / 3440)** gets two extra breakpoints beyond
  Tailwind's `2xl`: `3xl` (1920px) and `4xl` (2560px). Containers, the gallery
  column count, the header height, the lightbox and the hero's text measure all
  step up, so a 4K display doesn't get a laptop layout stranded in the middle
  of an empty screen.
- The **fluid type scale interpolates between 380px and 1920px** rather than
  stopping at 1536px, so headlines keep growing on large displays.
- Horizontal overflow is **zero at every width tested**, and `overflow-x: clip`
  on both `html` and `body` guarantees the page can never be dragged sideways.

### Why the layout no longer twitches

Four separate causes, all fixed:

1. **`scrollbar-gutter: stable`** — navigating from a long page to a short one
   used to remove the scrollbar, widening the viewport ~15px and jerking every
   centred element sideways. On every route change.
2. **`svh` instead of `dvh`** — `dvh` re-measures as a mobile browser's address
   bar collapses, so the hero visibly resized while you scrolled it. `svh` is
   fixed to the smallest viewport and never changes.
3. **No page-exit animation** — `AnimatePresence mode="wait"` kept the old route
   mounted while it faded, briefly emptying `<main>`; the footer jumped up and
   back down each time. Routes now mount immediately and fade in.
4. **Self-hosted fonts, preloaded** — text no longer reflows when Fraunces
   swaps in after a third-party round trip.

> Scroll-locking (mobile menu, lightbox) is applied to `<html>`, not `<body>`.
> A browser only propagates `<body>`'s overflow to the viewport while `<html>`'s
> own overflow is `visible` — and ours is `clip`, so locking the body would have
> silently stopped working.

---

## Notes on how it's built

- **Design tokens** live in `src/styles/globals.css` under `@theme`. Colour,
  the fluid type scale, easing and spacing all come from there — no component
  hardcodes a hex value.
- **Motion language** is centralised in `src/lib/motion.ts`: one easing curve,
  one set of durations, one stagger rhythm, so the whole site moves with a
  single hand. Reveals fire once and never re-animate on scroll-back.
- **Accessibility** is structural, not bolted on: real semantic elements
  everywhere, a skip link, focus trapping in the menu and lightbox, keyboard
  operation throughout, `prefers-reduced-motion` respected in both CSS and
  Framer Motion, and alt text written from actually looking at each photograph.
- **Performance**: route-level code splitting (zod + react-hook-form only load
  on Contact), responsive `srcset` on every image, blur-up placeholders using
  each photo's true average colour, self-hosted preloaded fonts, and zero
  layout shift.
- **Fonts** are self-hosted variable WOFF2 in `public/fonts/`, declared in
  `src/styles/fonts.css`. No request ever leaves for Google.

---

Built by **Lenzro Software Solutions**.

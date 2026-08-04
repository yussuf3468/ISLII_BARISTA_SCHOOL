/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  IMAGE REGISTRY
 * ─────────────────────────────────────────────────────────────────────────────
 *  Two kinds of photograph live here, behind one identical API:
 *
 *  · `islii`    — REAL ISLII photography supplied by the school. Optimised into
 *                 WebP derivatives at six widths (see /public/images/islii).
 *                 The 51 MB of camera originals are preserved in
 *                 /media-originals and are deliberately NOT inside /public,
 *                 so they never ship to the browser.
 *
 *  · `unsplash` — Licensed stock, used ONLY for craft/product shots ISLII has
 *                 not photographed yet (espresso pours, latte art, boba,
 *                 shakes). Every one was visually reviewed before its alt text
 *                 was written. Replace these as real shots arrive.
 *
 *  `alt` describes what is genuinely in the frame. For the real photographs of
 *  ISLII students, alt text is deliberately written to identify the SETTING and
 *  ACTIVITY, never the individual's appearance — these are real, identifiable
 *  people, and describing them physically in metadata would be both poor alt
 *  practice and a privacy overreach.
 *
 *  `tone` is each photo's true sampled average colour, painted behind the
 *  <img> so loading reads as a soft tonal fade instead of a white flash.
 * ─────────────────────────────────────────────────────────────────────────────
 */

interface BasePhoto {
  readonly alt: string;
  readonly tone: string;
  /** Native aspect ratio (width / height). */
  readonly ar: number;
}

interface UnsplashPhoto extends BasePhoto {
  readonly kind: 'unsplash';
  /** Unsplash photo id (the part after `photo-`). */
  readonly id: string;
}

interface IsliiPhoto extends BasePhoto {
  readonly kind: 'islii';
  /** Basename in /public/images/islii, without width suffix or extension. */
  readonly slug: string;
}

export type PhotoDef = UnsplashPhoto | IsliiPhoto;

/** Width ladder generated for the school's own photography. */
const ISLII_WIDTHS = [400, 640, 900, 1200, 1600, 2000] as const;

/** Width ladder requested from the Unsplash CDN. */
const CDN_WIDTHS = [480, 768, 1024, 1440, 1920, 2560] as const;

export const PHOTOS = {
  /* ═══════════════════════════════════════════════════════════════════════
     REAL ISLII PHOTOGRAPHY
     ═══════════════════════════════════════════════════════════════════════ */

  studentsTasting: {
    kind: 'islii',
    slug: 'students-tasting',
    alt: 'Three ISLII students in school aprons presenting the cappuccinos they have just made',
    tone: '#5b534c',
    ar: 0.5625,
  },
  classGroup: {
    kind: 'islii',
    slug: 'class-group',
    alt: 'An ISLII Barista School class photographed together with their trainer at the school',
    tone: '#83716a',
    ar: 1.7778,
  },
  classroomOne: {
    kind: 'islii',
    slug: 'classroom-01',
    alt: 'ISLII students seated at desks during a theory session beneath the school crest',
    tone: '#7e7963',
    ar: 0.5625,
  },
  classroomTwo: {
    kind: 'islii',
    slug: 'classroom-02',
    alt: 'A full ISLII classroom during a training session',
    tone: '#70636a',
    ar: 0.5625,
  },

  /* Graduate portraits — taken at the school's certification backdrop. */
  graduate01: {
    kind: 'islii',
    slug: 'graduate-01',
    alt: 'An ISLII Barista School graduate in school uniform at the certification backdrop',
    tone: '#85796e',
    ar: 0.5625,
  },
  graduate02: {
    kind: 'islii',
    slug: 'graduate-02',
    alt: 'An ISLII Barista School graduate in school uniform at the certification backdrop',
    tone: '#7e736f',
    ar: 0.5625,
  },
  graduate03: {
    kind: 'islii',
    slug: 'graduate-03',
    alt: 'An ISLII Barista School graduate in school uniform at the certification backdrop',
    tone: '#847667',
    ar: 0.5625,
  },
  // NOTE: `graduate-04` (IMG_1990) was removed deliberately. It is a near
  // identical frame to graduate03 — same uniform, same pose, same crop — and
  // sitting next to it in the portrait wall it read as a duplicate.
  graduate05: {
    kind: 'islii',
    slug: 'graduate-05',
    alt: 'An ISLII Barista School graduate in school uniform at the certification backdrop',
    tone: '#716562',
    ar: 0.5625,
  },
  graduate06: {
    kind: 'islii',
    slug: 'graduate-06',
    alt: 'An ISLII Barista School graduate in school uniform at the certification backdrop',
    tone: '#72655d',
    ar: 0.5625,
  },
  graduate07: {
    kind: 'islii',
    slug: 'graduate-07',
    alt: 'An ISLII Barista School graduate in school uniform at the certification backdrop',
    tone: '#877971',
    ar: 0.5625,
  },
  graduate08: {
    kind: 'islii',
    slug: 'graduate-08',
    alt: 'An ISLII Barista School graduate in school uniform at the certification backdrop',
    tone: '#9c8b8a',
    ar: 0.5625,
  },
  graduate09: {
    kind: 'islii',
    slug: 'graduate-09',
    alt: 'An ISLII Barista School graduate in school uniform at the certification backdrop',
    tone: '#897b72',
    ar: 0.5625,
  },
  graduate10: {
    kind: 'islii',
    slug: 'graduate-10',
    alt: 'An ISLII Barista School graduate in school uniform at the certification backdrop',
    tone: '#71635c',
    ar: 0.5625,
  },
  graduate11: {
    kind: 'islii',
    slug: 'graduate-11',
    alt: 'An ISLII Barista School graduate in school uniform at the certification backdrop',
    tone: '#716459',
    ar: 0.5625,
  },

  /* ═══════════════════════════════════════════════════════════════════════
     STOCK — craft and product shots awaiting ISLII's own photography
     ═══════════════════════════════════════════════════════════════════════ */

  /* ── Coffee & beans ─────────────────────────────────────────────────── */
  beansTexture: {
    kind: 'unsplash',
    id: '1447933601403-0c6688de566e',
    alt: 'Freshly roasted coffee beans filling the frame',
    tone: '#33221a',
    ar: 1.31,
  },
  beansSack: {
    kind: 'unsplash',
    id: '1524350876685-274059332603',
    alt: 'Roasted coffee beans spilling from a burlap sack',
    tone: '#37302d',
    ar: 1.49,
  },
  beansBowlWhite: {
    kind: 'unsplash',
    id: '1587734195503-904fca47e0e9',
    alt: 'A white bowl of roasted coffee beans on a pale surface, seen from above',
    tone: '#7a736e',
    ar: 0.75,
  },
  mugSteamBeansDark: {
    kind: 'unsplash',
    id: '1610632380989-680fe40816c6',
    alt: 'Steam rising from a white mug set among roasted coffee beans',
    tone: '#19110d',
    ar: 0.67,
  },
  icedCoffee: {
    kind: 'unsplash',
    id: '1461023058943-07fcbe16d735',
    alt: 'A tall glass of iced coffee with milk swirling through it',
    tone: '#685b4d',
    ar: 1.49,
  },
  icedLatte: {
    kind: 'unsplash',
    id: '1517701550927-30cf4ba1dba5',
    alt: 'An iced latte in a tall glass with espresso swirling through the milk',
    tone: '#71563d',
    ar: 0.67,
  },

  /* ── Espresso ───────────────────────────────────────────────────────── */
  espressoOverheadDark: {
    kind: 'unsplash',
    id: '1509785307050-d4066910ec1e',
    alt: 'An espresso shot surrounded by ground coffee and whole beans on dark wood',
    tone: '#391d12',
    ar: 1.25,
  },
  espressoSunlight: {
    kind: 'unsplash',
    id: '1559496417-e7f25cb247f3',
    alt: 'An espresso in a glass cup lit by sunlight falling through leaves',
    tone: '#a4a8a1',
    ar: 0.8,
  },
  portafilterOverhead: {
    kind: 'unsplash',
    id: '1511920170033-f8396924c348',
    alt: 'Two portafilters filled with ground coffee and beans beside a finished latte',
    tone: '#71706e',
    ar: 0.67,
  },
  blackCoffeeDark: {
    kind: 'unsplash',
    id: '1504630083234-14187a9df0f5',
    alt: 'A cup of black coffee on a white saucer against a dark background',
    tone: '#656665',
    ar: 1.49,
  },

  /* ── Latte art & milk ───────────────────────────────────────────────── */
  latteArtPour: {
    kind: 'unsplash',
    id: '1541167760496-1628856ab772',
    alt: 'A barista pouring steamed milk to finish a latte-art rosetta',
    tone: '#6f645c',
    ar: 1.78,
  },
  cappuccinoRosetta: {
    kind: 'unsplash',
    id: '1503481766315-7a586b20f66d',
    alt: 'A cappuccino poured with a rosetta latte-art pattern, seen from above',
    tone: '#52433a',
    ar: 1.45,
  },
  latteOnBeans: {
    kind: 'unsplash',
    id: '1512568400610-62da28bc8a13',
    alt: 'A cup of latte art resting on a bed of roasted coffee beans',
    tone: '#422d1f',
    ar: 0.67,
  },
  cappuccinoBlue: {
    kind: 'unsplash',
    id: '1485808191679-5f86510681a2',
    alt: 'A cappuccino with latte art served on a pale blue saucer',
    tone: '#45453d',
    ar: 0.67,
  },
  twoLattesOverhead: {
    kind: 'unsplash',
    id: '1509042239860-f550ce710b93',
    alt: 'Two cappuccinos with latte art on a dark table beside potted herbs',
    tone: '#605a4c',
    ar: 0.67,
  },
  latteBaristaBehind: {
    kind: 'unsplash',
    id: '1534778101976-62847782c213',
    alt: 'A finished latte on a saucer with a barista at work behind it',
    tone: '#5e5142',
    ar: 0.67,
  },
  cupsOverheadCircle: {
    kind: 'unsplash',
    id: '1498804103079-a6351b050096',
    alt: 'Coffee cups arranged in a circle on a wooden table, seen from above',
    tone: '#776d62',
    ar: 0.67,
  },

  /* ── Brewing ────────────────────────────────────────────────────────── */
  pourOverDark: {
    kind: 'unsplash',
    id: '1442512595331-e89e73853f31',
    alt: 'A barista pouring from a gooseneck kettle into a pour-over brewer',
    tone: '#414444',
    ar: 1.49,
  },
  frenchPress: {
    kind: 'unsplash',
    id: '1519082274554-1ca37fb8abb7',
    alt: 'A French press full of freshly brewed coffee on weathered wood',
    tone: '#5c5757',
    ar: 1.49,
  },

  /* ── Boba ───────────────────────────────────────────────────────────── */
  bubbleTea: {
    kind: 'unsplash',
    id: '1558857563-b371033873b8',
    alt: 'A tall cup of milk bubble tea with tapioca pearls settled at the base',
    tone: '#9b7f4d',
    ar: 0.67,
  },
  teaCupPalm: {
    kind: 'unsplash',
    id: '1597318181409-cf64d0b5d8a2',
    alt: 'A white cup of tea on a wooden coaster beside a palm leaf',
    tone: '#bab1a4',
    ar: 1.49,
  },
  teaBags: {
    kind: 'unsplash',
    id: '1576092768241-dec231879fc3',
    alt: 'A glass of brewed tea beside loose tea bags on linen',
    tone: '#4c473e',
    ar: 0.67,
  },
  icedTeaLime: {
    kind: 'unsplash',
    id: '1556679343-c7306c1976bc',
    alt: 'A tall glass of iced tea with lime on a dark wooden board',
    tone: '#241b14',
    ar: 0.8,
  },

  /* ── Mixology: mocktails, shakes, juices, smoothies ─────────────────── */
  juicesJars: {
    kind: 'unsplash',
    id: '1622597467836-f3285f2131b8',
    alt: 'A row of fresh juices and smoothies in glass jars with paper straws',
    tone: '#4d3e24',
    ar: 1.78,
  },
  mocktailsColour: {
    kind: 'unsplash',
    id: '1544145945-f90425340c7e',
    alt: 'Brightly coloured layered mocktails garnished with citrus against a yellow backdrop',
    tone: '#8a6f2a',
    ar: 0.67,
  },
  mocktailPour: {
    kind: 'unsplash',
    id: '1470337458703-46ad1756a187',
    alt: 'A drink being strained over ice into a glass and finished with an orange garnish',
    tone: '#6b5432',
    ar: 1.49,
  },
  chocolateMilkshake: {
    kind: 'unsplash',
    id: '1572490122747-3968b75cc699',
    alt: 'A chocolate milkshake topped with whipped cream and a cookie',
    tone: '#765f56',
    ar: 0.67,
  },
  berrySmoothies: {
    kind: 'unsplash',
    id: '1553530666-ba11a7da3888',
    alt: 'Two berry smoothies garnished with fresh fruit and mint',
    tone: '#786c6e',
    ar: 0.67,
  },
  mangoSmoothie: {
    kind: 'unsplash',
    id: '1525385133512-2f3bdd039054',
    alt: 'A glass of thick mango smoothie beside fresh fruit',
    tone: '#bda98a',
    ar: 0.66,
  },
  layeredSmoothies: {
    kind: 'unsplash',
    id: '1505252585461-04db1eb84625',
    alt: 'Layered fruit smoothies in tall glasses against a teal backdrop',
    tone: '#818688',
    ar: 0.7,
  },
  orangeJuiceOranges: {
    kind: 'unsplash',
    id: '1613478223719-2ab802602423',
    alt: 'A glass of fresh orange juice beside halved oranges on a board',
    tone: '#4b360f',
    ar: 1.33,
  },
  orangeJuiceBar: {
    kind: 'unsplash',
    id: '1600271886742-f049cd451bba',
    alt: 'A glass of fresh orange juice with a straw on a café bar',
    tone: '#5c4728',
    ar: 0.67,
  },

  /* ── Café environment ───────────────────────────────────────────────── */
  cafeInteriorMachine: {
    kind: 'unsplash',
    id: '1453614512568-c4024d13c247',
    alt: 'A café counter with an espresso machine beneath hanging filament lights',
    tone: '#625b57',
    ar: 1.78,
  },
  cafeInteriorPlants: {
    kind: 'unsplash',
    id: '1554118811-1e0d58224f24',
    alt: 'A bright café dining room filled with plants and natural light',
    tone: '#595853',
    ar: 1.45,
  },
  cafeInteriorModern: {
    kind: 'unsplash',
    id: '1521017432531-fbd92d768814',
    alt: 'A modern café interior with timber tables and shelves of supplies',
    tone: '#565956',
    ar: 1.49,
  },
  cafeWindowFrenchPress: {
    kind: 'unsplash',
    id: '1445116572660-236099ec97a0',
    alt: 'A café window table set with a French press and surrounded by plants',
    tone: '#79746e',
    ar: 1.49,
  },
  cafeStreet: {
    kind: 'unsplash',
    id: '1559925393-8be0ec4767c8',
    alt: 'A street-side café terrace with awnings and chalkboard menus',
    tone: '#674f42',
    ar: 1.49,
  },
  customerServicePos: {
    kind: 'unsplash',
    id: '1556742049-0cfed4f6a45d',
    alt: 'A café worker serving a customer at the counter with a card reader',
    tone: '#8c817a',
    ar: 1.49,
  },

  /* ── Pastry & Bakery ────────────────────────────────────────────────── */
  pastryChocolateCake: {
    kind: 'unsplash',
    id: '1578985545062-69928b1d9587',
    alt: 'A chocolate drip layer cake finished with piped rosettes on a cake stand',
    tone: '#7f6d5f',
    ar: 1.36,
  },
  pastryTiramisu: {
    kind: 'unsplash',
    id: '1571115177098-24ec42ed204d',
    alt: 'A slice of tiramisu dusted with cocoa beside the whole dessert',
    tone: '#8a7568',
    ar: 0.67,
  },
  pastryCinnamonRolls: {
    kind: 'unsplash',
    id: '1509365465985-25d11c17e812',
    alt: 'A tray of freshly baked cinnamon rolls seen from above',
    tone: '#675853',
    ar: 0.75,
  },
  pastryCookies: {
    kind: 'unsplash',
    id: '1558961363-fa8fdf82db35',
    alt: 'Chocolate chip cookies in a bowl lined with baking paper',
    tone: '#382d24',
    ar: 0.8,
  },
  pastryCroissants: {
    kind: 'unsplash',
    id: '1555507036-ab1f4038808a',
    alt: 'Croissants being dusted with icing sugar against a dark background',
    tone: '#3a322c',
    ar: 1.25,
  },
  pastryCupcakes: {
    kind: 'unsplash',
    id: '1550617931-e17a7b70dce2',
    alt: 'Chocolate cupcakes finished with piped swirls of buttercream',
    tone: '#8e7f73',
    ar: 1.49,
  },
  pastryBerryCake: {
    kind: 'unsplash',
    id: '1565958011703-44f9829ba187',
    alt: 'A slice of layered sponge cake topped with fresh raspberries',
    tone: '#4f463f',
    ar: 0.8,
  },
  pastryIceCreamCake: {
    kind: 'unsplash',
    id: '1621303837174-89787a7d4729',
    alt: 'A decorated celebration cake finished with a cone and sprinkles on a stand',
    tone: '#a89792',
    ar: 0.75,
  },
  bakeryBread: {
    kind: 'unsplash',
    id: '1509440159596-0249088772ff',
    alt: 'Rustic seeded bread loaves on a dark floured surface with wheat ears',
    tone: '#544b45',
    ar: 1.49,
  },
  bakeryDoughHands: {
    kind: 'unsplash',
    id: '1517686469429-8bdb88b9f907',
    alt: 'Hands kneading dough on a floured worktop beside a rolling pin',
    tone: '#806f67',
    ar: 1.49,
  },
} as const satisfies Record<string, PhotoDef>;

export type PhotoKey = keyof typeof PHOTOS;

/**
 * Real ISLII graduate portraits.
 *
 * The order is deliberately interleaved rather than sequential: shot in one
 * session against one backdrop, portraits of students in similar uniform read
 * as repeats when they sit side by side. Alternating them keeps the wall
 * feeling like a cohort instead of a contact sheet.
 */
export const GRADUATE_PORTRAITS = [
  'graduate01',
  'graduate03',
  'graduate06',
  'graduate02',
  'graduate09',
  'graduate05',
  'graduate10',
  'graduate07',
  'graduate11',
  'graduate08',
] as const satisfies readonly PhotoKey[];

interface SrcOptions {
  /** Rendered width in CSS pixels at the largest breakpoint. */
  width?: number;
  /** Force a crop ratio (width / height) on CDN images. */
  ratio?: number;
  /** Image quality for CDN images. */
  quality?: number;
}

/** Nearest available derivative width for a locally hosted photo. */
function nearestIsliiWidth(target: number): number {
  return (
    ISLII_WIDTHS.find((w) => w >= target) ?? ISLII_WIDTHS[ISLII_WIDTHS.length - 1]!
  );
}

/** Build a single URL for a photograph at a given width. */
export function photoSrc(key: PhotoKey, options: SrcOptions = {}): string {
  const photo = PHOTOS[key] as PhotoDef;
  const { width = 1600, ratio, quality = 72 } = options;

  if (photo.kind === 'islii') {
    return `/images/islii/${photo.slug}-${nearestIsliiWidth(width)}.webp`;
  }

  const params = new URLSearchParams({
    auto: 'format',
    fit: 'crop',
    q: String(quality),
    w: String(Math.round(width)),
  });
  if (ratio) params.set('h', String(Math.round(width / ratio)));

  return `https://images.unsplash.com/photo-${photo.id}?${params.toString()}`;
}

/** Build a responsive `srcset` across the appropriate width ladder. */
export function photoSrcSet(key: PhotoKey, options: Omit<SrcOptions, 'width'> = {}): string {
  const photo = PHOTOS[key] as PhotoDef;

  if (photo.kind === 'islii') {
    return ISLII_WIDTHS.map((w) => `/images/islii/${photo.slug}-${w}.webp ${w}w`).join(', ');
  }

  return CDN_WIDTHS.map((w) => `${photoSrc(key, { ...options, width: w })} ${w}w`).join(', ');
}

/** Everything a component needs to render one photograph, in one call. */
export function getPhoto(key: PhotoKey, options: SrcOptions = {}) {
  const photo = PHOTOS[key] as PhotoDef;
  return {
    src: photoSrc(key, options),
    srcSet: photoSrcSet(key, options),
    alt: photo.alt,
    tone: photo.tone,
    ratio: options.ratio ?? photo.ar,
    isLocal: photo.kind === 'islii',
  };
}

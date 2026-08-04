import type { PhotoKey } from '@/lib/images';

/**
 * Gallery manifest.
 *
 * Real ISLII photography leads — "Our Students" is the first category after
 * "All" because authentic photographs of actual graduates outsell stock craft
 * shots every time.
 *
 * Captions describe the TRAINING context rather than the photograph. The
 * literal description already lives in each photo's alt text (lib/images.ts),
 * so a caption saying "a cup of coffee" would be pure duplication.
 */

export const galleryCategories = [
  'All',
  'Our Students',
  'Barista',
  'Mixology',
  'Boba',
  'Pastry & Bakery',
  'The Café',
] as const;

export type GalleryCategory = (typeof galleryCategories)[number];

export interface GalleryItem {
  photo: PhotoKey;
  category: Exclude<GalleryCategory, 'All'>;
  caption: string;
}

export const galleryItems: readonly GalleryItem[] = [
  /* ── Our Students — REAL ISLII photography ──────────────────────────── */
  { photo: 'studentsTasting', category: 'Our Students', caption: 'Presenting the morning’s cappuccinos for assessment' },
  { photo: 'classGroup', category: 'Our Students', caption: 'A full intake with their trainer on certification day' },
  { photo: 'classroomOne', category: 'Our Students', caption: 'Theory session — extraction, ratios and costing' },
  { photo: 'classroomTwo', category: 'Our Students', caption: 'A full classroom mid-programme' },
  { photo: 'graduate01', category: 'Our Students', caption: 'Certified — ISLII Barista School' },
  { photo: 'graduate02', category: 'Our Students', caption: 'Certified — ISLII Barista School' },
  { photo: 'graduate03', category: 'Our Students', caption: 'Certified — ISLII Barista School' },
  { photo: 'graduate05', category: 'Our Students', caption: 'Certified — ISLII Barista School' },
  { photo: 'graduate06', category: 'Our Students', caption: 'Certified — ISLII Barista School' },
  { photo: 'graduate07', category: 'Our Students', caption: 'Certified — ISLII Barista School' },
  { photo: 'graduate08', category: 'Our Students', caption: 'Certified — ISLII Barista School' },
  { photo: 'graduate09', category: 'Our Students', caption: 'Certified — ISLII Barista School' },
  { photo: 'graduate10', category: 'Our Students', caption: 'Certified — ISLII Barista School' },
  { photo: 'graduate11', category: 'Our Students', caption: 'Certified — ISLII Barista School' },

  /* ── Barista ─────────────────────────────────────────────────────────── */
  { photo: 'latteArtPour', category: 'Barista', caption: 'The pour — where milk texture becomes visible' },
  { photo: 'cappuccinoRosetta', category: 'Barista', caption: 'Rosetta symmetry, poured to order' },
  { photo: 'latteOnBeans', category: 'Barista', caption: 'Contrast and crema integrity, judged side by side' },
  { photo: 'cappuccinoBlue', category: 'Barista', caption: 'Adapting the pour across different cup shapes' },
  { photo: 'twoLattesOverhead', category: 'Barista', caption: 'Back-to-back consistency practice' },
  { photo: 'latteBaristaBehind', category: 'Barista', caption: 'Finished to service standard on the pass' },
  { photo: 'espressoOverheadDark', category: 'Barista', caption: 'Dose, grind, yield — the three dials that decide everything' },
  { photo: 'portafilterOverhead', category: 'Barista', caption: 'Puck preparation, drilled until it is automatic' },
  { photo: 'espressoSunlight', category: 'Barista', caption: 'A balanced shot, assessed on taste before appearance' },
  { photo: 'blackCoffeeDark', category: 'Barista', caption: 'Service standard: the same drink, every single time' },
  { photo: 'pourOverDark', category: 'Barista', caption: 'Pour-over: bloom, pulse and pour discipline' },
  { photo: 'frenchPress', category: 'Barista', caption: 'Immersion brewing to a written recipe' },
  { photo: 'beansSack', category: 'Barista', caption: 'Origin, processing and freshness — from bag to bar' },
  { photo: 'beansTexture', category: 'Barista', caption: 'Reading roast colour and development' },
  { photo: 'beansBowlWhite', category: 'Barista', caption: 'Green-bean and roast assessment' },
  { photo: 'cupsOverheadCircle', category: 'Barista', caption: 'Structured cupping — training the palate' },
  { photo: 'icedLatte', category: 'Barista', caption: 'Iced latte layering practice' },
  { photo: 'icedCoffee', category: 'Barista', caption: 'Cold builds — dilution control is the whole skill' },
  { photo: 'mugSteamBeansDark', category: 'Barista', caption: 'Kenyan coffee, brewed the way it deserves' },

  /* ── Mixology ────────────────────────────────────────────────────────── */
  { photo: 'juicesJars', category: 'Mixology', caption: 'A costed cold menu, built from scratch' },
  { photo: 'mocktailsColour', category: 'Mixology', caption: 'Mocktail balance, layering and garnish craft' },
  { photo: 'mocktailPour', category: 'Mixology', caption: 'Straining, building and finishing over ice' },
  { photo: 'chocolateMilkshake', category: 'Mixology', caption: 'Thickness control, without separation' },
  { photo: 'berrySmoothies', category: 'Mixology', caption: 'Smoothie ratios built for texture and taste' },
  { photo: 'mangoSmoothie', category: 'Mixology', caption: 'Whole-fruit blending, Kenyan mango in season' },
  { photo: 'layeredSmoothies', category: 'Mixology', caption: 'Layering and presentation practice' },
  { photo: 'orangeJuiceOranges', category: 'Mixology', caption: 'Fresh extraction, colour and oxidation control' },
  { photo: 'orangeJuiceBar', category: 'Mixology', caption: 'Cold service on the pass' },

  /* ── Boba ────────────────────────────────────────────────────────────── */
  { photo: 'bubbleTea', category: 'Boba', caption: 'Pearl texture and tea-base balance' },
  { photo: 'teaCupPalm', category: 'Boba', caption: 'Temperature and steep time, matched to the leaf' },
  { photo: 'teaBags', category: 'Boba', caption: 'Leaf grades and structured tasting' },
  { photo: 'icedTeaLime', category: 'Boba', caption: 'Iced tea builds and fruit-tea bases' },

  /* ── Pastry & Bakery ─────────────────────────────────────────────────── */
  { photo: 'pastryChocolateCake', category: 'Pastry & Bakery', caption: 'Layering, filling and finishing a celebration cake' },
  { photo: 'pastryCinnamonRolls', category: 'Pastry & Bakery', caption: 'Enriched dough, proved and shaped by hand' },
  { photo: 'pastryTiramisu', category: 'Pastry & Bakery', caption: 'Tiramisu and short desserts — Class Two' },
  { photo: 'pastryBerryCake', category: 'Pastry & Bakery', caption: 'Sponge, cream and fruit — built to a set standard' },
  { photo: 'pastryCupcakes', category: 'Pastry & Bakery', caption: 'Piping consistency across a full tray' },
  { photo: 'pastryCookies', category: 'Pastry & Bakery', caption: 'Biscuits and cookies to consistent size and colour' },
  { photo: 'pastryCroissants', category: 'Pastry & Bakery', caption: 'Laminated pastry and finishing technique' },
  { photo: 'bakeryDoughHands', category: 'Pastry & Bakery', caption: 'Mixing, kneading and proving — where every bake starts' },
  { photo: 'bakeryBread', category: 'Pastry & Bakery', caption: 'Bread work on the Class One programme' },
  { photo: 'pastryIceCreamCake', category: 'Pastry & Bakery', caption: 'Occasion cakes finished for sale' },

  /* ── The Café ────────────────────────────────────────────────────────── */
  { photo: 'cafeInteriorMachine', category: 'The Café', caption: 'The bar our students train to run' },
  { photo: 'cafeInteriorModern', category: 'The Café', caption: 'Layout and workflow, studied as a discipline' },
  { photo: 'cafeInteriorPlants', category: 'The Café', caption: 'Front of house — the room guests actually remember' },
  { photo: 'customerServicePos', category: 'The Café', caption: 'Live service role-play and payment handling' },
  { photo: 'cafeWindowFrenchPress', category: 'The Café', caption: 'Brew-bar station setup' },
  { photo: 'cafeStreet', category: 'The Café', caption: 'Building a café that a street returns to' },
] as const;

/**
 * Home-page teaser selection. Deliberately front-loaded with real ISLII
 * photography so the first images a visitor sees are genuinely of the school.
 */
export const galleryHighlights: readonly PhotoKey[] = [
  'studentsTasting',
  'latteArtPour',
  'classGroup',
  'bubbleTea',
  'classroomOne',
  'juicesJars',
  'cappuccinoRosetta',
  'chocolateMilkshake',
] as const;

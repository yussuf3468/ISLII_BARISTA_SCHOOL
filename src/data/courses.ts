import type { PhotoKey } from '@/lib/images';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  COURSE CATALOGUE — transcribed from ISLII's own printed brochures
 * ─────────────────────────────────────────────────────────────────────────────
 *  Durations, fees and syllabus content below come directly from the school's
 *  course sheets, not from guesswork:
 *
 *    · Full Professional Barista & Beverage Course — 6 weeks — KES 35,000
 *    · ISLII Pastry & Bakery, Class One            — 1 month — KES 30,000
 *    · ISLII Pastry & Bakery, Class Two            — 2 weeks — KES 20,000
 *
 *  Barista, Mixology and Boba are the three disciplines that make up the Full
 *  Course. They are listed individually because students ask for them by name,
 *  but the brochure prices them only as the combined programme.
 *
 *  ── TWO THINGS TO CONFIRM ────────────────────────────────────────────────
 *  1. STANDALONE FEES — the brochures price the Full Course and the two Pastry
 *     classes only. If Barista / Mixology / Boba can be taken separately, send
 *     us those fees and durations and they drop straight into this file.
 *
 *  2. MOJITO, LEMONADE and PIÑA COLADA are written throughout as the
 *     café-style NON-ALCOHOLIC versions, which is the standard reading for a
 *     hospitality school. Say the word if any of them are alcoholic and the
 *     copy will be rewritten.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type CourseLevel = 'Beginner' | 'Beginner → Professional' | 'All Levels';

export type CourseDiscipline = 'Coffee & Beverage' | 'Pastry & Bakery';

export interface Course {
  /** URL segment: /courses/<slug> */
  slug: string;
  number: string;
  title: string;
  /** Shown above the title on detail pages, e.g. "ISLII Pastry & Bakery". */
  overline?: string;
  kicker: string;
  duration: string;
  level: CourseLevel;
  discipline: CourseDiscipline;
  format: string;
  /** Fee in KES. Omitted where the brochure does not quote one separately. */
  priceKes?: number;
  /** Shown instead of a fee when `priceKes` is absent. */
  priceNote?: string;
  overview: string;
  outcomes: readonly string[];
  modules: readonly { title: string; detail: string }[];
  /** For pastry classes: the full item list the student learns to produce. */
  menu?: readonly string[];
  certification: string;
  idealFor: string;
  photo: PhotoKey;
  featured?: boolean;
  isBundle?: boolean;
  includes?: readonly string[];
}

export const courses: readonly Course[] = [
  /* ═══════════════════════════════════════════════════════════════════════
     COFFEE & BEVERAGE
     ═══════════════════════════════════════════════════════════════════════ */
  {
    slug: 'full-barista-beverage-course',
    number: '01',
    title: 'Full Professional Barista & Beverage Course',
    kicker: 'Coffee, cold drinks and boba — the complete bar, in six weeks.',
    duration: '6 Weeks',
    level: 'Beginner → Professional',
    discipline: 'Coffee & Beverage',
    format: 'Full-time · Hands-on · Small group',
    priceKes: 35000,
    overview:
      'Our flagship programme, and the one most students take. It runs from the history of coffee and tea through bean processing, espresso machines and grinders, into latte art, and then across the entire cold menu — juices, milkshakes, smoothies, mojitos, lemonades, frappés, iced lattes and piña colada. You finish able to run a full drinks service on your own, not just the espresso machine.',
    outcomes: [
      'Operate and maintain different commercial espresso machines and grinders',
      'Pull consistent, balanced espresso and texture silk microfoam',
      'Free-pour clean latte art to order, at service speed',
      'Identify coffee and tea types, and explain the difference between every drink on the menu',
      'Build juices, milkshakes, smoothies, mojitos, lemonades, frappés and iced lattes to a written spec',
      'Prepare piña colada and other signature blended drinks',
      'Hold personal hygiene and workplace standards to commercial requirement',
    ],
    modules: [
      {
        title: 'History of Coffee & Tea',
        detail:
          'Where both plants came from, how they reached Kenya, and why origin still decides what ends up in the cup.',
      },
      {
        title: 'Coffee Bean Processing',
        detail:
          'Processing methods and roast development, then the equipment itself — using different espresso machines, and setting up and calibrating coffee grinders.',
      },
      {
        title: 'Latte Art Techniques',
        detail:
          'Milk texture first, then the pour. Hearts, rosettas and tulips, repeated until they are consistent rather than lucky.',
      },
      {
        title: 'Types of Coffee & Tea',
        detail:
          'Every drink on a café menu and precisely how it differs from the one next to it, plus the main tea types and how each is correctly brewed.',
      },
      {
        title: 'Hygiene & Workplace Management',
        detail:
          'Personal hygiene, station setup, cleaning schedules and workflow — the standards that keep a bar working through a rush.',
      },
      {
        title: 'The Cold Menu',
        detail:
          'Juice, milkshake, smoothies, mojito, lemonade, frappés and iced latte. Balance, texture, ice, dilution and garnish.',
      },
      {
        title: 'Piña Colada & Signature Blends',
        detail:
          'Blended drink construction, layering and presentation — the drinks that photograph well and carry a menu.',
      },
    ],
    certification: 'ISLII Full Professional Barista Certificate',
    idealFor:
      'Anyone serious about working in coffee, and anyone opening a café who needs to own the whole menu rather than a third of it.',
    photo: 'studentsTasting',
    featured: true,
    isBundle: true,
    includes: ['barista-course', 'mixology-course', 'boba-course'],
  },

  {
    slug: 'barista-course',
    number: '02',
    title: 'Barista Course',
    kicker: 'Espresso, milk and latte art — the craft at the heart of the café.',
    duration: 'Part of the Full Course',
    level: 'Beginner → Professional',
    discipline: 'Coffee & Beverage',
    format: 'Hands-on · Live commercial equipment · Small group',
    priceNote: 'Included in the Full Professional Course',
    overview:
      'The core coffee discipline inside our Full Professional Course. You spend your days on live commercial equipment — dialling in grinders, texturing milk and pouring art under ticket pressure — until technique stops being something you think about. This is the part of the programme that makes you employable behind any espresso bar in Nairobi.',
    outcomes: [
      'Dial in any grinder and pull balanced, repeatable espresso',
      'Texture silk microfoam across whole, skim and plant-based milks',
      'Free-pour clean hearts, rosettas and tulips to order',
      'Identify coffee types and explain how each drink differs',
      'Diagnose a bad shot from taste, flow and time — and correct it',
      'Maintain, backflush and troubleshoot commercial machines',
    ],
    modules: [
      {
        title: 'Machines & Grinders',
        detail:
          'Machine anatomy across different models, grinder mechanics, dose and yield, and daily maintenance.',
      },
      {
        title: 'Espresso',
        detail:
          'Extraction theory, puck preparation, recipe building, and your first hundred shots — most of which will be wrong, which is the point.',
      },
      {
        title: 'Milk & Latte Art',
        detail:
          'Steam wand technique, microfoam physics and temperature discipline, then hearts, rosettas and tulips.',
      },
      {
        title: 'Coffee & Tea Knowledge',
        detail:
          'Bean processing, roast profile and freshness, plus the tea types every café menu carries.',
      },
    ],
    certification: 'Covered by the ISLII Full Professional Barista Certificate',
    idealFor: 'Career starters and career changers who want to be hired behind an espresso bar.',
    photo: 'latteArtPour',
    featured: true,
  },

  {
    slug: 'mixology-course',
    number: '03',
    title: 'Mixology Course',
    kicker: 'The cold menu that carries your afternoon trade.',
    duration: 'Part of the Full Course',
    level: 'Beginner',
    discipline: 'Coffee & Beverage',
    format: 'Hands-on · Recipe pack included · Small group',
    priceNote: 'Included in the Full Professional Course',
    overview:
      'Coffee sells in the morning; cold drinks carry the rest of the day. This discipline covers the full café bar — fresh juices, milkshakes, smoothies, mojitos, lemonades, frappés, iced lattes and piña colada — with the balance, texture control and presentation that separate a menu that sells from one that just hangs on the wall.',
    outcomes: [
      'Build mojitos, lemonades and piña colada with proper structure and garnish',
      'Extract and blend fresh juices while protecting colour and flavour',
      'Blend smoothies and milkshakes with real thickness and no separation',
      'Make frappés and iced lattes with correct dilution and hold',
      'Layer, shake, stir and present drinks to a photographable standard',
      'Handle, store and rotate fresh fruit to control waste',
    ],
    modules: [
      {
        title: 'Juices & Smoothies',
        detail:
          'Extraction methods, fruit-to-liquid ratios, frozen versus fresh, oxidation control and safe holding times.',
      },
      {
        title: 'Milkshakes & Frappés',
        detail:
          'Base ratios, ice-cream selection, thickness control, and iced-coffee builds that do not turn to water.',
      },
      {
        title: 'Mojito, Lemonade & Piña Colada',
        detail:
          'Muddling, sweet-acid balance, in-house syrups and purées, and blended-drink construction.',
      },
      {
        title: 'Garnish & Presentation',
        detail:
          'Glassware, ice, garnish craft and plating — the last ten seconds that decide whether the drink gets photographed.',
      },
    ],
    certification: 'Covered by the ISLII Full Professional Barista Certificate',
    idealFor:
      'Café and restaurant staff, juice-bar operators, and anyone building a drinks menu that has to work all day.',
    photo: 'juicesJars',
    featured: true,
  },

  {
    slug: 'boba-course',
    number: '04',
    title: 'Boba Course',
    kicker: "Kenya's fastest-growing drinks category, done properly.",
    duration: 'Part of the Full Course',
    level: 'Beginner',
    discipline: 'Coffee & Beverage',
    format: 'Hands-on · Recipe pack included · Small group',
    priceNote: 'Included in the Full Professional Course',
    overview:
      'Bubble tea has moved from novelty to fixture, and most of what is sold locally is inconsistent. This discipline covers the whole build — pearl cooking and texture, tea bases, syrup ratios, sealing and shaking — plus the costing that decides whether the line actually makes money.',
    outcomes: [
      'Cook tapioca pearls to a consistent chewy texture, batch after batch',
      'Brew tea bases correctly for milk tea, fruit tea and cheese foam',
      'Balance sweetness, ice and dilution to a repeatable spec',
      'Operate sealing machines and manage shelf life safely',
      'Build and cost a boba menu for real margin',
    ],
    modules: [
      {
        title: 'Pearls & Toppings',
        detail:
          'Cooking, resting and syruping tapioca. Popping boba, jellies and puddings — and how long each actually holds.',
      },
      {
        title: 'Tea Bases',
        detail: 'Black, green, oolong and jasmine. Strength, astringency and dilution by ice melt.',
      },
      {
        title: 'Build, Seal & Sell',
        detail: 'Layering, shaking, sealing, presentation, cold-chain hygiene and menu costing.',
      },
    ],
    certification: 'Covered by the ISLII Full Professional Barista Certificate',
    idealFor:
      'Café owners adding a high-margin line, and entrepreneurs launching a boba kiosk or delivery brand.',
    photo: 'bubbleTea',
    featured: true,
  },

  /* ═══════════════════════════════════════════════════════════════════════
     PASTRY & BAKERY
     ═══════════════════════════════════════════════════════════════════════ */
  {
    slug: 'pastry-bakery-class-one',
    number: '05',
    title: 'Pastry & Bakery — Class One',
    overline: 'ISLII Pastry & Bakery School',
    kicker: 'Twenty-four bakes, from cinnamon rolls to red velvet.',
    duration: '1 Month',
    level: 'Beginner',
    discipline: 'Pastry & Bakery',
    format: 'Hands-on · Full ingredient kit provided · Small group',
    priceKes: 30000,
    overview:
      'Our foundation baking programme, and the one to start with. Over a month you work through twenty-four separate bakes — breakfast pastries, biscuits, small cakes and the full range of celebration cakes — learning the doughs, batters, creams and finishing techniques that every one of them is built from. You leave able to produce a saleable counter, not a single showpiece.',
    outcomes: [
      'Mix, prove and bake enriched doughs for cinnamon rolls, donuts and honeycomb',
      'Produce consistent cake batters — vanilla, chocolate, orange, fruit and red velvet',
      'Make and apply buttercream, ganache and cream fillings cleanly',
      'Layer, crumb-coat and finish celebration cakes to a saleable standard',
      'Bake biscuits, cookies, madeleines and cake pops to consistent size and colour',
      'Cost a bakery counter and price it for margin',
    ],
    menu: [
      'Cinnamon Roll',
      'Honey Comb',
      'Donuts',
      'Gulab Jamun',
      'Cupcake',
      'Madeleines',
      'Cookies',
      'Butter Biscuits',
      'Basbusa',
      'Cake Pops',
      'Cake Slice',
      'Chocolate Cake',
      'Orange Cake',
      'Vanilla Cake',
      'Fruit Cake',
      'Pineapple Cake',
      'Caramel Cake',
      'Strawberry Cake',
      'Milk Cake',
      'Lotus Cake',
      'Pastry Cake',
      'Black Forest',
      'White Forest',
      'Red Velvet',
    ],
    modules: [
      {
        title: 'Doughs & Breakfast Bakes',
        detail:
          'Enriched dough method, proving and shaping — cinnamon rolls, honeycomb, donuts and gulab jamun.',
      },
      {
        title: 'Biscuits & Small Bakes',
        detail: 'Cookies, butter biscuits, madeleines, basbusa, cupcakes and cake pops.',
      },
      {
        title: 'Cake Foundations',
        detail:
          'Creaming, folding and baking consistent sponges — vanilla, chocolate, orange, pineapple and fruit.',
      },
      {
        title: 'Celebration Cakes',
        detail:
          'Layering, filling and finishing — caramel, strawberry, milk, lotus, black forest, white forest and red velvet.',
      },
    ],
    certification: 'ISLII Pastry & Bakery Certificate — Class One',
    idealFor:
      'Complete beginners, home bakers going commercial, and anyone starting a cake or bakery business.',
    photo: 'pastryChocolateCake',
    featured: true,
  },

  {
    slug: 'pastry-bakery-class-two',
    number: '06',
    title: 'Pastry & Bakery — Class Two',
    overline: 'ISLII Pastry & Bakery School',
    kicker: 'Sixteen advanced bakes — macarons, tiramisu, wedding cakes.',
    duration: '2 Weeks',
    level: 'All Levels',
    discipline: 'Pastry & Bakery',
    format: 'Hands-on · Full ingredient kit provided · Small group',
    priceKes: 20000,
    overview:
      'The advanced programme, built around the sixteen items that command the highest prices on a pastry counter. Macarons, tiramisu, tarts, churros and tiered wedding cakes each demand a technique the foundation class does not cover — and each one is worth learning precisely because most bakeries locally cannot do them well.',
    outcomes: [
      'Produce macarons with consistent feet, shells and shine',
      'Assemble tiramisu, short desserts and puddings to a set standard',
      'Build, stack and finish a tiered wedding cake that holds',
      'Make and blind-bake tart shells, then fill and glaze them cleanly',
      'Fry churros and produce brownies, muffins and Swiss rolls consistently',
      'Present and package premium desserts for sale and delivery',
    ],
    menu: [
      'Swiss Roll',
      'Muffin',
      'Choco Chip Cookies',
      'Chocolate Fudge Cake',
      'Macarons',
      'Lotus Cheese Cake',
      'Short Dessert',
      'Brownies',
      'Tiramisu',
      'Wedding Cake',
      'Sponge Cake',
      'Churros',
      // TODO_CLIENT: brochure reads "Chande / Chanade Butter" — confirm spelling.
      'Chantilly Butter',
      'Ice Cream Cake',
      'Tarts',
      'Pudding',
    ],
    modules: [
      {
        title: 'Rolled & Baked',
        detail: 'Swiss rolls, muffins, sponge cakes, brownies and chocolate fudge cake.',
      },
      {
        title: 'Patisserie Technique',
        detail: 'Macarons, tarts, churros, Chantilly and lotus cheesecake.',
      },
      {
        title: 'Desserts',
        detail: 'Tiramisu, short desserts, puddings and ice cream cake.',
      },
      {
        title: 'Wedding & Occasion Cakes',
        detail: 'Structure, stacking, dowelling and finishing a tiered cake that survives transport.',
      },
    ],
    certification: 'ISLII Pastry & Bakery Certificate — Class Two',
    idealFor:
      'Class One graduates, working bakers, and cake businesses adding premium lines to the menu.',
    photo: 'pastryTiramisu',
    featured: true,
  },
] as const;

/* ── Derived helpers ──────────────────────────────────────────────────── */

export const featuredCourses = courses.filter((course) => course.featured);

export const coffeeCourses = courses.filter((c) => c.discipline === 'Coffee & Beverage');
export const pastryCourses = courses.filter((c) => c.discipline === 'Pastry & Bakery');

export function getCourseBySlug(slug: string | undefined): Course | undefined {
  return courses.find((course) => course.slug === slug);
}

/** Resolve a bundle's `includes` slugs into full course objects. */
export function getIncludedCourses(course: Course): Course[] {
  if (!course.includes) return [];
  return course.includes
    .map((slug) => getCourseBySlug(slug))
    .filter((c): c is Course => Boolean(c));
}

/** Options for the enquiry form's "programme of interest" select. */
export const courseOptions = [
  ...courses.map((course) => ({ value: course.slug, label: course.title })),
  { value: 'undecided', label: "Not sure yet — I'd like advice" },
];

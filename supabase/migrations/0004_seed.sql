-- ═══════════════════════════════════════════════════════════════════════════
--  ISLII SMS — 0004 SEED
-- ═══════════════════════════════════════════════════════════════════════════
--  The six programmes, mirroring src/data/courses.ts. The `slug` is the join
--  between the marketing site and the database — keep them identical.
--
--  Idempotent: safe to re-run after editing a title or duration.
-- ═══════════════════════════════════════════════════════════════════════════

insert into public.courses (slug, title, duration, level, certification, sort_order) values
  ('full-barista-beverage-course',
   'Full Professional Barista & Beverage Course',
   '6 Weeks', 'Beginner → Professional',
   'ISLII Full Professional Barista Certificate', 1),

  ('barista-course',
   'Barista Course',
   'Part of the Full Course', 'Beginner → Professional',
   'Covered by the ISLII Full Professional Barista Certificate', 2),

  ('mixology-course',
   'Mixology Course',
   'Part of the Full Course', 'Beginner',
   'Covered by the ISLII Full Professional Barista Certificate', 3),

  ('boba-course',
   'Boba Course',
   'Part of the Full Course', 'Beginner',
   'Covered by the ISLII Full Professional Barista Certificate', 4),

  ('pastry-bakery-class-one',
   'Pastry & Bakery — Class One',
   '1 Month', 'Beginner',
   'ISLII Pastry & Bakery Certificate — Class One', 5),

  ('pastry-bakery-class-two',
   'Pastry & Bakery — Class Two',
   '2 Weeks', 'All Levels',
   'ISLII Pastry & Bakery Certificate — Class Two', 6)

on conflict (slug) do update set
  title         = excluded.title,
  duration      = excluded.duration,
  level         = excluded.level,
  certification = excluded.certification,
  sort_order    = excluded.sort_order;

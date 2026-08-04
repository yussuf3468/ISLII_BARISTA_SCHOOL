/**
 * Tiny class-name joiner. Deliberately dependency-free — `clsx`/`tailwind-merge`
 * are not needed because no component here fights over conflicting utilities.
 *
 * Accepts `unknown` and keeps only non-empty strings, so the common
 * `cond && 'class'` idiom stays safe even when `cond` is a number or a
 * ReactNode rather than a boolean.
 */
export function cn(...classes: unknown[]): string {
  return classes.filter((c): c is string => typeof c === 'string' && c.length > 0).join(' ');
}

/** Clamp a number into a range. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Slugify a title into a URL-safe segment.
 * Kept deterministic so route params stay stable across content edits.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Format a number with thousands separators, e.g. 1200 → "1,200". */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-KE').format(value);
}

/** Split a string into words, preserving them as atomic units for masked reveals. */
export function toWords(input: string): string[] {
  return input.split(/\s+/).filter(Boolean);
}

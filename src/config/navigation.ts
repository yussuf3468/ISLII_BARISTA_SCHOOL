/**
 * Navigation is declared once and consumed by the header, the mobile menu,
 * the footer and the sitemap generator. Adding a page here wires it into all
 * four automatically.
 */

export interface NavItem {
  label: string;
  href: string;
  /** Short description shown in the mobile mega-menu. */
  hint?: string;
  /** Sitemap priority (0–1). */
  priority?: number;
}

export const primaryNav: readonly NavItem[] = [
  { label: 'Home', href: '/', hint: 'Start here', priority: 1.0 },
  { label: 'About', href: '/about', hint: 'Who we are', priority: 0.8 },
  { label: 'Courses', href: '/courses', hint: 'Eight programmes', priority: 0.9 },
  { label: 'Gallery', href: '/gallery', hint: 'Inside the school', priority: 0.7 },
  { label: 'FAQ', href: '/faq', hint: 'Answers, fast', priority: 0.6 },
  { label: 'Contact', href: '/contact', hint: 'Talk to us', priority: 0.8 },
] as const;

/** Secondary links surfaced only in the footer. */
export const footerNav: readonly NavItem[] = [
  { label: 'Enrol Now', href: '/contact#enrol' },
  { label: 'All Courses', href: '/courses' },
  { label: 'Student Gallery', href: '/gallery' },
  { label: 'Common Questions', href: '/faq' },
] as const;

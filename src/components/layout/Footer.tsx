import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Clock, ArrowUpRight } from 'lucide-react';
import { Logo } from './Logo';
import { WhatsAppGlyph, TikTokGlyph, InstagramGlyph, FacebookGlyph } from '@/components/ui/Glyphs';
import { Reveal } from '@/components/ui/Reveal';
import { CONTAINER } from '@/components/ui/Section';
import { primaryNav } from '@/config/navigation';
import { courses } from '@/data/courses';
import { site, whatsappLink, mapDirectionsUrl } from '@/config/site';
import { cn } from '@/lib/utils';

const socials = [
  { key: 'tiktok', href: site.social.tiktok, label: 'TikTok', Icon: TikTokGlyph },
  { key: 'instagram', href: site.social.instagram, label: 'Instagram', Icon: InstagramGlyph },
  { key: 'facebook', href: site.social.facebook, label: 'Facebook', Icon: FacebookGlyph },
] as const;

function FooterHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-sans text-eyebrow font-medium uppercase text-gold-500/70">{children}</h2>
  );
}

const linkClass =
  'group inline-flex items-center gap-1.5 font-sans text-[0.9375rem] text-cream-200/60 transition-colors duration-300 hover:text-cream-50';

export function Footer() {
  const activeSocials = socials.filter((s) => s.href);

  return (
    <footer className="on-dark grain relative overflow-hidden bg-espresso-950 text-cream-100">
      {/* Oversized wordmark bled off the bottom edge — a piece of pure art
          direction that gives the footer weight without adding content. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-[0.22em] left-1/2 w-full -translate-x-1/2 select-none text-center font-display leading-none text-cream-50/[0.028]"
        style={{ fontSize: 'clamp(7rem, 22vw, 22rem)' }}
      >
        ISLII
      </span>

      <div className={cn('relative mx-auto px-gutter', CONTAINER.default)}>
        {/* ── Main grid ─────────────────────────────────────────────── */}
        <div className="grid gap-14 py-20 md:py-24 lg:grid-cols-12 lg:gap-10">
          {/* Brand */}
          <div className="lg:col-span-4">
            <Reveal>
              <Logo tone="light" />
              <p className="mt-7 max-w-sm text-[0.9375rem] leading-relaxed text-cream-200/55">
                Nairobi's professional coffee academy. We train baristas to an international
                standard — then help them build careers behind the bar and businesses of their own.
              </p>

              {activeSocials.length > 0 && (
                <ul className="mt-8 flex items-center gap-3">
                  {activeSocials.map(({ key, href, label, Icon }) => (
                    <li key={key}>
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${site.name} on ${label}`}
                        className="grid size-11 place-items-center rounded-full border border-cream-50/12 text-cream-200/70 transition-all duration-400 hover:border-gold-500/60 hover:bg-gold-500/10 hover:text-gold-400"
                      >
                        <Icon className="size-4" />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </Reveal>
          </div>

          {/* Explore */}
          <div className="lg:col-span-2">
            <Reveal index={1}>
              <FooterHeading>Explore</FooterHeading>
              <ul className="mt-6 space-y-3.5">
                {primaryNav.map((item) => (
                  <li key={item.href}>
                    <Link to={item.href} className={linkClass}>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>

          {/* Courses */}
          <div className="lg:col-span-3">
            <Reveal index={2}>
              <FooterHeading>Programmes</FooterHeading>
              <ul className="mt-6 space-y-3.5">
                {courses.slice(0, 6).map((course) => (
                  <li key={course.slug}>
                    <Link to={`/courses/${course.slug}`} className={linkClass}>
                      {course.title}
                      <ArrowUpRight className="size-3.5 opacity-0 transition-opacity duration-300 group-hover:opacity-70" />
                    </Link>
                  </li>
                ))}
                <li>
                  <Link to="/courses" className={cn(linkClass, 'text-gold-500/80 hover:text-gold-400')}>
                    All programmes
                    <ArrowUpRight className="size-3.5" />
                  </Link>
                </li>
              </ul>
            </Reveal>
          </div>

          {/* Contact */}
          <div className="lg:col-span-3">
            <Reveal index={3}>
              <FooterHeading>Visit &amp; Enrol</FooterHeading>
              <ul className="mt-6 space-y-5">
                <li>
                  <a href={site.phone.href} className={cn(linkClass, 'items-start')}>
                    <Phone className="mt-0.5 size-4 shrink-0 text-gold-500/70" />
                    <span>{site.phone.display}</span>
                  </a>
                </li>
                <li>
                  <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className={cn(linkClass, 'items-start')}>
                    <WhatsAppGlyph className="mt-0.5 size-4 shrink-0 text-gold-500/70" />
                    <span>Message us on WhatsApp</span>
                  </a>
                </li>
                <li>
                  <a href={site.email.href} className={cn(linkClass, 'items-start')}>
                    <Mail className="mt-0.5 size-4 shrink-0 text-gold-500/70" />
                    <span>{site.email.display}</span>
                  </a>
                </li>
                <li>
                  <a
                    href={mapDirectionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(linkClass, 'items-start')}
                  >
                    <MapPin className="mt-0.5 size-4 shrink-0 text-gold-500/70" />
                    <span>{site.address.full}</span>
                  </a>
                </li>
                <li className="flex items-start gap-1.5 font-sans text-[0.9375rem] text-cream-200/60">
                  <Clock className="mt-0.5 size-4 shrink-0 text-gold-500/70" />
                  <span>
                    {site.hoursDisplay.map((row) => (
                      <span key={row.label} className="block">
                        <span className="text-cream-200/40">{row.label}:</span> {row.value}
                      </span>
                    ))}
                  </span>
                </li>
              </ul>
            </Reveal>
          </div>
        </div>

        {/* ── Legal bar ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 border-t border-cream-50/8 py-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-sans text-[0.8125rem] text-cream-200/40">
            © {new Date().getFullYear()} {site.legalName}. All rights reserved.
          </p>

          {/* Both of these were reachable only by typing the URL.
              `/verify` is the school's proof of itself: an employer holding a
              printed certificate needs somewhere to check it, and the QR only
              helps the person who can scan it. `/admin` is where staff sign in
              — hiding it protects nothing, because the security boundary is the
              database's row-level policies, not the obscurity of a path. */}
          <nav aria-label="Utility" className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link
              to="/verify"
              className="font-sans text-[0.8125rem] text-cream-200/55 underline-offset-4 transition-colors hover:text-cream-100 hover:underline"
            >
              Verify a certificate
            </Link>
            <Link
              to="/admin"
              className="font-sans text-[0.8125rem] text-cream-200/40 underline-offset-4 transition-colors hover:text-cream-100 hover:underline"
            >
              Staff sign in
            </Link>
            <p className="font-sans text-[0.8125rem] text-cream-200/40">
              Crafted by{' '}
              <span className="text-cream-200/65">Lenzro Software Solutions</span>
            </p>
          </nav>
        </div>
      </div>
    </footer>
  );
}

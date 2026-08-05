import { Phone, Mail, MapPin, Clock, Navigation } from 'lucide-react';
import { Seo } from '@/components/seo/Seo';
import { PageHero } from '@/components/sections/PageHero';
import { EnquiryForm } from '@/components/forms/EnquiryForm';
import { Container, Section, Eyebrow } from '@/components/ui/Section';
import { Reveal, RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { Button } from '@/components/ui/Button';
import { WhatsAppGlyph, TikTokGlyph } from '@/components/ui/Glyphs';
import { site, whatsappLink, mapEmbedSrc, mapDirectionsUrl } from '@/config/site';
import { PAGE_SEO } from '@/config/seo';
import { organizationSchema, contactPageSchema, breadcrumbSchema } from '@/lib/schema';

const channels = [
  {
    Icon: Phone,
    label: 'Call us',
    value: site.phone.display,
    href: site.phone.href,
    detail: 'Fastest answer during opening hours',
  },
  {
    Icon: WhatsAppGlyph,
    label: 'WhatsApp',
    value: 'Message us directly',
    href: whatsappLink(),
    detail: 'Usually answered within the hour',
  },
  {
    Icon: Mail,
    label: 'Email',
    value: site.email.display,
    href: site.email.href,
    detail: 'For detailed or corporate enquiries',
  },
  {
    Icon: MapPin,
    label: 'Visit',
    value: site.address.full,
    href: mapDirectionsUrl,
    detail: 'Come and see the training bar',
  },
] as const;

export default function Contact() {
  return (
    <>
      <Seo
        {...PAGE_SEO.contact}
        jsonLd={[
          organizationSchema(),
          contactPageSchema(),
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Contact', path: '/contact' },
          ]),
        ]}
      />

      <PageHero
        eyebrow="Get In Touch"
        title="Let's get you behind the bar."
        lead="Tell us where you're starting from and what you want to do with it. We'll come back with fees, intake dates and an honest recommendation — even if that's a different programme than the one you asked about."
        photo="cafeInteriorPlants"
        crumb="Contact"
      />

      {/* ── Channels ─────────────────────────────────────────────────── */}
      <section className="relative -mt-16 pb-4 md:-mt-24">
        <Container>
          <RevealGroup stagger={0.08} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {channels.map(({ Icon, label, value, href, detail }) => (
              <RevealItem key={label}>
                <a
                  href={href}
                  {...(href.startsWith('http')
                    ? { target: '_blank', rel: 'noopener noreferrer' }
                    : {})}
                  className="group flex h-full flex-col rounded-sm border border-coffee-400/20 bg-linen p-6 shadow-lift transition-all duration-500 ease-luxe hover:-translate-y-1 hover:border-gold-500/50 hover:shadow-raise motion-reduce:hover:translate-y-0"
                >
                  <span
                    aria-hidden="true"
                    className="grid size-11 place-items-center rounded-full bg-espresso-950 text-gold-500 transition-colors duration-500 group-hover:bg-gold-500 group-hover:text-espresso-950"
                  >
                    <Icon className="size-4.5" />
                  </span>

                  <span className="mt-5 font-sans text-[0.6875rem] uppercase tracking-[0.18em] text-coffee-400">
                    {label}
                  </span>
                  <span className="mt-1.5 font-display text-lg leading-snug text-espresso-950">
                    {value}
                  </span>
                  <span className="mt-2 font-sans text-[0.8125rem] text-coffee-400">{detail}</span>
                </a>
              </RevealItem>
            ))}
          </RevealGroup>
        </Container>
      </section>

      {/* ── Form + details ───────────────────────────────────────────── */}
      <Section id="enrol" tone="light">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <Reveal>
              <Eyebrow>Enrolment Enquiry</Eyebrow>
              <h2 className="mt-6 text-heading-1 text-espresso-950">Reserve your place.</h2>
              <p className="mt-6 max-w-xl text-lead text-coffee-500">
                Intakes are capped so every student gets real machine time, which means popular
                dates fill several weeks ahead. Send this and we'll confirm availability, fees and
                your start date.
              </p>
            </Reveal>

            <div className="mt-12">
              <EnquiryForm />
            </div>
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-5">
            <Reveal index={1}>
              <div className="on-dark grain rounded-sm bg-espresso-950 p-8 md:p-10">
                <h3 className="font-display text-2xl text-cream-50">Visiting us</h3>

                <dl className="mt-8 space-y-7">
                  <div>
                    <dt className="flex items-center gap-2.5 font-sans text-[0.6875rem] uppercase tracking-[0.18em] text-gold-500/75">
                      <MapPin className="size-3.5" aria-hidden="true" />
                      Address
                    </dt>
                    {/* TODO_CLIENT: swap for the exact street address in config/site.ts */}
                    <dd className="mt-2.5 font-sans text-[0.9375rem] leading-relaxed text-cream-200/70">
                      {site.address.full}
                    </dd>
                  </div>

                  <div>
                    <dt className="flex items-center gap-2.5 font-sans text-[0.6875rem] uppercase tracking-[0.18em] text-gold-500/75">
                      <Clock className="size-3.5" aria-hidden="true" />
                      Opening hours
                    </dt>
                    <dd className="mt-2.5 space-y-1.5">
                      {site.hoursDisplay.map((row) => (
                        <span
                          key={row.label}
                          className="flex justify-between gap-4 font-sans text-[0.9375rem] text-cream-200/70"
                        >
                          <span className="text-cream-200/45">{row.label}</span>
                          <span>{row.value}</span>
                        </span>
                      ))}
                    </dd>
                  </div>
                </dl>

                <div className="mt-9 space-y-3">
                  <Button
                    href={mapDirectionsUrl}
                    variant="gold"
                    fullWidth
                    icon={<Navigation className="size-4" />}
                  >
                    Get Directions
                  </Button>
                  <Button
                    href={whatsappLink()}
                    variant="outlineLight"
                    fullWidth
                    icon={<WhatsAppGlyph className="size-4" />}
                  >
                    Ask a Quick Question
                  </Button>
                </div>

                {site.social.tiktok && (
                  <a
                    href={site.social.tiktok}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-8 flex items-center gap-3 border-t border-cream-50/10 pt-7 font-sans text-[0.875rem] text-cream-200/60 transition-colors duration-300 hover:text-cream-50"
                  >
                    <TikTokGlyph className="size-4 text-gold-500" />
                    See the school in action on TikTok
                  </a>
                )}
              </div>
            </Reveal>
          </aside>
        </div>
      </Section>

      {/* ── Map ──────────────────────────────────────────────────────── */}
      <section aria-label="Our location on a map">
        <div className="h-[380px] w-full bg-cream-100 md:h-[520px]">
          <iframe
            src={mapEmbedSrc}
            title={`Map showing the location of ${site.name} in ${site.address.locality}`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
            className="size-full border-0 grayscale-[0.35] contrast-[1.05]"
          />
        </div>
      </section>
    </>
  );
}

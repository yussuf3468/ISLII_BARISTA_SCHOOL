import { Phone } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Reveal } from '@/components/ui/Reveal';
import { MaskedText } from '@/components/ui/MaskedText';
import { Container } from '@/components/ui/Section';
import { WhatsAppGlyph } from '@/components/ui/Glyphs';
import { site, whatsappLink } from '@/config/site';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  CtaBand — the closing conversion block on every page.
 * ─────────────────────────────────────────────────────────────────────────────
 *  Deliberately has NO photograph.
 *
 *  It previously ran a café interior shot behind a heavy scrim, and the result
 *  was mud: an image too dark to read as an image, sitting behind type it was
 *  actively fighting. A photograph that has to be hidden to make the text work
 *  is not adding anything — it is just noise with a download cost.
 *
 *  What replaces it is a deep espresso field with a single warm gold bloom
 *  behind the headline. Maximum contrast, no competing detail, and the eye goes
 *  exactly where the section wants it to: the call to action.
 *
 *  Three routes out, ordered by commitment — the form for people ready to
 *  enrol, WhatsApp for people with one question, and a phone number for people
 *  who want a human immediately.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function CtaBand({
  title = 'Your first shot is waiting.',
  lead = 'Intakes are small and they fill early. Tell us where you are starting from and we will send you fees, dates and the right programme for your level — usually the same day.',
}: {
  title?: string;
  lead?: string;
}) {
  return (
    <section className="on-dark grain relative isolate overflow-hidden bg-espresso-950">
      {/* Gold bloom behind the headline. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(75% 60% at 50% 42%, rgba(200,161,90,0.20) 0%, rgba(200,161,90,0.07) 38%, transparent 70%)',
        }}
      />

      {/* Hairline top edge picks the section off the one above it. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-500/35 to-transparent"
      />

      {/* Padding is set explicitly rather than using the site-wide `py-section`
          rhythm. This block holds four short elements, and the full section
          rhythm left it swimming in dead space — a closing CTA should feel
          taut and decisive, not cavernous. */}
      <Container className="relative py-16 md:py-20 lg:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <span className="inline-flex items-center gap-3 font-sans text-eyebrow font-medium uppercase text-gold-400">
              <span aria-hidden="true" className="h-px w-8 bg-gold-400/50" />
              Enrol Now
              <span aria-hidden="true" className="h-px w-8 bg-gold-400/50" />
            </span>
          </Reveal>

          <MaskedText
            as="h2"
            text={title}
            className="mt-5 text-heading-1 text-cream-50"
            stagger={0.06}
          />

          <Reveal index={2}>
            <p className="mx-auto mt-5 max-w-xl text-lead text-cream-200/70">{lead}</p>
          </Reveal>

          <Reveal index={3}>
            <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button to="/contact#enrol" variant="gold" size="lg" magnetic withArrow>
                Enrol Today
              </Button>
              <Button
                href={whatsappLink()}
                variant="outlineLight"
                size="lg"
                magnetic
                icon={<WhatsAppGlyph className="size-4" />}
              >
                WhatsApp Us
              </Button>
            </div>
          </Reveal>

          <Reveal index={4}>
            <a
              href={site.phone.href}
              className="group mt-7 inline-flex items-center gap-2.5 font-sans text-sm text-cream-200/55 transition-colors duration-300 hover:text-cream-50"
            >
              <Phone className="size-3.5 text-gold-500 transition-transform duration-300 group-hover:-rotate-12" />
              Or call {site.phone.display}
            </a>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}

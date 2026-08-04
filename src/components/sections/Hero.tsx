import { motion } from 'framer-motion';
import { ArrowDown } from 'lucide-react';
import { Photo } from '@/components/ui/Photo';
import { Button } from '@/components/ui/Button';
import { MaskedText } from '@/components/ui/MaskedText';
import { ParallaxImage } from '@/components/ui/Parallax';
import { Container } from '@/components/ui/Section';
import { site } from '@/config/site';
import { EASE_LUXE } from '@/lib/motion';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Hero — full-bleed cinematic background.
 * ─────────────────────────────────────────────────────────────────────────────
 *  Four stacked layers: photograph, contrast scrims, film grain, content.
 *
 *  The single decision that makes this work is the CHOICE of photograph. A
 *  full-bleed 16:9 hero magnifies its source enormously on a wide screen, so a
 *  tight close-up (a cup, a pour) reads as a zoomed-in fragment rather than an
 *  image. This is a wide establishing shot of a working coffee bar — it has
 *  depth, a natural dark quadrant for the type to sit in, and it still looks
 *  like a photograph at 2560px across.
 *
 *  The scrims are weighted into the bottom-left corner where the type actually
 *  sits, and released across the rest of the frame so the room stays visible.
 *  Even at these lighter values the headline clears roughly 14:1 contrast —
 *  comfortably past WCAG AAA.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function Hero() {
  return (
    <section className="on-dark grain relative isolate flex min-h-dvh flex-col justify-end overflow-hidden bg-espresso-950">
      {/* Layer 1 — photograph */}
      <ParallaxImage speed={0.1} className="absolute inset-0 -z-20">
        <Photo
          name="cafeInteriorMachine"
          priority
          ratio={16 / 9}
          width={2560}
          sizes="100vw"
          className="size-full"
          alt="The espresso bar our students train on at ISLII Barista School"
        />
      </ParallaxImage>

      {/* Layer 2 — contrast scrims.
          Three of them, each doing a specific job:
            · bottom  — carries the headline block
            · left    — keeps type off the busiest part of the room
            · top     — the header sits directly on this image, and without a
                        top scrim the nav links land on bright brick and become
                        genuinely hard to read. This is an accessibility fix,
                        not a stylistic one. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-t from-espresso-950/94 via-espresso-950/45 to-espresso-950/20"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-r from-espresso-950/80 via-espresso-950/18 to-transparent"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 -z-10 h-56 bg-gradient-to-b from-espresso-950/88 via-espresso-950/45 to-transparent md:h-64"
      />

      {/* Layer 4 — content */}
      <Container className="relative z-10 pb-16 pt-36 md:pb-20 md:pt-40">
        <div className="max-w-4xl">
          {/* Eyebrow */}
          {/* `flex-wrap` + `min-w-0` matter more than they look. A flex item
              defaults to `min-width: auto`, so this heavily letter-spaced line
              refused to shrink below its own content width — forcing the hero
              wider than a 390px viewport and clipping the headline off-screen.
              The rule is also hidden on the narrowest screens where it costs
              more width than it earns. */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE_LUXE, delay: 0.15 }}
            className="flex flex-wrap items-center gap-x-4 gap-y-2"
          >
            <span aria-hidden="true" className="hidden h-px w-10 bg-gold-500/60 sm:block" />
            <span className="min-w-0 font-sans text-eyebrow font-medium uppercase text-gold-400">
              {site.address.locality}, {site.address.country} · Coffee Academy
            </span>
          </motion.div>

          {/* Headline */}
          <h1 className="mt-7 text-display-1 text-cream-50 md:mt-9">
            <MaskedText text="Become a" immediate delay={0.3} className="block" />
            <MaskedText
              text="World-Class Barista"
              immediate
              delay={0.42}
              accentWords={['World-Class']}
              className="block"
            />
          </h1>

          {/* Sub-headline — three deliberate beats, not a paragraph. */}
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: EASE_LUXE, delay: 0.95 }}
            className="mt-8 max-w-xl font-display text-xl leading-relaxed text-cream-100/80 md:text-2xl"
          >
            Master coffee. Master hospitality.
            <span className="block text-cream-50">Build your future.</span>
          </motion.p>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: EASE_LUXE, delay: 1.1 }}
            className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center md:mt-12"
          >
            <Button to="/contact#enrol" variant="gold" size="lg" magnetic withArrow>
              Enrol Today
            </Button>
            <Button to="/courses" variant="outlineLight" size="lg" magnetic>
              Explore Courses
            </Button>
          </motion.div>
        </div>
      </Container>

      {/* Scroll cue */}
      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.6 }}
        className="pointer-events-none absolute bottom-8 right-gutter hidden items-center gap-3 lg:flex"
      >
        <span className="font-sans text-[0.625rem] uppercase tracking-[0.28em] text-cream-200/45">
          Scroll
        </span>
        <motion.span
          animate={{ y: [0, 7, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          className="grid size-9 place-items-center rounded-full border border-cream-50/20 text-cream-200/70"
        >
          <ArrowDown className="size-3.5" />
        </motion.span>
      </motion.div>
    </section>
  );
}

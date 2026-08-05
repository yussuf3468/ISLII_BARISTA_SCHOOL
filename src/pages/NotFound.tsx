import { Seo } from '@/components/seo/Seo';
import { Photo } from '@/components/ui/Photo';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Section';
import { MaskedText } from '@/components/ui/MaskedText';
import { primaryNav } from '@/config/navigation';
import { Link } from 'react-router-dom';
import { PAGE_SEO } from '@/config/seo';

/**
 * 404. Noindexed, on-brand, and genuinely useful — a dead end is a lost
 * enquiry, so this page routes people back to something they wanted.
 */
export default function NotFound() {
  return (
    <>
      <Seo
        {...PAGE_SEO.notFound}
        noindex
      />

      <section className="on-dark grain relative isolate flex min-h-svh items-center overflow-hidden bg-espresso-950">
        <div className="absolute inset-0 -z-20">
          <Photo
            name="espressoOverheadDark"
            priority
            ratio={16 / 9}
            width={2000}
            sizes="100vw"
            className="size-full"
            alt=""
          />
        </div>
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-espresso-950/88"
        />

        <Container className="relative py-32">
          <div className="max-w-2xl">
            <span className="font-sans text-eyebrow font-medium uppercase tracking-[0.22em] text-gold-400">
              Error 404
            </span>

            <MaskedText
              as="h1"
              text="This shot didn't extract."
              immediate
              delay={0.2}
              className="mt-7 text-display-2 text-cream-50"
            />

            <p className="mt-7 max-w-lg text-lead text-cream-200/70">
              The page you're after has moved or never existed. Let's get you back to something
              useful.
            </p>

            <div className="mt-11 flex flex-wrap gap-4">
              <Button to="/" variant="gold" size="lg" magnetic withArrow>
                Back Home
              </Button>
              <Button to="/courses" variant="outlineLight" size="lg" magnetic>
                Browse Courses
              </Button>
            </div>

            <nav aria-label="Site sections" className="mt-14 border-t border-cream-50/10 pt-8">
              <p className="font-sans text-[0.6875rem] uppercase tracking-[0.18em] text-cream-200/40">
                Or try
              </p>
              <ul className="mt-4 flex flex-wrap gap-x-7 gap-y-3">
                {primaryNav.map((item) => (
                  <li key={item.href}>
                    <Link
                      to={item.href}
                      className="font-sans text-[0.9375rem] text-cream-200/65 underline-offset-4 transition-colors duration-300 hover:text-gold-400 hover:underline"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </Container>
      </section>
    </>
  );
}

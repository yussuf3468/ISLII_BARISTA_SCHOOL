import { lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { WhatsAppFab } from '@/components/layout/WhatsAppFab';
import { ScrollProgress } from '@/components/motion/ScrollProgress';
import { ScrollToTop } from '@/components/utility/ScrollToTop';
import { pageTransition } from '@/lib/motion';

import Home from '@/pages/Home';

/* Home ships in the initial bundle because it is the landing page for almost
   all traffic. Everything else is split out and fetched on navigation. */
const About = lazy(() => import('@/pages/About'));
const Courses = lazy(() => import('@/pages/Courses'));
const CourseDetail = lazy(() => import('@/pages/CourseDetail'));
const Gallery = lazy(() => import('@/pages/Gallery'));
const Faq = lazy(() => import('@/pages/Faq'));
const Contact = lazy(() => import('@/pages/Contact'));
const NotFound = lazy(() => import('@/pages/NotFound'));

/** Neutral espresso panel shown while a route chunk downloads. */
function RouteFallback() {
  return (
    <div className="grid min-h-svh place-items-center bg-espresso-950" role="status" aria-live="polite">
      <span className="sr-only">Loading page</span>
      <span
        aria-hidden="true"
        className="size-9 animate-spin rounded-full border-2 border-gold-500/25 border-t-gold-500"
      />
    </div>
  );
}

/**
 * Route entrance.
 *
 * This deliberately does NOT use <AnimatePresence mode="wait">. With an exit
 * animation, the outgoing page stays mounted while it fades, then unmounts —
 * leaving <main> momentarily empty. The footer snaps up to fill the gap and
 * drops back down when the new page mounts, so every navigation produced a
 * visible collapse-and-expand of the whole page.
 *
 * Mounting the new route immediately and fading it in has no such gap. The
 * transition is shorter, and the page never changes height on its own.
 */
function AnimatedPage({ children }: { children: React.ReactNode }) {
  return (
    <motion.div variants={pageTransition} initial="initial" animate="animate">
      {children}
    </motion.div>
  );
}

export default function App() {
  const location = useLocation();

  return (
    <>
      <ScrollProgress />
      <ScrollToTop />
      <Header />

      <main id="main">
        <Suspense fallback={<RouteFallback />}>
          {/* Keyed on pathname so each route remounts and replays its entrance. */}
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<AnimatedPage><Home /></AnimatedPage>} />
            <Route path="/about" element={<AnimatedPage><About /></AnimatedPage>} />
            <Route path="/courses" element={<AnimatedPage><Courses /></AnimatedPage>} />
            <Route path="/courses/:slug" element={<AnimatedPage><CourseDetail /></AnimatedPage>} />
            <Route path="/gallery" element={<AnimatedPage><Gallery /></AnimatedPage>} />
            <Route path="/faq" element={<AnimatedPage><Faq /></AnimatedPage>} />
            <Route path="/contact" element={<AnimatedPage><Contact /></AnimatedPage>} />
            <Route path="*" element={<AnimatedPage><NotFound /></AnimatedPage>} />
          </Routes>
        </Suspense>
      </main>

      <Footer />
      <WhatsAppFab />
    </>
  );
}

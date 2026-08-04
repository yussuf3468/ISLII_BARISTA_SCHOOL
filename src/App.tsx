import { lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

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
    <div className="grid min-h-dvh place-items-center bg-espresso-950" role="status" aria-live="polite">
      <span className="sr-only">Loading page</span>
      <span
        aria-hidden="true"
        className="size-9 animate-spin rounded-full border-2 border-gold-500/25 border-t-gold-500"
      />
    </div>
  );
}

function AnimatedPage({ children }: { children: React.ReactNode }) {
  return (
    <motion.div variants={pageTransition} initial="initial" animate="animate" exit="exit">
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
          {/* mode="wait" lets the outgoing page finish before the next enters —
              without it the two overlap and the page visibly doubles. */}
          <AnimatePresence mode="wait" initial={false}>
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
          </AnimatePresence>
        </Suspense>
      </main>

      <Footer />
      <WhatsAppFab />
    </>
  );
}

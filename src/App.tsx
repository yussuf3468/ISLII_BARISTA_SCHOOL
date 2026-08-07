import { lazy, Suspense } from 'react';
import { Routes, Route, useLocation, Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { WhatsAppFab } from '@/components/layout/WhatsAppFab';
import { ScrollProgress } from '@/components/motion/ScrollProgress';
import { ScrollToTop } from '@/components/utility/ScrollToTop';
import { pageTransition } from '@/lib/motion';

import Home from '@/pages/Home';

/* Home ships in the initial bundle because it is the landing page for almost
   all traffic. Everything else is split out and fetched on navigation —
   including the entire admin app and the verification pages, so a marketing
   visitor never downloads a byte of either. */
const About = lazy(() => import('@/pages/About'));
const Courses = lazy(() => import('@/pages/Courses'));
const CourseDetail = lazy(() => import('@/pages/CourseDetail'));
const Gallery = lazy(() => import('@/pages/Gallery'));
const Faq = lazy(() => import('@/pages/Faq'));
const Contact = lazy(() => import('@/pages/Contact'));
const NotFound = lazy(() => import('@/pages/NotFound'));

const VerifySearch = lazy(() => import('@/pages/verify/VerifySearch'));
const VerifyResult = lazy(() => import('@/pages/verify/VerifyResult'));

const AdminRoot = lazy(() => import('@/pages/admin/AdminRoot'));
const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'));
const AdminLogin = lazy(() => import('@/pages/admin/AdminLogin'));
const Dashboard = lazy(() => import('@/pages/admin/Dashboard'));
const Students = lazy(() => import('@/pages/admin/Students'));
const StudentDetail = lazy(() => import('@/pages/admin/StudentDetail'));
const Intakes = lazy(() => import('@/pages/admin/Intakes'));
const AdminCourses = lazy(() => import('@/pages/admin/Courses'));
const AdminIntakeDetail = lazy(() => import('@/pages/admin/IntakeDetail'));
const AdminFinance = lazy(() => import('@/pages/admin/Finance'));
const AdminAttendance = lazy(() => import('@/pages/admin/Attendance'));
const AdminGrades = lazy(() => import('@/pages/admin/Grades'));
const AdminCertificates = lazy(() => import('@/pages/admin/Certificates'));
const AdminSettings = lazy(() => import('@/pages/admin/Settings'));
const AdminAudit = lazy(() => import('@/pages/admin/AuditLog'));

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
 * Mounting the new route immediately and fading it in has no such gap.
 */
function AnimatedPage({ children }: { children: React.ReactNode }) {
  return (
    <motion.div variants={pageTransition} initial="initial" animate="animate">
      {children}
    </motion.div>
  );
}

/**
 * The marketing chrome — header, footer, floating WhatsApp button.
 *
 * The admin and verification routes deliberately sit OUTSIDE this. A staff
 * member working through a student list does not need a "Enrol Today" call to
 * action, and an employer verifying a certificate should see the school's
 * identity and the verdict — not a marketing navigation bar inviting them to
 * browse courses.
 */
function PublicSite() {
  return (
    <>
      <ScrollProgress />
      <Header />
      <main id="main">
        <Outlet />
      </main>
      <Footer />
      <WhatsAppFab />
    </>
  );
}

export default function App() {
  const location = useLocation();

  return (
    <>
      <ScrollToTop />

        <Suspense fallback={<RouteFallback />}>
          <Routes location={location}>
            {/* ── Marketing ──────────────────────────────────────────── */}
            <Route element={<PublicSite />}>
              <Route path="/" element={<AnimatedPage><Home /></AnimatedPage>} />
              <Route path="/about" element={<AnimatedPage><About /></AnimatedPage>} />
              <Route path="/courses" element={<AnimatedPage><Courses /></AnimatedPage>} />
              <Route path="/courses/:slug" element={<AnimatedPage><CourseDetail /></AnimatedPage>} />
              <Route path="/gallery" element={<AnimatedPage><Gallery /></AnimatedPage>} />
              <Route path="/faq" element={<AnimatedPage><Faq /></AnimatedPage>} />
              <Route path="/contact" element={<AnimatedPage><Contact /></AnimatedPage>} />
              <Route path="*" element={<AnimatedPage><NotFound /></AnimatedPage>} />
            </Route>

            {/* ── Public certificate verification ────────────────────── */}
            <Route path="/verify" element={<VerifySearch />} />
            <Route path="/verify/:token" element={<VerifyResult />} />

            {/* ── Student management ───────────────────────────────────
                AdminRoot carries AuthProvider + React Query. Because it is a
                lazy route element, neither Supabase nor TanStack Query is in
                the bundle a marketing visitor downloads. */}
            <Route path="/admin" element={<AdminRoot />}>
              <Route path="login" element={<AdminLogin />} />
              <Route element={<AdminLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="students" element={<Students />} />
                <Route path="students/:id" element={<StudentDetail />} />
                <Route path="courses" element={<AdminCourses />} />
                <Route path="intakes" element={<Intakes />} />
                <Route path="intakes/:id" element={<AdminIntakeDetail />} />
                <Route path="certificates" element={<AdminCertificates />} />
                <Route path="attendance" element={<AdminAttendance />} />
                <Route path="grades" element={<AdminGrades />} />
                <Route path="finance" element={<AdminFinance />} />
                <Route path="audit" element={<AdminAudit />} />
                <Route path="settings" element={<AdminSettings />} />
              </Route>
            </Route>
          </Routes>
        </Suspense>
    </>
  );
}

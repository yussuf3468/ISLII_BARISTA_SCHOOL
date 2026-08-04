import { useEffect, useState } from 'react';

/**
 * Thin gold reading-progress bar pinned to the top of the viewport.
 *
 * Note: this file previously also exported a custom cursor ring. It was removed
 * at the client's request — the native pointer is now left completely alone,
 * which is also the more accessible default (the OS cursor communicates text
 * selection, resize and disabled states that a decorative element cannot).
 *
 * Scroll is read inside a rAF callback and the listener is passive, so this
 * never blocks or janks the scroll thread.
 */
export function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;

    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        setProgress(max > 0 ? window.scrollY / max : 0);
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div aria-hidden="true" className="fixed inset-x-0 top-0 z-[90] h-px">
      <div
        className="h-full origin-left bg-gradient-to-r from-gold-600 via-gold-400 to-gold-600"
        style={{ transform: `scaleX(${progress})` }}
      />
    </div>
  );
}

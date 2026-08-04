import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

import { primaryNav } from './src/config/navigation';
import { courses } from './src/data/courses';
import { site } from './src/config/site';

/**
 * Emits sitemap.xml at build time from the same route and course data the app
 * renders from. Generating it (rather than hand-maintaining a static file) is
 * the only way it can't silently drift when a course is added or a page is
 * renamed — a stale sitemap is worse than none, because search engines keep
 * requesting URLs that no longer exist.
 */
function sitemapPlugin(): Plugin {
  return {
    name: 'islii-sitemap',
    apply: 'build',
    generateBundle() {
      const today = new Date().toISOString().slice(0, 10);

      const urls = [
        ...primaryNav.map((item) => ({
          loc: item.href,
          priority: item.priority ?? 0.7,
          changefreq: item.href === '/' ? 'weekly' : 'monthly',
        })),
        ...courses.map((course) => ({
          loc: `/courses/${course.slug}`,
          priority: 0.85,
          changefreq: 'monthly',
        })),
      ];

      const body = urls
        .map(({ loc, priority, changefreq }) => {
          const abs = `${site.url}${loc === '/' ? '/' : loc}`;
          return [
            '  <url>',
            `    <loc>${abs}</loc>`,
            `    <lastmod>${today}</lastmod>`,
            `    <changefreq>${changefreq}</changefreq>`,
            `    <priority>${priority.toFixed(1)}</priority>`,
            '  </url>',
          ].join('\n');
        })
        .join('\n');

      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`,
      });
    },
  };
}

/**
 * Single-page apps need every unknown path served index.html, or a hard refresh
 * on /courses/barista-course returns a 404 from the host. This handles it for
 * `vite preview`; the deployment equivalents are documented in README.md.
 */
function spaFallbackPreview(): Plugin {
  return {
    name: 'islii-spa-fallback',
    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (
          req.url &&
          !req.url.startsWith('/assets') &&
          !req.url.includes('.') &&
          req.headers.accept?.includes('text/html')
        ) {
          req.url = '/';
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), sitemapPlugin(), spaFallbackPreview()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'es2020',
    cssMinify: 'lightningcss',
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          motion: ['framer-motion'],
          forms: ['react-hook-form', 'zod', '@hookform/resolvers/zod'],
        },
      },
    },
  },
});

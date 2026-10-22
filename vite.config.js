import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    // Installable app: manifest + a service worker that caches everything (including the
    // 7 MB engine) so games work offline. New versions are offered with an in-app prompt.
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Chess Coach',
        short_name: 'Chess Coach',
        description: 'Real games with a coach who stops you at the moments that matter — then turns them into practice.',
        theme_color: '#0d1015',
        background_color: '#0d1015',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,wasm}'],
        maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
  optimizeDeps: {
    exclude: ['stockfish'],
  },
  test: {
    // Only this repo's tests — not the copies inside .claude/worktrees.
    include: ['test/**/*.test.js'],
  },
  build: {
    // The opening courses, book and name database are bundled on purpose (~150 kB gzip);
    // they're tiny next to the 7 MB engine and keep the app fully offline-capable.
    chunkSizeWarningLimit: 1200,
  },
})

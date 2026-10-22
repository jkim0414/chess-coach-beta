import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
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

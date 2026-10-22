// Coaching audit (slow): `SHARD=0 GAMES=4 npx vitest run --config vitest.audit.config.js`
import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    include: ['audit/**/*.audit.js'],
    testTimeout: 60 * 60 * 1000,
  },
});

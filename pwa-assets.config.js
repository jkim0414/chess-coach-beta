// App icons for the PWA: `npx pwa-assets-generator` regenerates them from public/pwa-icon.svg.
// The source is full-bleed, so no padding: phones apply their own rounded/circular mask.
import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, padding: 0 },
    apple: { ...minimal2023Preset.apple, padding: 0 },
  },
  images: ['public/pwa-icon.svg'],
});

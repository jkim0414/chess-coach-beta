#!/usr/bin/env node
// Builds public/og-image.png (1200×630): the picture shown when the app link is shared in
// Messages, Slack, WhatsApp, etc. Re-run after changing the icon:  node scripts/make-share-image.mjs
import { readFileSync } from 'node:fs';
import sharp from 'sharp';

const icon = readFileSync('public/pwa-icon.svg', 'utf8')
  .replace('<svg ', '<svg x="110" y="155" width="320" height="320" ')
  .replace('<rect width="512" height="512"', '<rect width="512" height="512" rx="96"');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="#0d1015"/>
  ${icon}
  <g font-family="-apple-system, 'Helvetica Neue', Helvetica, Arial, sans-serif" fill="#e8ecf4">
    <text x="500" y="285" font-size="84" font-weight="700">Chess Coach</text>
    <text x="500" y="355" font-size="34" fill="#a9b3c6">Real games, with a coach who stops you</text>
    <text x="500" y="400" font-size="34" fill="#a9b3c6">at the moments that matter.</text>
  </g>
</svg>`;
await sharp(Buffer.from(svg)).png().toFile('public/og-image.png');
console.log('wrote public/og-image.png');

// Renders public/icons/icon.svg to PNGs (run once: node scripts/make-icons.mjs).
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const svg = readFileSync('public/icons/icon.svg', 'utf8');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage();
for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['icon-512-maskable.png', 512], ['apple-touch-icon.png', 180]]) {
  await page.setViewportSize({ width: size, height: size });
  const inner = svg.replace('rx="112"', 'rx="0"'); // square: iOS/Android apply their own mask
  await page.setContent(`<html><body style="margin:0;background:#0a7d5a">${inner.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  await page.screenshot({ path: `public/icons/${name}` });
}
await browser.close();

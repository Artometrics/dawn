// Screenshots of /atlas from the static export, at desktop and phone size. Needs `npm run build` and Chrome.
//   node scripts/atlas-shots.mjs [outDir]
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { serveOut } from './lib/static-server.mjs';

const outDir = path.resolve('out');
const shots = path.resolve(process.argv[2] || 'docs/atlas/screenshots');
const chromeBin = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium'].find((file) => existsSync(file));
if (!chromeBin) throw new Error('Chrome is not installed');
if (!existsSync(path.join(outDir, 'atlas/index.html'))) throw new Error('Run `npm run build` first. out/atlas/index.html is missing.');
await mkdir(shots, { recursive: true });

const site = await serveOut(outDir);
const browser = await chromium.launch({ executablePath: chromeBin, headless: true, args: ['--no-sandbox'] });

const sizes = [
  { name: 'desktop', width: 1440, height: 900, mobile: false },
  { name: 'mobile', width: 390, height: 844, mobile: true },
];

async function ready(page) {
  await page.goto(`${site.url}/atlas`, { waitUntil: 'load' });
  await page.waitForSelector('.at-root[data-ready="true"] [data-place="maus"], .at-root[data-ready="true"] .at-pin');
  await page.waitForFunction(() => !document.querySelector('.at-map-note'), null, { timeout: 15_000 });
  await page.waitForTimeout(400);
}

const shot = (page, size, name) => page.screenshot({ path: path.join(shots, `${size.name}-${name}.png`) });

try {
  for (const size of sizes) {
    const context = await browser.newContext({
      viewport: { width: size.width, height: size.height },
      deviceScaleFactor: size.mobile ? 2 : 1,
      hasTouch: size.mobile,
      isMobile: size.mobile,
    });
    const page = await context.newPage();
    await ready(page);
    await shot(page, size, '1-opening');

    await page.locator('[data-place="memchu"]').first().click();
    await page.waitForTimeout(1100);
    await shot(page, size, '2-place');

    await page.locator('.at-fab[aria-label="Fit the tour on screen"]').click();
    await page.getByRole('tab', { name: 'Tours' }).click();
    await page.locator('[data-action="walk-next"], [data-action="cta"]').first().click();
    await page.waitForSelector('[data-card="maus"]', { timeout: 15_000 });
    await page.waitForTimeout(500);
    await shot(page, size, '3-arrived');
    for (const id of ['angel', 'cactus']) {
      await page.locator('[data-action="cta"]').click();
      if (id === 'cactus') {
        await page.waitForTimeout(1100);
        await shot(page, size, '4-walking');
      }
      await page.waitForSelector(`[data-card="${id}"]`, { timeout: 15_000 });
    }
    await page.waitForTimeout(500);
    await shot(page, size, '4b-arrived');

    await page.getByRole('tab', { name: 'Tours' }).click();
    await page.locator('.at-back').first().click();
    await shot(page, size, '5-tours');

    await page.getByRole('tab', { name: 'Story' }).click();
    await page.locator('[data-thread] > button').first().click();
    await shot(page, size, '6-story');

    await page.getByRole('tab', { name: 'You' }).click();
    await shot(page, size, '7-you');

    await page.getByRole('tab', { name: 'Places' }).click();
    await page.getByRole('searchbox', { name: 'Search places' }).fill('hoover');
    await page.waitForTimeout(300);
    await shot(page, size, '8-search');
    await context.close();
  }
} finally {
  await browser.close();
  await site.close();
}
console.log(`wrote screenshots to ${shots}`);

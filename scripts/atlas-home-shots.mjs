// Full-page screenshots of the home route (/) with the sidebar shut and open, at 390px and 1280px wide.
//   node scripts/atlas-home-shots.mjs [outDir] [--root out] [--label after]
// Needs `npm run build` (or another export folder via --root) and Chrome.
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { serveOut } from './lib/static-server.mjs';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 ? args[at + 1] : fallback;
};
const positional = args.filter((arg, i) => !arg.startsWith('--') && !args[i - 1]?.startsWith('--'));
const root = path.resolve(flag('root', 'out'));
const label = flag('label', 'after');
const shots = path.resolve(positional[0] || path.join(os.tmpdir(), 'atlas-home-shots'));
const chromeBin = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium'].find((file) => existsSync(file));
if (!chromeBin) throw new Error('Chrome is not installed');
if (!existsSync(path.join(root, 'index.html'))) throw new Error(`No index.html in ${root}. Run \`npm run build\` first.`);
await mkdir(shots, { recursive: true });

const site = await serveOut(root);
const browser = await chromium.launch({ executablePath: chromeBin, headless: true, args: ['--no-sandbox'] });
const sizes = [
  { name: '390', width: 390, height: 844, mobile: true },
  { name: '1280', width: 1280, height: 800, mobile: false },
];

async function ready(page) {
  await page.goto(`${site.url}/`, { waitUntil: 'load' });
  if (await page.locator('.at-root').count().catch(() => 0)) {
    await page.waitForSelector('.at-root[data-ready="true"] [data-place="maus"]');
    await page.waitForFunction(() => !document.querySelector('.at-map-note'), null, { timeout: 15_000 });
  } else {
    await page.waitForSelector('.ph-canvas');
  }
  await page.waitForTimeout(900);
}

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
    await page.screenshot({ path: path.join(shots, `${label}-${size.name}-closed.png`), fullPage: true });
    await page.locator('button[aria-label="Menu"]').first().click();
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(shots, `${label}-${size.name}-sidebar-open.png`), fullPage: true });
    await context.close();
  }
  console.log(`wrote ${label} screenshots to ${shots}`);
} finally {
  await browser.close();
  await site.close();
}

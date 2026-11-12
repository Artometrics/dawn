// 390px phone screenshots of every exported route, for the shared-shell audit and PR.
//   node scripts/shell-shots.mjs <outDir> [--root out] [--dpr 1] [--only /kits,/editor]
// Needs `npm run build` (or another export folder via --root) and Chrome.
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { ROUTES } from './lib/routes.mjs';
import { serveOut } from './lib/static-server.mjs';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 ? args[at + 1] : fallback;
};
const positional = args.filter((arg, i) => !arg.startsWith('--') && !args[i - 1]?.startsWith('--'));
const root = path.resolve(flag('root', 'out'));
const dpr = Number(flag('dpr', '1'));
const only = flag('only', '')
  .split(',')
  .filter(Boolean);
const outDir = path.resolve(positional[0] || 'shell-shots');
const chromeBin = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium'].find((file) => existsSync(file));
if (!chromeBin) throw new Error('Chrome is not installed');
await mkdir(outDir, { recursive: true });

const site = await serveOut(root);
const browser = await chromium.launch({ executablePath: chromeBin, headless: true, args: ['--no-sandbox'] });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: dpr, hasTouch: true, isMobile: true });
  for (const route of ROUTES.filter((item) => !only.length || only.includes(item.path))) {
    const page = await context.newPage();
    await page.goto(`${site.url}${route.path}`, { waitUntil: 'load' });
    await page.waitForTimeout(route.path === '/' || route.path === '/atlas' ? 2500 : 1200);
    await page.screenshot({ path: path.join(outDir, `${route.name}.png`) });
    await page.close();
  }
  console.log(`wrote screenshots to ${outDir}`);
} finally {
  await browser.close();
  await site.close();
}

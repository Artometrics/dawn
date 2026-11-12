import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { chromium, type Browser } from 'playwright-core';
import { serveOut } from '../../../scripts/lib/static-server.mjs';
import { NAV_ITEMS, SITE_ROUTES } from './nav.ts';

const outDir = path.resolve('out');
const chromeBin = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium'].find((file) => existsSync(file));
const skip = !chromeBin ? 'Chrome is not installed' : !existsSync(path.join(outDir, '404.html')) ? 'run `npm run build` first so out/ exists' : false;

/** Opens every page, collects every link on it, and follows each internal one. Each must be 200 HTML with the shared sidebar. External links must be absolute https URLs. */
test('every internal link on every page returns 200 HTML with the shared sidebar, and external links are absolute', { skip, timeout: 280_000 }, async () => {
  const site = await serveOut(outDir);
  const browser: Browser = await chromium.launch({ executablePath: chromeBin, headless: true, args: ['--no-sandbox'] });
  const internal = new Set<string>();
  const external = new Map<string, string>();
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const starts = [...new Set([...SITE_ROUTES, ...NAV_ITEMS.map((item) => item.href), '/credits'])].filter((route) => route !== '/editor');
    for (const start of starts) {
      const page = await context.newPage();
      await page.goto(`${site.url}${start}`, { waitUntil: 'load' });
      await page.waitForTimeout(500);
      const hrefs = await page.$$eval('a[href]', (links) => links.map((link) => (link as HTMLAnchorElement).getAttribute('href') || ''));
      for (const href of hrefs) {
        if (!href || href.startsWith('#') || /^(mailto|tel|javascript):/.test(href)) continue;
        if (/^https?:\/\//.test(href)) {
          if (href.startsWith(site.url)) internal.add(new URL(href).pathname + new URL(href).search);
          else external.set(href, start);
        } else if (href.startsWith('/')) internal.add(href);
        else assert.fail(`${start} has a relative link "${href}" that would 404`);
      }
      await page.close();
    }
    for (const [href, from] of external) assert.match(href, /^https:\/\/[^/\s]+\.[^/\s]+/, `${from}: external link ${href} is not an absolute https URL`);
    assert.ok(internal.size >= NAV_ITEMS.length);

    const checker = await context.newPage();
    for (const href of internal) {
      const pathname = href.split('?')[0].split('#')[0];
      if (pathname === '/editor' || pathname.startsWith('/oauth2') || pathname.startsWith('/api/')) continue;
      const response = await checker.goto(`${site.url}${href}`, { waitUntil: 'load' });
      assert.equal(response?.status(), 200, `${href} status`);
      assert.match(response?.headers()['content-type'] || '', /^text\/html/, `${href} type`);
      await checker.waitForSelector('[data-sidebar="dawn"]', { state: 'attached', timeout: 10_000 }).catch(() => assert.fail(`${href} has no shared sidebar`));
      assert.equal(await checker.locator('[data-bar="dawn"]').count(), 1, `${href} top bar`);
    }
    const text = await checker.evaluate(() => document.body.innerText);
    assert.doesNotMatch(text, /sign.?out|sign in/i, 'no sign-in copy');
  } finally {
    await browser.close();
    await site.close();
  }
});

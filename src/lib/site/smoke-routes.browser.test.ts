import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { chromium, type Browser } from 'playwright-core';
import { MISSING_ROUTES, ROUTES } from '../../../scripts/lib/routes.mjs';
import { serveOut } from '../../../scripts/lib/static-server.mjs';
import { SITE_ROUTES } from './nav.ts';

const outDir = path.resolve('out');
const chromeBin = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium'].find((file) => existsSync(file));
const skip = !chromeBin ? 'Chrome is not installed' : !existsSync(path.join(outDir, '404.html')) ? 'run `npm run build` first so out/ exists' : false;

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

test('the route list used by the audit matches the site map', () => {
  assert.deepEqual(
    ROUTES.map((route: { path: string }) => route.path).sort(),
    [...SITE_ROUTES].sort(),
  );
});

test('every exported route renders cleanly on desktop and phone', { skip, timeout: 240_000 }, async (t) => {
  const site = await serveOut(outDir);
  const browser: Browser = await chromium.launch({ executablePath: chromeBin, headless: true, args: ['--no-sandbox'] });
  try {
    for (const route of ROUTES as { path: string }[]) {
      for (const viewport of VIEWPORTS) {
        await t.test(`${route.path} (${viewport.name})`, async () => {
          const context = await browser.newContext({ viewport });
          const page = await context.newPage();
          const pageErrors: string[] = [];
          const badResponses: string[] = [];
          page.on('pageerror', (error) => pageErrors.push(error.message));
          page.on('response', (response) => {
            if (response.status() >= 400) badResponses.push(`${response.status()} ${new URL(response.url()).pathname}`);
          });
          try {
            const response = await page.goto(`${site.url}${route.path}`, { waitUntil: 'load' });
            assert.equal(response?.status(), 200, 'document status');
            await page.waitForTimeout(400);

            assert.deepEqual(pageErrors, [], 'uncaught page errors');
            // Static hosting has no desk or gateway, so the pages probe /api/* and get 404. Anything else is a real miss.
            assert.deepEqual(badResponses.filter((entry) => !/ \/api\//.test(entry)), [], 'missing assets or routes');

            const facts = await page.evaluate(() => ({
              main: Boolean(document.querySelector('main, [role="main"]')),
              h1: document.querySelectorAll('h1').length,
              font: getComputedStyle(document.body).fontFamily,
              token: getComputedStyle(document.documentElement).getPropertyValue('--dawn-bg').trim(),
              overflow: document.documentElement.scrollWidth - window.innerWidth,
            }));
            assert.ok(facts.main, 'has a main landmark');
            assert.ok(facts.h1 >= 1, 'has an h1');
            assert.ok(!/^"?Times/i.test(facts.font), `body font should come from the app, got ${facts.font}`);
            assert.ok(facts.token, 'design tokens are loaded');
            assert.ok(facts.overflow <= 1, `horizontal overflow of ${facts.overflow}px`);
          } finally {
            await context.close();
          }
        });
      }
    }
  } finally {
    await browser.close();
    await site.close();
  }
});

test('an unknown path gets the branded 404 page with a 404 status', { skip }, async () => {
  const site = await serveOut(outDir);
  const browser: Browser = await chromium.launch({ executablePath: chromeBin, headless: true, args: ['--no-sandbox'] });
  try {
    for (const route of MISSING_ROUTES as { path: string }[]) {
      const page = await browser.newPage();
      const response = await page.goto(`${site.url}${route.path}`);
      assert.equal(response?.status(), 404);
      assert.ok(await page.locator('main h1').first().isVisible(), 'the 404 page has a heading');
      assert.ok((await page.locator('header nav a').count()) >= 5, 'the 404 page keeps the site nav');
      await page.close();
    }
  } finally {
    await browser.close();
    await site.close();
  }
});

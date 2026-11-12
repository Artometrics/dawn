import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { chromium, type Browser } from 'playwright-core';
import { serveOut } from '../../../scripts/lib/static-server.mjs';
import { NAV_ITEMS, SITE_ROUTES } from './nav.ts';

const outDir = path.resolve('out');
const chromeBin = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium'].find((file) => existsSync(file));
const skip = !chromeBin ? 'Chrome is not installed' : !existsSync(path.join(outDir, '404.html')) ? 'run `npm run build` first so out/ exists' : false;

const sitemapLinks = (): string[] => {
  const text = readFileSync(path.resolve('docs/process/design/shared-shell/SITEMAP.md'), 'utf8');
  return [...new Set([...text.matchAll(/`(\/[^`\s]*)`/g)].map((match) => match[1]).filter((href) => !href.includes('<') && !href.includes('*')))];
};

test('every sidebar and SITEMAP link returns 200 text/html, and unknown routes return a 404 page as html', { skip }, async () => {
  const site = await serveOut(outDir);
  try {
    const links = new Set([...NAV_ITEMS.map((item) => item.href), '/credits', ...sitemapLinks().filter((href) => SITE_ROUTES.includes(href.split('?')[0]))]);
    assert.ok(links.size >= NAV_ITEMS.length);
    for (const href of links) {
      const response = await fetch(`${site.url}${href}`);
      assert.equal(response.status, 200, `${href} status`);
      assert.match(response.headers.get('content-type') || '', /^text\/html/, `${href} type`);
    }
    for (const missing of ['/chats', '/nowhere/at/all']) {
      const response = await fetch(`${site.url}${missing}`);
      assert.equal(response.status, 404);
      assert.match(response.headers.get('content-type') || '', /^text\/html/);
      assert.match(await response.text(), /data-bar="dawn"|Dawn/);
    }
  } finally {
    await site.close();
  }
});

test('every route renders the same top bar, the same sidebar items in the same order, and no tab bar or footer', { skip, timeout: 240_000 }, async () => {
  const site = await serveOut(outDir);
  const browser: Browser = await chromium.launch({ executablePath: chromeBin, headless: true, args: ['--no-sandbox'] });
  const expected = NAV_ITEMS.map((item) => `${item.id}|${item.href}|${item.label}`);
  try {
    for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 800 }]) {
      for (const route of [...SITE_ROUTES, '/nowhere']) {
        const context = await browser.newContext({ viewport });
        const page = await context.newPage();
        try {
          await page.goto(`${site.url}${route}`, { waitUntil: 'load' });
          await page.waitForSelector('[data-sidebar="dawn"]', { state: 'attached' });
          const facts = await page.evaluate(() => {
            const bar = document.querySelector('[data-bar="dawn"]');
            return {
              bars: document.querySelectorAll('[data-bar="dawn"]').length,
              sidebars: document.querySelectorAll('[data-sidebar="dawn"]').length,
              barParts: bar ? [...bar.children].map((child) => child.tagName.toLowerCase()) : [],
              menu: Boolean(bar?.querySelector('[data-menu]')),
              account: Boolean(bar?.querySelector('[aria-label="Account"]')),
              items: [...document.querySelectorAll('[data-sidebar="dawn"] [data-nav]')].map((link) => `${link.getAttribute('data-nav')}|${link.getAttribute('href')}|${link.textContent?.trim()}`),
              tabBars: document.querySelectorAll('.dw-nav, .dw-footer, [role="tablist"].ag-tabs, .ag-tabbar, footer').length,
            };
          });
          const where = `${route} @${viewport.width}`;
          assert.equal(facts.bars, 1, `${where}: one top bar`);
          assert.equal(facts.sidebars, 1, `${where}: one sidebar`);
          assert.ok(facts.menu && facts.account, `${where}: menu button and account button`);
          assert.deepEqual(facts.items, expected, `${where}: sidebar items`);
          assert.equal(facts.tabBars, 0, `${where}: no tab bar or footer`);
          assert.deepEqual(facts.barParts, ['button', 'h2', 'button'], `${where}: bar is menu, title, account`);
        } finally {
          await context.close();
        }
      }
    }
  } finally {
    await browser.close();
    await site.close();
  }
});

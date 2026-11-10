import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright-core';
import { serveOut } from '../../../scripts/lib/static-server.mjs';

const outDir = path.resolve('out');
const chromeBin = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium'].find((file) => existsSync(file));
const skip = !chromeBin ? 'Chrome is not installed' : !existsSync(path.join(outDir, 'atlas/index.html')) ? 'run `npm run build` first so out/ exists' : false;

const SIZES = [
  { name: 'desktop', width: 1440, height: 900, touch: false },
  { name: 'phone', width: 390, height: 844, touch: true },
];
const KEY = 'dawn.atlas.cardinal.v2';

type Watch = { errors: string[]; bad: string[] };

async function open(browser: Browser, url: string, size: (typeof SIZES)[number]) {
  const context: BrowserContext = await browser.newContext({
    viewport: { width: size.width, height: size.height },
    hasTouch: size.touch,
    isMobile: size.touch,
    deviceScaleFactor: size.touch ? 2 : 1,
  });
  const page = await context.newPage();
  const watch: Watch = { errors: [], bad: [] };
  page.on('pageerror', (error) => watch.errors.push(error.message));
  page.on('response', (response) => {
    // Static hosting has no desk or gateway, so Dawn pages probe /api/* and get 404. Anything else is a real miss.
    if (response.status() >= 400 && !/\/api\//.test(response.url())) watch.bad.push(`${response.status()} ${new URL(response.url()).pathname}`);
  });
  page.on('requestfailed', (request) => {
    // Next aborts its own prefetch of the home link's payload; that is not a missing file.
    if (request.resourceType() === 'fetch' && request.failure()?.errorText === 'net::ERR_ABORTED') return;
    watch.bad.push(`failed ${request.url()}`);
  });
  await page.goto(`${url}/atlas`, { waitUntil: 'load' });
  await page.waitForSelector('.at-root[data-ready="true"] [data-place="maus"]');
  await page.waitForFunction(() => !document.querySelector('.at-map-note'), null, { timeout: 15_000 });
  return { context, page, watch };
}

const press = (page: Page, selector: string, touch: boolean) => (touch ? page.locator(selector).first().tap() : page.locator(selector).first().click());

test('the Atlas page loads as a static page and opens on Cardinal', { skip, timeout: 120_000 }, async (t) => {
  const site = await serveOut(outDir);
  const browser = await chromium.launch({ executablePath: chromeBin, headless: true, args: ['--no-sandbox'] });
  try {
    for (const size of SIZES) {
      await t.test(`opens on the Founders' Walk (${size.name})`, async () => {
        const { context, page, watch } = await open(browser, site.url, size);
        try {
          assert.equal(await page.locator('.at-root').getAttribute('data-region'), 'cardinal');
          assert.equal(await page.locator('.at-root').getAttribute('data-layout'), size.touch ? 'narrow' : 'wide');
          assert.equal(await page.locator('h1').innerText(), 'Atlas');
          assert.match(await page.locator('[data-view="route"] h2').innerText(), /Founders/);

          const drawn = await page.evaluate(() => {
            const canvas = document.querySelector<HTMLCanvasElement>('.at-canvas');
            if (!canvas) return 0;
            const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
            let lit = 0;
            for (let i = 0; i < data.length; i += 4 * 17) if (Math.abs(data[i] - 0x16) + Math.abs(data[i + 1] - 0x18) + Math.abs(data[i + 2] - 0x16) > 12) lit += 1;
            return lit / (data.length / (4 * 17));
          });
          assert.ok(drawn > 0.1, `the basemap should be drawn, only ${(drawn * 100).toFixed(1)}% of pixels are not ground`);

          const credit = await page.locator('.at-credit').innerText();
          assert.match(credit, /OpenStreetMap contributors/);
          assert.match(credit, /ODbL/);
          assert.equal(await page.locator('.at-credit a[href*="openstreetmap.org/copyright"]').count(), 1);
          assert.ok(await page.locator('.at-credit').isVisible());

          assert.equal(await page.locator('[data-sprite]').isVisible(), true, 'the pixel character is on the map');
          assert.equal(await page.locator('[data-zone="live"]').count(), 1, 'the live zone is drawn around the first stop');
          assert.equal(await page.locator('[data-leg]').count(), 7, 'seven legs between eight stops');

          const overflow = await page.evaluate(() => ({
            page: document.documentElement.scrollWidth - window.innerWidth,
            root: (document.querySelector('.at-root') as HTMLElement).scrollWidth - (document.querySelector('.at-root') as HTMLElement).clientWidth,
          }));
          assert.ok(overflow.page <= 0, `page scrolls sideways by ${overflow.page}px`);
          assert.ok(overflow.root <= 0, `atlas scrolls sideways by ${overflow.root}px`);
          assert.deepEqual(watch.errors, []);
          assert.deepEqual(watch.bad, []);
        } finally {
          await context.close();
        }
      });

      await t.test(`every visible control is 44px or taller (${size.name})`, async () => {
        const { context, page } = await open(browser, site.url, size);
        try {
          const measure = () =>
            page.evaluate(() => {
              const out: string[] = [];
              const vh = window.innerHeight;
              for (const el of document.querySelectorAll<HTMLElement>('.at-root button, .at-root a, .at-root input, .at-root summary')) {
                const r = el.getBoundingClientRect();
                if (r.width === 0 || r.height === 0 || r.bottom < 0 || r.top > vh) continue;
                const isLink = el.tagName === 'A' && !el.classList.contains('at-round');
                if (r.height < 43.5 || (!isLink && r.width < 43.5)) out.push(`${el.tagName} "${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
              }
              return out;
            });
          const small: string[] = [];
          for (const tab of ['Places', 'Story', 'You', 'Tours']) {
            await page.getByRole('tab', { name: tab }).click();
            if (tab === 'Story') await page.locator('[data-thread] > button').first().click();
            small.push(...(await measure()).map((entry) => `${tab}: ${entry}`));
          }
          await press(page, '[data-place="maus"]', size.touch);
          await page.waitForSelector('[data-card="maus"]');
          small.push(...(await measure()).map((entry) => `card: ${entry}`));
          assert.deepEqual(small, []);
        } finally {
          await context.close();
        }
      });

      await t.test(`a place opens with its story, sources and quiz (${size.name})`, async () => {
        const { context, page } = await open(browser, site.url, size);
        try {
          await press(page, '[data-place="memchu"]', size.touch);
          const card = page.locator('[data-card="memchu"]');
          await card.waitFor();
          assert.equal(await card.locator('h2').innerText(), 'Memorial Church');
          assert.match(await card.innerText(), /Jane Stanford built Memorial Church/);
          assert.ok((await card.locator('a[href^="https://"][rel~="noopener"]').count()) >= 1, 'sources link out safely');
          assert.equal(await card.locator('.at-answer').count(), 3);
          assert.equal(await page.locator('[data-place="memchu"]').getAttribute('aria-pressed'), 'true');
          await card.getByRole('button', { name: 'Back' }).click();
          assert.equal(await page.locator('[data-card]').count(), 0);
        } finally {
          await context.close();
        }
      });

      await t.test(`a tour walks, unlocks stops and survives a reload (${size.name})`, async () => {
        const { context, page, watch } = await open(browser, site.url, size);
        try {
          await press(page, '[data-action="cta"]', size.touch);
          await page.waitForSelector('[data-card="maus"]');
          assert.equal(await page.locator('[data-place="maus"]').getAttribute('data-state'), 'unlocked');

          await press(page, '[data-action="cta"]', size.touch);
          await page.waitForSelector('[data-sprite].is-walking');
          assert.match(await page.locator('[data-action="cta"]').innerText(), /Stop walking/);
          await page.waitForSelector('[data-card="angel"]', { timeout: 15_000 });
          assert.equal(await page.locator('[data-sprite].is-walking').count(), 0);
          assert.equal(await page.locator('[data-leg="done"]').count(), 1);

          const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || 'null'), KEY);
          assert.deepEqual(saved.unlocked, ['maus', 'angel']);
          assert.equal(saved.at, 'angel');

          await page.reload({ waitUntil: 'load' });
          await page.waitForSelector('.at-root[data-ready="true"] [data-place="maus"]');
          assert.equal(await page.locator('[data-place="maus"]').getAttribute('data-state'), 'unlocked');
          assert.equal(await page.locator('[data-place="angel"]').getAttribute('data-state'), 'unlocked');
          assert.match(await page.locator('[data-action="cta"]').innerText(), /Walk to Arizona Cactus Garden/);

          await page.getByRole('tab', { name: 'You' }).click();
          assert.equal(await page.locator('[data-stat="stops"]').innerText(), '2/27');
          assert.deepEqual(watch.errors, []);
        } finally {
          await context.close();
        }
      });

      await t.test(`search, story and keyboard zoom work (${size.name})`, async () => {
        const { context, page } = await open(browser, site.url, size);
        try {
          const search = page.getByRole('searchbox', { name: 'Search places' });
          await search.fill('hoover');
          await page.waitForSelector('[data-row="hoover-tower"], [data-row]');
          const rows = await page.locator('[data-row]').count();
          assert.ok(rows >= 1 && rows < 10, `search narrows the list, got ${rows}`);
          await search.fill('zzzz');
          assert.match(await page.locator('[role="tabpanel"]').innerText(), /No places match/);
          await page.getByRole('button', { name: 'Clear search' }).click();

          await page.getByRole('tab', { name: 'Story' }).click();
          await page.locator('[data-thread] > button').first().click();
          assert.ok((await page.locator('[data-thread] a[href^="https://"]').count()) >= 1, 'thread facts carry sources');

          if (size.touch) await page.locator('.at-grab').tap();
          const map = page.locator('.at-map');
          const before = Number(await map.getAttribute('data-scale'));
          await map.focus();
          await page.keyboard.press('+');
          await page.waitForFunction((b) => Number(document.querySelector('.at-map')!.getAttribute('data-scale')) > b, before);
          await page.getByRole('button', { name: 'Zoom out' }).click();
          const after = Number(await map.getAttribute('data-scale'));
          assert.ok(after > 0 && after < before * 1.4);
        } finally {
          await context.close();
        }
      });
    }

    await t.test('the phone sheet snaps to 26, 46 and 78 percent', async () => {
      const { context, page } = await open(browser, site.url, SIZES[1]);
      try {
        const stage = (await page.locator('.at-stage').boundingBox())!;
        const ratios: number[] = [];
        for (let i = 0; i < 3; i += 1) {
          const sheet = (await page.locator('.at-sheet').boundingBox())!;
          ratios.push(Math.round((sheet.height / stage.height) * 100));
          await page.locator('.at-grab').tap();
          await page.waitForTimeout(350);
        }
        assert.deepEqual(ratios, [46, 78, 26]);
      } finally {
        await context.close();
      }
    });
  } finally {
    await browser.close();
    await site.close();
  }
});

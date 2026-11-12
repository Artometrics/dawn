import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright-core';
import { serveOut } from '../../../scripts/lib/static-server.mjs';

const outDir = path.resolve('out');
const chromeBin = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium'].find((file) => existsSync(file));
const skip = !chromeBin ? 'Chrome is not installed' : !existsSync(path.join(outDir, 'town/index.html')) ? 'run `npm run build` first so out/ exists' : false;

const SIZES = [
  { name: 'phone 390x844', width: 390, height: 844, touch: true },
  { name: 'desktop 1280x800', width: 1280, height: 800, touch: false },
];
const PINNED = ['Atlas Scout', 'Code Mage', 'Recipe Keeper', 'Letter Carrier', 'Studio Painter', 'Agents Desk'];

async function openHome(browser: Browser, url: string, size: (typeof SIZES)[number], route = '/') {
  const context: BrowserContext = await browser.newContext({
    viewport: { width: size.width, height: size.height },
    hasTouch: size.touch,
    isMobile: size.touch,
    deviceScaleFactor: size.touch ? 2 : 1,
  });
  const page = await context.newPage();
  const errors: string[] = [];
  const bad: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    // Static hosting has no desk or gateway, so the sidebar's desk probe gets 404. Anything else is a real miss.
    if (response.status() >= 400 && !/\/api\//.test(response.url())) bad.push(`${response.status()} ${new URL(response.url()).pathname}`);
  });
  const response = await page.goto(`${url}${route}`, { waitUntil: 'load' });
  assert.equal(response?.status(), 200);
  await page.waitForSelector('.at-root[data-ready="true"] [data-place="maus"]');
  await page.waitForFunction(() => !document.querySelector('.at-map-note'), null, { timeout: 15_000 });
  return { context, page, errors, bad };
}

const tap = (page: Page, touch: boolean, selector: string) => (touch ? page.locator(selector).first().tap() : page.locator(selector).first().click());

/** Where the map's left edge is, in CSS pixels. It is 0 with the sidebar shut. */
const stageLeft = (page: Page) => page.evaluate(() => Math.round(document.querySelector('.ah-stage')!.getBoundingClientRect().left));
const drawerOpen = (page: Page) => page.locator('#dawn-menu').getAttribute('data-open');

async function settle(page: Page) {
  await page.waitForTimeout(450);
}

async function assertMap(page: Page, touch: boolean) {
  assert.equal(await page.locator('.at-root').getAttribute('data-framed'), 'home');
  assert.equal(await page.locator('.at-root').getAttribute('data-region'), 'cardinal');
  assert.equal(await page.locator('.at-root').getAttribute('data-layout'), touch ? 'narrow' : 'wide');
  assert.equal(await page.locator('h1').innerText(), 'Atlas');
  assert.equal(await page.locator('.ph-canvas').count(), 0, 'the 8-bit town is not on the home screen');
  assert.match(await page.locator('[data-action="cta"]').innerText(), /Start at Stanford Mausoleum/);
  assert.match(await page.locator('[data-view="route"] h2').innerText(), /Founders/);
  for (const tab of ['Places', 'Tours', 'Story', 'You']) assert.equal(await page.getByRole('tab', { name: tab }).count(), 1, `${tab} tab`);
  for (const label of ['Show where I am on street tiles', 'Zoom in', 'Zoom out', 'Find my character', 'Fit the tour on screen']) {
    assert.equal(await page.getByRole('button', { name: label }).count(), 1, label);
  }
  const drawn = await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('.at-canvas');
    if (!canvas) return 0;
    const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
    let lit = 0;
    for (let i = 0; i < data.length; i += 4 * 17) if (Math.abs(data[i] - 0x16) + Math.abs(data[i + 1] - 0x18) + Math.abs(data[i + 2] - 0x16) > 12) lit += 1;
    return lit / (data.length / (4 * 17));
  });
  assert.ok(drawn > 0.1, `the basemap should be drawn, only ${(drawn * 100).toFixed(1)}% of pixels are not ground`);
  assert.equal(await page.locator('[data-sprite]').isVisible(), true, 'the pixel character is on the map');
  assert.match(await page.locator('.at-credit').innerText(), /OpenStreetMap contributors/);
}

async function assertSidebarContent(page: Page) {
  const menu = page.locator('#dawn-menu');
  assert.equal(await menu.getAttribute('aria-label'), 'Dawn');
  assert.equal(await menu.locator('.dd-mark').innerText(), 'Dawn');
  const links = new Map<string, string>();
  for (const a of await menu.locator('a[data-drawer-link]').all()) links.set((await a.innerText()).trim(), (await a.getAttribute('href')) || '');
  assert.deepEqual([...links.keys()], ['Projects', 'Code', 'Artifacts', 'Village', 'Dawn Town']);
  assert.equal(links.get('Village'), '/village?section=village');
  assert.equal(links.get('Dawn Town'), '/town');
  assert.deepEqual(await menu.locator('a[data-pinned]').allInnerTexts(), PINNED);
  assert.equal(await menu.getByText('Pinned', { exact: true }).count(), 1);
  assert.equal(await menu.getByText('Recents', { exact: true }).count(), 1);
  assert.equal(await menu.getByRole('link', { name: 'Village history' }).getAttribute('href'), '/village?section=library');
  assert.equal(await menu.getByRole('button', { name: 'You' }).count(), 1, 'account button');
}

test('the Atlas map is the home screen, and the Dawn sidebar opens and closes', { skip, timeout: 180_000 }, async (t) => {
  const site = await serveOut(outDir);
  const browser = await chromium.launch({ executablePath: chromeBin, headless: true, args: ['--no-sandbox'] });
  try {
    for (const size of SIZES) {
      await t.test(`/ shows the map with the sidebar shut (${size.name})`, async () => {
        const { context, page, errors, bad } = await openHome(browser, site.url, size);
        try {
          await assertMap(page, size.touch);
          assert.equal(await drawerOpen(page), 'false');
          assert.equal(await page.locator('#dawn-menu').isVisible(), false, 'the shut sidebar is hidden from sight and focus');
          assert.equal(await page.locator('button[aria-controls="dawn-menu"]').getAttribute('aria-expanded'), 'false');
          assert.equal(await stageLeft(page), 0);
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
          assert.ok(overflow <= 0, `page scrolls sideways by ${overflow}px`);
          assert.deepEqual(errors, []);
          assert.deepEqual(bad, []);
        } finally {
          await context.close();
        }
      });

      await t.test(`the top-left button opens the sidebar and its close button shuts it (${size.name})`, async () => {
        const { context, page, errors } = await openHome(browser, site.url, size);
        try {
          await tap(page, size.touch, 'button[aria-label="Menu"]');
          await settle(page);
          assert.equal(await drawerOpen(page), 'true');
          assert.equal(await page.locator('#dawn-menu').isVisible(), true);
          assert.equal(await page.locator('button[aria-controls="dawn-menu"]').getAttribute('aria-expanded'), 'true');
          await assertSidebarContent(page);
          const drawerWidth = await page.evaluate(() => Math.round(document.getElementById('dawn-menu')!.getBoundingClientRect().width));
          assert.equal(await stageLeft(page), drawerWidth, 'the map makes room for the sidebar');
          if (size.touch) assert.equal(drawerWidth, 318, 'the sidebar leaves a 72px strip of map on a 390px phone');
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
          assert.ok(overflow <= 0, `page scrolls sideways by ${overflow}px with the sidebar open`);

          const small = await page.evaluate(() => {
            const out: string[] = [];
            for (const el of document.querySelectorAll<HTMLElement>('#dawn-menu button, #dawn-menu a')) {
              const r = el.getBoundingClientRect();
              if (r.width === 0 || r.height === 0 || r.bottom > window.innerHeight) continue;
              if (r.height < 43.5) out.push(`${el.tagName} "${(el.textContent || '').trim().slice(0, 24)}" ${Math.round(r.height)}px`);
            }
            return out;
          });
          assert.deepEqual(small, [], 'every sidebar target is 44px or taller');

          await tap(page, size.touch, '#dawn-menu button[aria-label="Close menu"]');
          await settle(page);
          assert.equal(await drawerOpen(page), 'false');
          assert.equal(await stageLeft(page), 0);
          assert.equal(await page.locator('button[aria-controls="dawn-menu"]').getAttribute('aria-expanded'), 'false');
          assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), 'Menu', 'focus returns to the menu button');

          await tap(page, size.touch, 'button[aria-label="Menu"]');
          await settle(page);
          assert.equal(await drawerOpen(page), 'true');
          if (!size.touch) {
            await tap(page, size.touch, 'button[aria-label="Menu"]');
            await settle(page);
            assert.equal(await drawerOpen(page), 'false', 'on a wide window the menu button also toggles it shut');
          }
          assert.deepEqual(errors, []);
        } finally {
          await context.close();
        }
      });

      await t.test(`Escape shuts the sidebar (${size.name})`, async () => {
        const { context, page } = await openHome(browser, site.url, size);
        try {
          await tap(page, size.touch, 'button[aria-label="Menu"]');
          await settle(page);
          assert.equal(await drawerOpen(page), 'true');
          await page.keyboard.press('Escape');
          await settle(page);
          assert.equal(await drawerOpen(page), 'false');
        } finally {
          await context.close();
        }
      });

      await t.test(`the account button opens the You tab (${size.name})`, async () => {
        const { context, page } = await openHome(browser, site.url, size);
        try {
          await tap(page, size.touch, 'button[aria-label="Menu"]');
          await settle(page);
          await tap(page, size.touch, '#dawn-menu button[aria-label="You"]');
          await settle(page);
          assert.equal(await drawerOpen(page), 'false');
          assert.equal(await page.getByRole('tab', { name: 'You' }).getAttribute('aria-selected'), 'true');
        } finally {
          await context.close();
        }
      });
    }

    const phone = SIZES[0];
    await t.test('on a phone, tapping the map beside the sidebar shuts it', async () => {
      const { context, page } = await openHome(browser, site.url, phone);
      try {
        await tap(page, true, 'button[aria-label="Menu"]');
        await settle(page);
        assert.equal(await page.locator('.ah-scrim').count(), 1);
        await page.touchscreen.tap(phone.width - 20, 400);
        await settle(page);
        assert.equal(await drawerOpen(page), 'false');
        assert.equal(await page.locator('.ah-scrim').count(), 0);
        assert.equal(await stageLeft(page), 0);
      } finally {
        await context.close();
      }
    });

    await t.test('on a phone, swiping left shuts the sidebar and a slight nudge does not', async () => {
      const { context, page } = await openHome(browser, site.url, phone);
      try {
        const drag = async (from: [number, number], to: [number, number]) => {
          await page.mouse.move(...from);
          await page.mouse.down();
          await page.mouse.move(to[0], to[1], { steps: 6 });
          await page.mouse.up();
          await settle(page);
        };
        // x=250 is on the sidebar (its title row, which is not a link); x=340 is on the map strip beside it.
        // A small drag on the map strip is a click on the scrim, which shuts it too, so only the sidebar gets the nudge check.
        for (const [startX, y] of [[250, 50], [340, 500]]) {
          await tap(page, true, 'button[aria-label="Menu"]');
          await settle(page);
          assert.equal(await drawerOpen(page), 'true');
          if (startX < 318) {
            await drag([startX, y], [startX - 20, y + 5]);
            assert.equal(await drawerOpen(page), 'true', `a 20px nudge from x=${startX} keeps it open`);
          }
          await drag([startX, y], [startX - 160, y + 10]);
          assert.equal(await drawerOpen(page), 'false', `a swipe from x=${startX} shuts it`);
        }
      } finally {
        await context.close();
      }
    });

    await t.test('the sidebar is not shut by scrolling it up and down', async () => {
      const { context, page } = await openHome(browser, site.url, phone);
      try {
        await tap(page, true, 'button[aria-label="Menu"]');
        await settle(page);
        await page.mouse.move(150, 600);
        await page.mouse.down();
        await page.mouse.move(155, 300, { steps: 6 });
        await page.mouse.up();
        await settle(page);
        assert.equal(await drawerOpen(page), 'true');
      } finally {
        await context.close();
      }
    });

    await t.test('the sidebar links reach the village, the town, and the agents', async () => {
      for (const [label, expected] of [
        ['Village', /\/village\/?\?section=village/],
        ['Dawn Town', /\/town\/?$/],
        ['Atlas Scout', /\/town\/?\?bot=atlas-scout/],
      ] as const) {
        const { context, page } = await openHome(browser, site.url, phone);
        try {
          await tap(page, true, 'button[aria-label="Menu"]');
          await settle(page);
          await Promise.all([page.waitForURL(expected), page.locator('#dawn-menu').getByRole('link', { name: label, exact: true }).tap()]);
          await page.waitForSelector('.ph-canvas, .dawn-root h1, main h1');
        } finally {
          await context.close();
        }
      }
    });

    await t.test('the 8-bit town is still reachable at /town, the village at /village, and /atlas is the same home', async () => {
      const wide = SIZES[1];
      const town = await openTown(browser, site.url, wide);
      assert.ok(town.canvas > 0, 'the 8-bit town canvas is at /town');
      assert.deepEqual(town.errors, []);
      const { context, page, errors } = await openHome(browser, site.url, wide, '/atlas');
      try {
        await assertMap(page, false);
        assert.equal(await page.locator('#dawn-menu').count(), 1, '/atlas has the sidebar too');
        assert.deepEqual(errors, []);
      } finally {
        await context.close();
      }
      const ctx = await browser.newContext({ viewport: { width: wide.width, height: wide.height } });
      const village = await ctx.newPage();
      await village.goto(`${site.url}/village?section=village`, { waitUntil: 'load' });
      await village.waitForSelector('.dawn-root canvas', { timeout: 30_000 });
      await ctx.close();
    });

    await t.test('the page and its headers stay out of search engines', async () => {
      const response = await fetch(`${site.url}/`);
      assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow');
      const html = await response.text();
      assert.match(html, /<meta name="robots" content="noindex, nofollow"/);
    });
  } finally {
    await browser.close();
    await site.close();
  }
});

async function openTown(browser: Browser, url: string, size: (typeof SIZES)[number]) {
  const context = await browser.newContext({ viewport: { width: size.width, height: size.height } });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${url}/town`, { waitUntil: 'load' });
  await page.waitForSelector('.ph-canvas');
  const canvas = await page.locator('.ph-canvas').count();
  await context.close();
  return { canvas, errors };
}

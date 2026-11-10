// Forge (the Character Maker) in a real browser: layout, type, colour, tap size and console checks
// at desktop 1440, phone portrait 390 and phone landscape 844x390, in every state a visitor can reach.
// Needs `npm run build` (out/) and Chrome. Skips when either is missing, like the route smoke test.
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright-core';
import { measure } from '../../../scripts/lib/measure.mjs';
import { serveOut } from '../../../scripts/lib/static-server.mjs';

const outDir = path.resolve('out');
const chromeBin = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium'].find((file) => existsSync(file));
const skip = !chromeBin ? 'Chrome is not installed' : !existsSync(path.join(outDir, 'village/index.html')) ? 'run `npm run build` first so out/ exists' : false;

const VIEWPORTS = [
  { name: 'desktop 1440', width: 1440, height: 900, phone: false },
  { name: 'phone portrait 390', width: 390, height: 844, phone: true },
  { name: 'phone landscape 844', width: 844, height: 390, phone: true },
];
const FORGE = '/village/?section=characters';
const ROSTER_KEY = 'dawn.forge.roster.v1';

/** Every colour in tokens.css, so a stray hex on the Forge page can be told apart from a token. */
const tokenColors = [...readFileSync(path.resolve('src/styles/tokens.css'), 'utf8').matchAll(/--dawn-[a-z-]+:\s*(#[0-9a-fA-F]{3,8}|rgb\([^)]*\))\s*;/g)].map((match) => match[1]);

assert.ok(tokenColors.length > 20, 'tokens.css colours were read');

type Facts = {
  overflowX: number;
  pageScroll: number;
  tooSmall: string[];
  families: string[];
  strayColors: string[];
  canvas: { left: number; right: number; width: number; height: number } | null;
  offscreen: string[];
  unlabelled: string[];
  text: string;
};

/** Runs inside the page. */
function collect(args: { phone: boolean; tokens: string[] }): Facts {
  const { phone, tokens } = args;
  const vw = document.documentElement.clientWidth;
  const visible = (el: Element) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
  };
  const label = (el: Element) => `${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 24)}"`;
  const controls = [...document.querySelectorAll('button, a[href], input:not([type=hidden]), select, textarea, [role=button]')].filter(visible).filter((el) => !el.closest('.dw-sr-only, .sr-only') && !el.matches('.dw-sr-only, .sr-only'));
  const tooSmall = controls
    .filter((el) => {
      const r = el.getBoundingClientRect();
      // Desktop chips are the system's 36px size. Everything else, and every control on a phone, is 44px.
      const floor = !phone && el.classList.contains('dw-btn--chip') ? 36 : 44;
      return r.height < floor - 0.5 || r.width < Math.min(floor, 44) - 0.5;
    })
    .map((el) => `${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)} ${label(el)}`);

  const scope = [...document.querySelectorAll('.dawn-root *')].filter(visible).filter((el) => !el.closest('canvas'));
  const families = new Set<string>();
  const probe = document.createElement('i');
  document.body.append(probe);
  const normal = (value: string) => {
    probe.style.color = '';
    probe.style.color = value;
    return getComputedStyle(probe).color;
  };
  const allowed = new Set(tokens.map(normal).concat(['rgba(0, 0, 0, 0)']));
  const stray = new Set<string>();
  for (const el of scope) {
    const cs = getComputedStyle(el);
    if ([...el.childNodes].some((node) => node.nodeType === 3 && (node.textContent || '').trim())) {
      families.add(cs.fontFamily.split(',')[0].replace(/["']/g, '').trim());
    }
    // The colour inputs and portraits show the visitor's own pixels. Everything else is chrome.
    if (el.matches('input[type=color], img, svg, svg *')) continue;
    for (const [name, value] of [['color', cs.color], ['background', cs.backgroundColor], ['border', cs.borderTopWidth === '0px' ? 'rgba(0, 0, 0, 0)' : cs.borderTopColor]]) {
      if (!allowed.has(value)) stray.add(`${name} ${value} on ${label(el)}`);
    }
  }
  probe.remove();

  const canvas = document.querySelector('[data-forge-canvas]')?.getBoundingClientRect();
  const offscreen = controls
    .filter((el) => {
      const r = el.getBoundingClientRect();
      if (r.left >= -1 && r.right <= vw + 1) return false;
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        if (['auto', 'scroll'].includes(getComputedStyle(p).overflowX) && p.scrollWidth > p.clientWidth) return false;
      }
      return true;
    })
    .map(label);
  return {
    overflowX: document.documentElement.scrollWidth - window.innerWidth,
    pageScroll: (document.scrollingElement?.scrollHeight ?? 0) - window.innerHeight,
    tooSmall,
    families: [...families],
    strayColors: [...stray].slice(0, 8),
    canvas: canvas ? { left: canvas.left, right: canvas.right, width: canvas.width, height: canvas.height } : null,
    offscreen,
    unlabelled: controls.filter((el) => !(el.getAttribute('aria-label') || el.textContent?.trim() || el.getAttribute('placeholder') || (el as HTMLInputElement).labels?.length)).map(label),
    text: document.body.innerText,
  };
}

type Session = { context: BrowserContext; page: Page; consoleErrors: string[]; pageErrors: string[]; badResponses: string[] };

async function session(browser: Browser, origin: string, viewport: (typeof VIEWPORTS)[number], init?: string): Promise<Session> {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    isMobile: viewport.phone,
    hasTouch: viewport.phone,
    // Colour transitions are off, so contrast is read from settled colours.
    reducedMotion: 'reduce',
    acceptDownloads: true,
  });
  if (init) await context.addInitScript(init);
  const page = await context.newPage();
  const found: Session = { context, page, consoleErrors: [], pageErrors: [], badResponses: [] };
  page.on('console', (message) => {
    if (message.type() === 'error') found.consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => found.pageErrors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400) found.badResponses.push(`${response.status()} ${new URL(response.url()).pathname}`);
  });
  await page.goto(`${origin}${FORGE}`, { waitUntil: 'load' });
  await page.waitForSelector('[data-forge-canvas]', { timeout: 20000 });
  await page.waitForTimeout(1800);
  return found;
}

/** The checks every state has to pass. */
async function assertSound(found: Session, viewport: (typeof VIEWPORTS)[number], state: string, options: { webgl?: boolean } = {}) {
  const { page } = found;
  const facts = await page.evaluate(collect, { phone: viewport.phone, tokens: tokenColors });
  const metrics = await page.evaluate(measure);
  const where = `${viewport.name}, ${state}`;
  assert.ok(facts.overflowX <= 1, `${where}: page scrolls sideways by ${facts.overflowX}px`);
  assert.ok(facts.pageScroll <= 1, `${where}: the page itself scrolls vertically by ${facts.pageScroll}px, so the app shell can slide away`);
  assert.deepEqual(facts.tooSmall, [], `${where}: controls below the tap size`);
  assert.deepEqual(facts.offscreen, [], `${where}: controls off screen`);
  assert.deepEqual(facts.unlabelled, [], `${where}: controls with no name`);
  assert.deepEqual(facts.families.filter((family) => family !== 'Geist' && family !== 'Source Serif 4'), [], `${where}: fonts outside the type system`);
  assert.deepEqual(facts.strayColors, [], `${where}: colours that are not Dawn tokens`);
  assert.equal(metrics.smallTextCount, 0, `${where}: text under 12px ${metrics.smallText.join(', ')}`);
  assert.equal(metrics.lowContrastCount, 0, `${where}: low contrast ${metrics.lowContrast.join(', ')}`);
  assert.deepEqual(metrics.brokenImages, [], `${where}: broken images`);
  assert.ok(!/rainfall/i.test(facts.text), `${where}: Rainfall text on a Forge page`);
  assert.deepEqual(found.pageErrors, [], `${where}: uncaught errors`);
  assert.deepEqual(found.consoleErrors, [], `${where}: console errors`);
  assert.deepEqual(found.badResponses.filter((entry) => !/ \/api\//.test(entry)), [], `${where}: failed requests`);
  if (options.webgl !== false) {
    assert.ok(facts.canvas, `${where}: no 3D view`);
    assert.ok(facts.canvas.left >= -1 && facts.canvas.right <= viewport.width + 1, `${where}: 3D view runs off the screen`);
    assert.ok(facts.canvas.width >= 280 && facts.canvas.height >= 160, `${where}: 3D view is only ${facts.canvas.width}x${facts.canvas.height}`);
    const share = facts.canvas.height / viewport.height;
    assert.ok(share <= 0.75, `${where}: 3D view fills ${(share * 100).toFixed(0)}% of the window and pushes the controls away`);
  }
}

test('Forge is clean in every state on desktop and phones', { skip, timeout: 600_000 }, async (t) => {
  const site = await serveOut(outDir);
  const browser = await chromium.launch({
    executablePath: chromeBin,
    headless: true,
    args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });
  const dir = mkdtempSync(path.join(os.tmpdir(), 'forge-layout-'));
  const badFile = path.join(dir, 'bad.json');
  writeFileSync(badFile, JSON.stringify({ ...JSON.parse(readFileSync(path.resolve('src/lib/forge/presets/joan.json'), 'utf8')), parts: { head: 'oval', face: 'calm', hair: 'mohawk', outfit: 'plate', accessory: 'none' } }));
  try {
    for (const viewport of VIEWPORTS) {
      await t.test(`${viewport.name}: empty, editing, posing, errors, saved, roster, village`, async () => {
        const found = await session(browser, site.url, viewport);
        try {
          const { page } = found;
          await assertSound(found, viewport, 'empty');
          assert.match(await page.locator('h1').first().innerText(), /Characters/);
          assert.equal(await page.locator('main').count(), 1);
          assert.ok(await page.getByText('Nobody yet').isVisible(), 'empty roster says so');

          await page.getByRole('button', { name: 'Napoleon' }).click();
          await page.getByRole('button', { name: 'Stern' }).click();
          await page.getByRole('button', { name: 'Robe' }).click();
          await page.getByRole('button', { name: 'Laurel' }).click();
          await page.fill('#forge-epithet-input', 'The Emperor of the French, with an epithet long enough to test how a field holds a line');
          await assertSound(found, viewport, 'editing');

          await page.getByRole('button', { name: 'Guard' }).click();
          await page.getByRole('button', { name: 'Skeleton' }).click();
          await page.getByRole('button', { name: 'Turntable' }).click();
          assert.equal(await page.getByRole('button', { name: 'Guard' }).getAttribute('aria-pressed'), 'true');
          await assertSound(found, viewport, 'posing');
          await page.getByRole('button', { name: 'Skeleton' }).click();
          await page.getByRole('button', { name: 'Idle' }).click();

          await page.fill('#forge-name-input', '');
          await page.waitForSelector('[role=alert]');
          assert.ok(/name/i.test(await page.locator('[role=alert]').first().innerText()), 'a blank name is explained');
          await assertSound(found, viewport, 'blank name');
          await page.fill('#forge-name-input', 'Napoleon Bonaparte');

          await page.getByRole('button', { name: /^Save/ }).click();
          await page.waitForFunction(() => document.querySelector('[data-forge-status]')?.textContent?.includes('in your roster'), null, { timeout: 20000 });
          await assertSound(found, viewport, 'saved');

          await page.setInputFiles('[data-forge-import]', badFile);
          await page.waitForFunction(() => /Unknown/.test(document.querySelector('[data-forge-status]')?.textContent || ''), null, { timeout: 5000 });
          assert.equal(await page.locator('[data-forge-status]').getAttribute('role'), 'alert');
          await assertSound(found, viewport, 'import refused');

          for (const [name, saved] of [['JSON', 'JSON saved'], ['PNG', 'Portrait saved'], ['glTF', 'glTF saved']] as const) {
            const download = page.waitForEvent('download', { timeout: 20000 });
            await page.getByRole('button', { name, exact: true }).click();
            await download;
            await page.waitForFunction((text) => document.querySelector('[data-forge-status]')?.textContent?.includes(text), saved, { timeout: 20000 });
          }
          await assertSound(found, viewport, 'exported');

          await page.getByRole('button', { name: 'Sun Tzu' }).click();
          await page.getByRole('button', { name: 'Save to roster' }).click();
          await page.waitForFunction(() => document.querySelectorAll('[data-forge-roster] > li').length === 2, null, { timeout: 20000 });
          await page.getByRole('group', { name: 'Village avatar for Napoleon Bonaparte' }).getByRole('button', { name: 'Trinity' }).click();
          assert.ok(await page.getByRole('button', { name: 'See in village' }).isVisible());
          await assertSound(found, viewport, 'roster');

          const menu = page.getByRole('button', { name: 'Menu', exact: true });
          if (await menu.isVisible()) {
            await menu.click();
            await page.waitForTimeout(400);
            const drawer = await page.locator('aside[aria-label="Dawn"]').boundingBox();
            assert.ok(drawer && drawer.x >= -1 && drawer.x + drawer.width <= viewport.width + 1, `${viewport.name}: the menu drawer sits on screen`);
            assert.ok(drawer.y >= -1 && drawer.y + drawer.height <= viewport.height + 1, `${viewport.name}: the menu drawer fits the window height`);
            await assertSound(found, viewport, 'menu drawer');
            await page.keyboard.press('Escape');
            await page.waitForTimeout(400);
            assert.equal(await page.locator('aside[aria-label="Dawn"]').evaluate((el) => getComputedStyle(el).visibility), 'hidden', 'closed drawer leaves the tab order');
          } else {
            assert.ok(await page.locator('aside[aria-label="Dawn"]').isVisible(), `${viewport.name}: the menu is docked`);
          }

          await page.getByRole('button', { name: 'You', exact: true }).click();
          await assertSound(found, viewport, 'you panel');
          await page.keyboard.press('Escape');

          await page.getByRole('button', { name: 'See in village' }).click();
          await page.waitForSelector('canvas:not([data-forge-canvas])');
          await page.waitForTimeout(1500);
          await assertSound(found, viewport, 'village with the Forge avatar', { webgl: false });
          await page.getByRole('main').getByRole('button', { name: 'Trinity' }).click();
          await page.waitForSelector('#agent-prompt');
          await assertSound(found, viewport, 'agent sheet', { webgl: false });
        } finally {
          await found.context.close();
        }
      });
    }

    await t.test('a browser without WebGL gets a plain message, not a console error', async () => {
      const viewport = VIEWPORTS[1];
      const found = await session(
        browser,
        site.url,
        viewport,
        `const real = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (kind, ...rest) { return /webgl/i.test(String(kind)) ? null : real.call(this, kind, ...rest); };`,
      );
      try {
        assert.ok(await found.page.getByRole('alert').filter({ hasText: 'could not start 3D' }).isVisible());
        await assertSound(found, viewport, 'no WebGL', { webgl: false });
        const download = found.page.waitForEvent('download', { timeout: 10000 });
        await found.page.getByRole('button', { name: 'JSON', exact: true }).click();
        await download;
        await found.page.getByRole('button', { name: 'Save to roster' }).click();
        await found.page.getByRole('alert').filter({ hasText: 'Could not draw the portrait' }).waitFor({ timeout: 20000 });
        await assertSound(found, viewport, 'no WebGL, save refused', { webgl: false });
      } finally {
        await found.context.close();
      }
    });

    await t.test('a full roster and a full phone are explained, and the page stays sound', async () => {
      for (const viewport of [VIEWPORTS[0], VIEWPORTS[1]]) {
        const character = JSON.parse(readFileSync(path.resolve('src/lib/forge/presets/joan.json'), 'utf8'));
        const roster = Array.from({ length: 12 }, (_, index) => ({
          id: `seed-character-${index + 1}`,
          character: { ...character, id: `joan-${index + 1}`, name: `Joan ${index + 1}` },
          portrait: '',
          sprite: '',
          agentId: '',
          createdAt: 1_790_000_000_000 + index,
          updatedAt: 1_790_000_000_000 + index,
        }));
        const full = await session(browser, site.url, viewport, `localStorage.setItem(${JSON.stringify(ROSTER_KEY)}, ${JSON.stringify(JSON.stringify(roster))});`);
        try {
          assert.ok(await full.page.getByRole('alert').filter({ hasText: 'roster holds 12' }).isVisible());
          assert.ok(await full.page.getByRole('button', { name: /^Save/ }).isDisabled());
          await assertSound(full, viewport, 'full roster');
        } finally {
          await full.context.close();
        }

        const refused = await session(
          browser,
          site.url,
          viewport,
          `const set = Storage.prototype.setItem; Storage.prototype.setItem = function (key, value) { if (String(key).startsWith('dawn.forge')) throw new DOMException('full', 'QuotaExceededError'); return set.call(this, key, value); };`,
        );
        try {
          await refused.page.getByRole('button', { name: 'Save to roster' }).click();
          await refused.page.getByRole('alert').filter({ hasText: 'no room left' }).waitFor({ timeout: 20000 });
          assert.ok(!/in your roster/.test(await refused.page.locator('[data-forge-status]').innerText()), 'a failed save does not claim success');
          await assertSound(refused, viewport, 'storage refused');
        } finally {
          await refused.context.close();
        }
      }
    });
  } finally {
    await browser.close();
    await site.close();
  }
});

// Browser audit of Forge, the Character Maker (/village/?section=characters), in every state.
//   node scripts/forge-audit.mjs --serve out --out docs/process/test/forge-before --shots docs/process/design/forge/before --label before
// For desktop 1440x900, phone portrait 390x844 and phone landscape 844x390 it walks the maker through
// empty, editing, posing, saving, exporting and error states plus the menu drawer, the You panel, the
// village and the agent sheet. For each state it records layout and design metrics (same checks as
// scripts/site-audit.mjs), console and network problems, and takes a full-page screenshot (header to footer).
// Uses the system Chrome through playwright-core with software WebGL. Nothing is sent anywhere.
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { measure } from './lib/measure.mjs';
import { serveOut } from './lib/static-server.mjs';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, arg, i, all) => {
    if (arg.startsWith('--')) pairs.push([arg.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : 'true']);
    return pairs;
  }, []),
);
const outDir = path.resolve(args.out || 'docs/process/test/forge-audit');
const shotsDir = args.shots ? path.resolve(args.shots) : null;
const label = args.label || 'forge';
const only = args.only ? args.only.split(',') : null;
const base = args.base || null;

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900, mobile: false },
  { name: 'mobile', width: 390, height: 844, mobile: true },
  { name: 'landscape', width: 844, height: 390, mobile: true },
];
const PATH = '/village/?section=characters';
const CHROME = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium'].find((file) => existsSync(file));
if (!CHROME) throw new Error('Chrome is not installed');

const served = base ? null : await serveOut(path.resolve(args.serve || 'out'));
const origin = base || served.url;
const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
await mkdir(outDir, { recursive: true });
if (shotsDir) await mkdir(shotsDir, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const results = { label, date: new Date().toISOString(), origin, viewports: {} };

/** Extra checks that only matter for Forge: canvas size and position, clipped controls, scroll containers. */
function forgeFacts() {
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;
  const canvas = document.querySelector('[data-forge-canvas]');
  const box = canvas?.getBoundingClientRect();
  const scroller = document.querySelector('[data-forge-scroll]');
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
  };
  const offscreen = [...document.querySelectorAll('button, a[href], input, select')]
    .filter(visible)
    .filter((el) => !el.closest('.sr-only'))
    .filter((el) => {
      const r = el.getBoundingClientRect();
      if (r.left >= -1 && r.right <= vw + 1) return false;
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const cs = getComputedStyle(p);
        if (['auto', 'scroll'].includes(cs.overflowX) && p.scrollWidth > p.clientWidth) return false;
      }
      return true;
    })
    .slice(0, 6)
    .map((el) => `${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 24)}"`);
  const newQuest = [...document.querySelectorAll('button')].find((el) => el.textContent.trim() === 'New quest');
  const save = [...document.querySelectorAll('button')].find((el) => /^(Saving|Save)/.test(el.textContent.trim()));
  let covered = false;
  if (newQuest && save && visible(newQuest) && visible(save)) {
    const a = newQuest.getBoundingClientRect();
    const b = save.getBoundingClientRect();
    covered = a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  }
  const fonts = {};
  for (const el of document.querySelectorAll('[data-forge-scroll] *')) {
    if (!visible(el)) continue;
    const fam = getComputedStyle(el).fontFamily.split(',')[0].replace(/["']/g, '').trim();
    fonts[fam] = (fonts[fam] || 0) + 1;
  }
  const palette = {};
  for (const el of document.querySelectorAll('[data-forge-scroll] *')) {
    if (!visible(el)) continue;
    const cs = getComputedStyle(el);
    for (const value of [cs.color, cs.backgroundColor, cs.borderTopColor]) {
      if (value && value !== 'rgba(0, 0, 0, 0)') palette[value] = (palette[value] || 0) + 1;
    }
  }
  return {
    canvas: box ? { x: Math.round(box.x), y: Math.round(box.y), w: Math.round(box.width), h: Math.round(box.height) } : null,
    canvasInsideWidth: box ? box.left >= -1 && box.right <= vw + 1 : null,
    canvasShareOfViewportHeight: box ? Number((box.height / vh).toFixed(2)) : null,
    scrollerHeight: scroller ? { scroll: scroller.scrollHeight, client: scroller.clientHeight } : null,
    offscreen,
    newQuestCoversSave: covered,
    fonts,
    palette,
    pageScroll: document.scrollingElement.scrollHeight - window.innerHeight,
    status: document.querySelector('[data-forge-status]')?.textContent?.trim() ?? null,
    alerts: [...document.querySelectorAll('[role=alert]')].map((el) => el.textContent.trim().slice(0, 100)),
    searchField: Boolean(document.querySelector('input[placeholder="Search"]')),
  };
}

async function canvasPainted(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('[data-forge-canvas]');
    if (!canvas || !canvas.width) return 0;
    const copy = document.createElement('canvas');
    copy.width = canvas.width;
    copy.height = canvas.height;
    const context = copy.getContext('2d');
    context.drawImage(canvas, 0, 0);
    const data = context.getImageData(0, 0, copy.width, copy.height).data;
    let painted = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 20) painted += 1;
    return Number((painted / (copy.width * copy.height)).toFixed(3));
  });
}

/**
 * One screenshot of the whole page, header to footer. The shell is a fixed-height app screen with an inner
 * scroll area, so for the shot the screen is let grow to the height of its content. The window keeps its
 * real size, so every width and height media query still answers the way it does for a visitor.
 */
async function shoot(page, viewport, state, scroller) {
  const info = { shot: null };
  if (!shotsDir) return info;
  const file = `${state}-${viewport.name}.png`;
  let style = null;
  if (scroller) {
    style = await page.addStyleTag({
      content: `html, body { height: auto !important; overflow: visible !important; }
        .dawn-root { height: auto !important; min-height: 100dvh; }
        .dawn-root main { min-height: 0; }
        ${scroller} { height: auto !important; overflow: visible !important; }`,
    });
    await sleep(500);
  }
  await page.screenshot({ path: path.join(shotsDir, file), fullPage: Boolean(scroller) });
  if (style) {
    await style.evaluate((node) => node.remove());
    await sleep(200);
  }
  info.shot = file;
  info.height = await page.evaluate(() => document.documentElement.scrollHeight);
  return info;
}

function watch(page, bucket) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') bucket.console.push(msg.text().slice(0, 240));
  });
  page.on('pageerror', (error) => bucket.pageErrors.push(String(error.message || error).slice(0, 240)));
  page.on('response', (res) => {
    if (res.status() >= 400) bucket.http.push(`${res.status()} ${new URL(res.url()).pathname}`);
  });
}

async function record(page, viewport, bucket, record, state, options = {}) {
  await sleep(options.wait ?? 500);
  const metrics = await page.evaluate(measure);
  const forge = await page.evaluate(forgeFacts);
  const painted = await canvasPainted(page);
  const shot = await shoot(page, viewport, state, options.scroller === undefined ? '[data-forge-scroll]' : options.scroller);
  const tapSmall = metrics.tapSmall.filter((line) => !/sr-only/.test(line));
  record[state] = {
    ...shot,
    metrics: {
      overflowX: metrics.overflowX,
      overflowers: metrics.overflowers,
      tapSmallCount: metrics.tapSmallCount - (metrics.tapSmall.length - tapSmall.length),
      tapSmall,
      smallTextCount: metrics.smallTextCount,
      smallText: metrics.smallText,
      lowContrastCount: metrics.lowContrastCount,
      lowContrast: metrics.lowContrast,
      bodyFont: metrics.bodyFont,
      fontFamilies: metrics.fontFamilies,
      fontSizes: metrics.fontSizes,
      buttonLookCount: metrics.buttonLookCount,
      radii: metrics.radii,
      unlabelled: metrics.unlabelled,
      brokenImages: metrics.brokenImages,
      hasMain: metrics.hasMain,
      h1: metrics.h1,
    },
    forge,
    canvasPainted: painted,
    console: [...bucket.console],
    pageErrors: [...bucket.pageErrors],
    http: [...bucket.http],
  };
  const flags = [];
  if (metrics.overflowX > 1) flags.push(`overflowX ${metrics.overflowX}`);
  if (record[state].metrics.tapSmallCount) flags.push(`tap<44 ${record[state].metrics.tapSmallCount}`);
  if (metrics.smallTextCount) flags.push(`text<12 ${metrics.smallTextCount}`);
  if (metrics.lowContrastCount) flags.push(`contrast ${metrics.lowContrastCount}`);
  if (forge.pageScroll > 1) flags.push(`page scrolls ${forge.pageScroll}px`);
  if (forge.offscreen.length) flags.push(`offscreen ${forge.offscreen.length}`);
  if (forge.newQuestCoversSave) flags.push('New quest covers Save');
  if (bucket.pageErrors.length) flags.push(`pageErrors ${bucket.pageErrors.length}`);
  console.log(`  ${viewport.name} ${state}: ${flags.join(', ') || 'clean'}`);
}

const click = (page, name) => page.getByRole('button', { name }).first().click();
const bucketNew = () => ({ console: [], pageErrors: [], http: [] });

async function open(page, selectorWait = true) {
  await page.goto(`${origin}${PATH}`, { waitUntil: 'load' });
  if (selectorWait) await page.waitForSelector('[data-forge-canvas]', { timeout: 20000 });
  await sleep(2200);
}

async function newPage(viewport, init) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    isMobile: viewport.mobile,
    hasTouch: viewport.mobile,
    acceptDownloads: true,
  });
  if (init) await context.addInitScript(init);
  const page = await context.newPage();
  const bucket = bucketNew();
  watch(page, bucket);
  return { context, page, bucket };
}

function wanted(state) {
  return !only || only.includes(state);
}

const downloads = os.tmpdir();
const bad = JSON.parse(await readFile(path.resolve('src/lib/forge/presets/joan.json'), 'utf8'));
bad.parts.hair = 'mohawk';
const badPath = path.join(downloads, 'forge-bad.json');
await writeFile(badPath, JSON.stringify(bad));
const garbagePath = path.join(downloads, 'forge-garbage.json');
await writeFile(garbagePath, '{ not json');

const seed = [];
for (const [index, file] of ['joan', 'napoleon', 'sun-tzu'].entries()) {
  const character = JSON.parse(await readFile(path.resolve(`src/lib/forge/presets/${file}.json`), 'utf8'));
  seed.push({ character, index });
}
const FULL_ROSTER = Array.from({ length: 12 }, (_, i) => ({
  id: `seed-character-${i + 1}`,
  character: { ...seed[i % 3].character, id: `${seed[i % 3].character.id}-${i + 1}`, name: `${seed[i % 3].character.name} ${i + 1}` },
  portrait: '',
  sprite: '',
  agentId: '',
  createdAt: 1_790_000_000_000 + i,
  updatedAt: 1_790_000_000_000 + i,
}));

for (const viewport of VIEWPORTS) {
  console.log(`\n== ${viewport.name} ${viewport.width}x${viewport.height} ==`);
  const rec = {};
  results.viewports[viewport.name] = rec;

  // One running session: empty -> editing -> posing -> saving -> saved -> exporting -> import error -> second character -> panels -> village.
  {
    const { context, page, bucket } = await newPage(viewport);
    try {
      await open(page);
      if (wanted('empty')) await record(page, viewport, bucket, rec, 'empty');

      await click(page, 'Napoleon');
      await click(page, 'Stern');
      await click(page, 'Robe');
      await click(page, 'Laurel');
      await page.fill('#forge-epithet-input', 'The Emperor of the French and a very long epithet that tests wrapping');
      if (wanted('editing')) await record(page, viewport, bucket, rec, 'editing');

      await click(page, 'Guard');
      await click(page, 'Skeleton');
      await click(page, 'Turntable');
      await click(page, 'Brush texture');
      if (wanted('posing')) await record(page, viewport, bucket, rec, 'posing', { wait: 900 });
      await click(page, 'Skeleton');
      await click(page, 'Brush texture');
      await click(page, 'Idle');

      await page.fill('#forge-name-input', '');
      if (wanted('error-name')) await record(page, viewport, bucket, rec, 'error-name');
      await page.fill('#forge-name-input', 'Napoleon Bonaparte');

      // Slow the browser down while saving so the "Saving…" state lasts long enough to measure and photograph.
      const cdp = await context.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      const label = page.getByRole('button', { name: /^Saving/ }).waitFor({ timeout: 8000 }).then(() => true, () => false);
      await page.getByRole('button', { name: /^Save/ }).first().click();
      const sawSaving = (await label) ? 1 : 0;
      rec.sawSavingLabel = sawSaving > 0;
      if (wanted('saving') && sawSaving > 0) await record(page, viewport, bucket, rec, 'saving', { wait: 0, scroller: null });
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      await page.waitForFunction(() => document.querySelector('[data-forge-status]')?.textContent.includes('in your roster'), null, { timeout: 20000 });
      if (wanted('saved')) await record(page, viewport, bucket, rec, 'saved');

      for (const name of ['JSON', 'PNG', 'glTF']) {
        const waiting = page.waitForEvent('download', { timeout: 15000 }).catch(() => null);
        await click(page, name);
        const file = await waiting;
        if (file) await file.delete().catch(() => {});
        await sleep(300);
      }
      await page.waitForFunction(() => document.querySelector('[data-forge-status]')?.textContent.includes('glTF saved'), null, { timeout: 15000 }).catch(() => {});
      if (wanted('exporting')) await record(page, viewport, bucket, rec, 'exporting');

      await page.setInputFiles('[data-forge-import]', badPath);
      await page.waitForFunction(() => /Unknown|not/i.test(document.querySelector('[data-forge-status]')?.textContent || ''), null, { timeout: 5000 }).catch(() => {});
      if (wanted('error-import')) await record(page, viewport, bucket, rec, 'error-import');
      await page.setInputFiles('[data-forge-import]', garbagePath);
      await sleep(300);

      await click(page, 'Sun Tzu');
      await click(page, 'Save to roster');
      await page.waitForFunction(() => document.querySelectorAll('[data-forge-roster] > li').length === 2, null, { timeout: 20000 });
      await page.evaluate(() => {
        const item = [...document.querySelectorAll('[data-forge-roster] > li')].find((li) => li.textContent.includes('Napoleon'));
        [...item.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Trinity').click();
      });
      await sleep(300);
      if (wanted('roster')) await record(page, viewport, bucket, rec, 'roster');

      if (await page.getByRole('button', { name: 'Menu', exact: true }).isVisible()) {
        await page.getByRole('button', { name: 'Menu', exact: true }).click();
        if (wanted('menu-drawer')) await record(page, viewport, bucket, rec, 'menu-drawer', { scroller: null, wait: 400 });
        await page.keyboard.press('Escape');
        await sleep(300);
      }
      await page.getByRole('button', { name: 'You', exact: true }).click();
      if (wanted('you-panel')) await record(page, viewport, bucket, rec, 'you-panel', { scroller: null, wait: 300 });
      await page.keyboard.press('Escape');
      await sleep(300);

      await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'See in village')?.click());
      await page.waitForFunction(() => document.querySelector('canvas:not([data-forge-canvas])'), null, { timeout: 20000 });
      await sleep(2500);
      if (wanted('village')) await record(page, viewport, bucket, rec, 'village', { scroller: 'main > div', wait: 600 });

      await page.evaluate(() => [...document.querySelectorAll('main button')].find((b) => b.textContent.trim() === 'Trinity')?.click());
      await sleep(600);
      if (wanted('agent-sheet')) await record(page, viewport, bucket, rec, 'agent-sheet', { scroller: null, wait: 400 });
    } catch (error) {
      rec.failure = String(error.message || error).slice(0, 400);
      console.log(`  FAIL ${viewport.name}: ${rec.failure}`);
      if (shotsDir) await page.screenshot({ path: path.join(outDir, `failure-${viewport.name}.png`) }).catch(() => {});
    }
    await context.close();
  }

  // No WebGL.
  if (wanted('error-no3d')) {
    const { context, page, bucket } = await newPage(viewport, () => {
      const real = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function patched(kind, ...rest) {
        if (/webgl/i.test(String(kind))) return null;
        return real.call(this, kind, ...rest);
      };
    });
    try {
      await page.goto(`${origin}${PATH}`, { waitUntil: 'load' });
      await page.waitForSelector('[data-forge-canvas]', { timeout: 20000 });
      await sleep(2500);
      await record(page, viewport, bucket, rec, 'error-no3d');
    } catch (error) {
      rec['error-no3d'] = { failure: String(error.message || error).slice(0, 300) };
    }
    await context.close();
  }

  // Storage refuses the roster.
  if (wanted('error-storage')) {
    const { context, page, bucket } = await newPage(viewport, () => {
      const real = Storage.prototype.setItem;
      Storage.prototype.setItem = function patched(key, value) {
        if (String(key).startsWith('dawn.forge')) throw new DOMException('full', 'QuotaExceededError');
        return real.call(this, key, value);
      };
    });
    try {
      await open(page);
      await click(page, 'Save to roster');
      await page.waitForSelector('[role=alert]', { timeout: 20000 });
      await record(page, viewport, bucket, rec, 'error-storage');
    } catch (error) {
      rec['error-storage'] = { failure: String(error.message || error).slice(0, 300) };
    }
    await context.close();
  }

  // Twelve characters already saved.
  if (wanted('roster-full')) {
    const { context, page, bucket } = await newPage(viewport, `localStorage.setItem('dawn.forge.roster.v1', ${JSON.stringify(JSON.stringify(FULL_ROSTER))});`);
    try {
      await open(page);
      await record(page, viewport, bucket, rec, 'roster-full');
    } catch (error) {
      rec['roster-full'] = { failure: String(error.message || error).slice(0, 300) };
    }
    await context.close();
  }
}

await writeFile(path.join(outDir, 'audit.json'), `${JSON.stringify(results, null, 2)}\n`);
await browser.close();
if (served) await served.close();

const summary = [];
for (const [name, rec] of Object.entries(results.viewports)) {
  for (const [state, data] of Object.entries(rec)) {
    if (!data?.metrics) continue;
    summary.push({ viewport: name, state, overflowX: data.metrics.overflowX, tap: data.metrics.tapSmallCount, small: data.metrics.smallTextCount, contrast: data.metrics.lowContrastCount, pageErrors: data.pageErrors.length });
  }
}
console.log(`\nwrote ${path.join(outDir, 'audit.json')} (${summary.length} states)`);

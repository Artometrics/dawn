// Headless browser check for the Character Maker. Needs `npm run build` first and a local Chrome.
//   node scripts/forge-check.mjs [outDir]
// It drives the real static export at 1440px and 390px, makes sure the 3D view drew, saves a
// character, gives it to an agent, checks the village drew it, exports JSON / PNG / glTF,
// reloads to prove the roster survives, and writes full-page screenshots (header to footer).
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const OUT = path.resolve('out');
const SHOTS = path.resolve(process.argv[2] || 'docs/process/forge-integration');
const CHROME = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium'].find((file) => existsSync(file));
const VIEWPORTS = [
  { name: '1440', width: 1440, height: 900, mobile: false },
  { name: '390', width: 390, height: 844, mobile: true },
];
const TYPES = { '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.json': 'application/json', '.html': 'text/html', '.txt': 'text/plain' };

if (!CHROME) throw new Error('Chrome is not installed');
await stat(path.join(OUT, 'village/index.html')).catch(() => {
  throw new Error('Run `npm run build` first. out/village/index.html is missing.');
});

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://127.0.0.1');
  const base = decodeURIComponent(url.pathname).replace(/^\/+/, '');
  for (const candidate of [base, `${base}.html`, path.join(base, 'index.html')]) {
    const full = path.resolve(OUT, candidate);
    if (!full.startsWith(OUT)) continue;
    try {
      if (!(await stat(full)).isFile()) continue;
      res.writeHead(200, { 'content-type': TYPES[path.extname(full)] || 'application/octet-stream' });
      res.end(await readFile(full));
      return;
    } catch {
      /* next shape */
    }
  }
  res.writeHead(404);
  res.end();
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-proxy-server'],
});

const report = [];
const log = (line) => {
  report.push(line);
  console.log(line);
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function clickText(page, selector, text) {
  const ok = await page.evaluate(
    (sel, label) => {
      const node = [...document.querySelectorAll(sel)].find((item) => item.textContent.trim().startsWith(label));
      if (!node) return false;
      node.click();
      return true;
    },
    selector,
    text,
  );
  assert.ok(ok, `no ${selector} reading "${text}"`);
}

/** Resize the window so the whole scroll area fits, then shoot header to footer. */
async function fullPage(page, viewport, selector, file) {
  const extra = await page.evaluate((sel) => {
    const scroller = document.querySelector(sel);
    return { grow: scroller.scrollHeight - scroller.clientHeight, inner: window.innerHeight };
  }, selector);
  await page.setViewport({ width: viewport.width, height: viewport.height + Math.max(0, extra.grow), deviceScaleFactor: 1, isMobile: viewport.mobile, hasTouch: viewport.mobile });
  await sleep(900);
  await page.screenshot({ path: path.join(SHOTS, file) });
  await page.setViewport({ width: viewport.width, height: viewport.height, deviceScaleFactor: 1, isMobile: viewport.mobile, hasTouch: viewport.mobile });
  await sleep(300);
  log(`  screenshot ${file} (${viewport.height + Math.max(0, extra.grow)}px tall)`);
}

async function canvasHasPixels(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('[data-forge-canvas]');
    if (!canvas) return 0;
    const copy = document.createElement('canvas');
    copy.width = canvas.width;
    copy.height = canvas.height;
    const context = copy.getContext('2d');
    context.drawImage(canvas, 0, 0);
    const data = context.getImageData(0, 0, copy.width, copy.height).data;
    let painted = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 20) painted += 1;
    return painted / (copy.width * copy.height);
  });
}

await mkdir(SHOTS, { recursive: true });
let failures = 0;

for (const viewport of VIEWPORTS) {
  log(`\n== ${viewport.name}px ==`);
  const downloads = await mkdtemp(path.join(os.tmpdir(), 'forge-dl-'));
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && !/Failed to load resource|9099|8080|emulator|ERR_CONNECTION/.test(message.text())) errors.push(message.text());
  });
  const cdp = await browser.target().createCDPSession();
  await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads, browserContextId: context.id });
  await page.setViewport({ width: viewport.width, height: viewport.height, deviceScaleFactor: 1, isMobile: viewport.mobile, hasTouch: viewport.mobile });

  try {
    await page.goto(`${origin}/village/?section=characters`, { waitUntil: 'load' });
    await page.waitForSelector('[data-forge-canvas]', { timeout: 20000 });
    await sleep(2500);

    const painted = await canvasHasPixels(page);
    assert.ok(painted > 0.03, `3D view looks empty (${painted})`);
    log(`ok 3D view drew (${(painted * 100).toFixed(1)}% of pixels)`);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(overflow <= 0, `page scrolls sideways by ${overflow}px`);
    log('ok no sideways scroll');

    await clickText(page, 'button', 'Napoleon');
    await sleep(400);
    assert.equal(await page.$eval('#forge-name-input', (input) => input.value), 'Napoleon');
    await clickText(page, 'button', 'Guard');
    await sleep(400);
    assert.ok((await canvasHasPixels(page)) > 0.03, 'view went blank after a pose change');
    log('ok preset and pose swap');

    await clickText(page, 'button', 'Sly');
    await clickText(page, 'button', 'Robe');
    await clickText(page, 'button', 'Crown');
    await page.$eval('input[type="range"]', (input) => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(input, '1.1');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await sleep(300);
    assert.ok((await canvasHasPixels(page)) > 0.03, 'view went blank after part swaps');
    log('ok part swaps and height slider');

    await clickText(page, 'button', 'Save to roster');
    await page.waitForFunction(() => document.querySelector('[data-forge-status]')?.textContent.includes('in your roster'), { timeout: 15000 });
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('dawn.forge.roster.v1') || '[]'));
    assert.equal(stored.length, 1);
    assert.equal(stored[0].character.name, 'Napoleon');
    assert.ok(stored[0].portrait.startsWith('data:image/png;base64,'), 'no portrait stored');
    assert.ok(stored[0].sprite.startsWith('data:image/png;base64,'), 'no sprite stored');
    log(`ok saved to the roster (portrait ${stored[0].portrait.length} chars, sprite ${stored[0].sprite.length} chars)`);

    await page.evaluate(() => (document.querySelector('[data-forge-import]').value = ''));
    const sunTzu = JSON.stringify({
      format: 'dawn.forge.file/1',
      character: { schema: 'dawn.forge.character/1', name: 'Imported Sage', title: 'From a file', head: 'long', face: 'smile', hair: 'topknot', outfit: 'robe', accessory: 'scroll', height: 1.05, build: 0.3, clip: 'idle', colors: { skin: '#d9ab82', hair: '#1d1a18', primary: '#2d5e55', secondary: '#c8a24b', accent: '#6b3b2a' } },
    });
    const importPath = path.join(downloads, 'import.json');
    await writeFile(importPath, sunTzu);
    const input = await page.$('[data-forge-import]');
    await input.uploadFile(importPath);
    await page.waitForFunction(() => document.querySelector('#forge-name-input')?.value === 'Imported Sage', { timeout: 5000 });
    log('ok JSON import');
    const badPath = path.join(downloads, 'bad.json');
    await writeFile(badPath, '{"schema":"dawn.forge.character/1","name":"Bad","hair":"mohawk"}');
    await input.uploadFile(badPath);
    await page.waitForFunction(() => document.querySelector('[data-forge-status]')?.textContent.includes('Unknown'), { timeout: 5000 });
    assert.equal(await page.$eval('#forge-name-input', (el) => el.value), 'Imported Sage');
    log('ok a bad JSON file is refused and the draft is kept');

    await clickText(page, 'button', 'Save to roster');
    await page.waitForFunction(() => document.querySelectorAll('[data-forge-roster] > li').length === 2, { timeout: 15000 });

    for (const label of ['JSON', 'PNG', 'glTF']) {
      await clickText(page, 'button', label);
      await sleep(label === 'JSON' ? 600 : 2500);
    }
    const files = (await readdir(downloads)).filter((file) => file !== 'import.json' && file !== 'bad.json' && !file.endsWith('.crdownload'));
    const byExt = (ext) => files.find((file) => file.endsWith(ext));
    assert.ok(byExt('.forge.json'), `no json in ${files}`);
    assert.ok(byExt('-portrait.png'), `no png in ${files}`);
    assert.ok(byExt('.glb'), `no glb in ${files}`);
    const png = await readFile(path.join(downloads, byExt('-portrait.png')));
    assert.equal(png.subarray(1, 4).toString(), 'PNG');
    const glb = await readFile(path.join(downloads, byExt('.glb')));
    assert.equal(glb.subarray(0, 4).toString(), 'glTF');
    const jsonLength = glb.readUInt32LE(12);
    const gltf = JSON.parse(glb.subarray(20, 20 + jsonLength).toString());
    const names = new Set(gltf.nodes.map((node) => node.name));
    assert.ok(names.has('hips') && names.has('hand_r') && names.has('head'), 'glTF is missing bones');
    assert.deepEqual(gltf.animations.map((clip) => clip.name).sort(), ['guard', 'idle']);
    assert.ok(!gltf.nodes.some((node) => node.name === 'outline'), 'ink hulls leaked into the glTF');
    log(`ok exports: ${files.join(', ')} (glTF: ${gltf.nodes.length} nodes, clips ${gltf.animations.map((clip) => clip.name)})`);

    await page.evaluate(() => {
      const list = [...document.querySelectorAll('[data-forge-roster] > li')];
      const target = list.find((item) => item.textContent.includes('Napoleon'));
      [...target.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Trinity').click();
    });
    await sleep(300);
    const pressed = await page.evaluate(() => [...document.querySelectorAll('[data-forge-roster] button[aria-pressed="true"]')].map((button) => button.textContent.trim()));
    assert.deepEqual(pressed, ['Trinity']);
    log('ok Napoleon assigned to Trinity');
    await fullPage(page, viewport, '[data-forge-scroll]', `characters-${viewport.name}.png`);

    await page.reload({ waitUntil: 'load' });
    await page.waitForSelector('[data-forge-roster] > li', { timeout: 20000 });
    const after = await page.$$eval('[data-forge-roster] > li', (items) => items.map((item) => item.querySelector('p').textContent));
    assert.deepEqual(after.sort(), ['Imported Sage', 'Napoleon']);
    log('ok the roster survives a reload');

    // Village view
    await page.goto(`${origin}/village/?section=village`, { waitUntil: 'load' });
    await page.waitForSelector('canvas:not([data-forge-canvas])', { timeout: 20000 });
    await page.waitForFunction(() => document.querySelector('canvas:not([data-forge-canvas])')?.dataset.looks === 'trinity', { timeout: 20000 });
    log('ok the village scene draws Trinity from the saved character');
    const chip = await page.evaluate(() => [...document.querySelectorAll('button img')].some((img) => img.src.startsWith('data:image/png')));
    assert.ok(chip, 'agent chips still show the old sprite');
    await sleep(800);
    await fullPage(page, viewport, 'main > div', `village-${viewport.name}.png`).catch(async () => {
      await page.screenshot({ path: path.join(SHOTS, `village-${viewport.name}.png`), fullPage: true });
    });

    // Release the agent and confirm the village goes back to the tile sprite.
    await page.goto(`${origin}/village/?section=characters`, { waitUntil: 'load' });
    await page.waitForSelector('[data-forge-roster] > li');
    await page.evaluate(() => {
      const target = [...document.querySelectorAll('[data-forge-roster] > li')].find((item) => item.textContent.includes('Napoleon'));
      [...target.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Trinity').click();
    });
    await page.goto(`${origin}/village/?section=village`, { waitUntil: 'load' });
    await page.waitForSelector('canvas:not([data-forge-canvas])');
    await sleep(2500);
    assert.equal(await page.$eval('canvas:not([data-forge-canvas])', (el) => el.dataset.looks || ''), '');
    log('ok releasing the agent brings back its tile sprite');

    assert.deepEqual(errors, [], `browser errors: ${errors.join(' | ')}`);
    log('ok no browser errors');
  } catch (error) {
    failures += 1;
    log(`FAIL ${viewport.name}px: ${error instanceof Error ? error.message : error}`);
    await page.screenshot({ path: path.join(SHOTS, `failure-${viewport.name}.png`) }).catch(() => undefined);
  }
  await context.close();
}

await browser.close();
server.close();
await writeFile(path.join(SHOTS, 'check-log.txt'), `${report.join('\n')}\n`);
if (failures) {
  console.error(`${failures} viewport(s) failed`);
  process.exit(1);
}
console.log('\nforge check ok');

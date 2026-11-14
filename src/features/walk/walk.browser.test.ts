import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { chromium, type Browser } from 'playwright-core';
import { serveOut } from '../../../scripts/lib/static-server.mjs';

const outDir = path.resolve('out');
const chromeBin = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium'].find((file) => existsSync(file));
const skip = !chromeBin ? 'Chrome is not installed' : !existsSync(path.join(outDir, 'walk.html')) && !existsSync(path.join(outDir, 'walk/index.html')) ? 'run `npm run build` first so out/walk exists' : false;

const ALLOWED = new Set(['tiles.openfreemap.org', 'openfreemap.org']);

function hostOf(url: string, pageHost: string): string | null {
  if (url.startsWith('blob:') || url.startsWith('data:')) return null;
  try {
    const host = new URL(url).host;
    if (host === pageHost) return null;
    return host;
  } catch {
    return null;
  }
}

test('walk loads without GPS, the demo awards XP, and a reload keeps it', { skip, timeout: 120_000 }, async () => {
  const site = await serveOut(outDir);
  const browser: Browser = await chromium.launch({
    executablePath: chromeBin,
    headless: true,
    args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
  });
  const hosts = new Set<string>();
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
      geolocation: undefined,
      permissions: [],
    });
    await context.addInitScript(() => {
      const fail = () => {
        throw new Error('geolocation was used before the player asked');
      };
      const geo = {
        getCurrentPosition: fail,
        watchPosition: fail,
        clearWatch: () => undefined,
      };
      Object.defineProperty(navigator, 'geolocation', { configurable: true, get: () => geo });
    });
    const page = await context.newPage();
    const pageHost = new URL(site.url).host;
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (request) => {
      const host = hostOf(request.url(), pageHost);
      if (host) hosts.add(host);
    });
    await page.goto(`${site.url}/walk`, { waitUntil: 'load' });
    await page.waitForSelector('[data-ready="true"]');
    assert.equal(await page.locator('h1').innerText(), 'Walk');
    assert.match(await page.locator('.wk-note').innerText(), /OpenFreeMap/);
    assert.equal(await page.locator('[data-xp]').getAttribute('data-xp'), '0');
    await page.getByRole('button', { name: 'Demo walk' }).click();
    await page.waitForFunction(() => Number(document.querySelector('[data-xp]')?.getAttribute('data-xp')) > 0, null, { timeout: 12_000 });
    const xp = await page.locator('[data-xp]').getAttribute('data-xp');
    assert.ok(Number(xp) > 0);
    await page.reload({ waitUntil: 'load' });
    await page.waitForSelector('[data-ready="true"]');
    assert.equal(await page.locator('[data-xp]').getAttribute('data-xp'), xp);
    assert.deepEqual(errors, []);
    const stray = [...hosts].filter((host) => ![...ALLOWED].some((ok) => host === ok || host.endsWith(`.${ok}`)));
    assert.deepEqual(stray, [], `unexpected hosts: ${stray.join(', ')}`);
    await context.close();
  } finally {
    await browser.close();
    await site.close();
  }
});

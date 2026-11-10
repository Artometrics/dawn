// Renders /preview/style-guide from out/ into one standalone HTML file and a full-page PNG, and adds the
// all-pages contact sheets so uniformity is visible at a glance.
//   npm run build && node scripts/style-guide.mjs
import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
import { serveOut } from './lib/static-server.mjs';

const outDir = path.resolve('out');
const designDir = path.resolve('docs/process/design');
const chromePath = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) => existsSync(p));
const site = await serveOut(outDir);
const browser = await chromium.launch({ executablePath: chromePath, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto(`${site.url}/preview/style-guide`, { waitUntil: 'load' });
await page.waitForTimeout(800);

const sheets = [
  ['All pages, desktop (1440px), after', 'CONTACT_SHEET_after_desktop.png'],
  ['All pages, phone (390px), after', 'CONTACT_SHEET_after_mobile.png'],
  ['Before: all pages, desktop', 'CONTACT_SHEET_before_desktop.png'],
  ['Before: all pages, phone', 'CONTACT_SHEET_before_mobile.png'],
];

const html = await page.evaluate(async (sheetList) => {
  let css = '';
  const toDataUrl = async (url) => {
    const res = await fetch(url);
    const buf = new Uint8Array(await res.arrayBuffer());
    let bin = '';
    for (const b of buf) bin += String.fromCharCode(b);
    return `data:${res.headers.get('content-type') || 'application/octet-stream'};base64,${btoa(bin)}`;
  };
  for (const link of document.querySelectorAll('link[rel="stylesheet"]')) {
    const base = new URL(link.href);
    let text = await (await fetch(link.href)).text();
    const urls = [...new Set([...text.matchAll(/url\(([^)]+)\)/g)].map((m) => m[1].replace(/["']/g, '')))].filter((u) => !u.startsWith('data:'));
    for (const u of urls) {
      try {
        text = text.split(u).join(await toDataUrl(new URL(u, base).href));
      } catch {
        /* a missing font file falls back to the stack */
      }
    }
    css += text + '\n';
  }
  const clone = document.documentElement.cloneNode(true);
  clone.querySelectorAll('script, link, noscript, next-route-announcer').forEach((el) => el.remove());
  for (const img of clone.querySelectorAll('img')) {
    const src = img.getAttribute('src');
    if (src && src.startsWith('/')) img.setAttribute('src', await toDataUrl(new URL(src, location.origin).href));
  }
  const style = document.createElement('style');
  style.textContent = css + '\n.sg-sheets{display:flex;flex-direction:column;gap:16px}.sg-sheets img{display:block;width:100%;border-radius:14px;box-shadow:inset 0 0 0 1px var(--dawn-line)}.sg-sheets figure{margin:0;display:flex;flex-direction:column;gap:8px}.sg-sheets figcaption{color:var(--dawn-secondary);font-size:13px}';
  clone.querySelector('head').appendChild(style);
  const main = clone.querySelector('main');
  const block = (title, note, list) => {
    const section = document.createElement('section');
    section.className = 'sg-section';
    section.innerHTML = `<h2 class="dw-h2">${title}</h2><p class="dw-note">${note}</p><div class="sg-sheets">` +
      list.map(([label, file]) => `<figure><img src="${file}" alt="${label}"><figcaption>${label}</figcaption></figure>`).join('') + '</div>';
    return section;
  };
  main.querySelector('p.dw-lead').insertAdjacentElement('afterend', block('All pages side by side', 'Every route in the static export, header to footer, from the same build. Same ground, same header, same buttons, same cards.', sheetList.slice(0, 2)));
  main.appendChild(block('Before, for comparison', 'The same routes before the shared tokens and components.', sheetList.slice(2)));
  return '<!doctype html>\n' + clone.outerHTML;
}, sheets);

const htmlPath = path.join(designDir, 'STYLE_GUIDE.html');
await writeFile(htmlPath, html);
await browser.close();
await site.close();

const render = await chromium.launch({ executablePath: chromePath, args: ['--no-sandbox'] });
const view = await render.newPage({ viewport: { width: 1280, height: 900 } });
await view.goto(pathToFileURL(htmlPath).href);
await view.waitForFunction(() => [...document.images].every((i) => i.complete));
await view.waitForTimeout(500);
await view.screenshot({ path: path.join(designDir, 'STYLE_GUIDE.png'), fullPage: true });
await render.close();
console.log('wrote STYLE_GUIDE.html and STYLE_GUIDE.png');

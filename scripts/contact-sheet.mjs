// Lays route screenshots side by side as one PNG.
//   node scripts/contact-sheet.mjs --dir docs/process/design/after --suffix desktop --out /tmp/sheet.png --cols 6 --cell 300 --max-height 640
import { existsSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
import { ROUTES } from './lib/routes.mjs';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, arg, i, all) => {
    if (arg.startsWith('--')) pairs.push([arg.slice(2), all[i + 1]]);
    return pairs;
  }, []),
);
const dir = path.resolve(args.dir);
const suffix = args.suffix;
const cell = Number(args.cell || 300);
const cols = Number(args.cols || 6);
const maxHeight = Number(args['max-height'] || 640);
const chromePath = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) => existsSync(p));

const items = ROUTES.map((r) => ({ ...r, file: path.join(dir, `${r.name}-${suffix}.png`) })).filter((r) => existsSync(r.file));
const html = `<!doctype html><meta charset="utf-8"><style>
body{margin:0;background:#0e0e0c;color:#f3f1ec;font:13px/1.3 system-ui,sans-serif;padding:16px}
.grid{display:grid;grid-template-columns:repeat(${cols},${cell}px);gap:14px;align-items:start}
figure{margin:0}
.frame{width:${cell}px;max-height:${maxHeight}px;overflow:hidden;border:1px solid #2a2a27;border-radius:8px;background:#171715}
img{display:block;width:100%}
figcaption{padding:6px 2px;color:#c4bdb3}
figcaption b{color:#f3f1ec;font-weight:600}
</style><div class="grid">${items
  .map((i) => `<figure><div class="frame"><img src="${pathToFileURL(i.file).href}"></div><figcaption><b>${i.title}</b><br>${i.path}</figcaption></figure>`)
  .join('')}</div>`;
const browser = await chromium.launch({ executablePath: chromePath, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: cols * (cell + 14) + 32, height: 800 } });
const htmlFile = path.join(dir, '.contact-sheet.html');
writeFileSync(htmlFile, html);
await page.goto(pathToFileURL(htmlFile).href);
await page.waitForFunction(() => [...document.images].every((i) => i.complete));
await page.screenshot({ path: path.resolve(args.out), fullPage: true });
await browser.close();
rmSync(htmlFile);
console.log(`wrote ${args.out} (${items.length} routes)`);

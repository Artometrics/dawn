// Browser audit of every route at 1440, 768 and 390 px.
//   node scripts/site-audit.mjs --base http://127.0.0.1:4173 --out docs/process/test/local --label local
//   node scripts/site-audit.mjs --serve out --out docs/process/test/local --label local
// Writes <out>/audit.json and <out>/shots/<route>-<width>.png. Uses the system Chrome through
// playwright-core, so no browser download. No network calls beyond the base URL (and whatever the
// pages themselves request, which is recorded as a failure when blocked).
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { ROUTES, MISSING_ROUTES, WIDTHS } from './lib/routes.mjs';
import { serveOut } from './lib/static-server.mjs';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, arg, i, all) => {
    if (arg.startsWith('--')) pairs.push([arg.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : 'true']);
    return pairs;
  }, []),
);
const outDir = path.resolve(args.out || 'docs/process/test/local');
const label = args.label || 'local';
const skipInteract = args['no-interact'] === 'true';
const maxClicks = Number(args['max-clicks'] || 60);
const only = args.only ? args.only.split(',') : null;

let base = args.base;
let served = null;
if (!base) {
  served = await serveOut(path.resolve(args.serve || 'out'));
  base = served.url;
}
const chromePath = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium'].find((p) => existsSync(p));

const browser = await chromium.launch({ executablePath: chromePath, headless: true, args: ['--no-sandbox'] });
await mkdir(path.join(outDir, 'shots'), { recursive: true });

function attachWatchers(page, bucket) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') bucket.console.push(msg.text().slice(0, 300));
    if (msg.type() === 'warning' && /hydrat|did not match/i.test(msg.text())) bucket.console.push(`warn: ${msg.text().slice(0, 200)}`);
  });
  page.on('pageerror', (err) => bucket.pageErrors.push(String(err.message || err).slice(0, 300)));
  page.on('requestfailed', (req) => bucket.failed.push(`${req.method()} ${req.url().slice(0, 160)} ${req.failure()?.errorText || ''}`));
  page.on('response', (res) => {
    if (res.status() >= 400) bucket.http.push(`${res.status()} ${res.url().slice(0, 160)}`);
  });
}
const freshBucket = () => ({ console: [], pageErrors: [], failed: [], http: [] });

// Runs inside the page. Returns layout and design metrics for one route at one width.
function measure() {
  const vw = document.documentElement.clientWidth;
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0;
  };
  const sel = (el) => {
    const id = el.id ? `#${el.id}` : '';
    const cls = typeof el.className === 'string' && el.className ? `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}` : '';
    const text = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30);
    return `${el.tagName.toLowerCase()}${id}${cls}${text ? ` "${text}"` : ''}`;
  };
  const all = [...document.querySelectorAll('body *')].filter((el) => !['SCRIPT', 'STYLE', 'NOSCRIPT', 'LINK', 'META'].includes(el.tagName));

  const overflowX = document.documentElement.scrollWidth - vw;
  const overflowers = all
    .filter((el) => {
      if (!visible(el)) return false;
      const r = el.getBoundingClientRect();
      return r.right > vw + 1 && r.left < vw;
    })
    .filter((el) => {
      // Ignore children of horizontal scrollers; they scroll on purpose.
      let p = el.parentElement;
      while (p && p !== document.body) {
        const cs = getComputedStyle(p);
        if (['auto', 'scroll', 'hidden'].includes(cs.overflowX) && p.scrollWidth > p.clientWidth) return false;
        p = p.parentElement;
      }
      return true;
    })
    .slice(0, 6)
    .map(sel);

  const interactive = all.filter(
    (el) => el.matches('a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=tab], [role=menuitem], [role=link]') && visible(el),
  );
  const tapSmall = interactive.filter((el) => {
    const r = el.getBoundingClientRect();
    // Checkbox-like marks are wrapped by a label that carries the target.
    return r.width < 43.5 || r.height < 43.5;
  });

  const textEls = all.filter((el) => visible(el) && !el.closest('.cv') && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1));
  const sizes = {};
  const families = {};
  const small = [];
  const lowContrast = [];
  const parse = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const [r, g, b, a = 1] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    return { r, g, b, a };
  };
  const lum = ({ r, g, b }) => {
    const f = (v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const bgOf = (el) => {
    let layers = [];
    for (let p = el; p; p = p.parentElement) {
      const c = parse(getComputedStyle(p).backgroundColor);
      if (c && c.a > 0) {
        layers.push(c);
        if (c.a >= 1) break;
      }
    }
    let base = { r: 14, g: 14, b: 12, a: 1 };
    for (const c of layers.reverse()) base = { r: c.r * c.a + base.r * (1 - c.a), g: c.g * c.a + base.g * (1 - c.a), b: c.b * c.a + base.b * (1 - c.a), a: 1 };
    return base;
  };
  for (const el of textEls) {
    const cs = getComputedStyle(el);
    const size = parseFloat(cs.fontSize);
    sizes[size] = (sizes[size] || 0) + 1;
    const fam = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim();
    families[fam] = (families[fam] || 0) + 1;
    if (size < 12) small.push(`${size}px ${sel(el)}`);
    const fg = parse(cs.color);
    if (fg && fg.a > 0.05) {
      const bg = bgOf(el);
      const eff = { r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a) };
      const l1 = lum(eff);
      const l2 = lum(bg);
      const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      const large = size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700);
      if (ratio < (large ? 3 : 4.5)) lowContrast.push(`${ratio.toFixed(2)} ${size}px ${sel(el)}`);
    }
  }
  const radii = {};
  const buttonLook = {};
  const bgs = {};
  for (const el of all) {
    if (!visible(el)) continue;
    const cs = getComputedStyle(el);
    if (el.matches('button, a[href], [role=button]')) {
      const r = el.getBoundingClientRect();
      if (r.width > 0) {
        const key = `${cs.backgroundColor}|${cs.color}|${cs.borderRadius.split(' ')[0]}`;
        buttonLook[key] = (buttonLook[key] || 0) + 1;
        radii[cs.borderRadius.split(' ')[0]] = (radii[cs.borderRadius.split(' ')[0]] || 0) + 1;
      }
    }
    const bg = cs.backgroundColor;
    if (bg && bg !== 'rgba(0, 0, 0, 0)') bgs[bg] = (bgs[bg] || 0) + 1;
  }
  const brokenImages = [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.src).map((i) => i.src.slice(0, 120));
  const body = getComputedStyle(document.body);
  return {
    title: document.title,
    h1: [...document.querySelectorAll('h1')].map((h) => h.textContent.trim().slice(0, 60)),
    bodyBg: body.backgroundColor,
    bodyFont: body.fontFamily.split(',')[0].replace(/["']/g, ''),
    colorScheme: getComputedStyle(document.documentElement).colorScheme,
    docHeight: document.documentElement.scrollHeight,
    overflowX,
    overflowers,
    interactiveCount: interactive.length,
    tapSmallCount: tapSmall.length,
    tapSmall: tapSmall.slice(0, 8).map((el) => {
      const r = el.getBoundingClientRect();
      return `${Math.round(r.width)}x${Math.round(r.height)} ${sel(el)}`;
    }),
    fontSizes: sizes,
    fontFamilies: families,
    smallText: small.slice(0, 6),
    smallTextCount: small.length,
    lowContrast: lowContrast.slice(0, 6),
    lowContrastCount: lowContrast.length,
    radii,
    buttonLookCount: Object.keys(buttonLook).length,
    buttonLooks: buttonLook,
    bgColors: bgs,
    brokenImages,
    textLength: document.body.innerText.trim().length,
    hasMain: Boolean(document.querySelector('main, [role=main]')),
    hasLang: Boolean(document.documentElement.lang),
    unlabelled: interactive
      .filter((el) => !(el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent.trim() || el.getAttribute('placeholder') || el.labels?.length))
      .slice(0, 6)
      .map(sel),
  };
}

async function settle(page) {
  await page.waitForLoadState('load').catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(700);
}

const results = { label, base, date: new Date().toISOString(), routes: [] };
const targets = [...ROUTES, ...MISSING_ROUTES].filter((r) => !only || only.includes(r.name));

for (const route of targets) {
  const entry = { ...route, widths: {}, interactions: {} };
  for (const { w, h } of WIDTHS) {
    const context = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: w < 768, isMobile: w < 768 });
    const page = await context.newPage();
    const bucket = freshBucket();
    attachWatchers(page, bucket);
    let status = 0;
    try {
      const res = await page.goto(base + route.path, { waitUntil: 'domcontentloaded', timeout: 30000 });
      status = res?.status() ?? 0;
      await settle(page);
      const metrics = await page.evaluate(measure);
      // Pages that scroll inside a fixed shell would otherwise screenshot as one viewport.
      const expanded = await page.evaluate(() => {
        const scrollers = [...document.querySelectorAll('body *')].filter((el) => {
          const cs = getComputedStyle(el);
          return ['auto', 'scroll'].includes(cs.overflowY) && el.scrollHeight > el.clientHeight + 40 && el.clientHeight > 200;
        });
        return scrollers.map((el) => ({ h: el.scrollHeight, c: el.clientHeight }));
      });
      await page.screenshot({ path: path.join(outDir, 'shots', `${route.name}-${w}.png`), fullPage: true });
      entry.widths[w] = { status, ...bucket, metrics, innerScrollers: expanded.slice(0, 4) };
    } catch (error) {
      entry.widths[w] = { status, error: String(error.message || error).slice(0, 300), ...bucket };
    }
    await context.close();
  }
  results.routes.push(entry);
  console.log(`${route.path}: ${Object.entries(entry.widths).map(([w, d]) => `${w}=${d.status}${d.metrics?.overflowX > 1 ? ' OVERFLOW' : ''}`).join(' ')}`);
}

// Click-through pass. Each click starts from a fresh load so one action cannot hide another.
async function interact(route, w, h) {
  const context = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 768, isMobile: w < 768 });
  const page = await context.newPage();
  const bucket = freshBucket();
  attachWatchers(page, bucket);
  const log = { clicked: 0, dead: [], errors: [], navigations: [], opened: [], external: [], fields: [] };
  const url = base + route.path;
  const open = async () => {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await settle(page);
  };
  const listTargets = () =>
    page.evaluate(() => {
      const visible = (el) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && !el.disabled && cs.pointerEvents !== 'none';
      };
      const els = [...document.querySelectorAll('a[href], button, [role=button], [role=tab], summary')].filter(visible);
      return els.map((el, i) => {
        const href = el.getAttribute('href') || '';
        const external = /^(https?:)?\/\//.test(href) && !href.startsWith(location.origin) || href.startsWith('mailto:');
        return {
          i,
          tag: el.tagName.toLowerCase(),
          text: (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40),
          href,
          external,
          download: el.hasAttribute('download'),
        };
      });
    });
  const snapshot = () =>
    page.evaluate(() => ({
      url: location.pathname + location.search + location.hash,
      html: document.body.innerHTML.length,
      text: document.body.innerText.length,
      dialogs: document.querySelectorAll('[role=dialog], [role=menu], dialog[open], [data-state=open], [aria-expanded=true]').length,
      scroll: Math.round(window.scrollY),
      pressed: document.querySelectorAll('[aria-pressed=true], [aria-selected=true], [data-active=true]').length,
      focus: document.activeElement?.tagName || '',
    }));
  try {
    await open();
    const targets = await listTargets();
    const picked = targets.slice(0, maxClicks);
    log.total = targets.length;
    for (const t of picked) {
      if (t.external || t.download) {
        log.external.push(`${t.text || t.href} -> ${t.href}`);
        continue;
      }
      await open();
      const before = await snapshot();
      const errBefore = bucket.console.length + bucket.pageErrors.length;
      const items = await page.$$('a[href], button, [role=button], [role=tab], summary');
      const handles = [];
      for (const el of items) {
        if (await el.isVisible().catch(() => false)) handles.push(el);
      }
      const el = handles[t.i];
      if (!el) continue;
      try {
        await el.scrollIntoViewIfNeeded({ timeout: 1500 }).catch(() => {});
        await el.click({ timeout: 2500, noWaitAfter: true });
      } catch (error) {
        log.dead.push(`${t.tag} "${t.text}" could not be clicked: ${String(error.message).split('\n')[0].slice(0, 90)}`);
        continue;
      }
      log.clicked += 1;
      await page.waitForTimeout(450);
      const after = await snapshot();
      const errs = [...bucket.console, ...bucket.pageErrors].slice(errBefore);
      if (errs.length) log.errors.push(`"${t.text}": ${errs[0]}`);
      if (after.url !== before.url) log.navigations.push(`"${t.text}" -> ${after.url}`);
      else if (after.dialogs !== before.dialogs || after.pressed !== before.pressed) log.opened.push(`"${t.text}" toggled a panel or state`);
      else if (after.html === before.html && after.text === before.text && after.scroll === before.scroll && after.focus === before.focus) log.dead.push(`${t.tag} "${t.text}" ${t.href ? `(${t.href}) ` : ''}no visible change`);
      else log.opened.push(`"${t.text}" changed the page`);
    }
    // Forms: type into each visible field and press Enter.
    await open();
    const fields = await page.$$('input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]), textarea');
    let n = 0;
    for (const f of fields) {
      if (n >= 4) break;
      if (!(await f.isVisible().catch(() => false)) || !(await f.isEditable().catch(() => false))) continue;
      n += 1;
      await open();
      const again = (await page.$$('input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]), textarea')).filter(Boolean);
      const target = again[fields.indexOf(f)];
      if (!target) continue;
      const placeholder = (await target.getAttribute('placeholder')) || (await target.getAttribute('aria-label')) || (await target.getAttribute('name')) || 'field';
      const before = await snapshot();
      try {
        await target.fill('smoke test message', { timeout: 1500 });
        await target.press('Enter', { timeout: 1500 });
        await page.waitForTimeout(500);
        const after = await snapshot();
        const changed = after.html !== before.html || after.url !== before.url;
        log.fields.push(`"${placeholder}": typed + Enter -> ${changed ? 'page changed' : 'nothing happened'}`);
      } catch (error) {
        log.fields.push(`"${placeholder}": ${String(error.message).split('\n')[0].slice(0, 80)}`);
      }
    }
  } catch (error) {
    log.fatal = String(error.message || error).slice(0, 200);
  }
  await context.close();
  return log;
}

if (!skipInteract) {
  for (const route of results.routes) {
    if (route.name === 'chats') continue;
    for (const { w, h } of [WIDTHS[0], WIDTHS[2]]) {
      route.interactions[w] = await interact(route, w, h);
      const l = route.interactions[w];
      console.log(`  ${route.path} @${w}: clicked ${l.clicked}/${l.total ?? '?'} dead ${l.dead.length} errors ${l.errors.length} fields ${l.fields.length}`);
    }
  }
}

// Light-scheme emulation: does anything respond to prefers-color-scheme?
results.lightScheme = [];
for (const route of targets.filter((r) => r.name !== 'chats')) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
  const page = await context.newPage();
  try {
    await page.goto(base + route.path, { waitUntil: 'domcontentloaded' });
    await settle(page);
    results.lightScheme.push({ path: route.path, ...(await page.evaluate(() => ({ bodyBg: getComputedStyle(document.body).backgroundColor, htmlClass: document.documentElement.className.includes('dark') ? 'dark' : 'light' }))) });
  } catch {}
  await context.close();
}

await writeFile(path.join(outDir, 'audit.json'), JSON.stringify(results, null, 2));
await browser.close();
if (served) await served.close();
console.log(`wrote ${path.join(outDir, 'audit.json')}`);

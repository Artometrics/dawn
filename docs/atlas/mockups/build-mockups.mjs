// Renders the two Atlas mockups (desktop 1440x900, mobile 390x844) as static HTML + PNG.
// HTML goes to the temp dir; only the PNGs are kept.
// The map in both is the real baked basemap and the real Cardinal data, drawn as inline SVG.
//   node docs/atlas/mockups/build-mockups.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright-core';

const here = path.dirname(new URL(import.meta.url).pathname);
const root = path.resolve(here, '../../..');
const base = JSON.parse(readFileSync(path.join(root, 'public/maps/atlas/cardinal-basemap.json'), 'utf8'));
const data = (n) => JSON.parse(readFileSync(path.join(root, 'src/features/atlas/data/cardinal', n), 'utf8'));
const stops = data('stops.json').stops;
const routes = data('routes.json').routes;
const byId = Object.fromEntries(stops.map((s) => [s.id, s]));
const { origin, unitsPerMetre } = base.meta;
const mLat = 110540;
const mLng = 111320 * Math.cos((origin.lat * Math.PI) / 180);
const world = (lat, lng) => [(lng - origin.lon) * mLng, (origin.lat - lat) * mLat];

function decode(flat) {
  const pts = [];
  let x = 0;
  let y = 0;
  for (let i = 0; i < flat.length; i += 2) {
    x = i === 0 ? flat[0] : x + flat[i];
    y = i === 0 ? flat[1] : y + flat[i + 1];
    pts.push([x / unitsPerMetre, y / unitsPerMetre]);
  }
  return pts;
}
const d = (list, close) => list.map((flat) => `M${decode(flat).map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('L')}${close ? 'Z' : ''}`).join('');

function mapSvg({ w, h, cx, cy, scale, route, active, compact }) {
  const vw = w / scale;
  const vh = h / scale;
  const view = `${cx - vw / 2} ${cy - vh / 2} ${vw} ${vh}`;
  const rt = routes.find((r) => r.id === route);
  const line = rt.line.map(([lng, lat]) => world(lat, lng).map((n) => n.toFixed(1)).join(' ')).join('L');
  const pins = rt.stops.map((id, i) => {
    const s = byId[id];
    const [x, y] = world(s.lat, s.lng);
    return { id, i, x, y, s };
  });
  const px = (n) => n / scale;
  const pills = pins.map((p) => {
    const sel = p.id === active;
    const label = p.s.name;
    if (compact && !sel) {
      return `<g transform="translate(${p.x} ${p.y}) scale(${1 / scale})"><circle r="14" fill="#1a3358" stroke="${p.i < 7 ? '#ff7a2f' : '#4cb7ff'}" stroke-width="2"/><text y="4.5" text-anchor="middle" font-size="12" font-weight="600" fill="#fff">${p.i + 1}</text></g>`;
    }
    const wpx = 44 + label.length * 6.6;
    return `<g transform="translate(${p.x} ${p.y})">
      <circle r="${px(sel ? 7 : 5)}" fill="#4cb7ff" stroke="#0e0e0c" stroke-width="${px(2)}"/>
      <g transform="translate(${px(10)} ${px(-22)}) scale(${1 / scale})">
        <rect width="${wpx}" height="32" rx="10" fill="#1a3358" ${sel ? 'stroke="#4cb7ff" stroke-width="2"' : ''}/>
        <rect x="4" y="4" width="24" height="24" rx="8" fill="#ffffff1a"/>
        <text x="16" y="21" text-anchor="middle" font-size="12" font-weight="600" fill="#fff">${p.i + 1}</text>
        <text x="34" y="21" font-size="13" font-weight="500" fill="#fff">${label}</text>
      </g></g>`;
  }).join('');
  const sprite = (() => {
    const p = pins[0];
    return `<image href="file://${path.join(root, 'public/tiles/you-0.png')}" x="${p.x - px(18) - px(14)}" y="${p.y - px(36)}" width="${px(36)}" height="${px(36)}" style="image-rendering:pixelated"/>`;
  })();
  const labels = base.labels.filter((l) => l.major).slice(0, 14).map((l) => {
    const [x, y] = [l.x / unitsPerMetre, l.y / unitsPerMetre];
    return `<text transform="translate(${x} ${y}) rotate(${(l.angle * 180) / Math.PI})" text-anchor="middle" font-size="${px(11)}" fill="#8f887f" stroke="#161816" stroke-width="${px(3)}" paint-order="stroke">${l.text}</text>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${view}" style="display:block;background:#161816">
    <path d="${d(base.green, true)}" fill="#1b211c"/>
    <path d="${d(base.water, true)}" fill="#152028"/>
    <path d="${d(base.waterways)}" fill="none" stroke="#152028" stroke-width="${px(3)}"/>
    <path d="${d(base.rail)}" fill="none" stroke="#2a2d2b" stroke-width="${px(2)}" stroke-dasharray="${px(6)} ${px(4)}"/>
    <path d="${d(base.buildings, true)}" fill="#22251f"/>
    <path d="${d(base.roads.path)}" fill="none" stroke="#2c322e" stroke-width="${px(1.2)}"/>
    <path d="${d(base.roads.minor)}" fill="none" stroke="#343a36" stroke-width="${px(2.4)}" stroke-linecap="round"/>
    <path d="${d(base.roads.major)}" fill="none" stroke="#3a413c" stroke-width="${px(4.5)}" stroke-linecap="round"/>
    ${labels}
    <path d="M${line}" fill="none" stroke="#ff7a2f" stroke-width="${px(4)}" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${pins[1].x}" cy="${pins[1].y}" r="42" fill="#3ee08a22" stroke="#3ee08a" stroke-width="${px(2)}"/>
    ${pills}${sprite}
  </svg>`;
}

const css = `
*{box-sizing:border-box}html,body{margin:0;background:#0e0e0c;color:#f3f1ec;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
.round{position:absolute;width:44px;height:44px;border-radius:50%;background:#2a2a27;display:grid;place-items:center;box-shadow:0 8px 18px #0006;font-size:18px;color:#f3f1ec}
.search{position:absolute;height:44px;border-radius:999px;background:#000b;display:flex;align-items:center;padding:0 16px;gap:10px;color:#a8a199;font-size:16px}
.chip{height:44px;padding:0 16px;border-radius:999px;background:#2a2a27;display:inline-flex;align-items:center;font-size:14px;color:#f3f1ec;white-space:nowrap}
.chip.on{background:#d97746;color:#141210}
.pill{height:44px;padding:0 18px;border-radius:999px;background:#f7f4ef;color:#141210;display:inline-flex;align-items:center;font-size:14px;font-weight:600}
.muted{color:#8f887f}.sec{color:#c4bdb3}
.row{display:flex;gap:12px;align-items:center;min-height:56px;padding:6px 12px;border-radius:14px}
.row b{font-weight:500;font-size:16px;display:block}.row small{font-size:13px;color:#8f887f}
.num{width:28px;height:28px;border-radius:50%;background:#1a3358;display:grid;place-items:center;font-size:13px;font-weight:600;flex:none}
.attr{position:absolute;font-size:11px;color:#c4bdb3;background:#000a;padding:3px 8px;border-radius:8px}
h1{font-family:"Source Serif 4","Iowan Old Style",Palatino,Georgia,serif;font-weight:560;letter-spacing:-.03em;margin:0}
.src{display:block;font-size:13px;color:#c4bdb3;padding:6px 0;text-decoration:underline;text-decoration-color:#3a3834}
.fact{font-size:14px;color:#c4bdb3;line-height:1.35;padding-left:14px;position:relative;margin:4px 0}.fact::before{content:'';position:absolute;left:0;top:7px;width:5px;height:5px;border-radius:50%;background:#d97746}
`;

const story = byId.memchu;
const panelPlace = (compact) => `
  <div style="padding:${compact ? '4px 16px 0' : '20px 20px 0'}">
    <div class="muted" style="font-size:13px">${story.years} · ${story.icon} Founders' Walk, stop 8 of 8</div>
    <h1 style="font-size:${compact ? 26 : 32}px;margin-top:4px">${story.name}</h1>
    <p class="sec" style="font-size:15px;line-height:1.45;margin:10px 0 0">${story.story.slice(0, compact ? 200 : 330)}…</p>
    ${story.facts.slice(0, compact ? 0 : 3).map((f) => `<div class="fact">${f}</div>`).join('')}
    <div style="display:flex;gap:8px;margin:14px 0 6px;flex-wrap:wrap"><span class="pill">Unlock +100 XP</span><span class="chip">Quiz +50</span><span class="chip">Listen</span></div>
    <div class="muted" style="font-size:13px;margin-top:10px">Sources</div>
    ${story.sources.slice(0, compact ? 2 : 4).map((s) => `<a class="src">${s.title}</a>`).join('')}
  </div>`;

const desktop = `<!doctype html><meta charset="utf-8"><style>${css}</style>
<div style="display:grid;grid-template-columns:420px 1fr;height:900px;width:1440px;overflow:hidden">
  <aside style="background:#121211;border-right:1px solid #2a2a27;display:flex;flex-direction:column;min-height:0">
    <div style="padding:20px 20px 8px;display:flex;align-items:center;gap:12px"><div class="round" style="position:static">⌂</div><div><h1 style="font-size:30px">Atlas</h1><div class="muted" style="font-size:13px">Cardinal · Stanford · 27 stops · 5 tours</div></div></div>
    <div style="padding:8px 20px"><div class="search" style="position:static;background:#1c1c1a">⌕ &nbsp;Search places</div></div>
    <div style="padding:4px 20px 8px;display:flex;gap:8px;overflow:hidden"><span class="chip on">Places</span><span class="chip">Tours</span><span class="chip">Story</span><span class="chip">Progress</span></div>
    <div style="padding:6px 8px;overflow:hidden;flex:1">
      <div class="muted" style="font-size:13px;padding:6px 12px">Founders' Walk · 2.5 km · 7 of 8 unlocked</div>
      ${routes[0].stops.map((id, i) => `<div class="row" style="${id === 'memchu' ? 'background:#1c1c1a' : ''}"><span class="num" style="${i < 7 ? 'background:#ff7a2f;color:#141210' : ''}">${i + 1}</span><div><b>${byId[id].name}</b><small>${byId[id].years}</small></div></div>`).join('')}
      <div class="muted" style="font-size:13px;padding:14px 12px 6px">Beyond the quad</div>
      ${['Palm Drive', 'HP Garage · exterior only', 'Stanford Research Park'].map((n) => `<div class="row"><span class="num" style="background:#2a2a27">·</span><div><b>${n}</b><small>OpenStreetMap place</small></div></div>`).join('')}
    </div>
    <div style="border-top:1px solid #2a2a27;max-height:330px;overflow:hidden;background:#171715">${panelPlace(false)}</div>
  </aside>
  <main style="position:relative;overflow:hidden">
    ${mapSvg({ w: 1020, h: 900, cx: 40, cy: -600, scale: 0.62, route: 'founders', active: 'memchu' })}
    <div class="search" style="left:16px;top:16px;width:360px">⌕ &nbsp;Search the map</div>
    <div class="round" style="right:16px;top:16px">◫</div><div class="round" style="right:16px;top:68px">◎</div>
    <div class="round" style="right:16px;top:132px;font-size:22px">+</div><div class="round" style="right:16px;top:184px;font-size:22px">−</div>
    <div style="position:absolute;left:16px;bottom:16px;display:flex;gap:8px;align-items:center"><span class="pill">Walk to Memorial Church</span><span class="chip">Founders' Walk ▾</span></div>
    <div class="attr" style="right:16px;bottom:16px">© OpenStreetMap contributors · ODbL</div>
  </main>
</div>`;

const mobile = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=390"><style>${css}</style>
<div style="position:relative;width:390px;height:844px;overflow:hidden">
  ${mapSvg({ w: 390, h: 844, cx: -20, cy: -40, scale: 0.33, route: 'founders', active: 'memchu', compact: true })}
  <div class="round" style="left:12px;top:12px">⌂</div>
  <div class="search" style="left:64px;right:12px;top:12px">⌕ &nbsp;Search places</div>
  <div class="round" style="right:12px;top:68px">◫</div><div class="round" style="right:12px;top:120px">◎</div>
  <div class="attr" style="left:10px;bottom:calc(46% + 8px)">© OpenStreetMap contributors · ODbL</div>
  <section style="position:absolute;left:0;right:0;bottom:0;height:46%;background:#121211;border-radius:22px 22px 0 0;box-shadow:0 -10px 28px #0006;overflow:hidden">
    <div style="height:28px;display:grid;place-items:center"><span style="width:36px;height:4px;border-radius:99px;background:#3a3834"></span></div>
    <div style="padding:0 16px 8px;display:flex;gap:8px;overflow:hidden"><span class="chip">Places</span><span class="chip on">Place</span><span class="chip">Tours</span><span class="chip">Story</span></div>
    ${panelPlace(true)}
  </section>
</div>`;

const work = tmpdir();
writeFileSync(path.join(work, 'atlas-mock-desktop.html'), desktop);
writeFileSync(path.join(work, 'atlas-mock-mobile.html'), mobile);
const chrome = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome'].find((f) => { try { readFileSync(f); return true; } catch { return false; } });
const browser = await chromium.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox', '--allow-file-access-from-files'] });
for (const [name, size] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
  const page = await browser.newPage({ viewport: size });
  await page.goto(`file://${path.join(work, `atlas-mock-${name}.html`)}`);
  await page.screenshot({ path: path.join(here, `${name}.png`), fullPage: true });
}
await browser.close();
console.log('mockups written');

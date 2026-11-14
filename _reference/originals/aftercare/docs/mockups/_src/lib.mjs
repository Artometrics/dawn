// Shared pieces for the static mockups. Run `node docs/mockups/build.mjs` to regenerate the HTML.
import { readFileSync } from 'node:fs'

const world = JSON.parse(readFileSync(new URL('../../../site/src/data/worldPath.json', import.meta.url), 'utf8'))

export const sprite = `
<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
  <symbol id="i-sun" viewBox="0 0 32 32"><circle cx="16" cy="16" r="5.5" fill="none" stroke="currentColor" stroke-width="1.6"/><g stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M16 3v4M16 25v4M3 16h4M25 16h4M6.8 6.8l2.8 2.8M22.4 22.4l2.8 2.8M25.2 6.8l-2.8 2.8M9.6 22.4l-2.8 2.8"/></g></symbol>
  <symbol id="i-moon" viewBox="0 0 32 32"><path d="M22 4.5A12 12 0 1 0 27.5 22 10 10 0 0 1 22 4.5z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></symbol>
  <symbol id="i-star" viewBox="0 0 32 32"><path d="M16 3l3 10 10 3-10 3-3 10-3-10-10-3 10-3z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></symbol>
  <symbol id="i-eye" viewBox="0 0 32 32"><path d="M2 16c4-7 9-10 14-10s10 3 14 10c-4 7-9 10-14 10S6 23 2 16z" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="16" cy="16" r="4.5" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="16" cy="16" r="1.5" fill="currentColor"/></symbol>
  <symbol id="i-cards" viewBox="0 0 32 32"><rect x="5" y="6" width="14" height="21" rx="2.5" transform="rotate(-9 12 16)" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="13" y="5" width="14" height="21" rx="2.5" transform="rotate(8 20 15)" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M20 12l1.2 3 3 1.2-3 1.2-1.2 3-1.2-3-3-1.2 3-1.2z" fill="currentColor" transform="rotate(8 20 15)"/></symbol>
  <symbol id="i-num" viewBox="0 0 32 32"><path d="M11 5L8 27M24 5l-3 22M4 12h24M3 20h24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></symbol>
  <symbol id="i-pin" viewBox="0 0 32 32"><path d="M16 29s9-8.5 9-15.5a9 9 0 0 0-18 0C7 20.5 16 29 16 29z" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="16" cy="13.5" r="3.2" fill="none" stroke="currentColor" stroke-width="1.6"/></symbol>
  <symbol id="i-me" viewBox="0 0 32 32"><circle cx="16" cy="11" r="5.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M5 28c1.5-6 6-9 11-9s9.5 3 11 9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></symbol>
  <symbol id="i-book" viewBox="0 0 32 32"><path d="M5 6c4-1.5 8-1 11 2 3-3 7-3.5 11-2v19c-4-1.5-8-1-11 2-3-3-7-3.5-11-2z M16 8v19" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></symbol>
  <symbol id="i-home" viewBox="0 0 32 32"><path d="M4 15L16 5l12 10M7 13v14h18V13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></symbol>
  <symbol id="i-share" viewBox="0 0 32 32"><circle cx="8" cy="16" r="3.5" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="24" cy="7" r="3.5" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="24" cy="25" r="3.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M11 14.5l10-6M11 17.5l10 6" stroke="currentColor" stroke-width="1.6"/></symbol>
  <symbol id="i-lock" viewBox="0 0 32 32"><rect x="6" y="14" width="20" height="14" rx="3" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M10 14V10a6 6 0 0 1 12 0v4" fill="none" stroke="currentColor" stroke-width="1.6"/></symbol>
  <symbol id="i-flourish" viewBox="0 0 32 32"><path d="M16 4c1 5 4 8 9 9-5 1-8 4-9 9-1-5-4-8-9-9 5-1 8-4 9-9z" fill="currentColor"/></symbol>
</defs></svg>`

export const ic = (name, cls = "") => `<svg class="${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`

export const logoMark = `<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="13" fill="#0f2321"/><path d="M21.5 7.5a9.5 9.5 0 1 0 3 12.5 7.5 7.5 0 0 1-3-12.5z" fill="#d99a2b"/><circle cx="21" cy="12" r="1.3" fill="#f3ead9"/><circle cx="12" cy="9" r=".8" fill="#f3ead9"/></svg>`

const tabs = [
  ['home', 'Home', 'landing.html'],
  ['cards', 'Tarot', 'tarot-reading.html'],
  ['num', 'Numbers', 'numerology.html'],
  ['me', 'Me', 'profile.html'],
  ['book', 'Journal', 'journal.html'],
]

export function layout({ title, active, body, bodyClass = '' }) {
  const nav = [
    ['Tarot', 'tarot-reading.html', 'tarot-reading'],
    ['Numbers', 'numerology.html', 'numerology'],
    ['Second self', 'profile.html', 'profile'],
    ['Journal', 'journal.html', 'journal'],
  ]
    .map(([l, h, k]) => `<a href="${h}"${active === k ? ' aria-current="page"' : ''}>${l}</a>`)
    .join('')
  const tab = tabs
    .map(([i, l, h]) => {
      const k = h.replace('.html', '')
      const cur = active === k || (active === 'card-detail' && k === 'tarot-reading') || (active === 'onboarding' && k === 'profile')
      return `<a href="${h}"${cur ? ' aria-current="page"' : ''}>${ic(i)}<span>${l}</span></a>`
    })
    .join('')
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} - Aftercare (mockup)</title>
<link rel="stylesheet" href="assets/almanac.css">
<link rel="stylesheet" href="assets/pages.css">
</head>
<body class="${bodyClass}">
${sprite}
<header class="site-head"><div class="wrap">
  <a class="logo" href="landing.html" aria-label="Aftercare home">${logoMark}Aftercare</a>
  <nav class="nav" aria-label="Main">${nav}</nav>
  <div class="head-cta"><a class="btn ghost sm" href="onboarding.html">Sign in</a><a class="btn sm" href="onboarding.html">Start your profile</a></div>
</div></header>
<main>
${body}
</main>
<footer class="site-foot"><div class="wrap">
  <div><a class="logo" href="landing.html">${logoMark}Aftercare</a><p style="max-width:26em">A warm little almanac for your inner life. Tarot, numbers, places and the things you love, all in one home.</p></div>
  <div><h4>Explore</h4><a href="tarot-reading.html">Tarot table</a><a href="card-detail.html">The deck</a><a href="numerology.html">Numerology</a><a href="profile.html">Your second self</a></div>
  <div><h4>Coming later</h4><a href="#">Druids &amp; trees</a><a href="#">Historical figures</a><a href="#">Fun facts</a><a href="#">Marketplace</a></div>
  <div><h4>Aftercare</h4><a href="journal.html">Journal</a><a href="#">About</a><a href="#">Privacy</a><a href="#">Contact</a></div>
  <div class="fine"><span>For reflection and entertainment. Readings do not predict the future or replace medical, legal or financial advice.</span><span>Made with care. Your data stays on your device.</span></div>
</div></footer>
<nav class="tabbar" aria-label="Tabs">${tab}</nav>
</body>
</html>
`
}

/* ---------- mock card art (stand-ins; the app generates all 78 from code) ---------- */
const star = (cx, cy, n, ro, ri, rot = -90) => {
  const pts = []
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? ri : ro
    const a = ((rot + (i * 180) / n) * Math.PI) / 180
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`)
  }
  return `<polygon points="${pts.join(' ')}"/>`
}
const cup = (x, y, s = 1, fill = '#f3ead9') =>
  `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-24-34h48c0 24-9 38-24 43-15-5-24-19-24-43z" fill="${fill}" stroke="#0f2321" stroke-width="2.4"/><path d="M0 9v22M-14 34h28" stroke="#0f2321" stroke-width="3" stroke-linecap="round"/><path d="M-18-24h36" stroke="#0f2321" stroke-width="1.5" opacity=".5"/></g>`

function face({ field, art, numeral, name, accent = '#7b2d3a', back = false }) {
  return `<svg viewBox="0 0 300 514" role="img" aria-label="${name}"><rect width="300" height="514" fill="#f3ead9"/>
  <rect x="10" y="10" width="280" height="494" rx="6" fill="none" stroke="#0f2321" stroke-width="1.6"/>
  <rect x="18" y="18" width="264" height="416" fill="${field}"/>
  <g clip-path="url(#c)">${art}</g>
  <rect x="18" y="18" width="264" height="416" fill="none" stroke="#0f2321" stroke-width="1.6"/>
  <text x="150" y="468" text-anchor="middle" font-family="Fraunces, Georgia, serif" font-size="25" font-weight="560" fill="#0f2321">${name}</text>
  <text x="150" y="490" text-anchor="middle" font-family="Outfit, sans-serif" font-size="11" letter-spacing="4" fill="${accent}">${numeral}</text>
  <defs><clipPath id="c"><rect x="18" y="18" width="264" height="416"/></clipPath></defs></svg>`
}

const dots = (seed, n, w = 264, h = 300, c = '#f3ead9') => {
  let s = seed
  const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280)
  return Array.from({ length: n }, () => `<circle cx="${(18 + r() * w).toFixed(0)}" cy="${(18 + r() * h).toFixed(0)}" r="${(0.7 + r() * 1.4).toFixed(1)}" fill="${c}" opacity=".8"/>`).join('')
}

export const cards = {
  star: () =>
    face({
      name: 'The Star', numeral: 'XVII', field: '#173532',
      art: `${dots(3, 40)}<g fill="#d99a2b">${star(150, 140, 8, 78, 26)}</g><g fill="#f3ead9">${star(66, 70, 4, 14, 5)}${star(236, 80, 4, 12, 4)}${star(52, 200, 4, 11, 4)}${star(248, 190, 4, 13, 4)}${star(100, 40, 4, 9, 3)}${star(210, 38, 4, 9, 3)}${star(150, 240, 4, 9, 3)}</g>
      <path d="M18 330c50-26 90 16 132-4s86-24 132 2v106H18z" fill="#3f7f73"/><path d="M18 372c50-22 90 12 132-4s86-18 132 2" fill="none" stroke="#f3ead9" stroke-width="2" opacity=".7"/>
      <path d="M118 300c-8 20-8 36 0 50M182 300c8 20 8 36 0 50" stroke="#d9a7a0" stroke-width="5" fill="none" stroke-linecap="round"/>`,
    }),
  moon: () =>
    face({
      name: 'The Moon', numeral: 'XVIII', field: '#214844',
      art: `${dots(11, 30)}<circle cx="150" cy="120" r="70" fill="#d9a7a0"/><circle cx="178" cy="106" r="62" fill="#214844"/>
      <path d="M18 300h40v-90h28v90h-4v134H18zM282 300h-40v-90h-28v90h4v134h64z" fill="#0f2321"/>
      <path d="M150 440c-40-30 40-46 0-80s40-50 0-80" fill="none" stroke="#d99a2b" stroke-width="12" stroke-linecap="round" opacity=".9"/>
      <g fill="#f3ead9" opacity=".9"><circle cx="86" cy="336" r="3"/><circle cx="214" cy="326" r="3"/><circle cx="96" cy="380" r="2"/><circle cx="204" cy="372" r="2"/></g>
      <path d="M118 424c10-18 54-18 64 0z" fill="#7b2d3a"/>`,
    }),
  sun: () =>
    face({
      name: 'The Sun', numeral: 'XIX', field: '#e4b45b',
      art: `<g stroke="#7b2d3a" stroke-width="5" stroke-linecap="round">${Array.from({ length: 16 }, (_, i) => { const a = (i * 22.5 * Math.PI) / 180; return `<path d="M${150 + 70 * Math.cos(a)} ${150 + 70 * Math.sin(a)}L${150 + (i % 2 ? 96 : 118) * Math.cos(a)} ${150 + (i % 2 ? 96 : 118) * Math.sin(a)}"/>` }).join('')}</g>
      <circle cx="150" cy="150" r="56" fill="#f3ead9" stroke="#0f2321" stroke-width="2.4"/><circle cx="134" cy="140" r="4" fill="#0f2321"/><circle cx="166" cy="140" r="4" fill="#0f2321"/><path d="M130 166c12 12 28 12 40 0" stroke="#0f2321" stroke-width="3" fill="none" stroke-linecap="round"/>
      <rect x="18" y="360" width="264" height="74" fill="#3f7f73"/><g fill="#7b2d3a"><circle cx="60" cy="330" r="22"/><circle cx="150" cy="316" r="26"/><circle cx="240" cy="330" r="22"/></g><g stroke="#0f2321" stroke-width="3"><path d="M60 352v40M150 342v50M240 352v40"/></g>`,
    }),
  threeCups: () =>
    face({
      name: 'Three of Cups', numeral: 'III', accent: '#3f7f73', field: '#d9a7a0',
      art: `<path d="M30 70c40 40 80 0 120 30s80-10 120-30" fill="none" stroke="#3f7f73" stroke-width="6"/><g fill="#3f7f73">${Array.from({ length: 9 }, (_, i) => `<circle cx="${42 + i * 27}" cy="${84 + (i % 2) * 12}" r="7"/>`).join('')}</g>${cup(88, 220, 1.5)}${cup(212, 220, 1.5)}${cup(150, 150, 1.7, '#d99a2b')}
      <path d="M18 380c60-24 120 14 264-6v60H18z" fill="#7b2d3a" opacity=".85"/>`,
    }),
  queenSwords: () =>
    face({
      name: 'Queen of Swords', numeral: 'QUEEN', accent: '#5d6a63', field: '#9fb3b0',
      art: `${dots(7, 22, 264, 200, '#f3ead9')}<path d="M104 190l12-60 34 24 34-24 12 60z" fill="#d99a2b" stroke="#0f2321" stroke-width="2.4"/><circle cx="150" cy="224" r="40" fill="#f3ead9" stroke="#0f2321" stroke-width="2.4"/>
      <path d="M150 140L150 40M138 52h24" stroke="#0f2321" stroke-width="3"/><path d="M142 40l8-30 8 30v90h-16z" fill="#f3ead9" stroke="#0f2321" stroke-width="2.4"/>
      <path d="M60 434c0-80 40-150 90-150s90 70 90 150z" fill="#173532" stroke="#0f2321" stroke-width="2.4"/><path d="M18 300c40-10 70 12 132 0s90-14 132 0v134H18z" fill="#f3ead9" opacity=".35"/>`,
    }),
  back: () => `<svg viewBox="0 0 300 514" role="img" aria-label="Card back"><rect width="300" height="514" fill="#0f2321"/>
    <rect x="12" y="12" width="276" height="490" rx="6" fill="none" stroke="#d99a2b" stroke-width="2"/><rect x="22" y="22" width="256" height="470" rx="3" fill="none" stroke="#d99a2b" stroke-width=".8" opacity=".7"/>
    <g fill="none" stroke="#d99a2b" stroke-width="1.4"><circle cx="150" cy="257" r="86"/><circle cx="150" cy="257" r="64"/><circle cx="150" cy="257" r="30"/>${Array.from({ length: 24 }, (_, i) => { const a = (i * 15 * Math.PI) / 180; return `<path d="M${150 + 64 * Math.cos(a)} ${257 + 64 * Math.sin(a)}L${150 + 86 * Math.cos(a)} ${257 + 86 * Math.sin(a)}"/>` }).join('')}</g>
    <g fill="#d99a2b">${star(150, 257, 8, 24, 8)}</g><path d="M164 238a22 22 0 1 0 6 32 17 17 0 0 1-6-32z" fill="#0f2321"/>
    <g fill="#f3ead9" opacity=".8">${star(150, 70, 4, 11, 3)}${star(150, 444, 4, 11, 3)}${star(50, 257, 4, 8, 2.5)}${star(250, 257, 4, 8, 2.5)}</g></svg>`,
}

export const tcard = (key, cls = '', style = '') => `<div class="tcard ${key === 'back' ? 'back' : ''} ${cls}" style="${style}">${cards[key]()}</div>`

/* equirectangular map, same projection the app uses (1000x500 world, cropped) */
export function worldMap({ pins = [], links = [], className = 'map' }) {
  const px = (lng) => ((lng + 180) / 360) * 1000
  const py = (lat) => ((90 - lat) / 180) * 500
  const grat = [-120, -60, 0, 60, 120].map((x) => `<path d="M${px(x)} 20V415" />`).join('') + [60, 30, 0, -30].map((y) => `<path d="M0 ${py(y)}H1000" />`).join('')
  const pinSvg = pins
    .map((p) => {
      const x = px(p.lng), y = py(p.lat)
      const c = p.color || '#7b2d3a'
      return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><circle r="${p.home ? 14 : 8}" fill="${c}" opacity=".25"/><circle r="${p.home ? 6 : 4}" fill="${c}" stroke="#f3ead9" stroke-width="1.5"/>${p.label ? `<text x="${p.dx ?? 10}" y="${p.dy ?? 4}" font-family="Outfit, sans-serif" font-size="${p.home ? 15 : 13}" fill="#0f2321" paint-order="stroke" stroke="#f3ead9" stroke-width="4">${p.label}</text>` : ''}</g>`
    })
    .join('')
  const linkSvg = links.map(([a, b]) => `<path d="M${px(a.lng).toFixed(1)} ${py(a.lat).toFixed(1)}Q${((px(a.lng) + px(b.lng)) / 2).toFixed(1)} ${(Math.min(py(a.lat), py(b.lat)) - 50).toFixed(1)} ${px(b.lng).toFixed(1)} ${py(b.lat).toFixed(1)}" fill="none" stroke="#7b2d3a" stroke-width="1.4" stroke-dasharray="4 5" opacity=".75"/>`).join('')
  return `<svg class="${className}" viewBox="0 24 1000 392" role="img" aria-label="World map with saved places"><rect x="0" y="24" width="1000" height="392" fill="#e9dcc0"/><g stroke="#0f2321" stroke-opacity=".12" fill="none" stroke-width="1">${grat}</g><path d="${world.d}" fill="#f6efdf" stroke="#0f2321" stroke-width=".8" stroke-opacity=".7"/>${linkSvg}${pinSvg}</svg>`
}

export const samplePins = [
  { lat: 38.72, lng: -9.14, label: 'Lisbon', home: true, dx: -52, dy: -14 },
  { lat: 35.68, lng: 139.69, label: 'Spirited Away', color: '#3f7f73', dx: -86, dy: -12 },
  { lat: 41.9, lng: 12.5, label: 'Piranesi', color: '#d99a2b', dx: 8, dy: -10 },
  { lat: 55.75, lng: 37.62, label: 'Master & Margarita', color: '#3f7f73', dx: 8, dy: -8 },
  { lat: 48.86, lng: 2.35, label: 'Amélie', color: '#7b2d3a', dx: -50, dy: -12 },
  { lat: -20.46, lng: -66.82, label: 'Salt lakes', color: '#d99a2b', dx: 10, dy: 4 },
]

export const photoFree = true

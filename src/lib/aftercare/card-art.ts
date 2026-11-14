/**
 * Original procedural card art. Every card is a deterministic SVG (300 x 514) built from simple shapes.
 * No scans, no traced artwork, no third-party images. The same SVG feeds the 3D table, deck browser and card pages.
 */
import type { Card, Suit } from './types'

export const ART_W = 300
export const ART_H = 514

const INK = '#0f2321'
const PAPER = '#f3ead9'
const OX = '#7b2d3a'
const GOLD = '#d99a2b'
const VERD = '#3f7f73'
const ROSE = '#d9a7a0'
const NIGHT = '#173532'
const DEEP = '#214844'
const SLATE = '#9fb3b0'
const SAND = '#e4b45b'
const TERRA = '#b5533c'
const CREAM2 = '#fbf6ea'

/* ---------- tiny SVG helpers ---------- */
const f = (n: number) => Number(n.toFixed(1))
const circle = (cx: number, cy: number, r: number, fill = 'none', stroke = INK, sw = 2, extra = '') =>
  `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`
const path = (d: string, fill = 'none', stroke = INK, sw = 2, extra = '') =>
  `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round" ${extra}/>`
const rect = (x: number, y: number, w: number, h: number, fill = 'none', stroke = INK, sw = 2, rx = 0) =>
  `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`
const poly = (pts: Array<[number, number]>, fill = 'none', stroke = INK, sw = 2) =>
  `<polygon points="${pts.map(([x, y]) => `${f(x)},${f(y)}`).join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>`
const line = (x1: number, y1: number, x2: number, y2: number, stroke = INK, sw = 2, extra = '') =>
  `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" ${extra}/>`
const g = (transform: string, inner: string) => `<g transform="${transform}">${inner}</g>`

function starPts(cx: number, cy: number, n: number, ro: number, ri: number, rot = -90): Array<[number, number]> {
  const pts: Array<[number, number]> = []
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? ri : ro
    const a = ((rot + (i * 180) / n) * Math.PI) / 180
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)])
  }
  return pts
}
const star = (cx: number, cy: number, n: number, ro: number, ri: number, fill = GOLD, stroke = 'none', sw = 0, rot = -90) => poly(starPts(cx, cy, n, ro, ri, rot), fill, stroke, sw)

function rays(cx: number, cy: number, r1: number, r2: number, n: number, stroke = GOLD, sw = 3, alt = 0.7) {
  let s = ''
  for (let i = 0; i < n; i++) {
    const a = (i * 2 * Math.PI) / n
    const r = i % 2 && alt < 1 ? r1 + (r2 - r1) * alt : r2
    s += line(cx + r1 * Math.cos(a), cy + r1 * Math.sin(a), cx + r * Math.cos(a), cy + r * Math.sin(a), stroke, sw)
  }
  return s
}

const crescent = (cx: number, cy: number, r: number, fill = PAPER, stroke = INK, sw = 1.6, flip = false) => {
  const d = flip
    ? `M${f(cx)} ${f(cy - r)}A${f(r)} ${f(r)} 0 1 1 ${f(cx)} ${f(cy + r)}A${f(r * 1.3)} ${f(r * 1.3)} 0 0 0 ${f(cx)} ${f(cy - r)}Z`
    : `M${f(cx)} ${f(cy - r)}A${f(r)} ${f(r)} 0 1 0 ${f(cx)} ${f(cy + r)}A${f(r * 1.3)} ${f(r * 1.3)} 0 0 1 ${f(cx)} ${f(cy - r)}Z`
  return path(d, fill, stroke, sw)
}

function hash(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
function rngFor(seed: string) {
  let a = hash(seed)
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Seeded sprinkle: tiny stars on dark fields, flecks on light ones. */
function sprinkle(seed: string, n: number, dark: boolean, y0 = 20, y1 = 300) {
  const r = rngFor(seed)
  let s = ''
  for (let i = 0; i < n; i++) {
    const x = 24 + r() * 252
    const y = y0 + r() * (y1 - y0)
    const rad = 0.7 + r() * 1.5
    s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rad)}" fill="${dark ? PAPER : INK}" opacity="${dark ? 0.75 : 0.25}"/>`
  }
  return s
}

/* ---------- suit glyphs (origin-centred, ~120 units tall at scale 1) ---------- */
function wand(s = 1, accent = VERD) {
  const leaves =
    path('M0-18c-20-2-28-14-25-28 16 2 25 12 25 28z', accent, INK, 2.2) +
    path('M0 6c20-2 28-14 25-28-16 2-25 12-25 28z', accent, INK, 2.2) +
    path('M0 30c-16-2-22-11-20-22 13 2 20 10 20 22z', accent, INK, 2.2)
  return g(`scale(${s})`, `${path('M-6-62 Q-8-58-5-54 L-7 60 Q0 66 7 60 L5-54 Q8-58 6-62 Q0-68-6-62z', OX, INK, 2.4)}${leaves}${line(-4, -48, 4, -48, PAPER, 1.5)}`)
}
function cup(s = 1, fill = PAPER) {
  return g(`scale(${s})`, `${path('M-30-48h60c0 30-11 50-30 56-19-6-30-26-30-56z', fill, INK, 2.6)}${path('M0 8v32M-18 46h36M-12 40h24', 'none', INK, 3)}${path('M-22-34h44', 'none', INK, 1.4, 'opacity=".45"')}${circle(0, -20, 5, GOLD, INK, 1.4)}`)
}
function sword(s = 1) {
  return g(`scale(${s})`, `${path('M0-70L9-54V28H-9V-54Z', PAPER, INK, 2.6)}${line(0, -60, 0, 24, INK, 1.2, 'opacity=".45"')}${rect(-24, 28, 48, 8, GOLD, INK, 2.2, 3)}${rect(-4.5, 36, 9, 22, OX, INK, 2.2, 2)}${circle(0, 63, 6, GOLD, INK, 2)}`)
}
function pentacle(s = 1) {
  return g(`scale(${s})`, `${circle(0, 0, 46, GOLD, INK, 2.8)}${circle(0, 0, 38, 'none', INK, 1.4)}${poly(starPts(0, 0, 5, 30, 12), PAPER, INK, 2)}${circle(0, 0, 4, OX, INK, 1.4)}`)
}
function glyph(suit: Suit, s = 1) {
  return suit === 'wands' ? wand(s) : suit === 'cups' ? cup(s) : suit === 'swords' ? sword(s) : pentacle(s)
}
const suitMark = (suit: Suit, x: number, y: number, s: number) => g(`translate(${x} ${y})`, glyph(suit, s))

/* ---------- minor arcana ---------- */
const SUIT_STYLE: Record<Suit, { field: string; accent: string; dark: boolean }> = {
  wands: { field: SAND, accent: OX, dark: false },
  cups: { field: ROSE, accent: VERD, dark: false },
  swords: { field: SLATE, accent: INK, dark: false },
  pentacles: { field: '#9cc2a6', accent: GOLD, dark: false },
}

function suitBackdrop(suit: Suit, seed: string) {
  const r = rngFor(`bd-${seed}`)
  if (suit === 'wands') {
    let s = ''
    for (let i = 0; i < 9; i++) s += line(150 + (i - 4) * 36, 434, 150 + (i - 4) * 70, 18, OX, 1.4, 'opacity=".16"')
    return s + circle(150, 448, 120, OX, 'none', 0, 'opacity=".14"')
  }
  if (suit === 'cups') {
    let s = ''
    for (let i = 0; i < 6; i++) s += path(`M18 ${360 + i * 14}q33-12 66 0t66 0 66 0 66 0`, 'none', VERD, 2, 'opacity=".4"')
    return s
  }
  if (suit === 'swords') {
    let s = ''
    for (let i = 0; i < 5; i++) {
      const y = 60 + r() * 300
      const x = 30 + r() * 200
      s += path(`M${f(x)} ${f(y)}h${f(30 + r() * 40)}`, 'none', PAPER, 4, 'opacity=".6"')
    }
    return s
  }
  return path('M18 400Q80 340 150 380T282 360V434H18Z', VERD, 'none', 0, 'opacity=".5"') + path('M18 420Q100 380 180 410T282 400V434H18Z', DEEP, 'none', 0, 'opacity=".35"')
}

const PIPS: Record<number, Array<[number, number]>> = {
  2: [[0, -1], [0, 1]],
  3: [[0, -1.2], [0, 0], [0, 1.2]],
  4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
  6: [[-1, -1.2], [1, -1.2], [-1, 0], [1, 0], [-1, 1.2], [1, 1.2]],
  7: [[-1, -1.2], [1, -1.2], [0, -0.6], [-1, 0], [1, 0], [-1, 1.2], [1, 1.2]],
  8: [[-1, -1.2], [1, -1.2], [0, -0.6], [-1, 0], [1, 0], [0, 0.6], [-1, 1.2], [1, 1.2]],
  9: [[-1, -1.5], [1, -1.5], [-1, -0.5], [1, -0.5], [0, 0], [-1, 0.5], [1, 0.5], [-1, 1.5], [1, 1.5]],
  10: [[-1, -1.5], [1, -1.5], [0, -1], [-1, -0.5], [1, -0.5], [-1, 0.5], [1, 0.5], [0, 1], [-1, 1.5], [1, 1.5]],
}
const PIP_SCALE = [0, 0, 0.95, 0.78, 0.78, 0.72, 0.6, 0.56, 0.54, 0.5, 0.5]
const PIP_Y = [0, 0, 105, 82, 90, 90, 68, 68, 68, 62, 62]

function pipCard(card: Card) {
  const suit = card.suit as Suit
  const n = card.number
  const yU = PIP_Y[n]
  const s = PIP_SCALE[n]
  const pips = PIPS[n]
    .map(([ux, uy]) => {
      const flip = suit === 'swords' && n % 2 === 0 && uy > 0
      const body = glyph(suit, s)
      return g(`translate(${f(150 + ux * 62)} ${f(222 + uy * yU)})${flip ? ' rotate(180)' : ''}`, body)
    })
    .join('')
  // small ring of rank-dots along the top edge to make counts easy to read at a glance
  const dots = Array.from({ length: n }, (_, i) => circle(150 + (i - (n - 1) / 2) * 12, 38, 3, SUIT_STYLE[suit].accent, INK, 1)).join('')
  return dots + pips
}

function aceCard(card: Card) {
  const suit = card.suit as Suit
  const cloud = path('M60 430c-22 0-28-26-8-32 0-20 26-26 38-12 10-16 40-14 46 6 14-12 40-6 42 14 22-4 30 24 8 24z', PAPER, INK, 2.4)
  const hand = path('M128 420c0-30 4-48 12-60 4-6 14-6 18 0 8 12 12 30 12 60z', CREAM2, INK, 2.2) + line(150, 374, 150, 410, INK, 1.2, 'opacity=".4"')
  const glow = rays(150, 190, 82, 126, 24, PAPER, 3) + circle(150, 190, 76, PAPER, 'none', 0, 'opacity=".45"')
  return glow + cloud + hand + suitMark(suit, 150, 214, suit === 'pentacles' ? 1.25 : 1.35)
}

const ELEMENT_TRI: Record<string, string> = {
  fire: 'M0-9L9 7H-9Z',
  water: 'M0 9L9-7H-9Z',
  air: 'M0-9L9 7H-9ZM-6 0H6',
  earth: 'M0 9L9-7H-9ZM-6 0H6',
}

function courtCard(card: Card) {
  const suit = card.suit as Suit
  const acc = SUIT_STYLE[suit].accent === INK ? OX : SUIT_STYLE[suit].accent
  const arch = path('M52 434V190a98 98 0 0 1 196 0V434Z', PAPER, INK, 2.2, 'opacity=".55"')
  const shield = path('M92 262h116v76c0 38-30 60-58 74-28-14-58-36-58-74z', CREAM2, INK, 2.6) + path('M100 270h100v68c0 30-22 48-50 62-28-14-50-32-50-62z', 'none', acc, 1.6)
  const emblem = suitMark(suit, 150, 332, 0.62)
  let head = ''
  const rank = card.number
  if (rank === 11) {
    // Page: pennant on a pole and a small cap
    head = line(104, 250, 104, 120, INK, 3) + poly([[104, 124], [170, 142], [104, 160]], acc, INK, 2.2) + circle(150, 186, 22, PAPER, INK, 2.4) + path('M126 182q24-34 48 0z', acc, INK, 2.2) + circle(150, 168, 3.5, GOLD, INK, 1.4) + star(190, 108, 4, 12, 4, GOLD)
  } else if (rank === 12) {
    // Knight: plumed helm
    head = path('M118 214v-30a32 32 0 0 1 64 0v30z', SLATE, INK, 2.6) + line(126, 190, 174, 190, INK, 2) + path('M150 152c-20-30-8-56 22-58-10 12-6 28 8 44-10-2-20 2-30 14z', acc, INK, 2.2) + path('M140 152c-26-14-34-40-14-58 0 16 10 28 26 36z', GOLD, INK, 2) + poly([[210, 120], [226, 150], [210, 180], [194, 150]], acc, INK, 1.8) + poly([[90, 120], [106, 150], [90, 180], [74, 150]], acc, INK, 1.8)
  } else if (rank === 13) {
    // Queen: three-point crown with veil
    head = path('M96 200c-8 30-6 54 10 70M204 200c8 30 6 54-10 70', 'none', PAPER, 4) + circle(150, 190, 24, PAPER, INK, 2.4) + path('M122 164l8-28 12 18 8-24 8 24 12-18 8 28z', GOLD, INK, 2.4) + circle(130, 134, 3.2, OX, INK, 1.2) + circle(150, 124, 3.2, OX, INK, 1.2) + circle(170, 134, 3.2, OX, INK, 1.2) + path('M150 60c8 14 22 18 22 30 0 10-10 14-22 14s-22-4-22-14c0-12 14-16 22-30z', acc, INK, 1.8, 'opacity=".9"')
  } else {
    // King: five-point crown with orb and scepter
    head = circle(150, 192, 24, PAPER, INK, 2.4) + path('M118 164l-6-34 18 14 10-26 12 26 10-26 10 26 18-14-6 34z', GOLD, INK, 2.4) + circle(150, 112, 7, acc, INK, 2) + line(150, 119, 150, 130, INK, 2) + line(226, 250, 226, 100, INK, 3.4) + circle(226, 94, 10, acc, INK, 2.4) + line(214, 94, 238, 94, INK, 1.8)
  }
  const el = SUIT_ELEMENT_KEY[suit]
  const elMark = g('translate(150 44)', path(ELEMENT_TRI[el], 'none', INK, 2.2))
  return arch + head + shield + emblem + elMark
}
const SUIT_ELEMENT_KEY: Record<Suit, string> = { wands: 'fire', cups: 'water', swords: 'air', pentacles: 'earth' }

function minorArt(card: Card) {
  const suit = card.suit as Suit
  const base = suitBackdrop(suit, card.id) + sprinkle(card.id, 18, false, 24, 300)
  if (card.number === 1) return base + aceCard(card)
  if (card.number >= 11) return base + courtCard(card)
  return base + pipCard(card)
}

/* ---------- major arcana ---------- */
interface MajorStyle {
  field: string
  dark?: boolean
}
const MAJOR_STYLE: MajorStyle[] = [
  { field: SAND }, { field: NIGHT, dark: true }, { field: DEEP, dark: true }, { field: ROSE }, { field: TERRA }, { field: '#d9c08f' },
  { field: '#e7c1b8' }, { field: NIGHT, dark: true }, { field: SAND }, { field: DEEP, dark: true }, { field: NIGHT, dark: true }, { field: SLATE },
  { field: VERD, dark: true }, { field: '#1b2b2a', dark: true }, { field: '#e8c9b0' }, { field: '#2a1a1d', dark: true }, { field: NIGHT, dark: true }, { field: NIGHT, dark: true },
  { field: DEEP, dark: true }, { field: SAND }, { field: '#9db9c4' }, { field: '#e8cfa0' },
]

const infinity = (cx: number, cy: number, w: number, stroke = GOLD, sw = 5) =>
  path(`M${cx} ${cy}C${cx + w * 0.3} ${cy - w * 0.45} ${cx + w} ${cy - w * 0.45} ${cx + w} ${cy}S${cx + w * 0.3} ${cy + w * 0.45} ${cx} ${cy}S${cx - w} ${cy - w * 0.45} ${cx - w} ${cy}S${cx - w * 0.3} ${cy + w * 0.45} ${cx} ${cy}Z`, 'none', stroke, sw)

const rose = (cx: number, cy: number, r: number, petal = PAPER, mid = GOLD) =>
  Array.from({ length: 5 }, (_, i) => {
    const a = (i * 72 - 90) * (Math.PI / 180)
    return circle(cx + r * 0.62 * Math.cos(a), cy + r * 0.62 * Math.sin(a), r * 0.46, petal, INK, 1.4)
  }).join('') + circle(cx, cy, r * 0.3, mid, INK, 1.2)

const pillar = (x: number, w: number, y0: number, y1: number, fill: string) =>
  rect(x, y0, w, y1 - y0, fill, INK, 2.2) + rect(x - 6, y0 - 12, w + 12, 14, fill, INK, 2.2, 2) + rect(x - 6, y1 - 2, w + 12, 12, fill, INK, 2.2, 2)

const hills = (c1: string, c2: string, y = 380) =>
  path(`M18 ${y}Q80 ${y - 50} 150 ${y - 10}T282 ${y - 20}V434H18Z`, c1, INK, 2) + path(`M18 ${y + 30}Q100 ${y - 10} 180 ${y + 20}T282 ${y + 10}V434H18Z`, c2, INK, 2)

const figure = (x: number, y: number, s: number, body: string, head = PAPER) =>
  g(`translate(${x} ${y}) scale(${s})`, `${path('M-18 70L-10 0H10L18 70Z', body, INK, 2.4)}${circle(0, -14, 14, head, INK, 2.4)}`)

const MAJOR_ART: Array<() => string> = [
  // 0 The Fool
  () => circle(222, 84, 34, PAPER, INK, 2.2) + rays(222, 84, 40, 58, 16, OX, 2.6) + poly([[18, 330], [120, 250], [190, 330], [260, 280], [282, 300], [282, 434], [18, 434]], ROSE, INK, 2) +
    path('M18 300H132l20 8-4 16-20 12 8 22-14 20 12 56H18Z', NIGHT, INK, 2.4) + path('M150 304Q190 170 244 250', 'none', INK, 3.4, 'stroke-dasharray="1 11"') + rose(246, 252, 18, PAPER, GOLD) +
    line(112, 292, 90, 232, INK, 3.4) + circle(88, 226, 11, OX, INK, 2.2) + path('M130 292c8-18 20-18 26-4', 'none', INK, 2.4) + star(70, 90, 4, 11, 4, OX),
  // 1 The Magician
  () => infinity(150, 82, 38, GOLD, 5) + poly(starPts(150, 218, 6, 92, 80, -90), 'none', GOLD, 1.6) + line(150, 124, 150, 300, PAPER, 4) + rect(143, 108, 14, 26, PAPER, INK, 2, 2) +
    rect(52, 318, 196, 20, PAPER, INK, 2.4, 2) + rect(70, 338, 14, 70, PAPER, INK, 2) + rect(216, 338, 14, 70, PAPER, INK, 2) +
    [[88, wand(0.34)], [126, cup(0.34)], [174, sword(0.34)], [212, pentacle(0.3)]].map(([x, s]) => g(`translate(${x} 296)`, s as string)).join('') +
    Array.from({ length: 9 }, (_, i) => circle(30 + i * 30, 392 + (i % 2) * 10, 6, i % 2 ? OX : PAPER, INK, 1.4)).join('') + sprinkle('magician', 22, true, 22, 120),
  // 2 The High Priestess
  () => pillar(32, 44, 70, 410, INK) + pillar(224, 44, 70, 410, PAPER) + rect(76, 100, 148, 320, VERD, INK, 2) +
    Array.from({ length: 7 }, (_, r) => Array.from({ length: 5 }, (_, c) => circle(94 + c * 28 + (r % 2) * 14, 300 + r * 17, 4.2, OX, INK, 1)).join('')).join('') +
    circle(150, 132, 42, PAPER, INK, 2.4) + crescent(150, 132, 30, DEEP, INK, 1.6) + path('M104 132A46 46 0 0 1 196 132', 'none', GOLD, 3) + rect(122, 232, 56, 36, PAPER, INK, 2.2, 3) + line(132, 244, 168, 244, INK, 1.4) + line(132, 254, 160, 254, INK, 1.4) + sprinkle('priestess', 14, true, 100, 200),
  // 3 The Empress
  () => circle(150, 150, 38, 'none', OX, 6) + line(150, 188, 150, 262, OX, 6) + line(120, 226, 180, 226, OX, 6) +
    Array.from({ length: 12 }, (_, i) => { const a = (200 + i * 12.7) * (Math.PI / 180); return star(150 + 82 * Math.cos(a), 150 + 82 * Math.sin(a), 5, 8, 3.4, GOLD, INK, 1) }).join('') +
    [44, 70, 230, 256].map((x, i) => path(`M${x} 434Q${x + (i < 2 ? 8 : -8)} 330 ${x} 262`, 'none', INK, 2.6) + Array.from({ length: 6 }, (_, k) => `<ellipse cx="${x + (k % 2 ? 7 : -7)}" cy="${280 + k * 14}" rx="4" ry="8" fill="${GOLD}" stroke="${INK}" stroke-width="1.4" transform="rotate(${k % 2 ? 20 : -20} ${x} ${280 + k * 14})"/>`).join('')).join('') +
    hills(VERD, DEEP, 392) + poly(starPts(150, 330, 4, 18, 6), PAPER, INK, 1.6),
  // 4 The Emperor
  () => poly([[18, 300], [80, 190], [130, 270], [190, 170], [282, 310], [282, 434], [18, 434]], '#e08a62', INK, 2) + rect(94, 190, 112, 230, PAPER, INK, 2.8, 4) + rect(76, 270, 148, 20, PAPER, INK, 2.4, 3) + rect(112, 210, 76, 120, '#d9c08f', INK, 2) +
    path('M96 214c-34-8-52 14-38 36 10 14 30 8 30-8-6 10-22 8-22-6 0-12 16-18 30-8z', 'none', INK, 3.6) + path('M204 214c34-8 52 14 38 36-10 14-30 8-30-8 6 10 22 8 22-6 0-12-16-18-30-8z', 'none', INK, 3.6) +
    circle(150, 170, 26, PAPER, INK, 2.6) + path('M126 150l8-22 16 14 16-14 8 22z', GOLD, INK, 2.4) + circle(150, 122, 6, OX, INK, 2) + line(240, 400, 240, 196, INK, 3.6) + circle(240, 188, 14, 'none', INK, 3.2) + line(240, 202, 240, 214, INK, 3) + line(230, 208, 250, 208, INK, 3) + circle(62, 360, 20, GOLD, INK, 2.4) + line(62, 340, 62, 380, INK, 1.6),
  // 5 The Hierophant
  () => pillar(30, 36, 80, 330, OX) + pillar(234, 36, 80, 330, OX) + line(150, 70, 150, 270, INK, 6) + line(110, 100, 190, 100, INK, 5) + line(122, 134, 178, 134, INK, 5) + line(134, 168, 166, 168, INK, 5) +
    line(150, 70, 150, 270, GOLD, 2.4) + line(110, 100, 190, 100, GOLD, 2.4) + line(122, 134, 178, 134, GOLD, 2.4) + line(134, 168, 166, 168, GOLD, 2.4) +
    path('M100 360L200 420M200 360L100 420', 'none', INK, 6) + path('M100 360L200 420M200 360L100 420', 'none', GOLD, 3) + circle(98, 358, 12, 'none', INK, 3.4) + circle(202, 358, 12, 'none', INK, 3.4) + rect(190, 410, 22, 14, GOLD, INK, 2) + rect(88, 410, 22, 14, GOLD, INK, 2) +
    path('M56 330a24 24 0 0 1 48 0z', PAPER, INK, 2.2) + path('M196 330a24 24 0 0 1 48 0z', INK, INK, 2.2) + sprinkle('hierophant', 16, false, 60, 330),
  // 6 The Lovers
  () => circle(150, 100, 44, GOLD, INK, 2.6) + rays(150, 100, 50, 78, 20, OX, 2.6) + path('M86 100c-30-12-48 10-44 40 20-6 40-16 52-30zM214 100c30-12 48 10 44 40-20-6-40-16-52-30z', PAPER, INK, 2.2) +
    poly([[18, 330], [90, 230], [150, 300], [210, 220], [282, 330], [282, 434], [18, 434]], '#c9b08a', INK, 2) + circle(124, 300, 52, VERD, INK, 2.4, 'fill-opacity=".55"') + circle(176, 300, 52, OX, INK, 2.4, 'fill-opacity=".5"') +
    path('M150 276c-12-16-34 0-22 18l22 22 22-22c12-18-10-34-22-18z', PAPER, INK, 2.2) + figure(70, 336, 0.85, VERD) + figure(230, 336, 0.85, OX) + sprinkle('lovers', 10, false, 160, 250),
  // 7 The Chariot
  () => path('M44 120Q150 30 256 120V150H44Z', DEEP, INK, 2.4) + Array.from({ length: 9 }, (_, i) => star(66 + i * 21, 118 - Math.sin((i / 8) * Math.PI) * 38 + 10, 4, 6, 2, GOLD)).join('') +
    rect(54, 150, 8, 200, PAPER, INK, 2) + rect(238, 150, 8, 200, PAPER, INK, 2) + rect(86, 244, 128, 80, PAPER, INK, 2.8, 4) + path('M86 276h128', 'none', INK, 1.6) + star(150, 284, 8, 16, 6, GOLD, INK, 1.2) +
    [96, 204].map((x) => circle(x, 336, 24, PAPER, INK, 2.6) + circle(x, 336, 5, GOLD, INK, 1.6) + rays(x, 336, 6, 24, 8, INK, 1.4, 1)).join('') +
    circle(100, 396, 26, INK, INK, 2) + circle(200, 396, 26, PAPER, INK, 2) + poly([[82, 388], [64, 404], [86, 410]], INK, INK, 2) + poly([[218, 388], [236, 404], [214, 410]], PAPER, INK, 2) + star(150, 90, 8, 22, 9, GOLD, INK, 1.6) + path('M18 424Q60 410 100 424T180 424T282 420V434H18Z', VERD, INK, 1.6),
  // 8 Strength
  () => infinity(150, 70, 36, OX, 5) + rays(150, 232, 66, 98, 28, OX, 4, 0.6) + circle(150, 232, 70, '#efc16d', INK, 2.6) + circle(150, 240, 48, '#f6dba0', INK, 2.4) +
    path('M122 228q12 10 24 0M154 228q12 10 24 0', 'none', INK, 3) + poly([[140, 252], [160, 252], [150, 264]], OX, INK, 2) + path('M150 264v10M132 276q18 14 36 0', 'none', INK, 2.6) + circle(112, 262, 3, INK, 'none', 0) + circle(188, 262, 3, INK, 'none', 0) +
    Array.from({ length: 11 }, (_, i) => circle(40 + i * 22, 376 + Math.sin(i * 0.9) * 12, 7, i % 2 ? PAPER : OX, INK, 1.6)).join('') + path('M214 150c26 18 32 54 14 86', 'none', PAPER, 7) + path('M214 150c26 18 32 54 14 86', 'none', INK, 2) + circle(150, 410, 4, GOLD, INK, 1),
  // 9 The Hermit
  () => poly([[18, 434], [112, 250], [150, 300], [196, 214], [282, 434]], SLATE, INK, 2.4) + poly([[196, 214], [178, 252], [196, 246], [210, 256], [214, 244]], PAPER, INK, 1.8) +
    circle(150, 170, 62, GOLD, 'none', 0, 'fill-opacity=".22"') + circle(150, 170, 38, GOLD, 'none', 0, 'fill-opacity=".25"') + rect(136, 150, 28, 40, PAPER, INK, 2.4, 3) + star(150, 170, 6, 11, 5, GOLD, INK, 1) + line(150, 140, 150, 150, INK, 2.4) +
    path('M118 434L132 236c4-22 36-22 40 0L184 434Z', DEEP, INK, 2.6) + circle(150, 222, 14, PAPER, INK, 2.4) + path('M130 224c0-24 40-24 40 0', DEEP, INK, 2.4) + line(178, 436, 178, 190, INK, 4) + path('M142 238L164 190', 'none', INK, 3) + sprinkle('hermit', 26, true, 24, 140),
  // 10 Wheel of Fortune
  () => sprinkle('wheel', 20, true, 22, 120) + circle(150, 214, 104, 'none', GOLD, 3) + circle(150, 214, 88, DEEP, GOLD, 2.4) + circle(150, 214, 52, PAPER, INK, 2.6) + circle(150, 214, 20, GOLD, INK, 2.2) +
    Array.from({ length: 8 }, (_, i) => { const a = (i * 45 * Math.PI) / 180; return line(150 + 22 * Math.cos(a), 214 + 22 * Math.sin(a), 150 + 88 * Math.cos(a), 214 + 88 * Math.sin(a), GOLD, 3.2) + circle(150 + 96 * Math.cos(a), 214 + 96 * Math.sin(a), 6, i % 2 ? PAPER : OX, INK, 1.6) }).join('') +
    star(150, 214, 4, 44, 12, 'none', OX, 2.2) + path('M142 100q8-24 16 0l-8 10z', INK, INK, 2) + path('M20 424Q60 380 110 420', 'none', OX, 5) + path('M190 424q40-30 90 0', 'none', PAPER, 5) +
    [[34, 40], [266, 40], [34, 400], [266, 400]].map(([x, y]) => path(`M${x - 14} ${y + 6}q14-22 28 0q-14-8-28 0z`, PAPER, INK, 1.8)).join(''),
  // 11 Justice
  () => rect(18, 80, 264, 70, OX, 'none', 0, 0) + pillar(34, 38, 90, 410, PAPER) + pillar(228, 38, 90, 410, PAPER) + line(70, 190, 230, 190, INK, 4) + line(150, 110, 150, 190, INK, 3) +
    [[88, 0], [212, 0]].map(([x]) => line(x, 190, x - 24, 262, INK, 1.6) + line(x, 190, x + 24, 262, INK, 1.6) + path(`M${x - 28} 262h56a28 18 0 0 1-56 0z`, GOLD, INK, 2.4)).join('') +
    rect(142, 150, 16, 20, GOLD, INK, 2.2, 2) + path('M144 170h12L150 400z', PAPER, INK, 2.6) + rect(120, 300, 60, 9, GOLD, INK, 2.2, 3) + rect(145, 309, 10, 32, OX, INK, 2.2, 2) + path('M126 82l12-22 12 14 12-14 12 22z', GOLD, INK, 2.2) + circle(150, 106, 18, PAPER, INK, 2.4),
  // 12 The Hanged One
  () => rect(52, 62, 196, 18, '#6f4a2a', INK, 2.6, 4) + rect(52, 62, 16, 200, '#6f4a2a', INK, 2.4, 3) + rect(232, 62, 16, 200, '#6f4a2a', INK, 2.4, 3) + path('M60 270q-30 10-20 40M240 270q30 10 20 40', 'none', INK, 2.2) +
    [[70, 100], [86, 130], [226, 106], [214, 140], [120, 96], [186, 98]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="14" ry="7" fill="${PAPER}" stroke="${INK}" stroke-width="1.6" opacity=".85"/>`).join('') +
    line(150, 80, 150, 152, INK, 3.4) + path('M150 152L128 210M150 152L172 210', 'none', INK, 5) + path('M126 210h48l-8 62h-32z', OX, INK, 2.6) + circle(150, 298, 20, PAPER, INK, 2.6) + circle(150, 298, 33, 'none', GOLD, 3.4) + rays(150, 298, 35, 50, 16, GOLD, 2.4, 1) + path('M126 216L108 262M174 216L192 262', 'none', INK, 4.4) + path('M18 430q60-30 132-8t132-6V434H18Z', DEEP, INK, 1.8),
  // 13 Death
  () => circle(150, 340, 78, GOLD, INK, 2.6) + rays(150, 340, 84, 130, 24, GOLD, 3, 0.55) + rect(18, 340, 264, 94, '#0f1b1a', 'none', 0) + rect(44, 250, 36, 100, '#2e4744', INK, 2.2) + rect(220, 250, 36, 100, '#2e4744', INK, 2.2) + path('M44 250l6-14h6l6 14zM224 250l6-14h6l6 14z', '#2e4744', INK, 2) +
    line(150, 70, 150, 230, PAPER, 3.6) + path('M150 78h92l-14 36 14 36h-92z', INK, PAPER, 2.4) + rose(196, 114, 22, PAPER, GOLD) + path('M60 400q90-22 180 0', 'none', PAPER, 2.6, 'stroke-dasharray="2 8"') + path('M110 392q40 22 80 0z', OX, INK, 2.2) + line(150, 392, 150, 350, PAPER, 2.4) + poly([[150, 350], [176, 380], [150, 380]], PAPER, INK, 1.8) + sprinkle('death', 26, true, 24, 230),
  // 14 Temperance
  () => path('M18 150Q70 20 150 70Q230 20 282 150', 'none', GOLD, 8, 'opacity=".55"') + circle(150, 70, 30, PAPER, INK, 2.4) + circle(150, 70, 42, 'none', GOLD, 2.4) + star(150, 70, 6, 12, 5, GOLD, INK, 1) +
    g('translate(86 190) rotate(-18)', cup(0.8)) + g('translate(214 250) rotate(22)', cup(0.8)) + path('M100 160q50-40 100 70', 'none', VERD, 5) + path('M100 160q50-40 100 70', 'none', PAPER, 2, 'stroke-dasharray="1 8"') +
    path('M18 434Q60 330 150 330T282 434Z', VERD, INK, 2) + path('M146 434L150 250L154 434', PAPER, INK, 2) + path('M150 252l-16-22 16 8 16-8z', GOLD, INK, 1.8) + Array.from({ length: 6 }, (_, i) => path(`M${44 + i * 40} 420c-6-24 0-40 6-40s12 16 6 40z`, i % 2 ? OX : GOLD, INK, 1.6)).join(''),
  // 15 The Devil
  () => circle(150, 130, 60, 'none', GOLD, 3) + poly(starPts(150, 130, 5, 56, 22, 90), OX, GOLD, 2.4) + path('M82 210c-30-40-20-80 8-96-10 30 0 52 26 70zM218 210c30-40 20-80-8-96 10 30 0 52-26 70z', PAPER, INK, 2.2) +
    path('M96 176c6 50 26 70 54 70s48-20 54-70c-18 12-36 14-54 14s-36-2-54-14z', '#f0d9a0', INK, 2.6) + path('M122 196q8 8 16 0M162 196q8 8 16 0', 'none', INK, 3) + poly([[140, 214], [160, 214], [150, 232]], OX, INK, 1.8) +
    rect(70, 330, 160, 44, '#3a2a2e', INK, 2.4, 3) + [100, 200].map((x) => circle(x, 312, 13, PAPER, INK, 2.2) + path(`M${x - 16} 330l6-18h20l6 18z`, ROSE, INK, 2)).join('') +
    Array.from({ length: 6 }, (_, i) => `<ellipse cx="${112 + i * 10}" cy="${262 + i * 8}" rx="8" ry="5" transform="rotate(${i % 2 ? 60 : -30} ${112 + i * 10} ${262 + i * 8})" fill="none" stroke="${GOLD}" stroke-width="2.4"/>`).join('') + path('M150 246v84', 'none', GOLD, 2.4, 'stroke-dasharray="6 5"') + sprinkle('devil', 14, true, 30, 100),
  // 16 The Tower
  () => path('M18 330Q80 260 150 300T282 280V434H18Z', DEEP, INK, 2) + rect(112, 170, 76, 230, '#d9c08f', INK, 2.8) + path('M104 170h92l-6-24h-12v10h-14v-10h-16v10h-14v-10h-12v10h-12z', '#d9c08f', INK, 2.6) +
    [196, 250, 304].map((y, i) => rect(142, y, 16, 26, INK, INK, 1.8, 7) + (i % 2 ? '' : '')).join('') + path('M176 40L148 130 170 130 138 210 200 116 176 116 204 40z', GOLD, INK, 2.6) +
    g('translate(204 118) rotate(32)', path('M-28 6l6-18h8v8h8v-8h8v8h8v-8h8l6 18z', GOLD, INK, 2.4)) + Array.from({ length: 12 }, (_, i) => path(`M${44 + (i % 6) * 40} ${200 + Math.floor(i / 6) * 90 + (i % 3) * 8}c-6-12 0-22 6-26 6 4 12 14 6 26z`, i % 2 ? OX : GOLD, INK, 1.6)).join('') +
    path('M18 90q40-30 80-10t90-12 94 22V30H18z', '#0b1514', 'none', 0, 'opacity=".6"') + sprinkle('tower', 14, true, 20, 100),
  // 17 The Star
  () => sprinkle('star', 40, true, 20, 300) + star(150, 140, 8, 78, 26, GOLD) + [[66, 70, 14], [236, 80, 12], [52, 200, 11], [248, 190, 13], [100, 40, 9], [210, 38, 9], [150, 248, 9]].map(([x, y, r]) => star(x, y, 4, r, r / 3, PAPER)).join('') +
    path('M18 330c50-26 90 16 132-4s86-24 132 2v106H18z', VERD, INK, 2) + path('M18 372c50-22 90 12 132-4s86-18 132 2', 'none', PAPER, 2, 'opacity=".7"') + path('M118 304c-10 20-10 36 0 50M182 304c10 20 10 36 0 50', 'none', ROSE, 5) + g('translate(96 292) rotate(-24)', cup(0.52)) + g('translate(204 292) rotate(24)', cup(0.52)),
  // 18 The Moon
  () => sprinkle('moon', 30, true, 22, 240) + circle(150, 124, 72, ROSE, INK, 2) + circle(180, 108, 64, DEEP, 'none', 0) + rays(150, 124, 78, 110, 20, ROSE, 2, 0.6) + path('M18 300h44v-96h30v96h-6v134H18zM282 300h-44v-96h-30v96h6v134h68z', INK, INK, 2) +
    path('M150 440c-44-30 44-46 0-80s44-50 0-80', 'none', GOLD, 12, 'opacity=".9"') + g('translate(86 336)', poly([[-14, 12], [-6, -12], [2, 4], [10, -12], [14, 12]], SLATE, INK, 1.8)) + g('translate(214 336) scale(-1 1)', poly([[-16, 12], [-8, -14], [0, 2], [8, -10], [16, 12]], PAPER, INK, 1.8)) +
    path('M118 424c10-20 54-20 64 0z', OX, INK, 2.2) + circle(138, 408, 3, PAPER, INK, 1) + circle(162, 408, 3, PAPER, INK, 1) + Array.from({ length: 8 }, (_, i) => path(`M${60 + i * 24} ${200 + (i % 3) * 14}q-4 10 0 16q4-6 0-16z`, GOLD, 'none', 0)).join(''),
  // 19 The Sun
  () => rays(150, 142, 66, 118, 24, OX, 4.4, 0.7) + circle(150, 142, 58, PAPER, INK, 2.6) + circle(134, 134, 4, INK, 'none', 0) + circle(166, 134, 4, INK, 'none', 0) + path('M130 160c12 12 28 12 40 0', 'none', INK, 3) +
    rect(18, 372, 264, 62, VERD, INK, 2) + Array.from({ length: 6 }, (_, i) => rect(18 + i * 44, 372, 44, 30, i % 2 ? '#b9835a' : '#c99068', INK, 1.4)).join('') +
    [60, 150, 240].map((x, i) => line(x, 372, x, 330 + (i === 1 ? -16 : 0), INK, 3.4) + rays(x, 316 + (i === 1 ? -16 : 0), 14, 28, 12, OX, 3, 1) + circle(x, 316 + (i === 1 ? -16 : 0), 14, GOLD, INK, 2.2)).join('') + g('translate(150 396)', poly([[-18, 0], [0, -20], [18, 0], [0, 6]], OX, INK, 1.6)),
  // 20 Judgement
  () => path('M18 300Q70 240 130 290T282 270V434H18Z', '#6f8a93', INK, 2) + poly([[18, 330], [80, 250], [130, 320], [200, 240], [282, 330], [282, 434], [18, 434]], '#547179', INK, 2) +
    path('M18 120Q70 80 120 100T200 90 282 110V50H18z', PAPER, 'none', 0, 'opacity=".5"') + g('translate(150 110) rotate(-30)', path('M-70 -10L40 -22Q70 -50 76 0Q70 50 40 22L-70 10Z', GOLD, INK, 2.6) + rect(-100, -8, 34, 16, GOLD, INK, 2.2, 4) + rect(44, -28, 4, 56, INK, INK, 0)) +
    rays(214, 160, 20, 90, 14, PAPER, 2.4, 1) + rect(190, 140, 44, 38, OX, INK, 2.2) + line(212, 144, 212, 174, PAPER, 3) + line(200, 156, 224, 156, PAPER, 3) +
    [64, 150, 236].map((x) => rect(x - 28, 372, 56, 46, PAPER, INK, 2.2, 3) + g(`translate(${x} 372)`, path('M-12 0c0-34 24-34 24 0z', ROSE, INK, 2.2) + circle(0, -34, 10, PAPER, INK, 2.2) + path('M-16 -14L-26 -34M16 -14L26 -34', 'none', INK, 2.4))).join('') + path('M30 60q16-14 32 0t32 0M200 70q16-14 32 0t32 0', 'none', PAPER, 4),
  // 21 The World
  () => Array.from({ length: 30 }, (_, i) => { const a = (i / 30) * Math.PI * 2; const x = 150 + 94 * Math.cos(a); const y = 226 + 134 * Math.sin(a); return `<ellipse cx="${f(x)}" cy="${f(y)}" rx="14" ry="6.5" transform="rotate(${f((a * 180) / Math.PI + 90 + (i % 2 ? 22 : -22))} ${f(x)} ${f(y)})" fill="${i % 2 ? VERD : '#5a9a6a'}" stroke="${INK}" stroke-width="1.4"/>` }).join('') +
    path('M60 372c60 30 120 30 180 0M60 82c60-30 120-30 180 0', 'none', OX, 5) + path('M150 140c-30 20 30 40 0 70s-34 30-14 56', 'none', INK, 4.4) + circle(150, 124, 16, PAPER, INK, 2.4) + path('M150 150L112 170M150 160L190 178', 'none', INK, 3.4) +
    line(96, 186, 126, 156, GOLD, 4) + line(200, 190, 176, 160, GOLD, 4) + path('M136 200c20 12 34 6 28 40-6 30-26 34-38 60', 'none', OX, 6) + path('M150 140c-10 18 4 26 0 40', 'none', ROSE, 5, 'opacity=".9"') +
    [[44, 54, 0], [256, 54, 1], [44, 408, 2], [256, 408, 3]].map(([x, y, k]) => circle(x, y, 22, [ROSE, PAPER, SAND, VERD][k], INK, 2.2) + [path(`M${x - 10} ${y + 4}q10-18 20 0`, 'none', INK, 2), poly([[x - 12, y + 8], [x, y - 12], [x + 12, y + 8]], 'none', INK, 2), rays(x, y, 6, 14, 8, INK, 1.6, 1), path(`M${x - 12} ${y - 8}q-4-8 4-10M${x + 12} ${y - 8}q4-8-4-10M${x - 10} ${y + 6}h20`, 'none', INK, 2)][k as number]).join('') + sprinkle('world', 12, false, 60, 380),
]

function majorArt(card: Card) {
  const style = MAJOR_STYLE[card.number]
  return (style.dark ? '' : sprinkle(card.id, 10, false, 24, 160)) + MAJOR_ART[card.number]()
}

/* ---------- full card ---------- */
export interface CardArtOptions {
  /** Include the name and numeral as SVG text. Off for textures, where the table draws text with the loaded web font. */
  labels?: boolean
  /** Prefix for internal ids so the same card can be inlined more than once on a page. */
  uid?: string
}

function nameSize(name: string) {
  return name.length <= 12 ? 25 : name.length <= 16 ? 22 : 19
}

export function cardField(card: Card): { field: string; dark: boolean } {
  if (card.arcana === 'major') {
    const m = MAJOR_STYLE[card.number]
    return { field: m.field, dark: !!m.dark }
  }
  const s = SUIT_STYLE[card.suit as Suit]
  return { field: s.field, dark: s.dark }
}

export function cardArtSvg(card: Card, opts: CardArtOptions = {}): string {
  const uid = `${opts.uid ?? 'a'}-${card.id}`
  const { field } = cardField(card)
  const art = card.arcana === 'major' ? majorArt(card) : minorArt(card)
  const label = opts.labels
    ? `<text x="150" y="468" text-anchor="middle" font-family="var(--dawn-font-display), Georgia, serif" font-size="${nameSize(card.name)}" font-weight="560" fill="${INK}">${card.name}</text>` +
      `<text x="150" y="490" text-anchor="middle" font-family="var(--dawn-font-ui), system-ui, sans-serif" font-size="11" letter-spacing="4" fill="${OX}">${card.arcana === 'major' ? card.label : card.label.toUpperCase()}</text>`
    : ''
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ART_W} ${ART_H}" role="img" aria-label="${card.name}">` +
    `<defs><clipPath id="cp-${uid}"><rect x="18" y="18" width="264" height="416"/></clipPath></defs>` +
    `<rect width="${ART_W}" height="${ART_H}" fill="${PAPER}"/>` +
    `<rect x="10" y="10" width="280" height="494" rx="6" fill="none" stroke="${INK}" stroke-width="1.6"/>` +
    `<rect x="18" y="18" width="264" height="416" fill="${field}"/>` +
    `<g clip-path="url(#cp-${uid})">${art}</g>` +
    `<rect x="18" y="18" width="264" height="416" fill="none" stroke="${INK}" stroke-width="1.8"/>` +
    `<path d="M120 442h60" stroke="${GOLD}" stroke-width="1.4"/>` +
    label +
    `</svg>`
  )
}

/** Card back, used by the table and as a decorative element. */
export function cardBackSvg(): string {
  let spokes = ''
  for (let i = 0; i < 24; i++) {
    const a = (i * 15 * Math.PI) / 180
    spokes += `<path d="M${f(150 + 64 * Math.cos(a))} ${f(257 + 64 * Math.sin(a))}L${f(150 + 86 * Math.cos(a))} ${f(257 + 86 * Math.sin(a))}"/>`
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ART_W} ${ART_H}" role="img" aria-label="Card back">` +
    `<rect width="${ART_W}" height="${ART_H}" fill="${INK}"/>` +
    `<rect x="12" y="12" width="276" height="490" rx="6" fill="none" stroke="${GOLD}" stroke-width="2"/>` +
    `<rect x="22" y="22" width="256" height="470" rx="3" fill="none" stroke="${GOLD}" stroke-width=".8" opacity=".7"/>` +
    `<g fill="none" stroke="${GOLD}" stroke-width="1.4"><circle cx="150" cy="257" r="86"/><circle cx="150" cy="257" r="64"/><circle cx="150" cy="257" r="30"/>${spokes}</g>` +
    star(150, 257, 8, 24, 8, GOLD) +
    `<path d="M164 238a22 22 0 1 0 6 32 17 17 0 0 1-6-32z" fill="${INK}"/>` +
    `<g opacity=".8">${star(150, 70, 4, 11, 3, PAPER)}${star(150, 444, 4, 11, 3, PAPER)}${star(50, 257, 4, 8, 2.5, PAPER)}${star(250, 257, 4, 8, 2.5, PAPER)}</g>` +
    `<g stroke="${GOLD}" stroke-width="1" fill="none" opacity=".6">${[0, 1, 2, 3].map((i) => `<path d="M${40 + (i % 2) * 220} ${40 + Math.floor(i / 2) * 434}l10 10-10 10-10-10z"/>`).join('')}</g>` +
    `</svg>`
  )
}

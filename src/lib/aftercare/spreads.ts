import type { DrawnCard, SpreadId } from './types'
import { DECK } from './deck'
import { type Rng, secureRng, shuffle } from './shuffle'

export interface SpreadPosition {
  id: string
  /** Short label for the table */
  label: string
  /** What this position asks, in our own words */
  prompt: string
  /** Table coordinates in card-widths (card is 1 wide, 1.714 tall) */
  x: number
  y: number
  /** Degrees, anticlockwise */
  rot?: number
  /** Draw order lift for crossing cards */
  z?: number
}

export interface Spread {
  id: SpreadId
  name: string
  blurb: string
  positions: SpreadPosition[]
  pile: { x: number; y: number }
  /** Where the deck sits on wide screens, so a short spread can use the full width. */
  pileWide?: { x: number; y: number }
}

export const CARD_W = 1
export const CARD_H = 1.714

export const SPREADS: Record<SpreadId, Spread> = {
  one: {
    id: 'one',
    name: 'One card',
    blurb: 'A quick nudge for today. Best with a simple question.',
    pile: { x: 0, y: -2.7 },
    pileWide: { x: 2.6, y: 0.3 },
    positions: [{ id: 'card', label: 'Your card', prompt: 'What to keep in mind right now', x: 0, y: 0.3 }],
  },
  three: {
    id: 'three',
    name: 'Three card',
    blurb: 'Where you have been, where you are, and what is opening.',
    pile: { x: 0, y: -2.7 },
    pileWide: { x: 3.4, y: 0.3 },
    positions: [
      { id: 'past', label: "Where you've been", prompt: 'What shaped the road to here', x: -1.45, y: 0.3 },
      { id: 'present', label: 'Where you are', prompt: 'What is true in the middle of it', x: 0, y: 0.3 },
      { id: 'next', label: "What's opening", prompt: 'What may be coming into view', x: 1.45, y: 0.3 },
    ],
  },
  celtic: {
    id: 'celtic',
    name: 'Celtic Cross',
    blurb: 'Ten cards for a bigger question: a cross and a staff. A slow, rich reading.',
    pile: { x: -1.3, y: 1.85 },
    positions: [
      { id: 'heart', label: 'The heart of it', prompt: 'What the situation is really about', x: 0, y: 0 },
      { id: 'crossing', label: 'What crosses it', prompt: 'What complicates or challenges it', x: 0, y: 0, rot: 90, z: 1 },
      { id: 'root', label: 'The root', prompt: 'The foundation underneath', x: 0, y: -1.85 },
      { id: 'behind', label: 'Behind you', prompt: 'What is just passing out of view', x: -1.3, y: 0 },
      { id: 'crown', label: 'Above you', prompt: 'What you are reaching for', x: 0, y: 1.85 },
      { id: 'ahead', label: 'Ahead', prompt: 'What is arriving soon', x: 1.3, y: 0 },
      { id: 'you', label: 'You', prompt: 'How you are showing up', x: 3.15, y: -2.8 },
      { id: 'around', label: 'Around you', prompt: 'The people and setting that matter', x: 3.15, y: -0.93 },
      { id: 'hopes', label: 'Hopes and worries', prompt: 'What you wish for and what you fear (often twins)', x: 3.15, y: 0.93 },
      { id: 'outcome', label: 'Where it leans', prompt: 'Where this seems to be heading if nothing shifts', x: 3.15, y: 2.8 },
    ],
  },
}

export const SPREAD_IDS = Object.keys(SPREADS) as SpreadId[]

/** Draw cards for a spread from a freshly shuffled deck. Each card is reversed about half the time. */
export function drawSpread(spreadId: SpreadId, rng: Rng = secureRng): DrawnCard[] {
  const spread = SPREADS[spreadId]
  const order = shuffle(DECK.map((c) => c.id), rng)
  return spread.positions.map((p, i) => ({ positionId: p.id, cardId: order[i], reversed: rng() < 0.5 }))
}

/** Bounding box of a spread in table units, pile included, with half-card padding. */
export function spreadBounds(spreadId: SpreadId, pile?: { x: number; y: number }) {
  const s = SPREADS[spreadId]
  const pts = [...s.positions, { ...(pile ?? s.pile), rot: 0 }]
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const p of pts) {
    const rotated = Math.abs(((p as { rot?: number }).rot ?? 0) % 180) === 90
    const hw = (rotated ? CARD_H : CARD_W) / 2
    const hh = (rotated ? CARD_W : CARD_H) / 2
    minX = Math.min(minX, p.x - hw)
    maxX = Math.max(maxX, p.x + hw)
    minY = Math.min(minY, p.y - hh)
    maxY = Math.max(maxY, p.y + hh)
  }
  return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 }
}

import { describe, expect, it } from 'vitest'
import { DECK, MAJORS, SUITS, bySuit, getCard, majorByNumber, neighbours } from '../src/lib/deck'
import { cardArtSvg } from '../src/lib/cardArt'
import { SPREADS, SPREAD_IDS, drawSpread, spreadBounds } from '../src/lib/spreads'
import { mulberry32, shuffle } from '../src/lib/shuffle'
import { readingLines, summarize } from '../src/lib/reading'

describe('deck data', () => {
  it('has 78 unique cards: 22 major and 14 per suit', () => {
    expect(DECK).toHaveLength(78)
    expect(new Set(DECK.map((c) => c.id)).size).toBe(78)
    expect(new Set(DECK.map((c) => c.slug)).size).toBe(78)
    expect(MAJORS).toHaveLength(22)
    for (const s of SUITS) expect(bySuit(s)).toHaveLength(14)
  })
  it('numbers majors 0-21 and minors 1-14 without gaps', () => {
    expect(MAJORS.map((c) => c.number)).toEqual(Array.from({ length: 22 }, (_, i) => i))
    for (const s of SUITS) expect(bySuit(s).map((c) => c.number)).toEqual(Array.from({ length: 14 }, (_, i) => i + 1))
  })
  it('has the required fields on every card, in our own words', () => {
    for (const c of DECK) {
      expect(c.name.length).toBeGreaterThan(3)
      expect(['major', 'minor']).toContain(c.arcana)
      expect(c.arcana === 'major' ? c.suit === null : SUITS.includes(c.suit!)).toBe(true)
      expect(c.keywords.length).toBeGreaterThanOrEqual(3)
      expect(c.upright.length).toBeGreaterThan(60)
      expect(c.reversed.length).toBeGreaterThan(60)
      expect(c.reflect.endsWith('?')).toBe(true)
      expect(c.upright).not.toEqual(c.reversed)
    }
  })
  it('avoids fortune-telling and advice claims in the copy', () => {
    const banned = /\b(you will (die|get rich|be sick)|diagnos|invest|lawsuit|guarantee|doomed|cursed)\b/i
    for (const c of DECK) expect(`${c.upright} ${c.reversed} ${c.reflect}`).not.toMatch(banned)
  })
  it('looks cards up by id and number', () => {
    expect(getCard('the-star')?.number).toBe(17)
    expect(majorByNumber(11)?.name).toBe('Justice')
    expect(getCard('ace-of-wands')?.suit).toBe('wands')
    expect(getCard('nope')).toBeUndefined()
  })
  it('wraps neighbours around the deck', () => {
    expect(neighbours(DECK[0].id).prev.id).toBe(DECK[77].id)
    expect(neighbours(DECK[77].id).next.id).toBe(DECK[0].id)
  })
})

describe('card art', () => {
  it('generates distinct, well-formed SVG for every card', () => {
    const seen = new Set<string>()
    for (const c of DECK) {
      const svg = cardArtSvg(c)
      expect(svg.startsWith('<svg')).toBe(true)
      expect(svg.endsWith('</svg>')).toBe(true)
      expect(svg).toContain('viewBox="0 0 300 514"')
      expect((svg.match(/<svg/g) ?? []).length).toBe(1)
      seen.add(svg)
    }
    expect(seen.size).toBe(78)
  })
})

describe('shuffle and draw', () => {
  it('keeps every card exactly once', () => {
    const ids = DECK.map((c) => c.id)
    const s = shuffle(ids, mulberry32(7))
    expect(s).toHaveLength(78)
    expect(new Set(s).size).toBe(78)
    expect(s).not.toEqual(ids)
  })
  it('is reproducible with a seed and does not mutate the input', () => {
    const ids = DECK.map((c) => c.id)
    const copy = ids.slice()
    expect(shuffle(ids, mulberry32(1))).toEqual(shuffle(ids, mulberry32(1)))
    expect(ids).toEqual(copy)
  })
  it('is not heavily biased (position of first card spreads out)', () => {
    const rng = mulberry32(99)
    const firsts = new Set<string>()
    for (let i = 0; i < 400; i++) firsts.add(shuffle(DECK.map((c) => c.id), rng)[0])
    expect(firsts.size).toBeGreaterThan(60)
  })
})

describe('spreads', () => {
  it('has the right number of positions with unique ids', () => {
    expect(SPREAD_IDS).toEqual(['one', 'three', 'celtic'])
    expect(SPREADS.one.positions).toHaveLength(1)
    expect(SPREADS.three.positions).toHaveLength(3)
    expect(SPREADS.celtic.positions).toHaveLength(10)
    for (const id of SPREAD_IDS) expect(new Set(SPREADS[id].positions.map((p) => p.id)).size).toBe(SPREADS[id].positions.length)
  })
  it('draws unique cards for every position', () => {
    for (const id of SPREAD_IDS) {
      const drawn = drawSpread(id, mulberry32(3))
      expect(drawn).toHaveLength(SPREADS[id].positions.length)
      expect(new Set(drawn.map((d) => d.cardId)).size).toBe(drawn.length)
      expect(drawn.map((d) => d.positionId)).toEqual(SPREADS[id].positions.map((p) => p.id))
    }
  })
  it('reverses roughly half of the cards over many draws', () => {
    const rng = mulberry32(5)
    let rev = 0
    let total = 0
    for (let i = 0; i < 300; i++) for (const d of drawSpread('celtic', rng)) { total++; if (d.reversed) rev++ }
    expect(rev / total).toBeGreaterThan(0.43)
    expect(rev / total).toBeLessThan(0.57)
  })
  it('keeps celtic cross positions from overlapping (except the crossing card)', () => {
    const pos = SPREADS.celtic.positions.filter((p) => p.id !== 'crossing')
    for (let i = 0; i < pos.length; i++) {
      for (let j = i + 1; j < pos.length; j++) {
        const dx = Math.abs(pos[i].x - pos[j].x)
        const dy = Math.abs(pos[i].y - pos[j].y)
        expect(dx >= 1 || dy >= 1.714).toBe(true)
      }
    }
    const pile = SPREADS.celtic.pile
    for (const p of pos) expect(Math.abs(p.x - pile.x) >= 1 || Math.abs(p.y - pile.y) >= 1.714).toBe(true)
  })
  it('reports sane bounds', () => {
    for (const id of SPREAD_IDS) {
      const b = spreadBounds(id)
      expect(b.width).toBeGreaterThanOrEqual(1)
      expect(b.height).toBeGreaterThan(1.7)
    }
  })
})

describe('reading text', () => {
  it('builds one line per card with orientation-specific text', () => {
    const drawn = drawSpread('three', mulberry32(11))
    const lines = readingLines('three', drawn)
    expect(lines).toHaveLength(3)
    lines.forEach((l, i) => {
      expect(l.text).toBe(drawn[i].reversed ? l.card.reversed : l.card.upright)
      expect(l.orientation).toBe(drawn[i].reversed ? 'Reversed' : 'Upright')
    })
  })
  it('throws on a position that is not in the spread', () => {
    expect(() => readingLines('one', [{ positionId: 'nope', cardId: 'the-fool', reversed: false }])).toThrow()
  })
  it('summarises without predicting', () => {
    for (let s = 1; s < 30; s++) {
      for (const id of SPREAD_IDS) {
        const lines = summarize(id, drawSpread(id, mulberry32(s))).join(' ')
        expect(lines).not.toMatch(/\bwill (happen|die|get)\b/i)
      }
    }
    expect(summarize('one', drawSpread('one', mulberry32(1)))).toEqual([])
  })
})

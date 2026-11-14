// Merges the hand-written fragments in src/data/deck-src/ into src/data/deck.json.
import { readFileSync, writeFileSync } from 'node:fs'

const read = (f) => JSON.parse(readFileSync(new URL(`../src/data/deck-src/${f}.json`, import.meta.url), 'utf8'))
const ROMAN = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI']
const RANKS = ['', 'Ace', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Page', 'Knight', 'Queen', 'King']
const MAJOR_ELEMENT = ['air', 'air', 'water', 'earth', 'fire', 'earth', 'air', 'water', 'fire', 'earth', 'fire', 'air', 'water', 'water', 'fire', 'earth', 'fire', 'air', 'water', 'fire', 'fire', 'earth']
const SUIT_ELEMENT = { wands: 'fire', cups: 'water', swords: 'air', pentacles: 'earth' }
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const cards = []
for (const m of read('major')) {
  cards.push({
    id: slugify(m.name), slug: slugify(m.name), name: m.name, arcana: 'major', suit: null, number: m.n, label: ROMAN[m.n],
    element: MAJOR_ELEMENT[m.n], keywords: m.keywords, upright: m.upright, reversed: m.reversed, reflect: m.reflect, art: 'procedural',
  })
}
for (const suit of ['wands', 'cups', 'swords', 'pentacles']) {
  for (const m of read(suit)) {
    const name = `${RANKS[m.n]} of ${suit[0].toUpperCase()}${suit.slice(1)}`
    cards.push({
      id: slugify(name), slug: slugify(name), name, arcana: 'minor', suit, number: m.n, label: RANKS[m.n],
      element: SUIT_ELEMENT[suit], keywords: m.keywords, upright: m.upright, reversed: m.reversed, reflect: m.reflect, art: 'procedural',
    })
  }
}
writeFileSync(new URL('../src/data/deck.json', import.meta.url), JSON.stringify(cards, null, 1) + '\n')
console.log('cards', cards.length)

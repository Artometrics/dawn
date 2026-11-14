import deckJson from '../data/deck.json'
import type { Card, Suit } from './types'

export const DECK: Card[] = deckJson as Card[]

const byId = new Map(DECK.map((c) => [c.id, c]))
const byNumber = new Map(DECK.filter((c) => c.arcana === 'major').map((c) => [c.number, c]))

export const getCard = (id: string): Card | undefined => byId.get(id)

export function requireCard(id: string): Card {
  const c = byId.get(id)
  if (!c) throw new Error(`Unknown card: ${id}`)
  return c
}

/** Major arcana by number 0-21. */
export const majorByNumber = (n: number): Card | undefined => byNumber.get(n)

export const MAJORS = DECK.filter((c) => c.arcana === 'major')
export const SUITS: Suit[] = ['wands', 'cups', 'swords', 'pentacles']
export const bySuit = (suit: Suit) => DECK.filter((c) => c.suit === suit)

export const SUIT_BLURB: Record<Suit, string> = {
  wands: 'Fire: drive, creativity and what you are building.',
  cups: 'Water: feelings, friendship and imagination.',
  swords: 'Air: thinking, honesty and words.',
  pentacles: 'Earth: body, craft, home and care.',
}

export function cardTitle(c: Card): string {
  return c.arcana === 'major' ? `${c.label}. ${c.name}` : c.name
}

/** Neighbours in deck order, wrapping at both ends. */
export function neighbours(id: string): { prev: Card; next: Card } {
  const i = DECK.findIndex((c) => c.id === id)
  return { prev: DECK[(i + DECK.length - 1) % DECK.length], next: DECK[(i + 1) % DECK.length] }
}

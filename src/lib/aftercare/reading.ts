import type { Card, DrawnCard, Reading, SpreadId } from './types'
import { SPREADS } from './spreads'
import { requireCard } from './deck'

export interface ReadingLine {
  positionId: string
  position: string
  prompt: string
  card: Card
  reversed: boolean
  orientation: 'Upright' | 'Reversed'
  text: string
  keywords: string[]
}

export function readingLines(spreadId: SpreadId, cards: DrawnCard[]): ReadingLine[] {
  const spread = SPREADS[spreadId]
  return cards.map((d) => {
    const pos = spread.positions.find((p) => p.id === d.positionId)
    if (!pos) throw new Error(`Unknown position ${d.positionId} for spread ${spreadId}`)
    const card = requireCard(d.cardId)
    return {
      positionId: pos.id,
      position: pos.label,
      prompt: pos.prompt,
      card,
      reversed: d.reversed,
      orientation: d.reversed ? 'Reversed' : 'Upright',
      text: d.reversed ? card.reversed : card.upright,
      keywords: card.keywords,
    }
  })
}

/** A few plain-language observations about the whole spread. Our wording; never predictive. */
export function summarize(spreadId: SpreadId, cards: DrawnCard[]): string[] {
  if (cards.length < 2) return []
  const drawn = cards.map((d) => requireCard(d.cardId))
  const out: string[] = []
  const majors = drawn.filter((c) => c.arcana === 'major').length
  const reversed = cards.filter((c) => c.reversed).length
  if (majors / drawn.length >= 0.5) out.push(`${majors} of ${drawn.length} cards are major arcana, which tarot readers often take as a sign that this is a bigger-picture moment.`)
  else if (majors === 0) out.push('No major arcana turned up, so this looks like an everyday-life reading: small choices, ordinary days.')
  const counts = new Map<string, number>()
  for (const c of drawn) if (c.suit) counts.set(c.suit, (counts.get(c.suit) ?? 0) + 1)
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
  if (top && top[1] >= 3 && top[1] >= drawn.length / 3) {
    const note: Record<string, string> = {
      wands: 'wands lead: energy, ideas and momentum are in the foreground.',
      cups: 'cups lead: feelings and relationships are in the foreground.',
      swords: 'swords lead: thoughts, words and decisions are in the foreground.',
      pentacles: 'pentacles lead: practical matters, body and home are in the foreground.',
    }
    out.push(`${top[1]} ${note[top[0]]}`)
  }
  if (reversed >= Math.ceil(drawn.length * 0.6)) out.push('Lots of reversed cards. That can mean some of this is happening inside, or is waiting to be turned right-side up.')
  else if (reversed === 0 && drawn.length >= 3) out.push('Every card is upright, so the energies here are flowing fairly openly.')
  if (spreadId === 'three') {
    const [a, , c] = drawn
    out.push(`Read as a story: the thread runs from "${a.keywords[0]}" to "${c.keywords[0]}".`)
  }
  if (spreadId === 'celtic') {
    const outcome = drawn[drawn.length - 1]
    out.push(`The last card, ${outcome.name}, is where things lean if nothing shifts, which is a nudge to notice and not a verdict.`)
  }
  return out
}

export const REFLECTION_NOTE = 'For reflection and entertainment. A reading is a mirror, not a forecast, and it is not medical, legal or financial advice.'

export function newReading(spreadId: SpreadId, cards: DrawnCard[], question?: string, now = new Date(), id?: string): Reading {
  return {
    id: id ?? `r-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    spreadId,
    question: question?.trim() || undefined,
    createdAt: now.toISOString(),
    cards,
  }
}

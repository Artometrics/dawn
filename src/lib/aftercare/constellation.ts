import type { SelfView } from './second-self'
import { getCard, majorByNumber } from './deck'
import { themeById } from './themes'
import { SIGNS } from './zodiac'
import { lifePathCardNumber } from './numerology'

export interface ConstellationStar {
  key: string
  label: string
  x: number
  y: number
  ring: 'inner' | 'outer'
  own: string[]
  kind?: string
}

export interface ConstellationEdge {
  x1: number
  y1: number
  x2: number
  y2: number
  kind: 'own' | 'fav'
}

export interface ConstellationLayout {
  width: number
  height: number
  cx: number
  cy: number
  r1: number
  r2: number
  stars: ConstellationStar[]
  edges: ConstellationEdge[]
}

/** You in the middle, your cards on the inner ring, favorites on the outer ring. */
export function layoutConstellation(view: SelfView): ConstellationLayout | null {
  const numbers = view.numbers
  const favorites = (view.favorites ?? []).slice(0, 16)
  if (!numbers && favorites.length === 0) return null
  const cx = 400
  const cy = 310
  const r1 = 140
  const r2 = 255
  const inner: { id: string; label: string; own: string[] }[] = []
  const add = (id: string | undefined, own?: string) => {
    const card = id ? getCard(id) : undefined
    if (!card) return
    const hit = inner.find((item) => item.id === card.id)
    if (hit) {
      if (own) hit.own.push(own)
      return
    }
    inner.push({ id: card.id, label: card.name, own: own ? [own] : [] })
  }
  if (numbers) {
    add(majorByNumber(lifePathCardNumber(numbers.lifePath))?.id, 'Life path')
    add(numbers.birthCard, 'Birth')
    add(numbers.soulCard, 'Soul')
    const sign = SIGNS.find((item) => item.id === numbers.signId)
    if (sign) add(majorByNumber(sign.cardNumber)?.id, sign.name)
  }
  for (const favorite of favorites) add(majorByNumber(themeById(favorite.themeId)?.cardNumber ?? -1)?.id)
  const at = (index: number, total: number, radius: number, offset: number) => {
    const angle = offset + (index / Math.max(total, 1)) * Math.PI * 2
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) }
  }
  const innerStars: ConstellationStar[] = inner.map((card, index) => ({
    key: card.id,
    label: card.label,
    own: card.own,
    ring: 'inner',
    ...at(index, inner.length, r1, -Math.PI / 2),
  }))
  const outerStars: ConstellationStar[] = favorites.map((favorite, index) => ({
    key: `fav-${index}`,
    label: favorite.title,
    own: [],
    ring: 'outer',
    kind: favorite.kind,
    ...at(index, favorites.length, r2, -Math.PI / 2 + Math.PI / Math.max(favorites.length, 1)),
  }))
  const edges: ConstellationEdge[] = []
  for (const star of innerStars) {
    if (star.own.length) edges.push({ x1: cx, y1: cy, x2: star.x, y2: star.y, kind: 'own' })
  }
  favorites.forEach((favorite, index) => {
    const card = majorByNumber(themeById(favorite.themeId)?.cardNumber ?? -1)
    const target = innerStars.find((star) => star.key === card?.id)
    const from = outerStars[index]
    if (target && from) edges.push({ x1: from.x, y1: from.y, x2: target.x, y2: target.y, kind: 'fav' })
  })
  return { width: 800, height: 620, cx, cy, r1, r2, stars: [...innerStars, ...outerStars], edges }
}

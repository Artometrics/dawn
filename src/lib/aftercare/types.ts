export type Arcana = 'major' | 'minor'
export type Suit = 'wands' | 'cups' | 'swords' | 'pentacles'
export type Element = 'fire' | 'water' | 'air' | 'earth' | 'spirit'

export interface Card {
  id: string
  slug: string
  name: string
  arcana: Arcana
  suit: Suit | null
  /** Majors 0-21. Minors 1-14 (11 Page, 12 Knight, 13 Queen, 14 King). */
  number: number
  /** Roman numeral for majors, rank word for minors. */
  label: string
  element: Element
  keywords: string[]
  upright: string
  reversed: string
  reflect: string
}

export interface Place {
  label: string
  lat: number
  lng: number
}

export type FavoriteKind = 'movie' | 'book' | 'thing'

export interface Favorite {
  id: string
  kind: FavoriteKind
  title: string
  themeId?: string
  place?: Place
}

export interface Visibility {
  birth: boolean
  numbers: boolean
  map: boolean
  favorites: boolean
  connections: boolean
}

export interface Profile {
  id: string
  displayName: string
  birthDate: string
  birthTime?: string
  birthPlace?: Place
  favorites: Favorite[]
  visibility: Visibility
  updatedAt: string
}

export type SpreadId = 'one' | 'three' | 'celtic'

export interface DrawnCard {
  positionId: string
  cardId: string
  reversed: boolean
}

export interface Reading {
  id: string
  spreadId: SpreadId
  question?: string
  createdAt: string
  cards: DrawnCard[]
  note?: string
}

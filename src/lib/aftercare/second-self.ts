import type { FavoriteKind, Profile, Visibility } from './types'
import { NUMBER_MEANINGS, PERSONAL_YEAR_MEANINGS, lifePathCardNumber, numerologyFor, parseBirthDate } from './numerology'
import { sunSign } from './zodiac'
import { THEMES, themeById } from './themes'
import { majorByNumber } from './deck'
import { distanceKm, type MapPin } from './world-map'

/** Everything the "second self" page shows. Plain JSON, so it can also travel in a share link. */
export interface SelfView {
  name: string
  birthDate?: string
  numbers?: {
    lifePath: number
    lifePathTitle: string
    lifePathSummary: string
    birthday: number
    personalYear: number
    personalYearNote: string
    year: number
    expression?: number
    soulUrge?: number
    personality?: number
    birthCard: string
    soulCard: string
    signId?: string
  }
  pins?: MapPin[]
  favorites?: { kind: FavoriteKind; title: string; themeId: string }[]
  links?: SelfLink[]
  facts?: string[]
}

export type LinkKind = 'echo' | 'kindred' | 'place'
export interface SelfLink {
  kind: LinkKind
  /** Short headline */
  title: string
  /** One or two warm sentences */
  why: string
  /** Major arcana ids involved, for little card thumbnails */
  cards?: string[]
}

const KEYWORDS: Array<[string, RegExp]> = [
  ['love', /\b(love|romance|wedding|heart|pride|notebook|casablanca|titanic)\b/i],
  ['home', /\b(home|house|kitchen|garden|cottage|family|shire|hobbit|bread|soup|tea)\b/i],
  ['wonder', /\b(star|stars|space|sky|moon|galaxy|universe|dream|magic|wizard|fantasy)\b/i],
  ['courage', /\b(hero|war|fight|brave|lion|dragon|knight|quest|storm)\b/i],
  ['change', /\b(wheel|time|journey|road|travel|train|river|season|change)\b/i],
  ['mystery', /\b(mystery|ghost|secret|detective|night|shadow|witch|spirit|haunt|labyrinth)\b/i],
  ['craft', /\b(craft|build|maker|paint|art|music|guitar|piano|write|clock|workshop)\b/i],
  ['rest', /\b(sleep|rest|quiet|rain|library|candle|lantern|cat|slow)\b/i],
  ['joy', /\b(party|dance|sun|summer|laugh|comedy|festival|ice cream|picnic)\b/i],
  ['truth', /\b(court|justice|law|truth|honest|news|trial)\b/i],
  ['growth', /\b(seed|school|learn|begin|first|green|tree|forest|plant)\b/i],
  ['memory', /\b(memory|remember|letter|photo|old|vintage|nostalgia|diary|ancestor)\b/i],
]

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

/** A friendly default theme for a favorite when the user has not picked one. Keyword first, then a stable hash. */
export function guessTheme(title: string): string {
  for (const [id, re] of KEYWORDS) if (re.test(title)) return id
  return THEMES[hash(title.trim().toLowerCase()) % THEMES.length].id
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MS_DAY = 86_400_000

export function weekdayOf(iso: string): string | null {
  const p = parseBirthDate(iso)
  if (!p) return null
  const d = new Date(Date.UTC(2000, p.month - 1, p.day))
  d.setUTCFullYear(p.year)
  return WEEKDAYS[d.getUTCDay()]
}

export function daysAlive(iso: string, now: Date): number | null {
  const p = parseBirthDate(iso)
  if (!p) return null
  const b = new Date(Date.UTC(2000, p.month - 1, p.day))
  b.setUTCFullYear(p.year)
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.floor((today - b.getTime()) / MS_DAY)
}

export function daysToBirthday(iso: string, now: Date): number | null {
  const p = parseBirthDate(iso)
  if (!p) return null
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  let next = Date.UTC(now.getFullYear(), p.month - 1, p.day)
  if (next < today) next = Date.UTC(now.getFullYear() + 1, p.month - 1, p.day)
  return Math.round((next - today) / MS_DAY)
}

function cardIdFor(n: number): string {
  const c = majorByNumber(n)
  if (!c) throw new Error(`No major arcana ${n}`)
  return c.id
}

export function buildFacts(profile: Profile, now: Date): string[] {
  const out: string[] = []
  const wd = weekdayOf(profile.birthDate)
  if (wd) out.push(`You were born on a ${wd}.`)
  const alive = daysAlive(profile.birthDate, now)
  if (alive !== null && alive > 0) out.push(`You have been around for ${alive.toLocaleString('en-US')} days so far.`)
  const next = daysToBirthday(profile.birthDate, now)
  if (next !== null) out.push(next === 0 ? 'Today is your birthday. Happy birthday!' : `Your next birthday is ${next} day${next === 1 ? '' : 's'} away.`)
  return out
}

export function buildLinks(profile: Profile, now: Date): SelfLink[] {
  const nums = numerologyFor(profile.displayName, profile.birthDate, now.getFullYear())
  const sign = sunSign(profile.birthDate)
  if (!nums) return []
  const own: Array<{ n: number; label: string }> = [
    { n: lifePathCardNumber(nums.lifePath.number), label: 'your life path card' },
    { n: nums.cards.birth, label: 'your birth card' },
    { n: nums.cards.soul, label: 'your soul card' },
  ]
  if (sign) own.push({ n: sign.cardNumber, label: `the card we pair with ${sign.name}` })

  const links: SelfLink[] = []
  const favs = profile.favorites.map((f) => ({ ...f, themeId: f.themeId ?? guessTheme(f.title) }))

  for (const f of favs) {
    const theme = themeById(f.themeId)
    if (!theme) continue
    const hit = own.find((o) => o.n === theme.cardNumber)
    if (hit) {
      const card = majorByNumber(theme.cardNumber)
      links.push({
        kind: 'echo',
        title: `${f.title} echoes ${card?.name}`,
        why: `${theme.label} is carried by ${card?.name} in our map, and that is also ${hit.label}. What you love is rhyming with who you are.`,
        cards: card ? [card.id] : undefined,
      })
    }
  }

  const byTheme = new Map<string, string[]>()
  for (const f of favs) byTheme.set(f.themeId, [...(byTheme.get(f.themeId) ?? []), f.title])
  for (const [themeId, titles] of byTheme) {
    if (titles.length < 2) continue
    const theme = themeById(themeId)
    const card = theme ? majorByNumber(theme.cardNumber) : undefined
    if (!theme) continue
    links.push({
      kind: 'kindred',
      title: `${titles.slice(0, 3).join(', ')}: kindred`,
      why: `They all gather under ${theme.label.toLowerCase()}. ${theme.blurb}`,
      cards: card ? [card.id] : undefined,
    })
  }

  if (profile.birthPlace) {
    for (const f of favs) {
      if (!f.place) continue
      const km = Math.round(distanceKm(profile.birthPlace, f.place))
      if (km < 1) continue
      const tier = km > 6000 ? 'far' : km > 2500 ? 'mid' : 'near'
      links.push({
        kind: 'place',
        title: `${f.title}: ${km.toLocaleString('en-US')} km from where you began`,
        why:
          tier === 'far'
            ? `A long way from ${profile.birthPlace.label}. Some of your favorite things live on the other side of the world.`
            : tier === 'mid'
              ? `${f.place.label} is a real journey from ${profile.birthPlace.label}, but one a plane can manage in a day.`
              : `${f.place.label} is a short hop from ${profile.birthPlace.label}.`,
      })
    }
  }
  return links
}

export function buildView(profile: Profile, now = new Date()): SelfView {
  const nums = numerologyFor(profile.displayName, profile.birthDate, now.getFullYear())
  const sign = sunSign(profile.birthDate)
  const favorites = profile.favorites.map((f) => ({ kind: f.kind, title: f.title, themeId: f.themeId ?? guessTheme(f.title) }))
  const pins: MapPin[] = []
  if (profile.birthPlace) pins.push({ ...profile.birthPlace, kind: 'birth' })
  for (const f of profile.favorites) if (f.place) pins.push({ ...f.place, kind: f.kind, title: f.title })

  const view: SelfView = { name: profile.displayName, birthDate: profile.birthDate, pins, favorites, links: buildLinks(profile, now), facts: buildFacts(profile, now) }
  if (nums) {
    const meaning = NUMBER_MEANINGS[nums.lifePath.number]
    view.numbers = {
      lifePath: nums.lifePath.number,
      lifePathTitle: meaning.title,
      lifePathSummary: meaning.summary,
      birthday: nums.birthday,
      personalYear: nums.personalYear,
      personalYearNote: PERSONAL_YEAR_MEANINGS[nums.personalYear],
      year: now.getFullYear(),
      expression: nums.names?.expression,
      soulUrge: nums.names?.soulUrge || undefined,
      personality: nums.names?.personality || undefined,
      birthCard: cardIdFor(nums.cards.birth),
      soulCard: cardIdFor(nums.cards.soul),
      signId: sign?.id,
    }
  }
  return view
}

/** What a share link may carry: only the parts the person switched on. Links quote favorites and places, so they need those switched on too. */
export function redactView(view: SelfView, vis: Visibility): SelfView {
  const out: SelfView = { name: view.name }
  if (vis.birth && view.birthDate) {
    out.birthDate = view.birthDate
    if (view.facts) out.facts = view.facts
  }
  if (vis.numbers && view.numbers) out.numbers = view.numbers
  if (vis.map && view.pins) out.pins = view.pins.filter((p) => p.kind === 'birth' || vis.favorites)
  if (vis.favorites && view.favorites) out.favorites = view.favorites
  if (vis.connections && vis.favorites && view.links) out.links = view.links.filter((l) => l.kind !== 'place' || vis.map)
  return out
}

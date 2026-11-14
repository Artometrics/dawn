import type { DrawnCard, Favorite, Place, Profile, Reading, SpreadId, Visibility } from './types'
import { parseBirthDate } from './numerology'
import { THEMES } from './themes'
import { SPREADS } from './spreads'
import { getCard } from './deck'

export const PROFILE_KEY = 'aftercare.profile'
export const READINGS_KEY = 'aftercare.readings'
export const MAX_READINGS = 200

export const DEFAULT_VISIBILITY: Visibility = { birth: false, numbers: true, map: true, favorites: false, connections: true }

/** localStorage with an in-memory fallback (private mode, blocked storage, tests). */
function store(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  try {
    const ls = (globalThis as { localStorage?: Storage }).localStorage
    if (ls) {
      const k = '__aftercare_probe__'
      ls.setItem(k, '1')
      ls.removeItem(k)
      return ls
    }
  } catch {
    /* fall through */
  }
  return memory
}
const mem = new Map<string, string>()
const memory = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
}

const str = (v: unknown, max: number): string | undefined => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined)
const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)

export function sanitizePlace(v: unknown): Place | undefined {
  if (!v || typeof v !== 'object') return undefined
  const o = v as Record<string, unknown>
  const label = str(o.label, 120)
  const lat = num(o.lat)
  const lng = num(o.lng)
  if (!label || lat === undefined || lng === undefined || Math.abs(lat) > 90 || Math.abs(lng) > 180) return undefined
  return { label, lat, lng }
}

export function sanitizeProfile(v: unknown): Profile | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  const displayName = str(o.displayName, 80)
  const birthDate = str(o.birthDate, 10)
  if (!displayName || !birthDate || !parseBirthDate(birthDate)) return null
  const themeIds = new Set(THEMES.map((t) => t.id))
  const favorites: Favorite[] = []
  if (Array.isArray(o.favorites)) {
    for (const f of o.favorites.slice(0, 60)) {
      if (!f || typeof f !== 'object') continue
      const fo = f as Record<string, unknown>
      const title = str(fo.title, 100)
      const kind = fo.kind === 'movie' || fo.kind === 'book' || fo.kind === 'thing' ? fo.kind : null
      if (!title || !kind) continue
      const themeId = typeof fo.themeId === 'string' && themeIds.has(fo.themeId) ? fo.themeId : undefined
      favorites.push({ id: str(fo.id, 40) ?? `f-${favorites.length}`, kind, title, themeId, place: sanitizePlace(fo.place) })
    }
  }
  const vis = (o.visibility && typeof o.visibility === 'object' ? o.visibility : {}) as Record<string, unknown>
  const visibility: Visibility = {
    birth: typeof vis.birth === 'boolean' ? vis.birth : DEFAULT_VISIBILITY.birth,
    numbers: typeof vis.numbers === 'boolean' ? vis.numbers : DEFAULT_VISIBILITY.numbers,
    map: typeof vis.map === 'boolean' ? vis.map : DEFAULT_VISIBILITY.map,
    favorites: typeof vis.favorites === 'boolean' ? vis.favorites : DEFAULT_VISIBILITY.favorites,
    connections: typeof vis.connections === 'boolean' ? vis.connections : DEFAULT_VISIBILITY.connections,
  }
  const bt = str(o.birthTime, 5)
  return {
    id: str(o.id, 40) ?? 'me',
    displayName,
    birthDate,
    birthTime: bt && /^\d{2}:\d{2}$/.test(bt) ? bt : undefined,
    birthPlace: sanitizePlace(o.birthPlace),
    favorites,
    visibility,
    updatedAt: str(o.updatedAt, 40) ?? new Date().toISOString(),
  }
}

export function sanitizeReading(v: unknown): Reading | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  const spreadId = o.spreadId as SpreadId
  if (!(spreadId in SPREADS) || !Array.isArray(o.cards)) return null
  const spread = SPREADS[spreadId]
  const cards: DrawnCard[] = []
  for (const c of o.cards) {
    if (!c || typeof c !== 'object') return null
    const co = c as Record<string, unknown>
    if (typeof co.cardId !== 'string' || !getCard(co.cardId) || !spread.positions.some((p) => p.id === co.positionId)) return null
    cards.push({ positionId: co.positionId as string, cardId: co.cardId, reversed: co.reversed === true })
  }
  if (cards.length !== spread.positions.length) return null
  const id = str(o.id, 60)
  const createdAt = str(o.createdAt, 40)
  if (!id || !createdAt) return null
  return { id, spreadId, question: str(o.question, 300), createdAt, cards, note: str(o.note, 4000) }
}

export function getProfile(): Profile | null {
  try {
    const raw = store().getItem(PROFILE_KEY)
    return raw ? sanitizeProfile(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

export function saveProfile(p: Profile): Profile {
  const clean = sanitizeProfile({ ...p, updatedAt: new Date().toISOString() })
  if (!clean) throw new Error('Profile needs a name and a valid birth date')
  store().setItem(PROFILE_KEY, JSON.stringify(clean))
  return clean
}

export function clearProfile() {
  store().removeItem(PROFILE_KEY)
}

export function getReadings(): Reading[] {
  try {
    const raw = store().getItem(READINGS_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr.map(sanitizeReading).filter((r): r is Reading => r !== null)
  } catch {
    return []
  }
}

function writeReadings(list: Reading[]) {
  store().setItem(READINGS_KEY, JSON.stringify(list.slice(0, MAX_READINGS)))
}

export function saveReading(r: Reading): Reading[] {
  const clean = sanitizeReading(r)
  if (!clean) throw new Error('Invalid reading')
  const list = [clean, ...getReadings().filter((x) => x.id !== clean.id)]
  writeReadings(list)
  return list.slice(0, MAX_READINGS)
}

export function deleteReading(id: string): Reading[] {
  const list = getReadings().filter((r) => r.id !== id)
  writeReadings(list)
  return list
}

export function clearReadings() {
  store().removeItem(READINGS_KEY)
}

export interface Backup {
  app: 'aftercare'
  version: 1
  exportedAt: string
  profile: Profile | null
  readings: Reading[]
}

export function exportAll(now = new Date()): Backup {
  return { app: 'aftercare', version: 1, exportedAt: now.toISOString(), profile: getProfile(), readings: getReadings() }
}

/** Restores a backup. Returns counts, or null if the file is not an Aftercare backup. */
export function importAll(data: unknown): { profile: boolean; readings: number } | null {
  if (!data || typeof data !== 'object') return null
  const o = data as Record<string, unknown>
  if (o.app !== 'aftercare') return null
  const profile = sanitizeProfile(o.profile)
  const readings = Array.isArray(o.readings) ? o.readings.map(sanitizeReading).filter((r): r is Reading => r !== null) : []
  if (profile) store().setItem(PROFILE_KEY, JSON.stringify(profile))
  if (readings.length) writeReadings(readings)
  return { profile: !!profile, readings: readings.length }
}

/** How many times each card appears across saved readings. */
export function cardCounts(readings: Reading[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const r of readings) for (const c of r.cards) m.set(c.cardId, (m.get(c.cardId) ?? 0) + 1)
  return m
}

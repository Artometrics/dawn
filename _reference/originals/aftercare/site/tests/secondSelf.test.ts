import { describe, expect, it } from 'vitest'
import { buildView, guessTheme, redactView, weekdayOf, daysToBirthday } from '../src/lib/secondSelf'
import { decodeShare, encodeShare } from '../src/lib/share'
import { distanceKm, project, unproject, mapSvg } from '../src/lib/worldMap'
import { DEFAULT_VISIBILITY, sanitizeProfile, exportAll, importAll, saveProfile, getProfile, saveReading, getReadings, clearProfile, clearReadings } from '../src/lib/storage'
import { drawSpread } from '../src/lib/spreads'
import { newReading } from '../src/lib/reading'
import { THEMES } from '../src/lib/themes'
import type { Profile } from '../src/lib/types'

const profile: Profile = {
  id: 'me',
  displayName: 'Ada Q',
  birthDate: '1985-11-29',
  birthPlace: { label: 'Salt Lake City, United States', lat: 40.76, lng: -111.89 },
  favorites: [
    { id: 'a', kind: 'movie', title: 'Spirited Away', themeId: 'change' },
    { id: 'b', kind: 'book', title: 'The Hobbit', themeId: 'home', place: { label: 'Oxford, United Kingdom', lat: 51.75, lng: -1.26 } },
    { id: 'c', kind: 'thing', title: 'Rainy windows' },
  ],
  visibility: { ...DEFAULT_VISIBILITY },
  updatedAt: '2026-01-01T00:00:00.000Z',
}
const now = new Date(2026, 5, 15)

describe('second self view', () => {
  const view = buildView(profile, now)

  it('computes numbers tied to the birth date', () => {
    expect(view.numbers?.lifePath).toBe(9)
    expect(view.numbers?.signId).toBe('sagittarius')
    expect(view.numbers?.year).toBe(2026)
  })

  it('pins the birth place and favorite places', () => {
    expect(view.pins?.map((p) => p.kind)).toEqual(['birth', 'book'])
  })

  it('gives every favorite a theme', () => {
    for (const f of view.favorites ?? []) expect(THEMES.some((t) => t.id === f.themeId)).toBe(true)
  })

  it('finds a place link with a distance', () => {
    expect(view.links?.some((l) => l.kind === 'place' && /km/.test(l.title))).toBe(true)
  })

  it('has weekday and birthday facts', () => {
    expect(weekdayOf('1985-11-29')).toBe('Friday')
    expect(daysToBirthday('2000-06-15', now)).toBe(0)
    expect(view.facts?.length).toBeGreaterThanOrEqual(2)
  })

  it('guesses themes deterministically', () => {
    expect(guessTheme('Moonlit stars')).toBe('wonder')
    expect(guessTheme('Zzz unknown thing')).toBe(guessTheme('Zzz unknown thing'))
  })
})

describe('redaction and share links', () => {
  const view = buildView(profile, now)

  it('drops everything that is switched off', () => {
    const r = redactView(view, { birth: false, numbers: false, map: false, favorites: false, connections: false })
    expect(Object.keys(r)).toEqual(['name'])
  })

  it('never leaks birth date, favorites or places when only numbers are on', () => {
    const r = redactView(view, { birth: false, numbers: true, map: false, favorites: false, connections: true })
    const text = JSON.stringify(r)
    expect(text).not.toContain('1985')
    expect(text).not.toContain('Hobbit')
    expect(text).not.toContain('Salt Lake')
    expect(r.numbers?.lifePath).toBe(9)
  })

  it('only shares connections when favorites are shared too', () => {
    const r = redactView(view, { birth: false, numbers: true, map: true, favorites: false, connections: true })
    expect(r.links).toBeUndefined()
    expect(r.pins?.every((p) => p.kind === 'birth')).toBe(true)
  })

  it('round-trips through the URL fragment', () => {
    const r = redactView(view, { birth: true, numbers: true, map: true, favorites: true, connections: true })
    const decoded = decodeShare('#' + encodeShare(r))
    expect(decoded?.name).toBe('Ada Q')
    expect(decoded?.birthDate).toBe('1985-11-29')
    expect(decoded?.favorites?.length).toBe(3)
    expect(decoded?.numbers?.lifePath).toBe(9)
    expect(decoded?.pins?.length).toBe(2)
  })

  it('rejects junk and oversized fragments', () => {
    expect(decodeShare('')).toBeNull()
    expect(decodeShare('#d=not-base64!!')).toBeNull()
    expect(decodeShare('#d=' + 'A'.repeat(20000))).toBeNull()
    expect(decodeShare('#x=1')).toBeNull()
  })

  it('handles non-ASCII names', () => {
    const r = redactView(buildView({ ...profile, displayName: 'Zoë Núñez 月' }, now), DEFAULT_VISIBILITY)
    expect(decodeShare('#' + encodeShare(r))?.name).toBe('Zoë Núñez 月')
  })
})

describe('world map', () => {
  it('projects and unprojects', () => {
    expect(project(0, 0)).toEqual({ x: 500, y: 250 })
    const p = unproject(project(40.76, -111.89).x, project(40.76, -111.89).y)
    expect(p.lat).toBeCloseTo(40.76, 5)
    expect(p.lng).toBeCloseTo(-111.89, 5)
  })
  it('measures distance', () => {
    expect(distanceKm({ lat: 0, lng: 0 }, { lat: 0, lng: 0 })).toBe(0)
    const nycLondon = distanceKm({ lat: 40.71, lng: -74.0 }, { lat: 51.5, lng: -0.12 })
    expect(nycLondon).toBeGreaterThan(5500)
    expect(nycLondon).toBeLessThan(5650)
  })
  it('escapes titles inside the svg', () => {
    const svg = mapSvg([{ label: 'A', lat: 1, lng: 1, kind: 'movie', title: '<script>' }])
    expect(svg).not.toContain('<script>')
  })
})

describe('storage', () => {
  it('rejects bad profiles', () => {
    expect(sanitizeProfile({ displayName: '', birthDate: '1990-01-01' })).toBeNull()
    expect(sanitizeProfile({ displayName: 'X', birthDate: '1990-02-31' })).toBeNull()
  })

  it('saves, exports and re-imports profile and readings', () => {
    clearProfile()
    clearReadings()
    saveProfile(profile)
    saveReading(newReading('three', drawSpread('three'), 'A question'))
    const backup = exportAll()
    clearProfile()
    clearReadings()
    expect(getProfile()).toBeNull()
    expect(importAll(JSON.parse(JSON.stringify(backup)))).toEqual({ profile: true, readings: 1 })
    expect(getProfile()?.displayName).toBe('Ada Q')
    expect(getReadings()).toHaveLength(1)
    expect(importAll({ app: 'other' })).toBeNull()
  })
})

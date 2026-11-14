/**
 * A natal wheel computed on the device.
 * Positions use the published low-precision orbital elements (a few terms, no
 * network ephemeris). They are fine for a wheel and a sign, and they can be
 * off by about a degree, so a birthday on a cusp can disagree with an observatory.
 */

import { parseBirthDate } from './numerology'

export interface ChartInput {
  /** YYYY-MM-DD */
  iso: string
  /** HH:MM, optional. Read as local mean time when a place is set, otherwise as UTC. */
  time?: string
  lat?: number
  lng?: number
}

export interface PlacedBody {
  id: string
  name: string
  glyph: string
  longitude: number
  latitude: number
  sign: string
  signGlyph: string
  degree: number
  minute: number
  retrograde: boolean
  house: number | null
}

export interface NatalChart {
  /** What clock the planets were computed for. */
  whenLabel: string
  timeNote: string
  ascendant: number | null
  midheaven: number | null
  /** Equal-house cusps, house 1 at the ascendant. Null without a time and a place. */
  houses: number[] | null
  bodies: PlacedBody[]
}

interface WheelSign {
  name: string
  glyph: string
}

const g = (c: string) => `${c}\uFE0E`

/** Tropical signs from 0° Aries. */
export const WHEEL_SIGNS: WheelSign[] = [
  { name: 'Aries', glyph: g('♈') },
  { name: 'Taurus', glyph: g('♉') },
  { name: 'Gemini', glyph: g('♊') },
  { name: 'Cancer', glyph: g('♋') },
  { name: 'Leo', glyph: g('♌') },
  { name: 'Virgo', glyph: g('♍') },
  { name: 'Libra', glyph: g('♎') },
  { name: 'Scorpio', glyph: g('♏') },
  { name: 'Sagittarius', glyph: g('♐') },
  { name: 'Capricorn', glyph: g('♑') },
  { name: 'Aquarius', glyph: g('♒') },
  { name: 'Pisces', glyph: g('♓') },
]

const rev = (n: number) => ((n % 360) + 360) % 360
const rad = (n: number) => (n * Math.PI) / 180
const deg = (n: number) => (n * 180) / Math.PI

/** Days since 2000 Jan 0.0 (1999 Dec 31, 0h), Schlyter's day count. */
function dayNumber(year: number, month: number, day: number): number {
  return 367 * year - Math.floor((7 * (year + Math.floor((month + 9) / 12))) / 4) + Math.floor((275 * month) / 9) + day - 730530
}

function clock(time?: string): { h: number; m: number } | null {
  if (!time) return null
  const match = /^(\d{2}):(\d{2})$/.exec(time)
  if (!match) return null
  const h = Number(match[1])
  const m = Number(match[2])
  if (h > 23 || m > 59) return null
  return { h, m }
}

interface Moment {
  d: number
  /** Day number at 0h UT, for sidereal time. */
  d0: number
  utHours: number
  label: string
}

function momentFor(input: ChartInput): Moment | null {
  const parts = parseBirthDate(input.iso)
  if (!parts) return null
  const { year, month, day } = parts
  const clocked = clock(input.time)
  const hasPlace = typeof input.lat === 'number' && typeof input.lng === 'number' && Math.abs(input.lat) <= 90 && Math.abs(input.lng) <= 180
  const localHours = clocked ? clocked.h + clocked.m / 60 : 12
  const offsetHours = clocked && hasPlace ? input.lng! / 15 : 0
  const utMs = Date.UTC(year, month - 1, day, 0, 0, 0) + (localHours - offsetHours) * 3600000
  const when = new Date(utMs)
  if (Number.isNaN(when.getTime())) return null
  const y = when.getUTCFullYear()
  const m = when.getUTCMonth() + 1
  const d = when.getUTCDate()
  const utHours = when.getUTCHours() + when.getUTCMinutes() / 60 + when.getUTCSeconds() / 3600
  const dateLabel = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const timeLabel = `${String(when.getUTCHours()).padStart(2, '0')}:${String(when.getUTCMinutes()).padStart(2, '0')} UTC`
  return { d: dayNumber(y, m, d + utHours / 24), d0: dayNumber(y, m, d), utHours, label: `${dateLabel} ${timeLabel}` }
}

interface SunVec {
  lon: number
  r: number
  meanAnomaly: number
  obliquity: number
}

function sunVector(d: number): SunVec {
  const w = rev(282.9404 + 4.70935e-5 * d)
  const e = 0.016709 - 1.151e-9 * d
  const M = rev(356.0470 + 0.9856002585 * d)
  const obliquity = 23.4393 - 3.563e-7 * d
  const E = M + deg(e * Math.sin(rad(M)) * (1 + e * Math.cos(rad(M))))
  const xv = Math.cos(rad(E)) - e
  const yv = Math.sqrt(1 - e * e) * Math.sin(rad(E))
  const v = deg(Math.atan2(yv, xv))
  const r = Math.hypot(xv, yv)
  return { lon: rev(v + w), r, meanAnomaly: M, obliquity }
}

interface Orbit {
  id: string
  name: string
  glyph: string
  N0: number
  Nd: number
  i0: number
  idd: number
  w0: number
  wd: number
  a0: number
  ad: number
  e0: number
  ed: number
  M0: number
  Md: number
}

const PLANETS: Orbit[] = [
  { id: 'mercury', name: 'Mercury', glyph: g('☿'), N0: 48.3313, Nd: 3.24587e-5, i0: 7.0047, idd: 5.0e-8, w0: 29.1241, wd: 1.01444e-5, a0: 0.387098, ad: 0, e0: 0.205635, ed: 5.59e-10, M0: 168.6562, Md: 4.0923344368 },
  { id: 'venus', name: 'Venus', glyph: g('♀'), N0: 76.6799, Nd: 2.4659e-5, i0: 3.3946, idd: 2.75e-8, w0: 54.891, wd: 1.38374e-5, a0: 0.72333, ad: 0, e0: 0.006773, ed: -1.302e-9, M0: 48.0052, Md: 1.6021302244 },
  { id: 'mars', name: 'Mars', glyph: g('♂'), N0: 49.5574, Nd: 2.11081e-5, i0: 1.8497, idd: -1.78e-8, w0: 286.5016, wd: 2.92961e-5, a0: 1.523688, ad: 0, e0: 0.093405, ed: 2.516e-9, M0: 18.6021, Md: 0.5240207766 },
  { id: 'jupiter', name: 'Jupiter', glyph: g('♃'), N0: 100.4542, Nd: 2.76854e-5, i0: 1.303, idd: -1.557e-7, w0: 273.8777, wd: 1.64505e-5, a0: 5.20256, ad: 0, e0: 0.048498, ed: 4.469e-9, M0: 19.895, Md: 0.0830853001 },
  { id: 'saturn', name: 'Saturn', glyph: g('♄'), N0: 113.6634, Nd: 2.3898e-5, i0: 2.4886, idd: -1.081e-7, w0: 339.3939, wd: 2.97661e-5, a0: 9.55475, ad: 0, e0: 0.055546, ed: -9.499e-9, M0: 316.967, Md: 0.0334442282 },
  { id: 'uranus', name: 'Uranus', glyph: g('♅'), N0: 74.0005, Nd: 1.3978e-5, i0: 0.7733, idd: 1.9e-8, w0: 96.6612, wd: 3.0565e-5, a0: 19.18171, ad: -1.55e-8, e0: 0.047318, ed: 7.45e-9, M0: 142.5905, Md: 0.011725806 },
  { id: 'neptune', name: 'Neptune', glyph: g('♆'), N0: 131.7806, Nd: 3.0173e-5, i0: 1.77, idd: -2.55e-7, w0: 272.8461, wd: -6.027e-6, a0: 30.05826, ad: 3.313e-8, e0: 0.008606, ed: 2.15e-9, M0: 260.2471, Md: 0.005995147 },
]

function eccentric(Mdeg: number, e: number): number {
  let E = rad(Mdeg)
  const M = E
  for (let i = 0; i < 8; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E))
  return E
}

function heliocentric(orbit: Orbit, d: number): { x: number; y: number; z: number; mean: number } {
  const N = rad(rev(orbit.N0 + orbit.Nd * d))
  const i = rad(orbit.i0 + orbit.idd * d)
  const w = rad(rev(orbit.w0 + orbit.wd * d))
  const a = orbit.a0 + orbit.ad * d
  const e = orbit.e0 + orbit.ed * d
  const M = rev(orbit.M0 + orbit.Md * d)
  const E = eccentric(M, e)
  const xv = a * (Math.cos(E) - e)
  const yv = a * Math.sqrt(Math.max(0, 1 - e * e)) * Math.sin(E)
  const v = Math.atan2(yv, xv)
  const r = Math.hypot(xv, yv)
  const vw = v + w
  return {
    x: r * (Math.cos(N) * Math.cos(vw) - Math.sin(N) * Math.sin(vw) * Math.cos(i)),
    y: r * (Math.sin(N) * Math.cos(vw) + Math.cos(N) * Math.sin(vw) * Math.cos(i)),
    z: r * Math.sin(vw) * Math.sin(i),
    mean: M,
  }
}

function planetLongitude(orbit: Orbit, d: number, sun: SunVec): { lon: number; lat: number } {
  const helio = heliocentric(orbit, d)
  let lon = rev(deg(Math.atan2(helio.y + sun.r * Math.sin(rad(sun.lon)), helio.x + sun.r * Math.cos(rad(sun.lon)))))
  const lat = deg(Math.atan2(helio.z, Math.hypot(helio.x + sun.r * Math.cos(rad(sun.lon)), helio.y + sun.r * Math.sin(rad(sun.lon)))))
  if (orbit.id === 'jupiter' || orbit.id === 'saturn') {
    const jup = rev(19.895 + 0.0830853001 * d)
    const sat = rev(316.967 + 0.0334442282 * d)
    const s = (a: number) => Math.sin(rad(a))
    if (orbit.id === 'jupiter') {
      lon = rev(lon
        - 0.332 * s(2 * jup - 5 * sat - 67.6)
        - 0.056 * s(2 * jup - 2 * sat + 21)
        + 0.042 * s(3 * jup - 5 * sat + 21)
        - 0.036 * s(jup - 2 * sat)
        + 0.022 * Math.cos(rad(jup - sat))
        + 0.023 * s(2 * jup - 3 * sat + 52)
        - 0.016 * s(jup - 5 * sat - 69))
    } else {
      lon = rev(lon
        + 0.812 * s(2 * jup - 5 * sat - 67.6)
        - 0.229 * Math.cos(rad(2 * jup - 4 * sat - 2))
        + 0.119 * s(jup - 2 * sat - 3)
        + 0.046 * s(2 * jup - 6 * sat - 69)
        + 0.014 * s(jup - 3 * sat + 32))
    }
  }
  return { lon, lat }
}

function moonLongitude(d: number, sun: SunVec): { lon: number; lat: number } {
  const N = rev(125.1228 - 0.0529538083 * d)
  const i = 5.1454
  const w = rev(318.0634 + 0.1643573223 * d)
  const e = 0.0549
  const M = rev(115.3654 + 13.0649929509 * d)
  const E = eccentric(M, e)
  const xv = 60.2666 * (Math.cos(E) - e)
  const yv = 60.2666 * Math.sqrt(1 - e * e) * Math.sin(E)
  const v = deg(Math.atan2(yv, xv))
  const r = Math.hypot(xv, yv)
  const vw = rad(v + w)
  const Nr = rad(N)
  const ir = rad(i)
  const xh = r * (Math.cos(Nr) * Math.cos(vw) - Math.sin(Nr) * Math.sin(vw) * Math.cos(ir))
  const yh = r * (Math.sin(Nr) * Math.cos(vw) + Math.cos(Nr) * Math.sin(vw) * Math.cos(ir))
  const zh = r * Math.sin(vw) * Math.sin(ir)
  let lon = rev(deg(Math.atan2(yh, xh)))
  let lat = deg(Math.atan2(zh, Math.hypot(xh, yh)))
  const Mm = M
  const Ms = sun.meanAnomaly
  const Lm = rev(N + w + M)
  const Ls = rev(sun.meanAnomaly + 282.9404 + 4.70935e-5 * d)
  const D = rev(Lm - Ls)
  const F = rev(Lm - N)
  const s = (a: number) => Math.sin(rad(a))
  lon = rev(lon
    - 1.274 * s(Mm - 2 * D)
    + 0.658 * s(2 * D)
    - 0.186 * s(Ms)
    - 0.059 * s(2 * Mm - 2 * D)
    - 0.057 * s(Mm - 2 * D + Ms)
    + 0.053 * s(Mm + 2 * D)
    + 0.046 * s(2 * D - Ms)
    + 0.041 * s(Mm - Ms)
    - 0.035 * s(D)
    - 0.031 * s(Mm + Ms)
    - 0.015 * s(2 * F - 2 * D)
    + 0.011 * s(Mm - 4 * D))
  lat = lat
    - 0.173 * s(F - 2 * D)
    - 0.055 * s(Mm - F - 2 * D)
    - 0.046 * s(Mm + F - 2 * D)
    + 0.033 * s(F + 2 * D)
    + 0.017 * s(2 * Mm + F)
  return { lon, lat }
}

function sidereal(d0: number, utHours: number, lng: number): number {
  const mean = rev(356.0470 + 0.9856002585 * d0)
  const peri = rev(282.9404 + 4.70935e-5 * d0)
  const gmst0 = rev(mean + peri + 180)
  return rev(gmst0 + utHours * 15.04107 + lng)
}

function ascendantOf(ramc: number, lat: number, eps: number): number {
  const y = Math.cos(rad(ramc))
  const x = -(Math.sin(rad(ramc)) * Math.cos(rad(eps)) + Math.tan(rad(lat)) * Math.sin(rad(eps)))
  return rev(deg(Math.atan2(y, x)))
}

function midheavenOf(ramc: number, eps: number): number {
  return rev(deg(Math.atan2(Math.sin(rad(ramc)), Math.cos(rad(ramc)) * Math.cos(rad(eps)))))
}

export function signAt(longitude: number): WheelSign {
  return WHEEL_SIGNS[Math.floor(rev(longitude) / 30) % 12]
}

function place(id: string, name: string, glyph: string, lon: number, lat: number, retrograde: boolean, asc: number | null): PlacedBody {
  const sign = signAt(lon)
  const within = rev(lon) % 30
  const degree = Math.floor(within)
  const minute = Math.floor((within - degree) * 60)
  const house = asc === null ? null : Math.floor(rev(lon - asc) / 30) + 1
  return { id, name, glyph, longitude: rev(lon), latitude: lat, sign: sign.name, signGlyph: sign.glyph, degree, minute, retrograde, house }
}

function forward(d: number, id: string): number {
  const sun = sunVector(d)
  if (id === 'sun') return sun.lon
  if (id === 'moon') return moonLongitude(d, sun).lon
  if (id === 'node') return rev(125.1228 - 0.0529538083 * d)
  const orbit = PLANETS.find((p) => p.id === id)
  if (!orbit) return 0
  return planetLongitude(orbit, d, sun).lon
}

/** True when the body is moving backwards in longitude. The mean node always is. */
function isRetrograde(d: number, id: string): boolean {
  if (id === 'sun' || id === 'moon') return false
  if (id === 'node') return true
  const a = forward(d, id)
  const b = forward(d + 1, id)
  const step = ((b - a + 540) % 360) - 180
  return step < 0
}

export function natalChart(input: ChartInput): NatalChart | null {
  const when = momentFor(input)
  if (!when) return null
  const sun = sunVector(when.d)
  const hasTime = clock(input.time) !== null
  const hasPlace = typeof input.lat === 'number' && typeof input.lng === 'number' && Math.abs(input.lat) <= 90 && Math.abs(input.lng) <= 180
  let asc: number | null = null
  let mc: number | null = null
  let houses: number[] | null = null
  let timeNote = 'No birth time, so the planets are set for noon UTC and the houses are left off. The sun sign still follows the calendar date.'
  if (hasTime && hasPlace) {
    const ramc = sidereal(when.d0, when.utHours, input.lng!)
    const lat = Math.max(-89.5, Math.min(89.5, input.lat!))
    asc = ascendantOf(ramc, lat, sun.obliquity)
    mc = midheavenOf(ramc, sun.obliquity)
    houses = Array.from({ length: 12 }, (_, i) => rev(asc! + i * 30))
    timeNote = 'Houses are equal houses from the ascendant. The birth time is local mean time at the pinned place (longitude divided by 15), not a civil time zone.'
  } else if (hasTime) {
    timeNote = 'The clock time is read as UTC because there is no birth place, so the houses stay off.'
  } else if (hasPlace) {
    timeNote = 'A place is saved, but houses need a birth time. Planets are for noon UTC.'
  }

  const moon = moonLongitude(when.d, sun)
  const raw: Array<{ id: string; name: string; glyph: string; lon: number; lat: number }> = [
    { id: 'sun', name: 'Sun', glyph: g('☉'), lon: sun.lon, lat: 0 },
    { id: 'moon', name: 'Moon', glyph: g('☽'), lon: moon.lon, lat: moon.lat },
  ]
  for (const orbit of PLANETS) {
    const pos = planetLongitude(orbit, when.d, sun)
    raw.push({ id: orbit.id, name: orbit.name, glyph: orbit.glyph, lon: pos.lon, lat: pos.lat })
  }
  raw.push({ id: 'node', name: 'North node', glyph: g('☊'), lon: rev(125.1228 - 0.0529538083 * when.d), lat: 0 })

  return {
    whenLabel: when.label,
    timeNote,
    ascendant: asc,
    midheaven: mc,
    houses,
    bodies: raw.map((body) => place(body.id, body.name, body.glyph, body.lon, body.lat, isRetrograde(when.d, body.id), asc)),
  }
}

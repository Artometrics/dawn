const SIGNS = [
  'Capricorn', 'Aquarius', 'Pisces', 'Aries', 'Taurus', 'Gemini',
  'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius',
] as const

/** Tropical sun sign from month/day (approx cusp dates). */
export function sunSignFromDate(isoDate: string): string | null {
  const d = parseIsoDate(isoDate)
  if (!d) return null
  const m = d.getUTCMonth() + 1
  const day = d.getUTCDate()
  if ((m === 12 && day >= 22) || (m === 1 && day <= 19)) return 'Capricorn'
  if ((m === 1 && day >= 20) || (m === 2 && day <= 18)) return 'Aquarius'
  if ((m === 2 && day >= 19) || (m === 3 && day <= 20)) return 'Pisces'
  if ((m === 3 && day >= 21) || (m === 4 && day <= 19)) return 'Aries'
  if ((m === 4 && day >= 20) || (m === 5 && day <= 20)) return 'Taurus'
  if ((m === 5 && day >= 21) || (m === 6 && day <= 20)) return 'Gemini'
  if ((m === 6 && day >= 21) || (m === 7 && day <= 22)) return 'Cancer'
  if ((m === 7 && day >= 23) || (m === 8 && day <= 22)) return 'Leo'
  if ((m === 8 && day >= 23) || (m === 9 && day <= 22)) return 'Virgo'
  if ((m === 9 && day >= 23) || (m === 10 && day <= 22)) return 'Libra'
  if ((m === 10 && day >= 23) || (m === 11 && day <= 21)) return 'Scorpio'
  return 'Sagittarius'
}

export function parseIsoDate(isoDate: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim())
  if (!m) return null
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]))
  if (Number.isNaN(d.getTime())) return null
  return d
}

export function ageFromBirthDate(isoDate: string, now = new Date()) {
  const birth = parseIsoDate(isoDate)
  if (!birth) return null
  let age = now.getUTCFullYear() - birth.getUTCFullYear()
  const md = now.getUTCMonth() - birth.getUTCMonth()
  if (md < 0 || (md === 0 && now.getUTCDate() < birth.getUTCDate())) age -= 1
  return age
}

export function nextBirthday(isoDate: string, now = new Date()) {
  const birth = parseIsoDate(isoDate)
  if (!birth) return null
  const y = now.getUTCFullYear()
  let next = new Date(Date.UTC(y, birth.getUTCMonth(), birth.getUTCDate()))
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  if (next < today) next = new Date(Date.UTC(y + 1, birth.getUTCMonth(), birth.getUTCDate()))
  const days = Math.round((next.getTime() - today.getTime()) / 86400000)
  return { date: next.toISOString().slice(0, 10), daysUntil: days }
}

/** Pythagorean life-path style number from birth date. Reflective, not scientific. */
export function lifePathNumber(isoDate: string) {
  const digits = isoDate.replace(/\D/g, '')
  if (digits.length < 8) return null
  let sum = [...digits].reduce((a, c) => a + Number(c), 0)
  while (sum > 9 && sum !== 11 && sum !== 22 && sum !== 33) {
    sum = [...String(sum)].reduce((a, c) => a + Number(c), 0)
  }
  return sum
}

export function moonPhaseApprox(date = new Date()) {
  // Simple approximation from known new moon reference (2000-01-06)
  const knownNew = Date.UTC(2000, 0, 6, 18, 14)
  const synodic = 29.53058867
  const days = (date.getTime() - knownNew) / 86400000
  const phase = ((days % synodic) + synodic) % synodic
  const names = [
    { max: 1.84566, name: 'New Moon' },
    { max: 5.53699, name: 'Waxing Crescent' },
    { max: 9.22831, name: 'First Quarter' },
    { max: 12.91963, name: 'Waxing Gibbous' },
    { max: 16.61096, name: 'Full Moon' },
    { max: 20.30228, name: 'Waning Gibbous' },
    { max: 23.99361, name: 'Last Quarter' },
    { max: 27.68493, name: 'Waning Crescent' },
    { max: 29.53, name: 'New Moon' },
  ]
  const name = names.find((n) => phase <= n.max)?.name ?? 'New Moon'
  return { name, ageDays: Math.round(phase * 10) / 10, illumination: Math.round((1 - Math.cos((phase / synodic) * 2 * Math.PI)) * 50) }
}

export function birthdayInsight(isoDate: string) {
  const sign = sunSignFromDate(isoDate)
  const age = ageFromBirthDate(isoDate)
  const next = nextBirthday(isoDate)
  const path = lifePathNumber(isoDate)
  const moon = moonPhaseApprox()
  return {
    sunSign: sign,
    age,
    nextBirthday: next,
    lifePath: path,
    moonToday: moon,
    note: sign
      ? `Your sun in ${sign} frames a season of soft self-honesty. Life path ${path ?? '—'} asks for gentle consistency — not perfection.`
      : 'Add your birth date to unlock birthday and sign insights.',
    signs: SIGNS,
  }
}

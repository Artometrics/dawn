/** Reflective numerology. Plain arithmetic, shown. Not a science. */

export const MASTER_NUMBERS = [11, 22, 33] as const

export function digitSum(n: number): number {
  return String(Math.abs(Math.trunc(n)))
    .split('')
    .reduce((a, c) => a + Number(c), 0)
}

/** Add digits until one digit remains; 11, 22, 33 are kept when `keepMasters` is true. */
export function reduceNumber(n: number, keepMasters = true): number {
  let v = Math.abs(Math.trunc(n))
  while (v > 9) {
    if (keepMasters && (MASTER_NUMBERS as readonly number[]).includes(v)) return v
    v = digitSum(v)
  }
  return v
}

export interface DateParts {
  year: number
  month: number
  day: number
}

/** Strict YYYY-MM-DD parse; rejects impossible dates such as 2021-02-30. */
export function parseBirthDate(iso: string): DateParts | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim())
  if (!m) return null
  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  if (year < 1 || month < 1 || month > 12 || day < 1) return null
  const d = new Date(Date.UTC(year, month - 1, day))
  d.setUTCFullYear(year)
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null
  return { year, month, day }
}

export interface LifePathResult {
  number: number
  month: number
  day: number
  year: number
  sum: number
}

/** Reduce month, day and year separately (keeping masters), add, reduce again. */
export function lifePath(iso: string): LifePathResult | null {
  const p = parseBirthDate(iso)
  if (!p) return null
  const month = reduceNumber(p.month)
  const day = reduceNumber(p.day)
  const year = reduceNumber(p.year)
  const sum = month + day + year
  return { number: reduceNumber(sum), month, day, year, sum }
}

export function birthdayNumber(iso: string): number | null {
  const p = parseBirthDate(iso)
  return p ? reduceNumber(p.day) : null
}

/** Personal year: birth month + birth day + the given calendar year, reduced to 1-9. */
export function personalYear(iso: string, calendarYear: number): number | null {
  const p = parseBirthDate(iso)
  if (!p) return null
  return reduceNumber(reduceNumber(p.month, false) + reduceNumber(p.day, false) + reduceNumber(calendarYear, false), false)
}

const LETTER_VALUES: Record<string, number> = {}
;['AJS', 'BKT', 'CLU', 'DMV', 'ENW', 'FOX', 'GPY', 'HQZ', 'IR'].forEach((row, i) => {
  for (const ch of row) LETTER_VALUES[ch] = i + 1
})
const VOWELS = new Set(['A', 'E', 'I', 'O', 'U'])

/** Strip accents and keep A-Z only. */
export function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
}

export interface NameNumbers {
  expression: number
  soulUrge: number
  personality: number
}

/** Pythagorean letter values. Y counts as a consonant (MVP simplification). */
export function nameNumbers(name: string): NameNumbers | null {
  const letters = normalizeName(name)
  if (!letters) return null
  let all = 0
  let vowels = 0
  let consonants = 0
  for (const ch of letters) {
    const v = LETTER_VALUES[ch]
    all += v
    if (VOWELS.has(ch)) vowels += v
    else consonants += v
  }
  return {
    expression: reduceNumber(all),
    soulUrge: vowels ? reduceNumber(vowels) : 0,
    personality: consonants ? reduceNumber(consonants) : 0,
  }
}

export interface BirthCards {
  /** Major arcana number 0-21 */
  birth: number
  /** Major arcana number 0-9 */
  soul: number
}

/** Add every digit of the birth date, fold into 0-21 (22 becomes The Fool), then reduce once more for the soul card. */
export function birthCards(iso: string): BirthCards | null {
  const p = parseBirthDate(iso)
  if (!p) return null
  let s = digitSum(p.year) + digitSum(p.month) + digitSum(p.day)
  while (s > 22) s = digitSum(s)
  const birth = s === 22 ? 0 : s
  let soul = birth
  while (soul > 9) soul = digitSum(soul)
  return { birth, soul }
}

/** Life path number -> major arcana number. 11 Justice, 22 The Fool, 33 The Lovers (3+3 = 6). */
export function lifePathCardNumber(n: number): number {
  if (n === 22) return 0
  if (n === 33) return 6
  return n
}

export interface NumberMeaning {
  title: string
  summary: string
}

export const NUMBER_MEANINGS: Record<number, NumberMeaning> = {
  1: { title: 'The Starter', summary: 'You light the first match. Independence, nerve and a taste for doing things your own way. The growth edge is asking for help without feeling smaller.' },
  2: { title: 'The Listener', summary: 'You notice the quiet details and who is not speaking yet. Partnership, patience and diplomacy. The growth edge is saying what you want before you are asked.' },
  3: { title: 'The Maker', summary: 'You turn feelings into something you can show: a joke, a song, a scrapbook. Expression and play. The growth edge is finishing, not just sparkling.' },
  4: { title: 'The Builder', summary: 'You make things steady enough for other people to lean on. Craft, routine and loyalty. The growth edge is letting some plans stay loose.' },
  5: { title: 'The Wanderer', summary: 'You need fresh air, new roads and a good story. Change, curiosity and quick learning. The growth edge is staying put long enough for roots to take.' },
  6: { title: 'The Host', summary: 'You make a place feel like home. Care, beauty and responsibility. The growth edge is leaving a chair at the table for yourself.' },
  7: { title: 'The Seeker', summary: 'You want to know how the clock works and why it ticks. Study, solitude and inner questions. The growth edge is letting people in before the puzzle is solved.' },
  8: { title: 'The Steward', summary: 'You are drawn to making things work in the world: money, projects, influence. Ambition and follow-through. The growth edge is measuring a good life in more than output.' },
  9: { title: 'The Closer', summary: 'You see the whole arc and care how the story ends. Compassion, wisdom and generosity. The growth edge is letting endings be endings.' },
  11: { title: 'The Lantern', summary: 'A master number that tradition links with intuition and ideals: a sensitive antenna and a pull toward meaning. Reads as Justice here: fairness, honesty, weighing things. The growth edge is not absorbing every mood in the room.' },
  22: { title: 'The Architect', summary: 'A master number often tied to big, practical dreams, the kind that need teams and time. Paired here with The Fool: a leap with a blueprint. The growth edge is starting small enough to start.' },
  33: { title: 'The Tender Teacher', summary: 'The rarest master number, linked with devoted care and teaching by example. Paired here with The Lovers through 3+3 = 6. The growth edge is remembering that helping is not the same as fixing.' },
}

export const PERSONAL_YEAR_MEANINGS: Record<number, string> = {
  1: 'A seed year. Start the small thing you keep circling.',
  2: 'A patient year. Relationships and timing matter more than speed.',
  3: 'A bright year. Make, share and say yes to joy.',
  4: 'A foundation year. Tidy the structure, then build on it.',
  5: 'A loosening year. Expect change, travel and surprises.',
  6: 'A home year. Care for people, places and promises.',
  7: 'A study year. Rest, read and listen inward.',
  8: 'A harvest year. Work, money and results come into focus.',
  9: 'A closing year. Finish, forgive and clear space.',
}

export interface NumerologyProfile {
  lifePath: LifePathResult
  birthday: number
  personalYear: number
  cards: BirthCards
  names: NameNumbers | null
}

export function numerologyFor(name: string, iso: string, calendarYear = new Date().getFullYear()): NumerologyProfile | null {
  const lp = lifePath(iso)
  const cards = birthCards(iso)
  const bday = birthdayNumber(iso)
  const py = personalYear(iso, calendarYear)
  if (!lp || !cards || bday === null || py === null) return null
  return { lifePath: lp, birthday: bday, personalYear: py, cards, names: nameNumbers(name) }
}

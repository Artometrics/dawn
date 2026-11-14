import { parseBirthDate } from './numerology'

export interface Sign {
  id: string
  name: string
  glyph: string
  element: 'fire' | 'earth' | 'air' | 'water'
  /** Major arcana number commonly paired with the sign (our own table, labelled as ours in the UI). */
  cardNumber: number
  vibe: string
}

// U+FE0E asks for the text (not emoji) glyph.
const g = (c: string) => `${c}\uFE0E`

export const SIGNS: Sign[] = [
  { id: 'capricorn', name: 'Capricorn', glyph: g('♑'), element: 'earth', cardNumber: 15, vibe: 'patient climber with a dry sense of humor' },
  { id: 'aquarius', name: 'Aquarius', glyph: g('♒'), element: 'air', cardNumber: 17, vibe: 'friendly oddball who sees the future in small details' },
  { id: 'pisces', name: 'Pisces', glyph: g('♓'), element: 'water', cardNumber: 18, vibe: 'dreamer who feels the weather in a room' },
  { id: 'aries', name: 'Aries', glyph: g('♈'), element: 'fire', cardNumber: 4, vibe: 'first through the door, bold and direct' },
  { id: 'taurus', name: 'Taurus', glyph: g('♉'), element: 'earth', cardNumber: 5, vibe: 'comfort-loving and loyal, with excellent taste' },
  { id: 'gemini', name: 'Gemini', glyph: g('♊'), element: 'air', cardNumber: 6, vibe: 'quick, curious and always mid-conversation' },
  { id: 'cancer', name: 'Cancer', glyph: g('♋'), element: 'water', cardNumber: 7, vibe: 'tender protector with a hard shell and a soft middle' },
  { id: 'leo', name: 'Leo', glyph: g('♌'), element: 'fire', cardNumber: 8, vibe: 'warm, generous and gloriously dramatic' },
  { id: 'virgo', name: 'Virgo', glyph: g('♍'), element: 'earth', cardNumber: 9, vibe: 'careful observer who shows love through useful things' },
  { id: 'libra', name: 'Libra', glyph: g('♎'), element: 'air', cardNumber: 11, vibe: 'charming peacemaker who wants things fair and pretty' },
  { id: 'scorpio', name: 'Scorpio', glyph: g('♏'), element: 'water', cardNumber: 13, vibe: 'intense, loyal and unafraid of the deep end' },
  { id: 'sagittarius', name: 'Sagittarius', glyph: g('♐'), element: 'fire', cardNumber: 14, vibe: 'wide-roaming optimist chasing the next horizon' },
]

/** Tropical sun sign by calendar date (approximate cusps; birth time and year can shift them by a day). */
export function sunSign(iso: string): Sign | null {
  const p = parseBirthDate(iso)
  if (!p) return null
  const { month: m, day: d } = p
  const cusps: Array<[number, number, number]> = [
    // [month, first day of the sign, sign index in SIGNS]
    [1, 20, 1], [2, 19, 2], [3, 21, 3], [4, 20, 4], [5, 21, 5], [6, 21, 6],
    [7, 23, 7], [8, 23, 8], [9, 23, 9], [10, 23, 10], [11, 22, 11], [12, 22, 0],
  ]
  const [, firstDay, idx] = cusps[m - 1]
  if (d >= firstDay) return SIGNS[idx]
  return SIGNS[(idx + 11) % 12]
}

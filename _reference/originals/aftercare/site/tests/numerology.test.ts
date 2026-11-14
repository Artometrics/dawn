import { describe, expect, it } from 'vitest'
import { birthCards, birthdayNumber, lifePath, lifePathCardNumber, nameNumbers, normalizeName, numerologyFor, parseBirthDate, personalYear, reduceNumber } from '../src/lib/numerology'
import { sunSign } from '../src/lib/zodiac'

describe('reduceNumber', () => {
  it('reduces to a single digit', () => {
    expect(reduceNumber(29, false)).toBe(2)
    expect(reduceNumber(1990)).toBe(1)
    expect(reduceNumber(0)).toBe(0)
  })
  it('keeps master numbers unless told not to', () => {
    expect(reduceNumber(11)).toBe(11)
    expect(reduceNumber(29)).toBe(11)
    expect(reduceNumber(22)).toBe(22)
    expect(reduceNumber(33)).toBe(33)
    expect(reduceNumber(11, false)).toBe(2)
    expect(reduceNumber(38)).toBe(11)
  })
})

describe('parseBirthDate', () => {
  it('accepts real dates and rejects impossible ones', () => {
    expect(parseBirthDate('1992-03-14')).toEqual({ year: 1992, month: 3, day: 14 })
    expect(parseBirthDate('2024-02-29')).not.toBeNull()
    expect(parseBirthDate('2023-02-29')).toBeNull()
    expect(parseBirthDate('2021-02-30')).toBeNull()
    expect(parseBirthDate('1992-13-01')).toBeNull()
    expect(parseBirthDate('not a date')).toBeNull()
    expect(parseBirthDate('')).toBeNull()
  })
})

describe('lifePath', () => {
  it('matches the worked example in RESEARCH.md (1990-07-23 -> 4)', () => {
    const r = lifePath('1990-07-23')!
    expect(r).toMatchObject({ month: 7, day: 5, year: 1, sum: 13, number: 4 })
  })
  it('keeps master numbers (1992-03-14 -> 3 + 5 + 3 = 11)', () => {
    expect(lifePath('1992-03-14')!.number).toBe(11)
  })
  it('handles other cases', () => {
    expect(lifePath('2000-01-01')!.number).toBe(4) // 1 + 1 + 2
    expect(lifePath('1985-11-29')!.number).toBe(9) // 11 + 11 + 5 = 27 -> 9
    expect(lifePath('1999-12-31')!.number).toBe(8) // 3 + 4 + 1 (1999 -> 28 -> 10 -> 1; 12 -> 3; 31 -> 4)
  })
  it('returns null for bad input', () => {
    expect(lifePath('2023-02-30')).toBeNull()
  })
})

describe('other numbers', () => {
  it('birthday number reduces the day', () => {
    expect(birthdayNumber('1992-03-14')).toBe(5)
    expect(birthdayNumber('1992-03-29')).toBe(11)
    expect(birthdayNumber('1992-03-07')).toBe(7)
  })
  it('personal year reduces to 1-9', () => {
    expect(personalYear('1992-03-14', 2026)).toBe(9)
    expect(personalYear('1992-03-14', 2027)).toBe(1)
    for (let y = 2000; y < 2060; y++) {
      const v = personalYear('1988-11-02', y)!
      expect(v).toBeGreaterThanOrEqual(1)
      expect(v).toBeLessThanOrEqual(9)
    }
  })
  it('name numbers use the Pythagorean table', () => {
    expect(nameNumbers('Mara Ellison')).toEqual({ expression: 11, soulUrge: 22, personality: 7 })
    expect(normalizeName('Zoë O’Neil-Álvarez')).toBe('ZOEONEILALVAREZ')
    expect(nameNumbers('   ')).toBeNull()
    expect(nameNumbers('A')).toEqual({ expression: 1, soulUrge: 1, personality: 0 })
  })
})

describe('birth cards', () => {
  it('folds the digit sum into 0-21', () => {
    expect(birthCards('1992-03-14')).toEqual({ birth: 11, soul: 2 })
    expect(birthCards('1990-07-23')).toEqual({ birth: 4, soul: 4 })
  })
  it('always lands on a real major arcana', () => {
    for (let y = 1900; y <= 2030; y += 7) {
      for (let m = 1; m <= 12; m++) {
        const iso = `${y}-${String(m).padStart(2, '0')}-${String((m * 2) % 28 + 1).padStart(2, '0')}`
        const c = birthCards(iso)!
        expect(c.birth).toBeGreaterThanOrEqual(0)
        expect(c.birth).toBeLessThanOrEqual(21)
        expect(c.soul).toBeLessThanOrEqual(9)
      }
    }
  })
  it('maps life paths to major arcana numbers', () => {
    expect(lifePathCardNumber(7)).toBe(7)
    expect(lifePathCardNumber(11)).toBe(11)
    expect(lifePathCardNumber(22)).toBe(0)
    expect(lifePathCardNumber(33)).toBe(6)
  })
})

describe('numerologyFor + sunSign', () => {
  it('bundles everything for the sample profile', () => {
    const n = numerologyFor('Mara Ellison', '1992-03-14', 2026)!
    expect(n.lifePath.number).toBe(11)
    expect(n.birthday).toBe(5)
    expect(n.personalYear).toBe(9)
    expect(n.cards.birth).toBe(11)
    expect(n.names?.expression).toBe(11)
  })
  it('finds the sun sign around the cusps', () => {
    expect(sunSign('1992-03-14')!.name).toBe('Pisces')
    expect(sunSign('1992-03-21')!.name).toBe('Aries')
    expect(sunSign('1992-03-20')!.name).toBe('Pisces')
    expect(sunSign('1992-12-22')!.name).toBe('Capricorn')
    expect(sunSign('1992-12-21')!.name).toBe('Sagittarius')
    expect(sunSign('1992-01-01')!.name).toBe('Capricorn')
    expect(sunSign('1992-01-20')!.name).toBe('Aquarius')
    expect(sunSign('2023-02-30')).toBeNull()
  })
})

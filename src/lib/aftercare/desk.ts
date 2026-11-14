import { drawSpread, SPREADS } from './spreads';
import type { DrawnCard, Reading, SpreadId } from './types';
import { lifePath, numerologyFor, type NumerologyProfile } from './numerology';
import { sunSign } from './zodiac';
import { mulberry32 } from './shuffle';

export type Mood = 'steady' | 'bright' | 'heavy' | 'restless';
export const MOODS: Mood[] = ['steady', 'bright', 'heavy', 'restless'];

export type JournalNote = { id: string; mood: Mood; text: string; at: number };

export type AftercareData = {
  name: string;
  birthDate: string;
  readings: Reading[];
  notes: JournalNote[];
};

export const EMPTY_AFTERCARE: AftercareData = { name: '', birthDate: '', readings: [], notes: [] };

const CAP = { readings: 40, notes: 200, text: 2000, name: 80 };

export function parseAftercare(raw: unknown): AftercareData {
  if (!raw || typeof raw !== 'object') return EMPTY_AFTERCARE;
  const row = raw as Partial<AftercareData>;
  const readings: Reading[] = [];
  if (Array.isArray(row.readings)) {
    for (const item of row.readings) {
      const reading = parseReading(item);
      if (reading) readings.push(reading);
      if (readings.length >= CAP.readings) break;
    }
  }
  const notes: JournalNote[] = [];
  if (Array.isArray(row.notes)) {
    for (const item of row.notes) {
      const note = parseNote(item);
      if (note) notes.push(note);
      if (notes.length >= CAP.notes) break;
    }
  }
  return {
    name: typeof row.name === 'string' ? row.name.slice(0, CAP.name) : '',
    birthDate: typeof row.birthDate === 'string' && lifePath(row.birthDate) ? row.birthDate : '',
    readings,
    notes,
  };
}

function parseReading(raw: unknown): Reading | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Partial<Reading>;
  if (row.spreadId !== 'one' && row.spreadId !== 'three' && row.spreadId !== 'celtic') return null;
  if (!Array.isArray(row.cards) || typeof row.id !== 'string' || typeof row.createdAt !== 'string') return null;
  const expected = SPREADS[row.spreadId].positions.length;
  if (row.cards.length !== expected) return null;
  const cards: DrawnCard[] = [];
  for (const card of row.cards) {
    if (!card || typeof card !== 'object') return null;
    const drawn = card as DrawnCard;
    if (typeof drawn.cardId !== 'string' || typeof drawn.positionId !== 'string' || typeof drawn.reversed !== 'boolean') return null;
    cards.push({ positionId: drawn.positionId, cardId: drawn.cardId, reversed: drawn.reversed });
  }
  return {
    id: row.id.slice(0, 40),
    spreadId: row.spreadId,
    question: typeof row.question === 'string' ? row.question.slice(0, 240) : undefined,
    createdAt: row.createdAt,
    cards,
  };
}

function parseNote(raw: unknown): JournalNote | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Partial<JournalNote>;
  if (typeof row.id !== 'string' || typeof row.text !== 'string' || typeof row.at !== 'number') return null;
  if (!MOODS.includes(row.mood as Mood)) return null;
  const text = row.text.trim().slice(0, CAP.text);
  if (!text) return null;
  return { id: row.id.slice(0, 40), mood: row.mood as Mood, text, at: row.at };
}

export function dealReading(data: AftercareData, spreadId: SpreadId, question: string, now: number, seed = now): { ok: true; data: AftercareData; reading: Reading } | { ok: false; error: string; data: AftercareData } {
  if (data.readings.length >= CAP.readings) return { ok: false, error: 'The reading list is full.', data };
  const cards = drawSpread(spreadId, mulberry32(seed >>> 0));
  const reading: Reading = {
    id: `r-${now.toString(36)}`,
    spreadId,
    question: question.trim().slice(0, 240) || undefined,
    createdAt: new Date(now).toISOString(),
    cards,
  };
  return { ok: true, data: { ...data, readings: [reading, ...data.readings] }, reading };
}

export function addNote(data: AftercareData, mood: Mood, text: string, now: number): { ok: true; data: AftercareData } | { ok: false; error: string; data: AftercareData } {
  const clean = text.trim().slice(0, CAP.text);
  if (!clean) return { ok: false, error: 'Write a line first.', data };
  if (data.notes.length >= CAP.notes) return { ok: false, error: 'The journal is full.', data };
  const note: JournalNote = { id: `n-${now.toString(36)}`, mood, text: clean, at: now };
  return { ok: true, data: { ...data, notes: [note, ...data.notes] } };
}

export function numbersFor(name: string, birthDate: string, year = new Date().getFullYear()): (NumerologyProfile & { sign: string }) | null {
  const profile = numerologyFor(name, birthDate, year);
  const sign = sunSign(birthDate);
  if (!profile || !sign) return null;
  return { ...profile, sign: sign.name };
}

import { drawSpread, SPREADS } from './spreads';
import type { DrawnCard, Favorite, FavoriteKind, Place, Profile, Reading, SpreadId, Visibility } from './types';
import { lifePath, numerologyFor, parseBirthDate, type NumerologyProfile } from './numerology';
import { sunSign } from './zodiac';
import { mulberry32 } from './shuffle';
import { THEMES } from './themes';
import { newReading } from './reading';

export type Mood = 'steady' | 'bright' | 'heavy' | 'restless';
export const MOODS: Mood[] = ['steady', 'bright', 'heavy', 'restless'];

export type JournalNote = { id: string; mood: Mood; title?: string; text: string; at: number; editedAt?: number };

export const DEFAULT_VISIBILITY: Visibility = { birth: false, numbers: true, map: true, favorites: false, connections: true };

export type AftercareData = {
  name: string;
  birthDate: string;
  birthTime: string;
  birthPlace?: Place;
  favorites: Favorite[];
  visibility: Visibility;
  readings: Reading[];
  notes: JournalNote[];
};

export const EMPTY_AFTERCARE: AftercareData = {
  name: '',
  birthDate: '',
  birthTime: '',
  favorites: [],
  visibility: { ...DEFAULT_VISIBILITY },
  readings: [],
  notes: [],
};

const CAP = { readings: 80, notes: 200, favorites: 40, text: 2000, name: 80, title: 80 };

export function parseAftercare(raw: unknown): AftercareData {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_AFTERCARE, visibility: { ...DEFAULT_VISIBILITY }, favorites: [] };
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
  const favorites: Favorite[] = [];
  if (Array.isArray(row.favorites)) {
    for (const item of row.favorites) {
      const favorite = parseFavorite(item);
      if (favorite) favorites.push(favorite);
      if (favorites.length >= CAP.favorites) break;
    }
  }
  const birthTime = typeof row.birthTime === 'string' && /^\d{2}:\d{2}$/.test(row.birthTime) ? row.birthTime : '';
  return {
    name: typeof row.name === 'string' ? row.name.slice(0, CAP.name) : '',
    birthDate: typeof row.birthDate === 'string' && lifePath(row.birthDate) ? row.birthDate : '',
    birthTime,
    birthPlace: parsePlace(row.birthPlace),
    favorites,
    visibility: parseVisibility(row.visibility),
    readings,
    notes,
  };
}

function parsePlace(raw: unknown): Place | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const row = raw as Partial<Place>;
  if (typeof row.label !== 'string' || typeof row.lat !== 'number' || typeof row.lng !== 'number') return undefined;
  if (!Number.isFinite(row.lat) || !Number.isFinite(row.lng) || Math.abs(row.lat) > 90 || Math.abs(row.lng) > 180) return undefined;
  const label = row.label.trim().slice(0, 120);
  if (!label) return undefined;
  return { label, lat: row.lat, lng: row.lng };
}

function parseFavorite(raw: unknown): Favorite | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Partial<Favorite>;
  const kind: FavoriteKind | null = row.kind === 'movie' || row.kind === 'book' || row.kind === 'thing' ? row.kind : null;
  if (!kind || typeof row.title !== 'string' || typeof row.id !== 'string') return null;
  const title = row.title.trim().slice(0, 100);
  if (!title) return null;
  const themeId = typeof row.themeId === 'string' && THEMES.some((theme) => theme.id === row.themeId) ? row.themeId : undefined;
  return { id: row.id.slice(0, 40), kind, title, themeId, place: parsePlace(row.place) };
}

function parseVisibility(raw: unknown): Visibility {
  const row = raw && typeof raw === 'object' ? raw as Partial<Visibility> : {};
  return {
    birth: typeof row.birth === 'boolean' ? row.birth : DEFAULT_VISIBILITY.birth,
    numbers: typeof row.numbers === 'boolean' ? row.numbers : DEFAULT_VISIBILITY.numbers,
    map: typeof row.map === 'boolean' ? row.map : DEFAULT_VISIBILITY.map,
    favorites: typeof row.favorites === 'boolean' ? row.favorites : DEFAULT_VISIBILITY.favorites,
    connections: typeof row.connections === 'boolean' ? row.connections : DEFAULT_VISIBILITY.connections,
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
  const note = typeof row.note === 'string' ? row.note.trim().slice(0, CAP.text) : '';
  return {
    id: row.id.slice(0, 40),
    spreadId: row.spreadId,
    question: typeof row.question === 'string' ? row.question.slice(0, 240) : undefined,
    createdAt: row.createdAt,
    cards,
    note: note || undefined,
  };
}

function parseNote(raw: unknown): JournalNote | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Partial<JournalNote>;
  if (typeof row.id !== 'string' || typeof row.text !== 'string' || typeof row.at !== 'number') return null;
  if (!MOODS.includes(row.mood as Mood)) return null;
  const text = row.text.trim().slice(0, CAP.text);
  if (!text) return null;
  const title = typeof row.title === 'string' ? row.title.trim().slice(0, CAP.title) : '';
  return {
    id: row.id.slice(0, 40),
    mood: row.mood as Mood,
    title: title || undefined,
    text,
    at: row.at,
    editedAt: typeof row.editedAt === 'number' ? row.editedAt : undefined,
  };
}

export function dealReading(data: AftercareData, spreadId: SpreadId, question: string, now: number, seed = now): { ok: true; data: AftercareData; reading: Reading } | { ok: false; error: string; data: AftercareData } {
  if (data.readings.length >= CAP.readings) return { ok: false, error: 'The reading list is full.', data };
  const cards = drawSpread(spreadId, mulberry32(seed >>> 0));
  const reading = newReading(spreadId, cards, question.trim().slice(0, 240), new Date(now), `r-${now.toString(36)}`);
  return { ok: true, data: { ...data, readings: [reading, ...data.readings] }, reading };
}

/** Keeps a reading that was already dealt on the table, including its note. */
export function storeReading(data: AftercareData, reading: Reading): { ok: true; data: AftercareData } | { ok: false; error: string; data: AftercareData } {
  const clean = parseReading(reading);
  if (!clean) return { ok: false, error: 'That reading could not be kept.', data };
  if (data.readings.length >= CAP.readings) return { ok: false, error: 'The reading list is full.', data };
  return { ok: true, data: { ...data, readings: [clean, ...data.readings.filter((item) => item.id !== clean.id)] } };
}

export function setReadingNote(data: AftercareData, id: string, note: string): AftercareData {
  const clean = note.trim().slice(0, CAP.text);
  return {
    ...data,
    readings: data.readings.map((reading) => (reading.id === id ? { ...reading, note: clean || undefined } : reading)),
  };
}

export function removeReading(data: AftercareData, id: string): AftercareData {
  return { ...data, readings: data.readings.filter((reading) => reading.id !== id) };
}

export function addNote(data: AftercareData, mood: Mood, text: string, now: number, title = ''): { ok: true; data: AftercareData } | { ok: false; error: string; data: AftercareData } {
  const clean = text.trim().slice(0, CAP.text);
  if (!clean) return { ok: false, error: 'Write a line first.', data };
  if (data.notes.length >= CAP.notes) return { ok: false, error: 'The journal is full.', data };
  const heading = title.trim().slice(0, CAP.title);
  const note: JournalNote = { id: `n-${now.toString(36)}`, mood, title: heading || undefined, text: clean, at: now };
  return { ok: true, data: { ...data, notes: [note, ...data.notes] } };
}

export function editNote(data: AftercareData, id: string, mood: Mood, text: string, now: number, title = ''): { ok: true; data: AftercareData } | { ok: false; error: string; data: AftercareData } {
  const clean = text.trim().slice(0, CAP.text);
  if (!clean) return { ok: false, error: 'Write a line first.', data };
  if (!data.notes.some((note) => note.id === id)) return { ok: false, error: 'That entry is gone.', data };
  const heading = title.trim().slice(0, CAP.title);
  return {
    ok: true,
    data: {
      ...data,
      notes: data.notes.map((note) => (note.id === id ? { ...note, mood, title: heading || undefined, text: clean, editedAt: now } : note)),
    },
  };
}

export function removeNote(data: AftercareData, id: string): AftercareData {
  return { ...data, notes: data.notes.filter((note) => note.id !== id) };
}

export function numbersFor(name: string, birthDate: string, year = new Date().getFullYear()): (NumerologyProfile & { sign: string }) | null {
  const profile = numerologyFor(name, birthDate, year);
  const sign = sunSign(birthDate);
  if (!profile || !sign) return null;
  return { ...profile, sign: sign.name };
}

export function asProfile(data: AftercareData, now = Date.now()): Profile | null {
  if (!data.name.trim() || !parseBirthDate(data.birthDate)) return null;
  return {
    id: 'me',
    displayName: data.name.trim(),
    birthDate: data.birthDate,
    birthTime: data.birthTime || undefined,
    birthPlace: data.birthPlace,
    favorites: data.favorites,
    visibility: data.visibility,
    updatedAt: new Date(now).toISOString(),
  };
}

export interface AftercareBackup {
  app: 'dawn-aftercare';
  version: 1;
  exportedAt: string;
  desk: AftercareData;
}

export function exportBackup(data: AftercareData, now = Date.now()): AftercareBackup {
  return { app: 'dawn-aftercare', version: 1, exportedAt: new Date(now).toISOString(), desk: data };
}

/** Restores a Dawn backup, or an original Almanac backup (`app: "aftercare"`). */
export function importBackup(raw: unknown): AftercareData | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  if (row.app === 'dawn-aftercare' && row.version === 1) return parseAftercare(row.desk);
  if (row.app === 'aftercare' && row.version === 1) {
    const profile = row.profile && typeof row.profile === 'object' ? row.profile as Record<string, unknown> : {};
    return parseAftercare({
      name: profile.displayName,
      birthDate: profile.birthDate,
      birthTime: profile.birthTime,
      birthPlace: profile.birthPlace,
      favorites: profile.favorites,
      visibility: profile.visibility,
      readings: row.readings,
      notes: [],
    });
  }
  return null;
}

import {
  BUILD_RANGE,
  CLIPS,
  COLOR_SLOTS,
  FORGE_SCHEMA,
  HEIGHT_RANGE,
  NAME_MAX,
  PARTS,
  PART_SLOTS,
  type ClipId,
  type ColorSlot,
  type PartSlot,
} from './catalog';

export type ForgeCharacter = {
  schema: typeof FORGE_SCHEMA;
  name: string;
  title: string;
  head: string;
  face: string;
  hair: string;
  outfit: string;
  accessory: string;
  height: number;
  build: number;
  clip: ClipId;
  colors: Record<ColorSlot, string>;
};

export type ParseResult =
  | { ok: true; value: ForgeCharacter }
  | { ok: false; error: string };

const HEX = /^#[0-9a-fA-F]{6}$/;

export const DEFAULT_COLORS: Record<ColorSlot, string> = {
  skin: '#e0b48f',
  hair: '#3b2a20',
  primary: '#4a6fa5',
  secondary: '#d9b86a',
  accent: '#d97746',
};

export function blankCharacter(): ForgeCharacter {
  return {
    schema: FORGE_SCHEMA,
    name: 'New character',
    title: '',
    head: 'round',
    face: 'calm',
    hair: 'crop',
    outfit: 'tunic',
    accessory: 'none',
    height: 1,
    build: 0.5,
    clip: 'idle',
    colors: { ...DEFAULT_COLORS },
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function cleanText(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Accepts untrusted JSON (a pasted file, a Firestore document, localStorage) and
 * returns a character that the renderer can always build. Unknown part ids and
 * bad colors are refused, not silently replaced, so an import cannot smuggle
 * a half-valid character into the roster. Numbers are clamped.
 */
export function parseCharacter(input: unknown): ParseResult {
  if (!isRecord(input)) return { ok: false, error: 'That is not a character.' };
  if (input.schema !== FORGE_SCHEMA) return { ok: false, error: 'This is not a Dawn Forge character.' };

  const name = cleanText(input.name, NAME_MAX);
  if (!name) return { ok: false, error: 'The character needs a name.' };

  const base = blankCharacter();
  const out: ForgeCharacter = { ...base, name, title: cleanText(input.title, 60), colors: { ...base.colors } };

  for (const slot of PART_SLOTS) {
    const id = input[slot];
    if (typeof id !== 'string' || !PARTS[slot].some((option) => option.id === id)) {
      return { ok: false, error: `Unknown ${slot}.` };
    }
    (out as Record<PartSlot, string> & ForgeCharacter)[slot] = id;
  }

  if (typeof input.clip !== 'string' || !CLIPS.some((clip) => clip.id === input.clip)) {
    return { ok: false, error: 'Unknown pose.' };
  }
  out.clip = input.clip as ClipId;

  if (typeof input.height !== 'number' || !Number.isFinite(input.height)) return { ok: false, error: 'Height must be a number.' };
  if (typeof input.build !== 'number' || !Number.isFinite(input.build)) return { ok: false, error: 'Build must be a number.' };
  out.height = round2(clamp(input.height, HEIGHT_RANGE.min, HEIGHT_RANGE.max));
  out.build = round2(clamp(input.build, BUILD_RANGE.min, BUILD_RANGE.max));

  if (!isRecord(input.colors)) return { ok: false, error: 'Colors are missing.' };
  for (const slot of COLOR_SLOTS) {
    const color = input.colors[slot.id];
    if (typeof color !== 'string' || !HEX.test(color)) return { ok: false, error: `${slot.label} color must look like #aabbcc.` };
    out.colors[slot.id] = color.toLowerCase();
  }

  return { ok: true, value: out };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function characterEquals(a: ForgeCharacter, b: ForgeCharacter): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// Character JSON. Pure data: no Three.js, so node:test can import it.
// Ported from Pantheon Forge (tools/forge/src/schema.js, Pantheon PR #15) with TypeScript types added.
// The checks and the file format are unchanged, so Pantheon's own JSON files import and export as-is.

export const SCHEMA_VERSION = 1;

export type PartGroup = 'head' | 'face' | 'hair' | 'outfit' | 'accessory';
export type ColorKey = 'skin' | 'hair' | 'cloth' | 'trim';

export type CatalogEntry = { id: string; label: string };

const entry = (id: string, label: string): CatalogEntry => ({ id, label });

export const CATALOG: Record<PartGroup, CatalogEntry[]> = {
  head: [entry('oval', 'Oval'), entry('round', 'Round'), entry('square', 'Square'), entry('long', 'Long')],
  face: [entry('determined', 'Determined'), entry('stern', 'Stern'), entry('calm', 'Calm'), entry('youthful', 'Youthful')],
  hair: [entry('cropped', 'Cropped'), entry('bob', 'Bob'), entry('queue', 'Queue'), entry('long', 'Long'), entry('topknot', 'Topknot'), entry('none', 'None')],
  outfit: [entry('tunic', 'Tunic'), entry('plate', 'Plate'), entry('greatcoat', 'Greatcoat'), entry('robe', 'Robe')],
  accessory: [entry('none', 'None'), entry('banner', 'Banner'), entry('bicorne', 'Bicorne'), entry('saber', 'Saber'), entry('sword', 'Sword'), entry('laurel', 'Laurel')],
};

export type ForgeCharacter = {
  version: typeof SCHEMA_VERSION;
  id: string;
  name: string;
  epithet: string;
  body: { height: number; build: number };
  colors: Record<ColorKey, string>;
  parts: Record<PartGroup, string>;
  paintOverlay: boolean;
};

export type CharacterResult =
  | { ok: true; errors: never[]; character: ForgeCharacter }
  | { ok: false; errors: string[]; character?: undefined };

const TOP_KEYS = ['version', 'id', 'name', 'epithet', 'body', 'colors', 'parts', 'paintOverlay'];
const BODY_KEYS = ['height', 'build'];
const COLOR_KEYS: ColorKey[] = ['skin', 'hair', 'cloth', 'trim'];
const PART_KEYS: PartGroup[] = ['head', 'face', 'hair', 'outfit', 'accessory'];

const HEX = /^#[0-9a-f]{6}$/i;
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type Plain = Record<string, unknown>;

function isPlain(v: unknown): v is Plain {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function unknownKeys(obj: Plain, allowed: string[]): string[] {
  return Object.keys(obj).filter((k) => !allowed.includes(k));
}

function num(value: unknown, label: string, errors: string[]): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    errors.push(`${label} must be a number from 0 to 1.`);
    return null;
  }
  if (value < 0 || value > 1) {
    errors.push(`${label} must be from 0 to 1.`);
    return null;
  }
  return Math.round(value * 1000) / 1000;
}

function partId(group: PartGroup, value: unknown, errors: string[]): string | null {
  const ids = CATALOG[group].map((p) => p.id);
  if (typeof value !== 'string' || !ids.includes(value)) {
    errors.push(`Unknown ${group} "${value}". Expected ${ids.join(', ')}.`);
    return null;
  }
  return value;
}

export function validateCharacter(data: unknown): CharacterResult {
  const errors: string[] = [];
  if (!isPlain(data)) return { ok: false, errors: ['Character must be a JSON object.'] };

  for (const k of unknownKeys(data, TOP_KEYS)) errors.push(`Unknown field "${k}".`);

  if (data.version !== SCHEMA_VERSION) {
    errors.push(`version must be ${SCHEMA_VERSION}.`);
  }
  if (typeof data.id !== 'string' || !ID.test(data.id) || data.id.length > 32) {
    errors.push('id must be 1–32 characters: lowercase letters, digits, and hyphens.');
  }
  if (typeof data.name !== 'string' || data.name.trim().length === 0 || data.name.trim().length > 48) {
    errors.push('name must be 1–48 characters.');
  } else if (/[\u0000-\u001F]/.test(data.name)) {
    errors.push('name cannot contain line breaks.');
  }
  if (typeof data.epithet !== 'string' || data.epithet.trim().length > 64) {
    errors.push('epithet must be a string of at most 64 characters.');
  } else if (typeof data.epithet === 'string' && /[\u0000-\u001F]/.test(data.epithet)) {
    errors.push('epithet cannot contain line breaks.');
  }

  if (!isPlain(data.body)) errors.push('body must be an object with height and build.');
  if (!isPlain(data.colors)) errors.push('colors must be an object of hex strings.');
  if (!isPlain(data.parts)) errors.push('parts must be an object of part ids.');

  const height = isPlain(data.body) ? num(data.body.height, 'body.height', errors) : null;
  const build = isPlain(data.body) ? num(data.body.build, 'body.build', errors) : null;
  if (isPlain(data.body)) {
    for (const k of unknownKeys(data.body, BODY_KEYS)) errors.push(`Unknown body field "${k}".`);
  }

  const colors: Partial<Record<ColorKey, string>> = {};
  if (isPlain(data.colors)) {
    for (const k of unknownKeys(data.colors, COLOR_KEYS)) errors.push(`Unknown color "${k}".`);
    for (const k of COLOR_KEYS) {
      const v = data.colors[k];
      if (typeof v !== 'string' || !HEX.test(v)) errors.push(`colors.${k} must be a #rrggbb hex color.`);
      else colors[k] = v.toLowerCase();
    }
  }

  const parts: Partial<Record<PartGroup, string | null>> = {};
  if (isPlain(data.parts)) {
    for (const k of unknownKeys(data.parts, PART_KEYS)) errors.push(`Unknown part slot "${k}".`);
    for (const k of PART_KEYS) parts[k] = partId(k, data.parts[k], errors);
  }

  if (typeof data.paintOverlay !== 'boolean') errors.push('paintOverlay must be true or false.');

  if (errors.length) return { ok: false, errors };

  const character = {
    version: SCHEMA_VERSION,
    id: data.id as string,
    name: (data.name as string).trim(),
    epithet: (data.epithet as string).trim(),
    body: { height: height as number, build: build as number },
    colors: colors as Record<ColorKey, string>,
    parts: parts as Record<PartGroup, string>,
    paintOverlay: data.paintOverlay as boolean,
  } satisfies ForgeCharacter;
  return { ok: true, errors: [], character };
}

export function parseCharacter(text: unknown): CharacterResult {
  if (typeof text !== 'string') return { ok: false, errors: ['Character file is not valid JSON.'] };
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, errors: ['Character file is not valid JSON.'] };
  }
  return validateCharacter(data);
}

export class CharacterError extends Error {
  errors: string[];
  constructor(errors: string[]) {
    super(errors.join(' '));
    this.errors = errors;
  }
}

export function serializeCharacter(data: unknown): string {
  const result = validateCharacter(data);
  if (!result.ok) throw new CharacterError(result.errors);
  return JSON.stringify(result.character, null, 2);
}

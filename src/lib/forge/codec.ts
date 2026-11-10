import { FILE_MAX_BYTES } from './catalog';
import { parseCharacter, serializeCharacter, type ForgeCharacter } from './schema';

export type ImportResult = { ok: true; character: ForgeCharacter } | { ok: false; error: string };

/** Pantheon's own file format: the character object, two-space JSON. Nothing is added or renamed. */
export function exportCharacterJson(character: ForgeCharacter): string {
  return serializeCharacter(character);
}

export function importCharacterJson(text: string): ImportResult {
  if (typeof text !== 'string' || text.length === 0) return { ok: false, error: 'The file is empty.' };
  if (text.length > FILE_MAX_BYTES) return { ok: false, error: 'That file is too large for a character.' };
  const result = parseCharacter(text);
  if (!result.ok) return { ok: false, error: result.errors[0] ?? 'That is not a Forge character file.' };
  return { ok: true, character: result.character };
}

export function fileSafeName(character: Pick<ForgeCharacter, 'id'>): string {
  return character.id || 'character';
}

/** A slug id for a name, within the schema's 32-character limit. */
export function slugFromName(name: string): string {
  const slug = name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32).replace(/-+$/g, '');
  return slug || 'character';
}

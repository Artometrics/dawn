import { FILE_MAX_BYTES, FORGE_FILE_FORMAT } from './catalog';
import { parseCharacter, type ForgeCharacter, type ParseResult } from './schema';

export function exportCharacterJson(character: ForgeCharacter): string {
  return JSON.stringify({ format: FORGE_FILE_FORMAT, character }, null, 2);
}

/**
 * Accepts either a Dawn file ({ format, character }) or a bare character object,
 * so a hand-written JSON definition imports the same way an exported one does.
 */
export function importCharacterJson(text: string): ParseResult {
  if (typeof text !== 'string' || text.length === 0) return { ok: false, error: 'The file is empty.' };
  if (text.length > FILE_MAX_BYTES) return { ok: false, error: 'That file is too large for a character.' };
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'That file is not valid JSON.' };
  }
  if (data && typeof data === 'object' && 'format' in data && 'character' in data) {
    if ((data as { format: unknown }).format !== FORGE_FILE_FORMAT) return { ok: false, error: 'This file format is not supported.' };
    return parseCharacter((data as { character: unknown }).character);
  }
  return parseCharacter(data);
}

export function fileSafeName(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  return slug || 'character';
}

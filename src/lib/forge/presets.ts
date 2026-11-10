import joan from './presets/joan.json' with { type: 'json' };
import napoleon from './presets/napoleon.json' with { type: 'json' };
import sunTzu from './presets/sun-tzu.json' with { type: 'json' };
import { validateCharacter, type ForgeCharacter } from './schema';

// Pantheon's own character files, copied byte for byte from tools/forge/presets/.
// They go through the same validator as an imported file, so a bad edit fails here.

function load(data: unknown): ForgeCharacter {
  const result = validateCharacter(data);
  if (!result.ok) throw new Error(`Bad preset: ${result.errors.join(' ')}`);
  return result.character;
}

export const PRESETS: readonly ForgeCharacter[] = [load(joan), load(napoleon), load(sunTzu)];

export function presetById(id: string): ForgeCharacter | undefined {
  return PRESETS.find((preset) => preset.id === id);
}

/** A neutral starting point. The maker derives the id from the name as it is typed. */
export function blankCharacter(): ForgeCharacter {
  return {
    version: 1,
    id: 'new-character',
    name: 'New character',
    epithet: '',
    body: { height: 0.5, build: 0.5 },
    colors: { skin: '#d7a37a', hair: '#2a1a12', cloth: '#7a8a9e', trim: '#c6a24a' },
    parts: { head: 'oval', face: 'calm', hair: 'cropped', outfit: 'tunic', accessory: 'none' },
    paintOverlay: true,
  };
}

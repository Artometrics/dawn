import { FORGE_SCHEMA } from './catalog';
import type { ForgeCharacter } from './schema';

export type ForgePreset = { id: string; character: ForgeCharacter };

export const PRESETS: readonly ForgePreset[] = [
  {
    id: 'joan-of-arc',
    character: {
      schema: FORGE_SCHEMA,
      name: 'Joan of Arc',
      title: 'The Maid of Orleans',
      head: 'round',
      face: 'calm',
      hair: 'bob',
      outfit: 'armor',
      accessory: 'sword',
      height: 0.95,
      build: 0.4,
      clip: 'guard',
      colors: { skin: '#e8c3a0', hair: '#4a3022', primary: '#a9b4c2', secondary: '#2f4c8a', accent: '#d9b86a' },
    },
  },
  {
    id: 'napoleon',
    character: {
      schema: FORGE_SCHEMA,
      name: 'Napoleon',
      title: 'Emperor of the French',
      head: 'round',
      face: 'stern',
      hair: 'crop',
      outfit: 'coat',
      accessory: 'bicorne',
      height: 0.85,
      build: 0.62,
      clip: 'idle',
      colors: { skin: '#e0b48f', hair: '#3a2a20', primary: '#1f3a6e', secondary: '#e8e2d0', accent: '#c9a24a' },
    },
  },
  {
    id: 'sun-tzu',
    character: {
      schema: FORGE_SCHEMA,
      name: 'Sun Tzu',
      title: 'The Art of War',
      head: 'long',
      face: 'sly',
      hair: 'topknot',
      outfit: 'robe',
      accessory: 'scroll',
      height: 1.05,
      build: 0.3,
      clip: 'idle',
      colors: { skin: '#d9ab82', hair: '#1d1a18', primary: '#6b3b2a', secondary: '#c8a24b', accent: '#2d5e55' },
    },
  },
];

export function presetById(id: string): ForgePreset | undefined {
  return PRESETS.find((preset) => preset.id === id);
}

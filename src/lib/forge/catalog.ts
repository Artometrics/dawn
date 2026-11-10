export const FORGE_SCHEMA = 'dawn.forge.character/1';
export const FORGE_FILE_FORMAT = 'dawn.forge.file/1';

export type PartSlot = 'head' | 'face' | 'hair' | 'outfit' | 'accessory';

export type PartOption = { id: string; label: string };

export const PARTS: Record<PartSlot, readonly PartOption[]> = {
  head: [
    { id: 'round', label: 'Round' },
    { id: 'square', label: 'Square' },
    { id: 'long', label: 'Long' },
    { id: 'narrow', label: 'Narrow' },
  ],
  face: [
    { id: 'calm', label: 'Calm' },
    { id: 'stern', label: 'Stern' },
    { id: 'smile', label: 'Smile' },
    { id: 'sly', label: 'Sly' },
  ],
  hair: [
    { id: 'none', label: 'Bald' },
    { id: 'crop', label: 'Crop' },
    { id: 'bob', label: 'Bob' },
    { id: 'long', label: 'Long' },
    { id: 'topknot', label: 'Topknot' },
  ],
  outfit: [
    { id: 'tunic', label: 'Tunic' },
    { id: 'armor', label: 'Armor' },
    { id: 'coat', label: 'Coat' },
    { id: 'robe', label: 'Robe' },
  ],
  accessory: [
    { id: 'none', label: 'None' },
    { id: 'sword', label: 'Sword' },
    { id: 'bicorne', label: 'Bicorne hat' },
    { id: 'scroll', label: 'Scroll' },
    { id: 'crown', label: 'Crown' },
    { id: 'banner', label: 'Banner' },
  ],
};

export const PART_SLOTS = Object.keys(PARTS) as PartSlot[];

export const CLIPS = [
  { id: 'idle', label: 'Idle' },
  { id: 'guard', label: 'Guard' },
] as const;

export type ClipId = (typeof CLIPS)[number]['id'];

export const COLOR_SLOTS = [
  { id: 'skin', label: 'Skin' },
  { id: 'hair', label: 'Hair' },
  { id: 'primary', label: 'Outfit' },
  { id: 'secondary', label: 'Trim' },
  { id: 'accent', label: 'Accent' },
] as const;

export type ColorSlot = (typeof COLOR_SLOTS)[number]['id'];

export const HEIGHT_RANGE = { min: 0.8, max: 1.2 } as const;
export const BUILD_RANGE = { min: 0, max: 1 } as const;
export const NAME_MAX = 40;
export const ROSTER_MAX = 12;
export const FILE_MAX_BYTES = 64 * 1024;

export const AGENT_SLOTS = ['trinity', 'kali', 'nimbus'] as const;
export type AgentSlot = (typeof AGENT_SLOTS)[number];

/** Item id → name, rarity 0–3, kind, value. Kind: heal | xp | chest | atk | def | sell. */
export type ItemKind = 'heal' | 'xp' | 'chest' | 'atk' | 'def' | 'sell';

export type ItemDef = {
  name: string;
  rarity: 0 | 1 | 2 | 3;
  kind: ItemKind;
  value: number;
};

export const ITEMS: Record<string, ItemDef> = {
  loot_potion: { name: 'Potion', rarity: 0, kind: 'heal', value: 20 },
  loot_bread: { name: 'Sourdough', rarity: 0, kind: 'heal', value: 8 },
  loot_scroll: { name: 'Scroll of Lore', rarity: 1, kind: 'xp', value: 40 },
  loot_key: { name: 'Old Key', rarity: 1, kind: 'chest', value: 0 },
  loot_shield: { name: 'Shield', rarity: 2, kind: 'def', value: 2 },
  loot_gem: { name: 'Gem', rarity: 2, kind: 'sell', value: 25 },
  item_sword: { name: 'Warden Sword', rarity: 3, kind: 'atk', value: 4 },
};

export const RARITY = ['Common', 'Uncommon', 'Rare', 'Legendary'] as const;

export const HEROES = [
  'hero_wizard',
  'hero_knight',
  'hero_princess',
  'hero_ranger',
  'hero_rogue',
  'hero_viking',
  'hero_elf',
  'hero_sage',
  'hero_paladin',
  'hero_squire',
  'hero_monk',
  'hero_villager',
  'hero_stargreen',
  'hero_starblue',
  'hero_starpink',
  'hero_stargold',
  'hero_startan',
] as const;

export type HeroId = (typeof HEROES)[number];

export const spriteUrl = (name: string) => `/walk/sprites/${name}.png`;

export function isKnownHero(id: string): id is HeroId {
  return (HEROES as readonly string[]).includes(id);
}

export function sellPrice(id: string): number {
  const item = ITEMS[id];
  if (!item) return 2;
  return Math.max(2, [3, 8, 15, 40][item.rarity] + (item.kind === 'sell' ? item.value : 0));
}

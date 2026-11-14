import { ITEMS, sellPrice } from './items.ts';
import { addXp, heal } from './state.ts';
import type { DayState, WalkState } from './types.ts';

/** Loot bands from Questroad. `roll` is a uniform [0, 1) source so tests can pin a rarity. */
const RARE = ['loot_gem', 'loot_shield'];
const UNCOMMON = ['loot_key', 'loot_scroll'];
const COMMON = ['loot_potion', 'loot_bread', 'loot_scroll'];

export function pickLoot(roll: () => number, boost = false): string {
  const x = roll();
  if (boost || x > 0.93) return RARE[Math.floor(roll() * RARE.length)];
  if (x > 0.75) return UNCOMMON[Math.floor(roll() * UNCOMMON.length)];
  return COMMON[Math.floor(roll() * COMMON.length)];
}

function withoutOne(loot: string[], id: string): string[] | null {
  const index = loot.indexOf(id);
  if (index < 0) return null;
  const next = loot.slice();
  next.splice(index, 1);
  return next;
}

/** Use or sell one bag item. Returns null when the item is not in the bag. */
export function applyBagItem(
  state: WalkState,
  day: DayState,
  id: string,
  action: 'use' | 'sell',
  when: Date,
  roll: () => number,
): { state: WalkState; day: DayState; message: string } | null {
  const item = ITEMS[id];
  const loot = withoutOne(state.loot, id);
  if (!item || !loot) return null;
  if (action === 'sell') {
    const price = sellPrice(id);
    return { state: { ...state, loot, gold: state.gold + price }, day, message: `Sold ${item.name} for ${price} gold.` };
  }
  if (item.kind === 'heal') {
    return { state: heal({ ...state, loot }, item.value), day, message: `${item.name} restores ${item.value}.` };
  }
  if (item.kind === 'xp') {
    const gained = addXp({ ...state, loot }, day, item.value, when);
    return { state: gained.state, day: gained.day, message: `The scroll is worth ${gained.gained} XP.` };
  }
  if (item.kind === 'chest') {
    const gold = 20 + Math.floor(roll() * 30);
    const drop = pickLoot(roll, false);
    return {
      state: { ...state, loot: [...loot, drop], gold: state.gold + gold },
      day,
      message: `The chest holds ${gold} gold and ${ITEMS[drop]?.name ?? 'loot'}.`,
    };
  }
  if (item.kind === 'atk' || item.kind === 'def') {
    const previous = state.rpg.eq.find((equipped) => ITEMS[equipped]?.kind === item.kind);
    let bag = loot;
    let eq = state.rpg.eq;
    if (previous) {
      eq = eq.filter((equipped) => equipped !== previous);
      bag = [...bag, previous];
    }
    return {
      state: { ...state, loot: bag, rpg: { ...state.rpg, eq: [...eq, id] } },
      day,
      message: `Equipped ${item.name}.`,
    };
  }
  return { state: { ...state, loot }, day, message: `${item.name} is only worth selling.` };
}

import { ITEMS } from './items.ts';
import { pickLoot } from './loot.ts';
import { addXp, attackOf, defenseOf, heal, hurt, lvlOf } from './state.ts';
import type { DayState, Place, WalkState } from './types.ts';

export const MONSTERS: [string, string][] = [
  ['mon_slime', 'Bog Slime'],
  ['mon_cyclops', 'Bridge Cyclops'],
  ['mon_demon', 'Fog Imp'],
  ['mon_ghost', 'Cable-Car Ghost'],
  ['mon_bat', 'Bat Swarm'],
  ['mon_spider', 'Alley Spider'],
  ['mon_beetle', 'Shell Beetle'],
];

export function monStats(level: number): { hp: number; atk: number } {
  return { hp: 8 + level * 6, atk: 2 + level * 1.5 };
}

export type BossFight = {
  placeId: string;
  name: string;
  sprite: string;
  placeName: string;
  level: number;
  hp: number;
  max: number;
  atk: number;
};

export type StrikeOutcome = 'ongoing' | 'won' | 'down';

/** Opens a landmark fight. Returns null when that boss was already beaten today. */
export function startBoss(state: WalkState, day: DayState, place: Place): BossFight | null {
  if (!place.boss || day.db.includes(place.id)) return null;
  const level = lvlOf(state.xp) + 1;
  const max = 24 + level * 9;
  return {
    placeId: place.id,
    name: place.bossKind[1],
    sprite: place.bossKind[0],
    placeName: place.name,
    level,
    hp: max,
    max,
    atk: 2 + level,
  };
}

function playerHit(state: WalkState, roll: () => number): { damage: number; crit: boolean } {
  const crit = roll() < 0.12;
  const damage = Math.max(1, Math.round(attackOf(state) * (0.8 + roll() * 0.5) * (crit ? 2 : 1)));
  return { damage, crit };
}

function bossHit(fight: BossFight, state: WalkState, roll: () => number): number {
  return Math.max(1, Math.round(fight.atk * (0.7 + roll() * 0.6) - defenseOf(state)));
}

export type StrikeStep = {
  state: WalkState;
  day: DayState;
  fight: BossFight | null;
  outcome: StrikeOutcome;
  log: string;
};

/**
 * One exchange. The fight ends when the boss falls or you faint.
 * A win pays XP, gold, and one drop, and records the boss so a second win the same day pays nothing.
 */
export function bossStrike(state: WalkState, day: DayState, fight: BossFight, roll: () => number, when: Date): StrikeStep {
  const swing = playerHit(state, roll);
  const hp = fight.hp - swing.damage;
  const crit = swing.crit ? 'Critical. ' : '';
  if (hp <= 0) {
    const won = grantBossReward(state, day, fight, roll, when);
    return {
      state: won.state,
      day: won.day,
      fight: null,
      outcome: 'won',
      log: `${crit}${fight.name} falls. ${won.log}`,
    };
  }
  const back = bossHit({ ...fight, hp }, state, roll);
  const hit = hurt(state, back);
  const nextFight = { ...fight, hp };
  if (hit.fainted) {
    return {
      state: hit.state,
      day,
      fight: null,
      outcome: 'down',
      log: `${crit}You strike for ${swing.damage}. You faint (−${hit.lost} gold).`,
    };
  }
  return {
    state: hit.state,
    day,
    fight: nextFight,
    outcome: 'ongoing',
    log: `${crit}You strike for ${swing.damage}. It hits back for ${back}.`,
  };
}

export function grantBossReward(
  state: WalkState,
  day: DayState,
  fight: Pick<BossFight, 'placeId' | 'name' | 'level'>,
  roll: () => number,
  when: Date,
): { state: WalkState; day: DayState; log: string } {
  if (day.db.includes(fight.placeId)) return { state, day, log: 'Already defeated today.' };
  const hasSword = state.loot.includes('item_sword') || state.rpg.eq.includes('item_sword');
  const drop = !hasSword ? 'item_sword' : ['loot_gem', 'loot_shield', 'loot_key'][Math.floor(roll() * 3)] ?? 'loot_gem';
  const withLoot: WalkState = {
    ...state,
    gold: state.gold + 40 + fight.level * 5,
    loot: [...state.loot, drop],
    rpg: { ...state.rpg, bosses: state.rpg.bosses + 1 },
  };
  const gained = addXp(withLoot, { ...day, db: [...day.db, fight.placeId] }, 150 + fight.level * 10, when);
  return { state: gained.state, day: gained.day, log: `+${ITEMS[drop]?.name ?? drop}` };
}

/** Drink the first healing item. The boss still gets a swing. */
export function bossDrink(state: WalkState, fight: BossFight, roll: () => number): { state: WalkState; fight: BossFight | null; outcome: StrikeOutcome; log: string } | null {
  const index = state.loot.findIndex((id) => ITEMS[id]?.kind === 'heal');
  if (index < 0) return null;
  const id = state.loot[index];
  const item = ITEMS[id];
  const loot = state.loot.slice();
  loot.splice(index, 1);
  const healed = heal({ ...state, loot }, item.value);
  const back = bossHit(fight, healed, roll);
  const hit = hurt(healed, back);
  if (hit.fainted) {
    return { state: hit.state, fight: null, outcome: 'down', log: `You drink ${item.name}. You faint (−${hit.lost} gold).` };
  }
  return { state: hit.state, fight, outcome: 'ongoing', log: `You drink ${item.name} (+${item.value}). It hits for ${back}.` };
}

/** Wild encounter. Stops within 20 rounds so a fight cannot run forever. */
export function resolveWild(
  state: WalkState,
  day: DayState,
  monster: [string, string],
  monsterLevel: number,
  roll: () => number,
  when: Date,
): { state: WalkState; day: DayState; won: boolean; log: string } {
  const stats = monStats(monsterLevel);
  let hp = stats.hp;
  let taken = 0;
  let rounds = 0;
  while (hp > 0 && rounds < 20) {
    rounds += 1;
    const crit = roll() < 0.1;
    hp -= attackOf(state) * (0.7 + roll() * 0.6) * (crit ? 2 : 1);
    if (hp > 0) taken += Math.max(1, stats.atk * (0.6 + roll() * 0.8) - defenseOf(state));
  }
  const hit = hurt(state, Math.round(taken));
  if (!hit.fainted && hp <= 0) {
    const level = lvlOf(state.xp);
    let next: WalkState = { ...hit.state, wins: hit.state.wins + 1, gold: hit.state.gold + 5 + level * 2 };
    let log = `Victory over ${monster[1]}.`;
    if (roll() < 0.2) {
      const drop = pickLoot(roll, false);
      next = { ...next, loot: [...next.loot, drop] };
      log += ` ${ITEMS[drop]?.name ?? drop}.`;
    }
    const gained = addXp(next, { ...day, dw: day.dw + 1 }, 40 + (monsterLevel - level) * 10, when);
    return { state: gained.state, day: gained.day, won: true, log };
  }
  return { state: hit.state, day, won: false, log: `${monster[1]} wins this one.` };
}

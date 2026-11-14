import { ITEMS } from './items.ts';
import { addXp } from './state.ts';
import type { DayState, WalkState } from './types.ts';

/**
 * Single-player achievements from Questroad.
 * Road reports and the full-party goal are omitted: those systems are not in Walk.
 */
export const ACHIEVEMENTS = [
  { t: 'Walk 1 km', k: 'm', g: 1000 },
  { t: 'Walk 5 km', k: 'm', g: 5000 },
  { t: 'Win 3 battles', k: 'w', g: 3 },
  { t: 'Visit 5 places', k: 'v', g: 5 },
  { t: 'Find 5 loot', k: 'l', g: 5 },
  { t: 'Defeat a landmark boss', k: 'b', g: 1 },
  { t: '7-day streak', k: 's', g: 7 },
] as const;

export const FIRST_STEPS = [
  { k: 'j', t: 'Open your journal' },
  { k: 'v', t: 'Visit any place' },
  { k: 'w', t: 'Win a battle' },
] as const;

export function achievementValue(state: WalkState, key: string): number {
  if (key === 'm') return state.metres;
  if (key === 'w') return state.wins;
  if (key === 'v') return state.seen.length;
  if (key === 'l') return state.loot.length;
  if (key === 'b') return state.rpg.bosses;
  if (key === 's') return state.rpg.best;
  return 0;
}

function stepReady(state: WalkState, key: (typeof FIRST_STEPS)[number]['k'], opened: boolean): boolean {
  if (key === 'j') return opened;
  if (key === 'v') return state.seen.length > 0;
  return state.wins > 0;
}

/** Pays 25 XP the first time each first-step becomes true, then two potions when all three are done. */
export function noteFirstSteps(
  state: WalkState,
  day: DayState,
  when: Date,
  opened = false,
): { state: WalkState; day: DayState; messages: string[] } {
  if (state.fs.all) return { state, day, messages: [] };
  let next = state;
  let board = day;
  const messages: string[] = [];
  for (const step of FIRST_STEPS) {
    if (next.fs[step.k]) continue;
    if (!stepReady(next, step.k, opened)) continue;
    next = { ...next, fs: { ...next.fs, [step.k]: 1 }, gold: next.gold + 10 };
    const gained = addXp(next, board, 25, when);
    next = gained.state;
    board = gained.day;
    messages.push(`First step: ${step.t}`);
  }
  if (!next.fs.all && FIRST_STEPS.every((step) => next.fs[step.k])) {
    next = { ...next, fs: { ...next.fs, all: 1 }, loot: [...next.loot, 'loot_potion', 'loot_potion'] };
    messages.push(`First steps complete. Two ${ITEMS.loot_potion.name}s.`);
  }
  return { state: next, day: board, messages };
}

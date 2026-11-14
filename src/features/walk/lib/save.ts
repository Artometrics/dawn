import { emptyDay, emptyWalk, parseDay, parseWalk } from './state.ts';
import type { DayState, WalkState } from './types.ts';

export const WALK_KEY = 'dawn.walk.v1';
export const WALK_DAY_KEY = 'dawn.walk.day.v1';

type Store = Pick<Storage, 'getItem' | 'setItem'>;

function readJson(store: Store, key: string): unknown {
  const text = store.getItem(key);
  if (!text) return null;
  return JSON.parse(text) as unknown;
}

export function loadWalk(store: Store | null): { state: WalkState; day: DayState } {
  if (!store) return { state: emptyWalk(), day: emptyDay() };
  let state = emptyWalk();
  let day = emptyDay();
  try {
    state = parseWalk(readJson(store, WALK_KEY));
  } catch {
    state = emptyWalk();
  }
  try {
    day = parseDay(readJson(store, WALK_DAY_KEY));
  } catch {
    day = emptyDay();
  }
  return { state, day };
}

export function saveWalk(store: Store, state: WalkState, day: DayState): void {
  store.setItem(WALK_KEY, JSON.stringify(state));
  store.setItem(WALK_DAY_KEY, JSON.stringify(day));
}

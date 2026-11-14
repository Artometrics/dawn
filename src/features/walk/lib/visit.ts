import { distance, geohash, pacificDay } from './geo.ts';
import { HEAL_KINDS } from './poi.ts';
import { hash, rng } from './rng.ts';
import { addXp, heal, maxHp } from './state.ts';
import { pickLoot } from './loot.ts';
import { ITEMS } from './items.ts';
import type { DayState, LngLat, Place, WalkState } from './types.ts';

/** One seeded place per area and Pacific day. Same inputs, same festival; the next day moves it. */
export function festival(places: Place[], center: LngLat, day: string): Place | null {
  const near = places.filter((place) => !place.boss && distance(center, place.ll) < 900);
  if (!near.length) return null;
  const roll = rng(hash(day + geohash(center[1], center[0], 5) + 'fest'));
  const ordered = [...near].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return ordered[Math.floor(roll() * ordered.length)] ?? null;
}

export type VisitOptions = {
  tap: boolean;
  pos: LngLat | null;
  places: Place[];
  center: LngLat;
  now: Date;
  /** Defaults to a generator seeded by place id and Pacific day, so the drop is stable. */
  roll?: () => number;
};

export type VisitResult =
  | { ok: false; reason: 'done' | 'far'; metres?: number }
  | { ok: true; state: WalkState; day: DayState; message: string; festive: boolean };

export function visitPlace(state: WalkState, day: DayState, place: Place, options: VisitOptions): VisitResult {
  if (day.dv.includes(place.id)) return { ok: false, reason: 'done' };
  if (options.tap && options.pos && distance(options.pos, place.ll) > 50) {
    return { ok: false, reason: 'far', metres: distance(options.pos, place.ll) };
  }
  const today = pacificDay(options.now);
  const fest = festival(options.places, options.center, today)?.id === place.id;
  const first = !state.seen.includes(place.id);
  const roll = options.roll ?? rng(hash(`${today}:${place.id}:visit`));
  let xp = first ? 50 : 15;
  let gold = first ? 10 : 3;
  let loot = state.loot;
  let message = place.kind[1] + (place.name ? ` · ${place.name}` : '');
  if (first || fest) {
    const drop = pickLoot(roll, fest);
    loot = [...loot, drop];
    message += ` → ${ITEMS[drop]?.name ?? drop}`;
  }
  if (fest) {
    xp *= 2;
    gold *= 2;
    message = `Festival. ${message}`;
  }
  let next: WalkState = {
    ...state,
    gold: state.gold + gold,
    loot,
    seen: first ? [...state.seen, place.id] : state.seen,
  };
  if (HEAL_KINDS.has(place.kind[1])) {
    next = heal(next, maxHp(next.xp));
    message += ' · rested';
  }
  const gained = addXp(next, { ...day, dv: [...day.dv, place.id] }, xp, options.now);
  return { ok: true, state: gained.state, day: gained.day, message, festive: fest };
}

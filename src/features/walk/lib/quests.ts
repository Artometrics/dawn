import { distance, geohash, pacificDay } from './geo.ts';
import { hash, rng } from './rng.ts';
import { addXp } from './state.ts';
import type { DayState, LngLat, Place, Quest, WalkState } from './types.ts';

/**
 * Daily board for one geohash cell. Visit, kind, pilgrimage chain, and boss.
 * The same area and Pacific day always roll the same board.
 */
export function ensureQuests(day: DayState, places: Place[], center: LngLat, today: string, force = false): DayState {
  const area = geohash(center[1], center[0], 5);
  if (!force && day.q.length && day.qc.length) return day;
  if (!force && day.q.length && day.qa === area && places.length <= day.qn) return day;
  if (!places.length) return day;
  const roll = rng(hash(today + area));
  const near = places.filter((place) => distance(center, place.ll) < 900);
  const quests: Quest[] = [];
  const named = near.filter((place) => !place.boss && place.name).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  for (let i = 0; i < 2 && named.length; i++) {
    const place = named.splice(Math.floor(roll() * named.length), 1)[0];
    if (!place) break;
    quests.push({
      id: `v${place.id}`,
      ty: 'visit',
      tg: place.id,
      t: `Visit the ${place.kind[1]}: ${place.name}`,
      ic: place.kind[0],
      xp: 60,
      g: 15,
    });
  }
  if (named.length >= 2) {
    const from = named.splice(Math.floor(roll() * named.length), 1)[0];
    named.sort((a, b) => distance(from.ll, a.ll) - distance(from.ll, b.ll));
    const to = named[0];
    if (from && to) {
      named.splice(0, 1);
      quests.push({
        id: `c${from.id}_${to.id}`,
        ty: 'chain',
        tg: from.id,
        tg2: to.id,
        t: `Pilgrimage: ${from.name} → ${to.name}`,
        ic: 'poi_shrine',
        xp: 120,
        g: 30,
      });
    }
  }
  const counts = new Map<string, number>();
  for (const place of near) {
    if (place.boss) continue;
    counts.set(place.kind[1], (counts.get(place.kind[1]) ?? 0) + 1);
  }
  const kinds = [...counts.entries()].filter((entry) => entry[1] >= 2).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  if (kinds.length) {
    const pick = kinds[Math.floor(roll() * Math.min(3, kinds.length))];
    if (pick) {
      const [label, count] = pick;
      const goal = Math.min(3, count);
      const icon = near.find((place) => place.kind[1] === label)?.kind[0] ?? 'poi_site';
      quests.push({
        id: `k${label}`,
        ty: 'kind',
        tg: label,
        n: goal,
        t: `Visit ${goal} ${label}${goal > 1 ? 's' : ''}`,
        ic: icon,
        xp: 80,
        g: 20,
      });
    }
  }
  const bosses = near.filter((place) => place.boss).sort((a, b) => distance(center, a.ll) - distance(center, b.ll));
  if (bosses.length) {
    const place = bosses[Math.floor(roll() * Math.min(2, bosses.length))];
    if (place) {
      quests.push({
        id: `b${place.id}`,
        ty: 'boss',
        tg: place.id,
        t: `Slay ${place.bossKind[1]} at ${place.name}`,
        ic: place.bossKind[0],
        xp: 150,
        g: 50,
      });
    }
  }
  return { ...day, q: quests, qa: area, qn: places.length };
}

/** Progress pair `[done, goal]` for visit, kind, chain, and boss quests. */
export function qprog(quest: Quest, day: DayState, places: Place[]): [number, number] {
  if (quest.ty === 'visit') return [day.dv.includes(quest.tg) ? 1 : 0, 1];
  if (quest.ty === 'kind') {
    const goal = quest.n ?? 1;
    const done = places.filter((place) => place.kind[1] === quest.tg && day.dv.includes(place.id)).length;
    return [Math.min(goal, done), goal];
  }
  if (quest.ty === 'boss') return [day.db.includes(quest.tg) ? 1 : 0, 1];
  if (quest.ty === 'chain') {
    const first = day.dv.indexOf(quest.tg);
    const second = quest.tg2 ? day.dv.indexOf(quest.tg2) : -1;
    return [first < 0 ? 0 : second > first ? 2 : 1, 2];
  }
  return [0, 1];
}

export function qTarget(quest: Quest, day: DayState): string | null {
  if (quest.ty === 'chain') return qprog(quest, day, [])[0] >= 1 ? (quest.tg2 ?? quest.tg) : quest.tg;
  if (quest.ty === 'visit' || quest.ty === 'boss') return quest.tg;
  return null;
}

/** Pays every quest whose progress just filled. Each id is claimed once. */
export function claimQuests(
  state: WalkState,
  day: DayState,
  places: Place[],
  when: Date,
): { state: WalkState; day: DayState; messages: string[] } {
  let next = state;
  let board = day;
  const messages: string[] = [];
  for (const quest of day.q) {
    if (board.qc.includes(quest.id)) continue;
    const [done, goal] = qprog(quest, board, places);
    if (done < goal) continue;
    board = { ...board, qc: [...board.qc, quest.id] };
    next = { ...next, gold: next.gold + quest.g };
    const gained = addXp(next, board, quest.xp, when);
    next = gained.state;
    board = gained.day;
    messages.push(`Quest done: ${quest.t}`);
  }
  return { state: next, day: board, messages };
}

export function questsFor(day: DayState, places: Place[], center: LngLat, now: Date): DayState {
  return ensureQuests(day, places, center, pacificDay(now));
}

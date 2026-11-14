import { xpMul } from './events.ts';
import { pacificDay, shiftDay } from './geo.ts';
import { HEROES, ITEMS, isKnownHero } from './items.ts';
import type { DayState, Quest, WalkState } from './types.ts';

/** A step counts only inside this window, so GPS jitter and teleports do not farm XP. */
export const STEP_MIN_M = 0.5;
export const STEP_MAX_M = 500;

export function acceptStep(metres: number): boolean {
  return metres > STEP_MIN_M && metres < STEP_MAX_M;
}

export function lvlOf(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1;
}

export function maxHp(xp: number): number {
  return 24 + lvlOf(xp) * 8;
}

export function attackOf(state: WalkState): number {
  return 3 + lvlOf(state.xp) * 2 + (state.rpg.eq.includes('item_sword') ? 4 : 0);
}

export function defenseOf(state: WalkState): number {
  return state.rpg.eq.includes('loot_shield') ? 2 : 0;
}

export function emptyWalk(): WalkState {
  const xp = 0;
  return {
    xp,
    gold: 0,
    metres: 0,
    wins: 0,
    loot: [],
    seen: [],
    sprite: 'hero_wizard',
    name: 'Wanderer',
    rpg: { hp: maxHp(xp), streak: 0, best: 0, day: '', eq: [], bosses: 0 },
    fs: {},
  };
}

export function emptyDay(day = ''): DayState {
  return { day, dv: [], dm: 0, dw: 0, db: [], dxp: 0, q: [], qa: '', qn: 0, qc: [] };
}

function finite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function isQuest(value: unknown): value is Quest {
  if (!value || typeof value !== 'object') return false;
  const q = value as Quest;
  return (
    typeof q.id === 'string' &&
    (q.ty === 'visit' || q.ty === 'kind' || q.ty === 'chain' || q.ty === 'boss') &&
    typeof q.tg === 'string' &&
    typeof q.t === 'string' &&
    typeof q.ic === 'string' &&
    typeof q.xp === 'number' &&
    typeof q.g === 'number'
  );
}

/** A save that is not a walk object, or whose counters are not numbers, comes back as a new game. */
export function parseWalk(raw: unknown): WalkState {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return emptyWalk();
  const row = raw as Record<string, unknown>;
  const xp = finite(row.xp);
  const gold = finite(row.gold);
  const metres = finite(row.metres);
  if (xp === null || gold === null || metres === null) return emptyWalk();
  const rpgIn = row.rpg && typeof row.rpg === 'object' && !Array.isArray(row.rpg) ? (row.rpg as Record<string, unknown>) : {};
  const fsIn = row.fs && typeof row.fs === 'object' && !Array.isArray(row.fs) ? (row.fs as Record<string, unknown>) : {};
  const loot = Array.isArray(row.loot) ? row.loot.filter((id): id is string => typeof id === 'string' && id in ITEMS) : [];
  const seen = Array.isArray(row.seen) ? row.seen.filter((id): id is string => typeof id === 'string') : [];
  const eq = Array.isArray(rpgIn.eq)
    ? rpgIn.eq.filter((id): id is string => id === 'item_sword' || id === 'loot_shield')
    : [];
  const nextXp = Math.max(0, xp);
  let hp = finite(rpgIn.hp);
  if (hp === null || hp < 0 || hp > maxHp(nextXp)) hp = maxHp(nextXp);
  const sprite = typeof row.sprite === 'string' && isKnownHero(row.sprite) ? row.sprite : HEROES[0];
  const name = typeof row.name === 'string' && row.name.trim() ? row.name.trim().slice(0, 20) : 'Wanderer';
  return {
    xp: nextXp,
    gold: Math.max(0, gold),
    metres: Math.max(0, metres),
    wins: Math.max(0, finite(row.wins) ?? 0),
    loot,
    seen,
    sprite,
    name,
    rpg: {
      hp,
      streak: Math.max(0, finite(rpgIn.streak) ?? 0),
      best: Math.max(0, finite(rpgIn.best) ?? 0),
      day: typeof rpgIn.day === 'string' ? rpgIn.day : '',
      eq,
      bosses: Math.max(0, finite(rpgIn.bosses) ?? 0),
    },
    fs: {
      j: fsIn.j === 1 ? 1 : undefined,
      v: fsIn.v === 1 ? 1 : undefined,
      w: fsIn.w === 1 ? 1 : undefined,
      all: fsIn.all === 1 ? 1 : undefined,
    },
  };
}

export function parseDay(raw: unknown): DayState {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return emptyDay();
  const row = raw as Record<string, unknown>;
  if (typeof row.day !== 'string') return emptyDay();
  return {
    day: row.day,
    dv: Array.isArray(row.dv) ? row.dv.filter((id): id is string => typeof id === 'string') : [],
    dm: Math.max(0, finite(row.dm) ?? 0),
    dw: Math.max(0, finite(row.dw) ?? 0),
    db: Array.isArray(row.db) ? row.db.filter((id): id is string => typeof id === 'string') : [],
    dxp: Math.max(0, finite(row.dxp) ?? 0),
    q: Array.isArray(row.q) ? row.q.filter(isQuest) : [],
    qa: typeof row.qa === 'string' ? row.qa : '',
    qn: Math.max(0, finite(row.qn) ?? 0),
    qc: Array.isArray(row.qc) ? row.qc.filter((id): id is string => typeof id === 'string') : [],
  };
}

export function addXp(
  state: WalkState,
  day: DayState,
  raw: number,
  when: Date,
): { state: WalkState; day: DayState; gained: number; leveled: boolean } {
  const before = lvlOf(state.xp);
  const gained = Math.max(0, Math.round(raw * xpMul(when)));
  const xp = state.xp + gained;
  const leveled = lvlOf(xp) > before;
  return {
    state: {
      ...state,
      xp,
      rpg: { ...state.rpg, hp: leveled ? maxHp(xp) : state.rpg.hp },
    },
    day: { ...day, dxp: day.dxp + gained },
    gained,
    leveled,
  };
}

export function heal(state: WalkState, amount: number): WalkState {
  return { ...state, rpg: { ...state.rpg, hp: Math.min(maxHp(state.xp), state.rpg.hp + amount) } };
}

/** Damage. At 0 HP a healer revives you at half health and takes 10% of your gold. */
export function hurt(state: WalkState, amount: number): { state: WalkState; fainted: boolean; lost: number } {
  let hp = Math.max(0, state.rpg.hp - amount);
  if (hp > 0) return { state: { ...state, rpg: { ...state.rpg, hp } }, fainted: false, lost: 0 };
  const lost = Math.floor(state.gold * 0.1);
  hp = Math.ceil(maxHp(state.xp) / 2);
  return {
    state: { ...state, gold: state.gold - lost, rpg: { ...state.rpg, hp } },
    fainted: true,
    lost,
  };
}

/**
 * Apply the Pacific day boundary. The first open of a new day pays the streak,
 * refills health, and clears yesterday's visits, bosses, and quests.
 */
export function rollDay(state: WalkState, day: DayState, now: Date): { state: WalkState; day: DayState; message: string | null } {
  const today = pacificDay(now);
  const nextDay = day.day === today ? day : emptyDay(today);
  if (state.rpg.day === today) return { state, day: nextDay, message: null };
  const streak = state.rpg.day === shiftDay(today, -1) ? state.rpg.streak + 1 : 1;
  const best = Math.max(state.rpg.best, streak);
  const bonus = Math.min(100, 10 * streak);
  let loot = state.loot;
  let message = `Day ${streak} streak. +${bonus} gold`;
  if (streak % 7 === 0) {
    loot = [...loot, 'loot_gem'];
    message += ' and a gem';
  } else if (streak % 3 === 0) {
    loot = [...loot, 'loot_potion'];
    message += ' and a potion';
  }
  return {
    state: {
      ...state,
      gold: state.gold + bonus,
      loot,
      rpg: { ...state.rpg, streak, best, day: today, hp: maxHp(state.xp) },
    },
    day: nextDay,
    message,
  };
}

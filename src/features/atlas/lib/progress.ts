import type { Region, Stop } from './types.ts';

/** Eras, ranks and XP are Cardinal Quest's, unchanged. */
export const ERAS = [
  { from: 1876, to: 1890, name: 'The Farm & the Founding', icon: '\u{1F40E}' },
  { from: 1891, to: 1905, name: "The Founders' University", icon: '\u{1F54A}\uFE0F' },
  { from: 1906, to: 1940, name: 'Quake & Rebuild', icon: '\u{1F30B}' },
  { from: 1941, to: 1989, name: 'Tower to Valley', icon: '\u{1F5FC}' },
  { from: 1990, to: 2100, name: 'Modern Stanford', icon: '\u{1F4BB}' },
] as const;

export const RANKS: ReadonlyArray<readonly [number, string]> = [
  [0, 'Visitor'],
  [300, 'Prospective Student'],
  [800, 'Pioneer Class'],
  [1500, 'Upperclassman'],
  [2300, 'Graduate Student'],
  [3200, 'Professor'],
  [4100, 'Trustee'],
  [4900, 'Founder'],
];

export const XP = { stop: 100, quiz: 50, route: 250, thread: 150, hunt: 200 } as const;

/** Standing within this many metres unlocks a stop when location is on. */
export const UNLOCK_RADIUS_M = 60;

export type HuntDay = { found: string[]; done: boolean };

export type Progress = {
  version: 1;
  unlocked: string[];
  quiz: Record<string, boolean>;
  routesDone: string[];
  threadsDone: string[];
  hunt: Record<string, HuntDay>;
  /** The stop the character stands at. */
  at: string | null;
};

export const PROGRESS_KEY = 'dawn.atlas.cardinal.v2';

export function emptyProgress(): Progress {
  return { version: 1, unlocked: [], quiz: {}, routesDone: [], threadsDone: [], hunt: {}, at: null };
}

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? [...new Set(value.filter((x): x is string => typeof x === 'string'))] : [];

/** Reads whatever is in storage and keeps only what is well formed. Never throws. */
export function parseProgress(raw: string | null | undefined): Progress {
  if (!raw) return emptyProgress();
  try {
    const data = JSON.parse(raw) as Partial<Record<keyof Progress, unknown>> | null;
    if (!data || typeof data !== 'object') return emptyProgress();
    const quiz: Record<string, boolean> = {};
    if (data.quiz && typeof data.quiz === 'object') {
      for (const [id, ok] of Object.entries(data.quiz as Record<string, unknown>)) if (typeof ok === 'boolean') quiz[id] = ok;
    }
    const hunt: Record<string, HuntDay> = {};
    if (data.hunt && typeof data.hunt === 'object') {
      for (const [day, value] of Object.entries(data.hunt as Record<string, unknown>)) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !value || typeof value !== 'object') continue;
        const entry = value as { found?: unknown; done?: unknown };
        hunt[day] = { found: strings(entry.found), done: entry.done === true };
      }
    }
    return {
      version: 1,
      unlocked: strings(data.unlocked),
      quiz,
      routesDone: strings(data.routesDone),
      threadsDone: strings(data.threadsDone),
      hunt,
      at: typeof data.at === 'string' ? data.at : null,
    };
  } catch {
    return emptyProgress();
  }
}

export function serializeProgress(progress: Progress): string {
  return JSON.stringify(progress);
}

export function eraIndex(year: number): number {
  return ERAS.findIndex((era) => year >= era.from && year <= era.to);
}

export function huntDays(progress: Progress): number {
  return Object.values(progress.hunt).filter((day) => day.done).length;
}

export function quizzesCorrect(progress: Progress): number {
  return Object.values(progress.quiz).filter(Boolean).length;
}

export function xp(progress: Progress): number {
  return (
    progress.unlocked.length * XP.stop +
    quizzesCorrect(progress) * XP.quiz +
    progress.routesDone.length * XP.route +
    progress.threadsDone.length * XP.thread +
    huntDays(progress) * XP.hunt
  );
}

export function rankFor(total: number): { rank: string; next: { at: number; rank: string } | null } {
  let rank = RANKS[0];
  let next: { at: number; rank: string } | null = null;
  for (const entry of RANKS) {
    if (total >= entry[0]) rank = entry;
    else {
      next = { at: entry[0], rank: entry[1] };
      break;
    }
  }
  return { rank: rank[1], next };
}

export function erasDone(progress: Progress, stops: Stop[]): boolean[] {
  const got = new Set(progress.unlocked);
  return ERAS.map((_, index) => {
    const inEra = stops.filter((stop) => eraIndex(stop.sortYear) === index);
    return inEra.length > 0 && inEra.every((stop) => got.has(stop.id));
  });
}

/** The Pacific-time calendar day, as the daily hunt counts it. */
export function pacificDay(now: Date): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

/** Three stops per day from a fixed seed: FNV-1a over the date, then a linear congruential walk. */
export function huntPicks(day: string, ids: string[]): string[] {
  let h = 2166136261;
  for (const ch of day) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }
  const out: string[] = [];
  while (out.length < 3) {
    h = (Math.imul(h, 1103515245) + 12345) >>> 0;
    const pick = ids[h % ids.length];
    if (!out.includes(pick)) out.push(pick);
  }
  return out;
}

export function huntStreak(progress: Progress, today: string): number {
  let count = 0;
  const cursor = new Date(`${today}T12:00:00Z`);
  for (;;) {
    const key = cursor.toISOString().slice(0, 10);
    if (progress.hunt[key]?.done) {
      count += 1;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    } else break;
  }
  return count;
}

/** Marks a stop found in today's hunt. Returns null when the stop is not a target or was already found. */
export function huntHit(progress: Progress, stopId: string, day: string, ids: string[]): { progress: Progress; message: string } | null {
  const picks = huntPicks(day, ids);
  if (!picks.includes(stopId)) return null;
  const current = progress.hunt[day] ?? { found: [], done: false };
  if (current.found.includes(stopId)) return null;
  const found = [...current.found, stopId];
  const done = current.done || picks.every((id) => found.includes(id));
  const next: Progress = { ...progress, hunt: { ...progress.hunt, [day]: { found, done } } };
  const message = !current.done && done
    ? `Daily hunt complete! +${XP.hunt} XP, ${huntStreak(next, day)}-day streak`
    : `Hunt target found! ${found.length}/3`;
  return { progress: next, message };
}

export type UnlockResult = {
  progress: Progress;
  /** The line to show. Later events win, as in Cardinal Quest. */
  headline: string;
  rankUp: string | null;
  changed: boolean;
};

export function unlockStop(progress: Progress, region: Region, stopId: string, day: string): UnlockResult {
  const stop = region.stops.find((s) => s.id === stopId);
  if (!stop || progress.unlocked.includes(stopId)) return { progress, headline: '', rankUp: null, changed: false };

  const eraBefore = erasDone(progress, region.stops);
  const rankBefore = rankFor(xp(progress)).rank;
  let next: Progress = { ...progress, unlocked: [...progress.unlocked, stopId] };
  let headline = `+${XP.stop} XP ${stop.icon}`;
  const got = new Set(next.unlocked);

  for (const route of region.routes) {
    if (!next.routesDone.includes(route.id) && route.stops.every((id) => got.has(id))) {
      next = { ...next, routesDone: [...next.routesDone, route.id] };
      headline = `${route.name} complete! +${XP.route} XP`;
    }
  }
  erasDone(next, region.stops).forEach((done, index) => {
    if (done && !eraBefore[index]) headline = `Era stamp: ${ERAS[index].name}!`;
  });
  for (const thread of region.threads) {
    if (!next.threadsDone.includes(thread.id) && thread.stops.every((id) => got.has(id))) {
      next = { ...next, threadsDone: [...next.threadsDone, thread.id] };
      headline = `Thread complete: ${thread.name}! +${XP.thread} XP`;
    }
  }
  const hunt = huntHit(next, stopId, day, region.stops.map((s) => s.id));
  if (hunt) {
    next = hunt.progress;
    headline = hunt.message;
  }
  const rankAfter = rankFor(xp(next)).rank;
  const rankUp = rankAfter !== rankBefore ? rankAfter : null;
  return { progress: next, headline: rankUp ? `New rank: ${rankUp}!` : headline, rankUp, changed: true };
}

export type QuizResult = { progress: Progress; correct: boolean; alreadyAnswered: boolean; message: string };

export function answerQuiz(progress: Progress, region: Region, stopId: string, answer: number, day: string): QuizResult {
  const stop = region.stops.find((s) => s.id === stopId);
  if (!stop) return { progress, correct: false, alreadyAnswered: false, message: '' };
  if (progress.quiz[stopId] !== undefined) {
    return { progress, correct: progress.quiz[stopId], alreadyAnswered: true, message: 'Already answered: the answer is in the card above.' };
  }
  const correct = answer === stop.quiz.correct;
  let next: Progress = { ...progress, quiz: { ...progress.quiz, [stopId]: correct } };
  if (correct) {
    const hunt = huntHit(next, stopId, day, region.stops.map((s) => s.id));
    if (hunt) next = hunt.progress;
  }
  return {
    progress: next,
    correct,
    alreadyAnswered: false,
    message: correct ? `Correct! +${XP.quiz} XP` : 'Not quite. The answer is in the card above.',
  };
}

/** Answer order is shuffled the same way every time for a given stop. Cardinal Quest's seed. */
export function quizOrder(stopId: string, count: number): number[] {
  const order = Array.from({ length: count }, (_, i) => i);
  let seed = [...stopId].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  for (let i = order.length - 1; i > 0; i -= 1) {
    seed = (seed * 9301 + 49297) % 233280;
    const j = seed % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

export function setAt(progress: Progress, stopId: string): Progress {
  return progress.at === stopId ? progress : { ...progress, at: stopId };
}

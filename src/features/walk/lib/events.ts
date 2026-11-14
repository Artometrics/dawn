import { pacificClock } from './geo.ts';

export type WalkEvent = {
  id: 'fog' | 'weekend';
  text: string;
  xp?: number;
  dist?: number;
};

/** Time-of-day and weekday modifiers. Night and the weekend are Pacific, same as the daily reset. */
export function events(now: Date): WalkEvent[] {
  const { hour, weekday } = pacificClock(now);
  const out: WalkEvent[] = [];
  if (hour >= 20 || hour < 5) out.push({ id: 'fog', text: 'Fog Hour: +25% XP', xp: 1.25 });
  if (weekday === 0 || weekday === 6) out.push({ id: 'weekend', text: 'Weekend road: 2× distance XP', dist: 2 });
  return out;
}

export function xpMul(now: Date): number {
  return events(now).reduce((mul, event) => mul * (event.xp ?? 1), 1);
}

export function distanceMul(now: Date): number {
  return events(now).reduce((mul, event) => mul * (event.dist ?? 1), 1);
}

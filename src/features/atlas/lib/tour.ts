import { nearestIndexFrom, polylineLength, type Projector, type XY } from './geo.ts';
import type { Progress } from './progress.ts';
import type { Route, Stop } from './types.ts';

export type RouteProgress = {
  done: number;
  total: number;
  /** First stop of the route that is not unlocked yet. */
  nextStopId: string | null;
  complete: boolean;
};

export function routeProgress(route: Route, progress: Progress): RouteProgress {
  const got = new Set(progress.unlocked);
  const done = route.stops.filter((id) => got.has(id)).length;
  const next = route.stops.find((id) => !got.has(id)) ?? null;
  return { done, total: route.stops.length, nextStopId: next, complete: next === null };
}

export function routeLine(route: Route, projector: Projector): XY[] {
  return route.line.map(([lng, lat]) => projector.toWorld(lat, lng));
}

/**
 * Index of the line vertex where each stop is reached. The line is the stops' foot-routing legs
 * joined end to end, so the search only moves forward: a route that doubles back still resolves.
 */
export function stopVertexIndexes(route: Route, line: XY[], stops: Map<string, Stop>, projector: Projector): number[] {
  const out: number[] = [];
  let from = 0;
  for (const id of route.stops) {
    const stop = stops.get(id);
    if (!stop) throw new Error(`route ${route.id} names missing stop ${id}`);
    const at = nearestIndexFrom(line, projector.toWorld(stop.lat, stop.lng), from);
    out.push(at);
    from = at;
  }
  return out;
}

/**
 * The slice of the route line between two stops, in order. Foot routing snaps to the nearest
 * path, which can be a long way from a stop that sits in the middle of a lake or a lawn, so
 * when `anchors` (each stop's own map position) are given, the leg starts and ends exactly there.
 */
export function legPoints(line: XY[], indexes: number[], fromStep: number, toStep: number, anchors?: XY[]): XY[] {
  const a = indexes[fromStep];
  const b = indexes[toStep];
  if (a === undefined || b === undefined) return [];
  const slice = a <= b ? line.slice(a, b + 1) : line.slice(b, a + 1).reverse();
  if (!anchors?.[fromStep] || !anchors[toStep]) return slice;
  return [anchors[fromStep], ...slice, anchors[toStep]];
}

/** Walking time on screen. A real walk is minutes; the sprite covers it in a few seconds. */
export function walkDurationMs(metres: number): number {
  return Math.round(Math.min(7000, Math.max(1400, metres * 5)));
}

export function legDurationMs(points: XY[]): number {
  return walkDurationMs(polylineLength(points));
}

/** Smoothstep, so the sprite eases out of each stop. */
export function ease(t: number): number {
  const x = Math.min(1, Math.max(0, Number.isNaN(t) ? 0 : t));
  return x * x * (3 - 2 * x);
}

export type TourStep = {
  index: number;
  stopId: string;
  /** "Stop N." plus the route's spoken line for this stop, when the route has them. */
  bridge: string | null;
  /** Said after the last stop. */
  outro: string | null;
  last: boolean;
};

export function tourStep(route: Route, index: number): TourStep {
  const last = index === route.stops.length - 1;
  return {
    index,
    stopId: route.stops[index],
    bridge: route.bridge?.[index] ?? null,
    outro: last ? route.outro ?? null : null,
    last,
  };
}

/** What the speaker says on a stop: the welcome on stop one, then "Stop N." with the bridge line. */
export function spokenIntro(route: Route, index: number): string {
  const step = tourStep(route, index);
  const lead = index === 0 ? `Welcome to ${route.name}. ${route.description} ` : '';
  if (step.bridge) return `${lead}Stop ${index + 1}. ${step.bridge}`.trim();
  return index === 0 ? `${lead}Stop one.` : `Stop ${index + 1}.`;
}

export function spokenCard(stop: Stop, intro: string): string {
  return `${intro ? `${intro} ` : ''}${stop.name}. ${stop.years.replace('\u2013', ' to ')}. ${stop.story}`;
}

/** Which route the user is on, given where they unlocked last. Used to pick a starting step. */
export function startStep(route: Route, progress: Progress): number {
  const got = new Set(progress.unlocked);
  return Math.max(0, route.stops.findIndex((id) => !got.has(id)));
}

import { distance } from './geo.ts';
import type { LngLat } from './types.ts';

/** Downtown San Francisco, then the Stanford quad. The nearer start is the one that plays. */
export const DEMO_ROUTES: LngLat[][] = [
  [
    [-122.4075, 37.788],
    [-122.405, 37.7875],
    [-122.403, 37.7895],
    [-122.4005, 37.7915],
    [-122.3975, 37.7935],
    [-122.3945, 37.7955],
    [-122.3937, 37.7955],
    [-122.396, 37.798],
    [-122.401, 37.799],
    [-122.406, 37.7965],
    [-122.4075, 37.788],
  ],
  [
    [-122.1697, 37.4274],
    [-122.1703, 37.4268],
    [-122.169, 37.4262],
    [-122.1672, 37.4268],
    [-122.1666, 37.4275],
    [-122.168, 37.429],
    [-122.1695, 37.4295],
    [-122.1704, 37.433],
    [-122.1712, 37.4326],
    [-122.17, 37.43],
    [-122.1697, 37.4274],
  ],
];

export type DemoCursor = { route: number; index: number; t: number };

export function nearestRoute(here: LngLat): number {
  let best = 0;
  let bestD = Infinity;
  DEMO_ROUTES.forEach((route, index) => {
    const d = distance(here, route[0]);
    if (d < bestD) {
      best = index;
      bestD = d;
    }
  });
  return best;
}

/** Advance about six metres along the loop. Returns the new point. */
export function demoStep(cursor: DemoCursor, metres = 6): { cursor: DemoCursor; at: LngLat } {
  const route = DEMO_ROUTES[cursor.route] ?? DEMO_ROUTES[0];
  let index = cursor.index;
  const a = route[index];
  const b = route[(index + 1) % route.length];
  let t = cursor.t + metres / Math.max(1, distance(a, b));
  if (t >= 1) {
    t = 0;
    index = (index + 1) % (route.length - 1);
  }
  const from = route[index];
  const to = route[(index + 1) % route.length];
  return {
    cursor: { route: cursor.route, index, t },
    at: [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t],
  };
}

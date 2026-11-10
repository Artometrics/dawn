import { METRES_PER_DEG_LAT, metresPerDegLng } from './basemap-spec.ts';
import type { Frame } from './types.ts';

export type LatLng = { lat: number; lng: number };
export type XY = { x: number; y: number };
export type Bounds = { x0: number; y0: number; x1: number; y1: number };

export type Projector = {
  frame: Frame;
  toWorld: (lat: number, lng: number) => XY;
  fromWorld: (point: XY) => LatLng;
  inside: (lat: number, lng: number) => boolean;
  /** The whole baked frame in world metres. */
  bounds: Bounds;
};

/** Local flat projection in metres around the frame origin. Fine at campus scale. */
export function createProjector(frame: Frame): Projector {
  const mLng = metresPerDegLng(frame.origin.lat);
  const toWorld = (lat: number, lng: number): XY => ({
    x: (lng - frame.origin.lon) * mLng,
    y: (frame.origin.lat - lat) * METRES_PER_DEG_LAT,
  });
  const a = toWorld(frame.bbox.south, frame.bbox.west);
  const b = toWorld(frame.bbox.north, frame.bbox.east);
  return {
    frame,
    toWorld,
    fromWorld: (point) => ({
      lat: frame.origin.lat - point.y / METRES_PER_DEG_LAT,
      lng: frame.origin.lon + point.x / mLng,
    }),
    inside: (lat, lng) =>
      lat >= frame.bbox.south && lat <= frame.bbox.north && lng >= frame.bbox.west && lng <= frame.bbox.east,
    bounds: { x0: a.x, y0: b.y, x1: b.x, y1: a.y },
  };
}

/** Great-circle distance in metres. Same maths as Cardinal Quest's checks. */
export function metresBetween(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const p1 = (a.lat * Math.PI) / 180;
  const p2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin((p2 - p1) / 2) ** 2 +
    Math.cos(p1) * Math.cos(p2) * Math.sin(((b.lng - a.lng) * Math.PI) / 360) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function worldBounds(points: XY[]): Bounds {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const p of points) {
    x0 = Math.min(x0, p.x);
    y0 = Math.min(y0, p.y);
    x1 = Math.max(x1, p.x);
    y1 = Math.max(y1, p.y);
  }
  return { x0, y0, x1, y1 };
}

const seg = (a: XY, b: XY) => Math.hypot(b.x - a.x, b.y - a.y);

export function polylineLength(points: XY[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) total += seg(points[i - 1], points[i]);
  return total;
}

/** The point `distance` metres along a polyline, clamped to its ends. */
export function pointAtDistance(points: XY[], distance: number): XY {
  if (points.length === 0) return { x: 0, y: 0 };
  if (distance <= 0) return points[0];
  let left = distance;
  for (let i = 1; i < points.length; i += 1) {
    const len = seg(points[i - 1], points[i]);
    if (left <= len && len > 0) {
      const t = left / len;
      return {
        x: points[i - 1].x + (points[i].x - points[i - 1].x) * t,
        y: points[i - 1].y + (points[i].y - points[i - 1].y) * t,
      };
    }
    left -= len;
  }
  return points[points.length - 1];
}

/** Index of the first vertex at or after `from` that is nearest to the target. */
export function nearestIndexFrom(points: XY[], target: XY, from = 0): number {
  let best = Math.min(from, points.length - 1);
  let bestD = Infinity;
  for (let i = Math.max(0, from); i < points.length; i += 1) {
    const d = (points[i].x - target.x) ** 2 + (points[i].y - target.y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

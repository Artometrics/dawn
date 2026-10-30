export type LatLng = { lat: number; lng: number };

export function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/** Smoothstep so the sprite eases out of each stop. */
export function smoothstep(value: number): number {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

export function pointAlong(from: LatLng, to: LatLng, t: number): LatLng {
  const eased = smoothstep(t);
  return {
    lat: from.lat + (to.lat - from.lat) * eased,
    lng: from.lng + (to.lng - from.lng) * eased,
  };
}

/** Short hops stay readable. Long hops across campus do not drag. */
export function walkDurationMs(from: LatLng, to: LatLng): number {
  const degrees = Math.hypot(to.lat - from.lat, to.lng - from.lng);
  return Math.round(Math.min(4800, Math.max(1600, degrees * 90000)));
}

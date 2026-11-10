import type { Frame } from './types.ts';

/**
 * The frame the baked Cardinal basemap is drawn in. The bake script and the app both read this,
 * so a place and a road line up by construction. World x is metres east of the origin, y is
 * metres south of it.
 */
export const CARDINAL_FRAME: Frame = {
  bbox: { south: 37.402, west: -122.192, north: 37.45, east: -122.148 },
  origin: { lat: 37.426, lon: -122.17 },
};

/** Basemap coordinates are stored as integers in half-metre units. */
export const UNITS_PER_METRE = 2;

export const METRES_PER_DEG_LAT = 110540;

export function metresPerDegLng(originLat: number): number {
  return 111320 * Math.cos((originLat * Math.PI) / 180);
}

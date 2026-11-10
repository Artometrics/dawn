import { UNITS_PER_METRE } from './basemap-spec.ts';
import type { Frame } from './types.ts';

/** The baked file as it sits on disk. Coordinates are delta-coded half-metre integers. */
export type BakedBasemap = {
  meta: {
    title: string;
    attribution: string;
    licence: string;
    licenceUrl: string;
    copyrightUrl: string;
    osmBaseTimestamp: string | null;
    source: string;
    bbox: Frame['bbox'];
    origin: Frame['origin'];
    unitsPerMetre: number;
    encoding: string;
    simplified: string;
  };
  green: number[][];
  water: number[][];
  waterways: number[][];
  rail: number[][];
  buildings: number[][];
  roads: { major: number[][]; minor: number[][]; path: number[][] };
  labels: { text: string; x: number; y: number; angle: number; major: boolean; length: number }[];
};

/** Polyline or polygon points in world metres, from the delta-coded flat array. */
export function decodePath(flat: number[], unitsPerMetre = UNITS_PER_METRE): [number, number][] {
  const out: [number, number][] = [];
  let x = 0;
  let y = 0;
  for (let i = 0; i + 1 < flat.length; i += 2) {
    x = i === 0 ? flat[0] : x + flat[i];
    y = i === 0 ? flat[1] : y + flat[i + 1];
    out.push([x / unitsPerMetre, y / unitsPerMetre]);
  }
  return out;
}

/** Shoelace area in square metres. */
export function polygonArea(points: [number, number][]): number {
  let sum = 0;
  for (let i = 0; i < points.length; i += 1) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
}

export type DecodedBasemap = {
  meta: BakedBasemap['meta'];
  green: [number, number][][];
  water: [number, number][][];
  waterways: [number, number][][];
  rail: [number, number][][];
  /** Footprints of 220 m2 and up, drawn at every zoom. */
  buildingsLarge: [number, number][][];
  /** Smaller footprints, drawn only when zoomed in. */
  buildingsSmall: [number, number][][];
  roads: { major: [number, number][][]; minor: [number, number][][]; path: [number, number][][] };
  labels: { text: string; x: number; y: number; angle: number; major: boolean; length: number }[];
};

export const LARGE_BUILDING_M2 = 220;

export function decodeBasemap(baked: BakedBasemap): DecodedBasemap {
  const u = baked.meta.unitsPerMetre;
  const dec = (list: number[][]) => list.map((flat) => decodePath(flat, u));
  const buildings = dec(baked.buildings);
  return {
    meta: baked.meta,
    green: dec(baked.green),
    water: dec(baked.water),
    waterways: dec(baked.waterways),
    rail: dec(baked.rail),
    buildingsLarge: buildings.filter((b) => polygonArea(b) >= LARGE_BUILDING_M2),
    buildingsSmall: buildings.filter((b) => polygonArea(b) < LARGE_BUILDING_M2),
    roads: { major: dec(baked.roads.major), minor: dec(baked.roads.minor), path: dec(baked.roads.path) },
    labels: baked.labels.map((l) => ({ ...l, x: l.x / u, y: l.y / u })),
  };
}

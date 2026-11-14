import { Path, type Pt } from './pathing';

export const SLOTS: readonly Pt[] = [
  { x: -4.5, z: -4.75 },
  { x: -1.5, z: -4.75 },
  { x: 1.5, z: -4.75 },
  { x: -1.5, z: -0.25 },
  { x: 1.5, z: -0.25 },
  { x: 4.5, z: -0.25 },
  { x: -4.5, z: 4.25 },
  { x: -1.5, z: 4.25 },
  { x: 1.5, z: 4.25 },
  { x: -0.5, z: -9.1 },
  { x: 3, z: -9.1 },
  { x: -3.5, z: 8.6 },
  { x: 0, z: 8.6 },
  { x: 3.5, z: 8.6 },
];

export const BOUNDS = { minX: -6.4, maxX: 6.4, minZ: -10.4, maxZ: 10.2 } as const;
export const HERO_START: Pt = { x: 0, z: 0.9 };

const PATH_POINTS: readonly Pt[] = [
  { x: -5.9, z: -7 },
  { x: 4.2, z: -7 },
  { x: 4.2, z: -2.5 },
  { x: -4.2, z: -2.5 },
  { x: -4.2, z: 2 },
  { x: 4.2, z: 2 },
  { x: 4.2, z: 6.5 },
  { x: -5.9, z: 6.5 },
];

export const PATH = new Path(PATH_POINTS);
export const AIR_ROUTE = new Path([PATH_POINTS[0], { x: 1, z: -0.4 }, PATH_POINTS[PATH_POINTS.length - 1]]);

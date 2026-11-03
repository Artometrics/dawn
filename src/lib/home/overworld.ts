import layout from './town-layout.json' with { type: 'json' };

/** Original Dawn Town pixel map. Kenney tiles stay on the village and the credits page. */
export const TILE = 16;
export const MAP_SRC = '/tiles/dawn-town-map.png';
export const PLAYER_SRC = '/sprites/town/player.png';

export type Landmark = {
  id: string;
  name: string;
  kind: string;
  blurb: string;
  href: string;
  suggestion: string;
  x: number;
  y: number;
  w: number;
  h: number;
  approach: { x: number; y: number };
};

export type Overworld = {
  w: number;
  h: number;
  solid: boolean[][];
  landmarks: Landmark[];
  spawn: { x: number; y: number };
};

type Layout = {
  w: number;
  h: number;
  spawn: { x: number; y: number };
  solid: number[][];
  landmarks: Landmark[];
};

const town = layout as Layout;

export function buildOverworld(): Overworld {
  return {
    w: town.w,
    h: town.h,
    solid: town.solid.map((row) => row.map((cell) => cell === 1)),
    landmarks: town.landmarks,
    spawn: town.spawn,
  };
}

export function canWalk(world: Overworld, x: number, y: number): boolean {
  return y >= 0 && x >= 0 && y < world.h && x < world.w && !world.solid[y][x];
}

export function landmarkAt(world: Overworld, x: number, y: number): Landmark | null {
  return world.landmarks.find((spot) => x >= spot.x && x < spot.x + spot.w && y >= spot.y && y < spot.y + spot.h) ?? null;
}

export function stepToward(world: Overworld, from: { x: number; y: number }, to: { x: number; y: number }): { x: number; y: number } {
  if (from.x === to.x && from.y === to.y) return from;
  const dx = Math.sign(to.x - from.x);
  const dy = Math.sign(to.y - from.y);
  const options = [
    { x: from.x + dx, y: from.y },
    { x: from.x, y: from.y + dy },
    { x: from.x + dx, y: from.y + dy },
  ];
  for (const next of options) {
    if ((next.x !== from.x || next.y !== from.y) && canWalk(world, next.x, next.y)) return next;
  }
  return from;
}

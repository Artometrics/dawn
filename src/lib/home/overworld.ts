/** Kenney Tiny Town, CC0. Packed sheet is 16×16, 12 columns, no spacing. */
export const TILE = 16;
export const SHEET_COLS = 12;
export const SHEET_SRC = '/tiles/kenney-tiny-town.png';
export const PLAYER_SRC = '/sprites/agents/scout.png';

export const WORLD_W = 40;
export const WORLD_H = 30;

const GRASS = [0, 1, 2] as const;
const PATH = 25;
const FLOWER = 43;

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
  ground: number[][];
  object: (number | null)[][];
  solid: boolean[][];
  landmarks: Landmark[];
  spawn: { x: number; y: number };
};

type Stamp = { x: number; y: number; w: number; h: number; tiles: number[] };

const LANDMARKS: Landmark[] = [
  {
    id: 'agents',
    name: 'Agents HQ',
    kind: 'Agents',
    blurb: 'Your agents, their memory, and the desk.',
    href: '/agents',
    suggestion: 'Open the agents desk',
    x: 3,
    y: 3,
    w: 6,
    h: 3,
    approach: { x: 5, y: 6 },
  },
  {
    id: 'editor',
    name: 'Code workshop',
    kind: 'Editor',
    blurb: 'Dawn Code, on this host.',
    href: '/editor',
    suggestion: 'Open the editor',
    x: 28,
    y: 4,
    w: 4,
    h: 2,
    approach: { x: 30, y: 6 },
  },
  {
    id: 'studio',
    name: 'Studio',
    kind: 'Studio',
    blurb: 'The studio chat.',
    href: '/studio',
    suggestion: 'Ask in the studio',
    x: 16,
    y: 8,
    w: 3,
    h: 2,
    approach: { x: 17, y: 10 },
  },
  {
    id: 'recipes',
    name: 'Recipes boutique',
    kind: 'Recipes',
    blurb: 'Style recipes you can like, save, or skip.',
    href: '/agents?section=recipes',
    suggestion: 'Browse style recipes',
    x: 4,
    y: 16,
    w: 4,
    h: 2,
    approach: { x: 6, y: 18 },
  },
  {
    id: 'letter',
    name: 'Letter post',
    kind: 'Letter',
    blurb: 'The public letter. Sending still waits for a click.',
    href: '/letter',
    suggestion: 'Read the letter',
    x: 26,
    y: 16,
    w: 4,
    h: 2,
    approach: { x: 28, y: 18 },
  },
  {
    id: 'atlas',
    name: 'Atlas',
    kind: 'Atlas',
    blurb: 'A day on the Stanford walk.',
    href: '/atlas',
    suggestion: 'Walk the atlas',
    x: 30,
    y: 22,
    w: 3,
    h: 3,
    approach: { x: 31, y: 25 },
  },
];

const STAMPS: Record<string, number[]> = {
  agents: [96, 99, 100, 101, 102, 98, 108, 111, 112, 113, 114, 110, 120, 123, 125, 126, 124, 122],
  editor: [48, 49, 50, 51, 76, 88, 90, 79],
  studio: [52, 53, 55, 84, 85, 86],
  recipes: [63, 64, 66, 67, 84, 85, 86, 87],
  letter: [52, 53, 54, 55, 72, 84, 85, 75],
  atlas: [96, 100, 98, 108, 113, 110, 120, 125, 122],
};

export function buildOverworld(): Overworld {
  const w = WORLD_W;
  const h = WORLD_H;
  const ground: number[][] = Array.from({ length: h }, (_, y) =>
    Array.from({ length: w }, (_, x) => {
      const n = hash(x, y);
      if (n % 17 === 0) return GRASS[1];
      if (n % 19 === 0) return GRASS[2];
      return GRASS[0];
    }),
  );
  const object: (number | null)[][] = Array.from({ length: h }, () => Array<number | null>(w).fill(null));
  const solid: boolean[][] = Array.from({ length: h }, () => Array<boolean>(w).fill(false));
  const road: boolean[][] = Array.from({ length: h }, () => Array<boolean>(w).fill(false));
  const spawn = { x: 20, y: 14 };

  for (const spot of LANDMARKS) {
    pave(ground, road, spawn.x, spawn.y, spot.approach.x, spot.approach.y);
  }

  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      if (!road[y][x]) continue;
      if (hash(x, y + 3) % 5 === 0 && inside(x, y - 1, w, h) && !road[y - 1][x]) ground[y - 1][x] = FLOWER;
    }
  }

  for (const spot of LANDMARKS) {
    stamp({ x: spot.x, y: spot.y, w: spot.w, h: spot.h, tiles: STAMPS[spot.id] }, object, solid);
  }

  // A sign and a chest sit beside buildings. They are objects, not extra characters.
  put(object, solid, 25, 17, 83, true);
  put(object, solid, 10, 6, 107, true);
  put(object, solid, 15, 11, 29, false);

  fence(object, solid, 8, 22, 18, 28, { x: 13, y: 22 });
  for (let y = 24; y <= 26; y += 2) {
    for (let x = 10; x <= 16; x += 2) {
      if (solid[y][x] || solid[y - 1][x] || object[y][x] || object[y - 1][x]) continue;
      put(object, solid, x, y - 1, 9, false);
      put(object, solid, x, y, 21, false);
    }
  }

  const quiet = new Set<string>();
  for (const spot of LANDMARKS) {
    for (let y = spot.y - 1; y <= spot.y + spot.h; y += 1) {
      for (let x = spot.x - 1; x <= spot.x + spot.w; x += 1) quiet.add(`${x},${y}`);
    }
  }
  for (let y = spawn.y - 2; y <= spawn.y + 2; y += 1) {
    for (let x = spawn.x - 2; x <= spawn.x + 2; x += 1) quiet.add(`${x},${y}`);
  }

  const trees: [number, number][] = [
    [4, 16],
    [6, 18],
    [5, 16],
    [8, 20],
  ];
  for (let x = 1; x < w - 1; x += 2) {
    plant(object, solid, road, quiet, x, 1, trees[x % trees.length]);
    plant(object, solid, road, quiet, x, h - 2, trees[(x + 1) % trees.length]);
  }
  for (let y = 3; y < h - 2; y += 2) {
    plant(object, solid, road, quiet, 1, y, trees[y % trees.length]);
    plant(object, solid, road, quiet, w - 2, y, trees[(y + 2) % trees.length]);
  }
  for (const [x, y] of [
    [11, 9],
    [12, 20],
    [23, 5],
    [33, 14],
    [21, 24],
  ] as const) {
    plant(object, solid, road, quiet, x, y, trees[(x + y) % trees.length]);
  }

  // Doors stay open even if a later prop landed on them.
  for (const spot of LANDMARKS) {
    const { x, y } = spot.approach;
    solid[y][x] = false;
    object[y][x] = null;
    ground[y][x] = PATH;
  }
  solid[spawn.y][spawn.x] = false;
  object[spawn.y][spawn.x] = null;

  return { w, h, ground, object, solid, landmarks: LANDMARKS, spawn };
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

function stamp(stamp: Stamp, object: (number | null)[][], solid: boolean[][]) {
  for (let i = 0; i < stamp.tiles.length; i += 1) {
    const x = stamp.x + (i % stamp.w);
    const y = stamp.y + Math.floor(i / stamp.w);
    put(object, solid, x, y, stamp.tiles[i], true);
  }
}

function put(object: (number | null)[][], solid: boolean[][], x: number, y: number, tile: number, blocks: boolean) {
  if (y < 0 || x < 0 || y >= object.length || x >= object[0].length) return;
  object[y][x] = tile;
  if (blocks) solid[y][x] = true;
}

function plant(
  object: (number | null)[][],
  solid: boolean[][],
  road: boolean[][],
  quiet: Set<string>,
  x: number,
  y: number,
  tree: [number, number],
) {
  const [canopy, trunk] = tree;
  if (y <= 0) return;
  if (quiet.has(`${x},${y}`) || quiet.has(`${x},${y - 1}`)) return;
  if (road[y][x] || road[y - 1]?.[x]) return;
  if (solid[y][x] || solid[y - 1][x] || object[y][x] || object[y - 1][x]) return;
  put(object, solid, x, y - 1, canopy, true);
  put(object, solid, x, y, trunk, true);
}

function fence(
  object: (number | null)[][],
  solid: boolean[][],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  gap: { x: number; y: number },
) {
  for (let x = x0; x <= x1; x += 1) {
    put(object, solid, x, y0, 44, true);
    put(object, solid, x, y1, 80, true);
  }
  for (let y = y0; y <= y1; y += 1) {
    put(object, solid, x0, y, 47, true);
    put(object, solid, x1, y, 71, true);
  }
  put(object, solid, x0, y0, 45, true);
  put(object, solid, x1, y0, 45, true);
  put(object, solid, x0, y1, 68, true);
  put(object, solid, x1, y1, 70, true);
  solid[gap.y][gap.x] = false;
  object[gap.y][gap.x] = null;
}

function pave(ground: number[][], road: boolean[][], x0: number, y0: number, x1: number, y1: number) {
  let x = x0;
  let y = y0;
  ground[y][x] = PATH;
  road[y][x] = true;
  while (x !== x1) {
    x += Math.sign(x1 - x);
    ground[y][x] = PATH;
    road[y][x] = true;
  }
  while (y !== y1) {
    y += Math.sign(y1 - y);
    ground[y][x] = PATH;
    road[y][x] = true;
  }
}

function inside(x: number, y: number, w: number, h: number): boolean {
  return x >= 0 && y >= 0 && x < w && y < h;
}

function hash(x: number, y: number): number {
  return Math.abs((x * 374761393 + y * 668265263) | 0);
}

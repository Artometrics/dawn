/** Kenney Tiny Dungeon, CC0. Packed sheet is 16×16 with no spacing. */
export const TILE = 16;
export const COLS = 16;
export const ROWS = 11;
export const FLOOR = 49;
export const WALL = 36;
export const CRATE = 73;

export function buildHq(): number[][] {
  const grid = Array.from({ length: ROWS }, () => Array<number>(COLS).fill(FLOOR));
  for (let x = 0; x < COLS; x += 1) {
    grid[0][x] = WALL;
    grid[ROWS - 1][x] = WALL;
  }
  for (let y = 0; y < ROWS; y += 1) {
    grid[y][0] = WALL;
    grid[y][COLS - 1] = WALL;
  }
  grid[4][7] = CRATE;
  grid[4][8] = CRATE;
  grid[5][7] = CRATE;
  return grid;
}

export function isFloor(grid: number[][], x: number, y: number): boolean {
  return y >= 0 && x >= 0 && y < grid.length && x < grid[0].length && grid[y][x] === FLOOR;
}

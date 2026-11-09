/** Path colors sampled from public/maps/dawn-town-staging.png. Buildings, trees, and roofs fail this test. */
export function isTownPath(r: number, g: number, b: number): boolean {
  return r > 120 && g > 70 && b < 150 && r > b + 15 && Math.abs(r - g) < 90 && g + 15 > b && !(g > r + 25);
}

/** Painted red-cap figure in the source plate, in image pixels. Covered when the walker is drawn so two players do not stack. */
export const PAINTED_PLAYER = { x: 358, y: 648, w: 52, h: 60 };

/** A path patch used to fill the painted figure. */
export const PATH_PATCH = { x: 300, y: 668, w: 52, h: 60 };

export type TownDoor = {
  id: string;
  name: string;
  person: string;
  x: number;
  y: number;
  href: string;
};

/** Door cells that landed on path pixels of the staging plate. */
export const TOWN_DOORS: TownDoor[] = [
  { id: 'agents', name: 'Agents HQ', person: 'agents-desk', x: 206, y: 559, href: '/agents' },
  { id: 'editor', name: 'Code workshop', person: 'code-mage', x: 560, y: 537, href: '/editor' },
  { id: 'recipes', name: 'Recipes boutique', person: 'recipe-keeper', x: 190, y: 755, href: '/artifacts' },
  { id: 'letter', name: 'Letter post office', person: 'letter-carrier', x: 570, y: 715, href: '/letter' },
  { id: 'studio', name: 'Studio', person: 'studio-painter', x: 189, y: 918, href: '/projects' },
  { id: 'atlas', name: 'Atlas', person: 'atlas-scout', x: 565, y: 944, href: '/atlas' },
];

export function pathCell(grid: Uint8Array, cols: number, x: number, y: number, originY: number, cell: number): boolean {
  const cx = Math.floor(x / cell);
  const cy = Math.floor((y - originY) / cell);
  if (cx < 0 || cy < 0 || cx >= cols) return false;
  const index = cy * cols + cx;
  return index >= 0 && index < grid.length && grid[index] === 1;
}

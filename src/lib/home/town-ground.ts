/** Path colors sampled from public/maps/dawn-town-staging.png. */
export function isTownPath(r: number, g: number, b: number): boolean {
  return r > 120 && g > 70 && b < 150 && r > b + 15 && Math.abs(r - g) < 90 && g + 15 > b && !(g > r + 25);
}

/** Grass and dirt are walkable. Roofs, dark trees, and shadows are not. */
export function isTownWalkable(r: number, g: number, b: number): boolean {
  if (isTownPath(r, g, b)) return true;
  if (r + g + b < 220) return false;
  if (r > 155 && g < 115 && b < 120 && r > g + 30) return false;
  return g > r + 10 && g > b && g > 100 && g < 220 && r < 170;
}

/** Hat, shirt, skin, and pants of the figure painted into the plate. */
export function isPaintedPlayerPixel(r: number, g: number, b: number): boolean {
  const hat = r > 160 && g < 110 && b < 110 && r > g + 40;
  const shirt = b > 140 && b > r + 30 && r < 140;
  const skin = r > 190 && g > 120 && g < 190 && b > 90 && b < 170 && r > b;
  const pants = r > 70 && r < 140 && g > 35 && g < 90 && b < 60 && r > g + 15;
  return hat || shirt || skin || pants;
}

/** Grass in the staging plate. Used only to find the painted figure, not as a walk rule. */
export function isTownGrass(r: number, g: number, b: number): boolean {
  return g > r + 12 && g > b && g > 110 && r < 150 && b < 170;
}

/** Painted red-cap figure in the source plate, in image pixels. The PNG file stays as it is. */
export const PAINTED_PLAYER = { x: 348, y: 636, w: 74, h: 96 };

/** A grass patch to the right of the figure. Copied only onto the figure pixels. */
export const GRASS_DONOR = { x: 452, y: 660 };

/**
 * Replace only non-grass pixels inside the painted figure with the grass patch
 * at the same offset. Grass and the rest of the plate are left unchanged.
 * Returns how many pixels were covered.
 */
export function coverPaintedFigure(width: number, pixels: Uint8Array | Uint8ClampedArray): number {
  const { x, y, w, h } = PAINTED_PLAYER;
  let covered = 0;
  for (let row = y; row < y + h; row += 1) {
    for (let col = x; col < x + w; col += 1) {
      const index = (row * width + col) * 4;
      if (isTownGrass(pixels[index], pixels[index + 1], pixels[index + 2])) continue;
      const donor = ((GRASS_DONOR.y + (row - y)) * width + (GRASS_DONOR.x + (col - x))) * 4;
      if (donor < 0 || donor + 2 >= pixels.length || !isTownGrass(pixels[donor], pixels[donor + 1], pixels[donor + 2])) continue;
      pixels[index] = pixels[donor];
      pixels[index + 1] = pixels[donor + 1];
      pixels[index + 2] = pixels[donor + 2];
      covered += 1;
    }
  }
  return covered;
}

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

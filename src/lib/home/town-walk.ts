export type Point = { x: number; y: number };
export type Bounds = { minX: number; minY: number; maxX: number; maxY: number };

export function stepHero(pos: Point, dir: Point, bounds: Bounds, step = 28): Point {
  return {
    x: clamp(pos.x + dir.x * step, bounds.minX, bounds.maxX),
    y: clamp(pos.y + dir.y * step, bounds.minY, bounds.maxY),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

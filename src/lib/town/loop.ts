/** Same floor index as hq-map.ts (Kenney sand tile). Kept local so this file can run in node tests. */
const FLOOR = 49;

export type Spot = { x: number; y: number };

function walkable(grid: number[][], x: number, y: number): boolean {
  return y >= 0 && x >= 0 && y < grid.length && x < grid[0].length && grid[y][x] === FLOOR;
}

/** AI Town walks to a spot, then invites someone close enough to talk. */
export const TALK_DISTANCE = 1;

export function chebyshev(a: Spot, b: Spot): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

export function stepToward(grid: number[][], from: Spot, to: Spot, blocked: Spot[]): Spot {
  if (chebyshev(from, to) <= TALK_DISTANCE) return from;
  const options = [
    { x: from.x + 1, y: from.y },
    { x: from.x - 1, y: from.y },
    { x: from.x, y: from.y + 1 },
    { x: from.x, y: from.y - 1 },
  ].filter((spot) => walkable(grid, spot.x, spot.y) && !blocked.some((tile) => tile.x === spot.x && tile.y === spot.y));
  options.sort((left, right) => chebyshev(left, to) - chebyshev(right, to));
  return options[0] ?? from;
}

/** Token overlap stands in for AI Town's embedding search until vector memory is stored. */
export function rankMemories<T extends { text: string; createdAt: number; importance?: number }>(
  memories: T[],
  query: string,
  count: number,
  now = Date.now(),
): T[] {
  const words = new Set(query.toLowerCase().split(/\W+/).filter((word) => word.length > 2));
  return memories
    .map((memory) => {
      const tokens = memory.text.toLowerCase().split(/\W+/);
      const overlap = tokens.filter((token) => words.has(token)).length;
      const hours = (now - memory.createdAt) / 1000 / 60 / 60;
      const recency = 0.99 ** Math.floor(Math.max(0, hours));
      const importance = (memory.importance ?? 5) / 9;
      return { memory, score: overlap + recency + importance };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, count)
    .map((item) => item.memory);
}

/**
 * AI Town reflects after the latest memories sum past 500 importance.
 * This slice uses 15 so a short visit can still reflect. The original gate is in ROADMAP.md.
 */
export function shouldReflect(importanceSince: number): boolean {
  return importanceSince >= 15;
}

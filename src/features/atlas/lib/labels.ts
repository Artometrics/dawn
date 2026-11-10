import type { XY } from './geo.ts';

export type MarkerInput = {
  id: string;
  /** Screen position of the pin point. */
  at: XY;
  /** Higher wins a crowded spot. */
  priority: number;
  /** Pixel width of the full pill label. */
  pillWidth: number;
  /** Always shown as a pill, even if it overlaps (the selected stop). */
  force?: boolean;
};

export type MarkerLayout = { id: string; mode: 'pill' | 'dot' };

const PILL_H = 44;
const DOT = 44;

type Box = { x0: number; y0: number; x1: number; y1: number };

const overlaps = (a: Box, b: Box) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

/**
 * Greedy label placement. Highest priority first: a marker gets its pill when the pill clears every
 * pill already placed and every other marker's pin point, otherwise it shrinks to a dot. Stable for equal priorities (input order).
 */
export function layoutMarkers(markers: MarkerInput[], pillGap = 4): MarkerLayout[] {
  const order = markers
    .map((marker, index) => ({ marker, index }))
    .sort((a, b) => b.marker.priority - a.marker.priority || a.index - b.index);
  const pills: Box[] = [];
  const result = new Map<string, 'pill' | 'dot'>();
  for (const { marker } of order) {
    const pill: Box = {
      x0: marker.at.x - 6,
      y0: marker.at.y - PILL_H / 2 - pillGap,
      x1: marker.at.x - 6 + marker.pillWidth,
      y1: marker.at.y + PILL_H / 2 + pillGap,
    };
    const coversPin = order.some(({ marker: other }) => {
      if (other.id === marker.id) return false;
      const dot: Box = { x0: other.at.x - DOT / 4, y0: other.at.y - DOT / 4, x1: other.at.x + DOT / 4, y1: other.at.y + DOT / 4 };
      return overlaps(pill, dot);
    });
    if (marker.force || (!coversPin && !pills.some((box) => overlaps(box, pill)))) {
      pills.push(pill);
      result.set(marker.id, 'pill');
    } else result.set(marker.id, 'dot');
  }
  return markers.map((marker) => ({ id: marker.id, mode: result.get(marker.id) ?? 'dot' }));
}

/**
 * The home map is one swappable layer.
 * This staging plate is the approved Dawn Town comp, cropped to the map.
 * Drop in a Tiled map later by replacing `activeMapLayer()` with a loader
 * for `public/maps/dawn-town.tmj` (kind: 'tiled'). Do not use a ripped game map.
 */
export type MapHotspot = {
  id: string;
  name: string;
  kind: string;
  blurb: string;
  href: string;
  suggestion: string;
  /** Rectangle in source-image pixels. */
  x: number;
  y: number;
  w: number;
  h: number;
};

export type MapLayer = {
  id: string;
  kind: 'staging-image' | 'tiled';
  src: string;
  width: number;
  height: number;
  /** The pannable map inside the file. The rest of a comp (status bar, sheet) stays out. */
  view: { x: number; y: number; w: number; h: number };
  hotspots: MapHotspot[];
};

const buildings: MapHotspot[] = [
  { id: 'agents', name: 'Agents HQ', kind: 'Agents', blurb: 'Your agents and their desk.', href: '/agents', suggestion: 'Open the agents desk', x: 60, y: 380, w: 260, h: 180 },
  { id: 'editor', name: 'Code workshop', kind: 'Editor', blurb: 'Dawn Code, on this host.', href: '/editor', suggestion: 'Open the editor', x: 420, y: 370, w: 280, h: 180 },
  { id: 'recipes', name: 'Recipes boutique', kind: 'Recipes', blurb: 'Style recipes you can like, save, or skip.', href: '/agents?section=recipes', suggestion: 'Browse style recipes', x: 40, y: 580, w: 300, h: 180 },
  { id: 'letter', name: 'Letter post office', kind: 'Letter', blurb: 'The public letter. Sending still waits for a click.', href: '/letter', suggestion: 'Read the letter', x: 400, y: 560, w: 340, h: 160 },
  { id: 'studio', name: 'Studio', kind: 'Studio', blurb: 'The studio chat.', href: '/studio', suggestion: 'Ask in the studio', x: 30, y: 770, w: 310, h: 190 },
  { id: 'atlas', name: 'Atlas', kind: 'Atlas', blurb: 'A day on the Stanford walk.', href: '/atlas', suggestion: 'Walk the atlas', x: 400, y: 750, w: 330, h: 220 },
];

export const STAGING_MAP: MapLayer = {
  id: 'dawn-town-staging',
  kind: 'staging-image',
  src: '/maps/dawn-town-staging.png',
  width: 768,
  height: 1376,
  view: { x: 0, y: 280, w: 768, h: 700 },
  hotspots: buildings,
};

/** Live home map. Swap the return value when a .tmj map is ready. */
export function activeMapLayer(): MapLayer {
  return STAGING_MAP;
}

export function hotspotAt(layer: MapLayer, x: number, y: number): MapHotspot | null {
  return layer.hotspots.find((spot) => x >= spot.x && x < spot.x + spot.w && y >= spot.y && y < spot.y + spot.h) ?? null;
}

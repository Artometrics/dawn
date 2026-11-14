import { distance } from './geo.ts';
import { hash } from './rng.ts';
import type { LngLat, Place, PoiSeed, TileFeature } from './types.ts';

/** OpenMapTiles class/subclass → Questroad amenity key. Unknown classes are not places. */
export function tileKind(cls?: string, sub?: string): string | null {
  const c = cls ?? '';
  const sc = sub ?? '';
  if (c === 'cafe') return 'cafe';
  if (c === 'restaurant' || c === 'bakery' || c === 'ice_cream') return 'restaurant';
  if (c === 'fast_food') return 'fast_food';
  if (c === 'bar' || c === 'beer') return 'bar';
  if (c === 'place_of_worship') return 'place_of_worship';
  if (c === 'fuel' && sc === 'fuel') return 'fuel';
  if (c === 'library') return 'library';
  if (c === 'bank') return 'bank';
  if (c === 'pharmacy') return 'pharmacy';
  if (c === 'museum' || (c === 'art_gallery' && sc !== 'artwork')) return 'museum';
  if (c === 'art_gallery') return 'artwork';
  if ((c === 'park' && sc === 'park') || (c === 'garden' && sc === 'garden')) return 'park';
  if (c === 'theatre' || c === 'cinema') return 'theatre';
  if (c === 'attraction') return 'attraction';
  if (c === 'monument' || c === 'castle') return 'historic';
  if (c === 'college' && sc === 'university') return 'university';
  if (c === 'stadium' && sc === 'stadium') return 'stadium';
  if (c === 'town_hall' && sc === 'townhall') return 'townhall';
  if (c === 'railway' && sc === 'station') return 'train_station';
  return null;
}

export const POI_KIND: Record<string, [string, string]> = {
  cafe: ['poi_tavern', 'Tavern'],
  restaurant: ['poi_feast', 'Feast Hall'],
  fast_food: ['poi_feast', 'Feast Hall'],
  bar: ['poi_tavern', 'Tavern'],
  pub: ['poi_tavern', 'Tavern'],
  place_of_worship: ['poi_shrine', 'Shrine'],
  fuel: ['poi_alchemist', 'Alchemist'],
  library: ['poi_archive', 'Archive'],
  bank: ['poi_treasury', 'Treasury'],
  pharmacy: ['poi_apothecary', 'Apothecary'],
  museum: ['poi_relic', 'Relic Hall'],
  park: ['poi_grove', 'Grove'],
  theatre: ['poi_bard', 'Bard Hall'],
  attraction: ['poi_relic', 'Landmark'],
  historic: ['poi_relic', 'Ruin'],
  university: ['poi_archive', 'Academy'],
  artwork: ['poi_bard', 'Statue'],
  viewpoint: ['poi_site', 'Lookout'],
  townhall: ['poi_treasury', 'Keep'],
  train_station: ['poi_site', 'Waystation'],
  stadium: ['poi_site', 'Arena'],
};

export const HEAL_KINDS = new Set(['Tavern', 'Feast Hall', 'Apothecary']);

/** Landmark lairs. A museum is a boss; a cafe or a library is not. */
export const BOSS_KINDS = new Set(['attraction', 'historic', 'museum', 'stadium', 'townhall']);

export const BOSSES: [string, string][] = [
  ['mon_cyclops', 'Bell-Tower Golem'],
  ['mon_demon', 'Fog Wyrm'],
  ['mon_ghost', 'Cloister Wraith'],
  ['mon_beetle', 'Stadium Behemoth'],
  ['mon_spider', 'Redwood Spider Queen'],
  ['mon_slime', 'Quad Ooze King'],
];

export const SCAN_RADIUS_M = 1500;
export const POI_CAP = 70;
export const BOSS_CAP = 4;

/** Curated landmarks so the map has places before tiles arrive, and offline. Coordinates are approximate. */
const BASE_ROWS: [number, number, number, string, string, number?][] = [
  [1, 37.788, -122.4075, 'park', 'Union Square'],
  [2, 37.7955, -122.3937, 'museum', 'Ferry Building', 1],
  [3, 37.7952, -122.4028, 'attraction', 'Transamerica Pyramid', 1],
  [4, 37.7929, -122.4058, 'place_of_worship', "Old St. Mary's"],
  [5, 37.7976, -122.4065, 'library', 'City Lights Books'],
  [6, 37.8024, -122.4058, 'attraction', 'Coit Tower', 1],
  [20, 37.4275, -122.1666, 'attraction', 'Hoover Tower', 1],
  [21, 37.4268, -122.1703, 'place_of_worship', 'Memorial Church', 1],
  [22, 37.4274, -122.1697, 'park', 'Main Quad'],
  [23, 37.4295, -122.1695, 'park', 'The Oval'],
  [24, 37.433, -122.1704, 'museum', 'Cantor Arts Center', 1],
  [25, 37.4268, -122.1672, 'library', 'Green Library'],
  [26, 37.4346, -122.1611, 'attraction', 'Stanford Stadium', 1],
  [27, 37.4245, -122.1708, 'cafe', 'Tresidder Union'],
  [28, 37.4326, -122.1712, 'artwork', 'Rodin Sculpture Garden'],
  [40, 37.4434, -122.165, 'train_station', 'Palo Alto Caltrain'],
  [41, 37.4446, -122.172, 'historic', 'El Palo Alto', 1],
  [42, 37.4443, -122.1607, 'townhall', 'Palo Alto City Hall'],
  [43, 37.4448, -122.1612, 'park', 'Lytton Plaza'],
];

export const BASE_SEEDS: PoiSeed[] = BASE_ROWS.map((row) => ({
  id: `b${row[0]}`,
  lat: row[1],
  lon: row[2],
  tags: { amenity: row[3], name: row[4] },
  boss: row[5] ? true : undefined,
}));

export const DEFAULT_CENTER: LngLat = [-122.4075, 37.788];

export function toPlace(seed: PoiSeed): Place {
  const key = seed.tags.amenity;
  const kind = POI_KIND[key] ?? ['poi_site', 'Site'];
  const named = !!seed.tags.name;
  const boss = seed.boss != null ? seed.boss : BOSS_KINDS.has(key) && named;
  return {
    id: String(seed.id),
    ll: [seed.lon, seed.lat],
    kind,
    name: seed.tags.name || '',
    boss,
    bossKind: BOSSES[hash(String(seed.id)) % BOSSES.length],
    amenity: key,
  };
}

/** Drops a later place that shares a name with one already kept within 150 m. */
export function dedupe(list: Place[]): Place[] {
  const out: Place[] = [];
  for (const place of list) {
    if (place.ll[0] == null || Number.isNaN(place.ll[1])) continue;
    if (place.name && out.some((kept) => kept.name === place.name && distance(kept.ll, place.ll) < 150)) continue;
    out.push(place);
  }
  return out;
}

/** Keeps the closest landmark bosses and turns the rest into ordinary places. */
export function capBosses(list: Place[], center: LngLat, max = BOSS_CAP): Place[] {
  const bosses = list.filter((place) => place.boss).sort((a, b) => distance(center, a.ll) - distance(center, b.ll));
  const demote = new Set(bosses.slice(max).map((place) => place.id));
  if (!demote.size) return list;
  return list.map((place) => (demote.has(place.id) ? { ...place, boss: false } : place));
}

function featureSeed(feature: TileFeature): PoiSeed | null {
  const kind = tileKind(feature.properties?.class, feature.properties?.subclass);
  const name = feature.properties?.name;
  const coords = feature.geometry?.coordinates;
  if (!kind || !name || feature.geometry?.type !== 'Point' || !coords || coords.length < 2) return null;
  const lon = coords[0];
  const lat = coords[1];
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
  const id = `t${feature.id ?? hash(name + coords.join(','))}`;
  return { id, lat, lon, tags: { amenity: kind, name: String(name).slice(0, 40) } };
}

/**
 * Read POIs from a `querySourceFeatures('openmaptiles', { sourceLayer: 'poi' })` result.
 * Empty input still returns the curated landmarks. Tile hits are capped at 70 inside 1,500 m,
 * then bosses are capped at 4.
 */
export function scanPlaces(
  features: TileFeature[],
  center: LngLat,
  pool: Map<string, PoiSeed> = new Map(),
): { pool: Map<string, PoiSeed>; places: Place[] } {
  const next = new Map(pool);
  if (features.length) {
    for (const feature of features) {
      const seed = featureSeed(feature);
      if (!seed || next.has(seed.id)) continue;
      next.set(seed.id, seed);
    }
    const near = [...next.values()].filter((seed) => distance(center, [seed.lon, seed.lat]) < SCAN_RADIUS_M);
    next.clear();
    near.forEach((seed) => next.set(seed.id, seed));
  }
  const picked = [...next.values()]
    .filter((seed) => distance(center, [seed.lon, seed.lat]) < SCAN_RADIUS_M)
    .sort((a, b) => distance(center, [a.lon, a.lat]) - distance(center, [b.lon, b.lat]))
    .slice(0, POI_CAP);
  const places = capBosses(dedupe([...BASE_SEEDS, ...picked].map(toPlace)), center);
  return { pool: next, places };
}

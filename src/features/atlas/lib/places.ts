import { createProjector, metresBetween } from './geo.ts';
import type { AtlasPlace, CatalogPlace, PlaceMapState, Region, Stop } from './types.ts';

/** Cardinal Quest flagged a linked stop that sits more than this far from its catalog point. */
export const MARKER_OFFSET_FLAG_M = 50;

export function osmUrl(place: CatalogPlace): string | null {
  return place.osm ? `https://www.openstreetmap.org/${place.osm.type}/${place.osm.id}` : null;
}

function catalogState(place: CatalogPlace, inside: boolean): PlaceMapState {
  if (place.noPin) return 'no-pin';
  if (place.lat === null || place.lon === null) return place.linear ? 'line' : 'needs-point';
  return inside ? 'pin' : 'off-map';
}

function fromStop(stop: Stop, catalog: CatalogPlace | null): AtlasPlace {
  const linked = catalog && catalog.lat !== null && catalog.lon !== null ? catalog : null;
  const offset = linked ? metresBetween({ lat: stop.lat, lng: stop.lng }, { lat: linked.lat as number, lng: linked.lon as number }) : null;
  return {
    id: stop.id,
    kind: 'stop',
    name: stop.name,
    aka: catalog && catalog.name !== stop.name ? catalog.name : null,
    icon: stop.icon,
    lat: stop.lat,
    lng: stop.lng,
    mapState: 'stop',
    stop,
    catalog,
    markerOffsetM: offset,
    markerOffsetFlag: offset !== null && offset > MARKER_OFFSET_FLAG_M,
  };
}

/**
 * One list for the map and the panel. A story stop is pinned at its own coordinates, joined to its
 * catalog place when the doc links one. A catalog place with no stop is pinned only when the data
 * has a point, says pin, and falls inside the baked frame.
 */
export function buildPlaces(region: Region): AtlasPlace[] {
  const projector = createProjector(region.frame);
  const catalogById = new Map(region.catalog.map((place) => [place.id, place]));
  const linkedIds = new Set(region.stops.map((stop) => stop.locationId).filter((id): id is string => Boolean(id)));

  const places: AtlasPlace[] = region.stops.map((stop) => fromStop(stop, stop.locationId ? catalogById.get(stop.locationId) ?? null : null));

  for (const catalog of region.catalog) {
    if (linkedIds.has(catalog.id)) continue;
    const hasPoint = catalog.lat !== null && catalog.lon !== null;
    const inside = hasPoint && projector.inside(catalog.lat as number, catalog.lon as number);
    places.push({
      id: catalog.id,
      kind: 'catalog',
      name: catalog.name,
      aka: null,
      icon: catalog.privateProperty ? '\u{1F512}' : catalog.offCampus ? '\u{1F4CD}' : '\u{1F4CC}',
      lat: hasPoint && !catalog.noPin ? (catalog.lat as number) : null,
      lng: hasPoint && !catalog.noPin ? (catalog.lon as number) : null,
      mapState: catalogState(catalog, Boolean(inside)),
      stop: null,
      catalog,
      markerOffsetM: null,
      markerOffsetFlag: false,
    });
  }
  return places;
}

/** Places that get a marker on the baked map. */
export function pinnedPlaces(places: AtlasPlace[]): AtlasPlace[] {
  return places.filter((place) => place.mapState === 'stop' || place.mapState === 'pin');
}

/** The short name Cardinal Quest's catalog uses, without the parenthetical. */
export function shortName(name: string): string {
  return name.replace(/\s*\(.*\)\s*$/, '').trim();
}

export function matchesQuery(place: AtlasPlace, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const hay = [place.name, place.aka ?? '', place.stop?.years ?? '', place.stop?.facts.join(' ') ?? '']
    .join(' ')
    .toLowerCase();
  return needle.split(/\s+/).every((word) => hay.includes(word));
}

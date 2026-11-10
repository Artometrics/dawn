export type Source = { title: string; url: string };

export type Quiz = { question: string; answers: string[]; correct: number };

/** A story card: Cardinal Quest's "landmark". */
export type Stop = {
  id: string;
  name: string;
  icon: string;
  lat: number;
  lng: number;
  /** Display years, for example "1887–1906" or "late 1870s". */
  years: string;
  sortYear: number;
  /** The Cardinal Quest release that added the stop. */
  addedIn: 'v0' | 'v0.2' | 'v0.3';
  /** Where the stop's coordinates came from, as Cardinal Quest recorded it. */
  coordinateSource: string;
  /** Catalog place this stop is linked to, when the doc has one. */
  locationId: string | null;
  story: string;
  facts: string[];
  sources: Source[];
  quiz: Quiz;
};

export type CatalogPlace = {
  id: string;
  name: string;
  lat: number | null;
  lon: number | null;
  osm: { type: 'node' | 'way' | 'relation'; id: number } | null;
  bookScenes: { file: string; context?: string }[];
  podcastSegments: string[];
  note: string;
  offCampus: boolean;
  privateProperty: boolean;
  exteriorOnly: boolean;
  linear: boolean;
  needsPoint: boolean;
  noPin: boolean;
};

export type CatalogMeta = {
  title: string;
  version: string;
  derivedFrom: string;
  coordinateSource: string;
  osmUrlPattern: string;
  bookRepo: string;
  bookScenePath: string;
  podcastPath: string;
  flags: Record<string, string>;
};

export type Route = {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  stops: string[];
  km: number;
  /** Foot-routing line as [lng, lat] pairs, stop to stop. */
  line: [number, number][];
  /** One spoken line per stop. Only One Piece of Land has them. */
  bridge?: string[];
  outro?: string;
  prologue?: { text: string; sources: Source[] };
  side?: { stopId: string; text: string };
};

export type ThreadFact = { text: string; sources: Source[] };

export type Thread = {
  id: string;
  name: string;
  icon: string;
  color: string;
  book: string;
  description: string;
  stops: string[];
  facts: ThreadFact[];
};

export type TimelineEvent = {
  year: number;
  text: string;
  stopId: string | null;
  source: Source;
};

export type Frame = {
  bbox: { south: number; west: number; north: number; east: number };
  origin: { lat: number; lon: number };
};

/** How a catalog place shows on the map. */
export type PlaceMapState =
  | 'stop'
  | 'pin'
  | 'off-map'
  | 'line'
  | 'needs-point'
  | 'no-pin';

export type AtlasPlace = {
  /** The stop id for a story stop, otherwise the catalog id. */
  id: string;
  kind: 'stop' | 'catalog';
  name: string;
  /** The longer catalog name when it differs from the stop's. */
  aka: string | null;
  icon: string;
  lat: number | null;
  lng: number | null;
  mapState: PlaceMapState;
  stop: Stop | null;
  catalog: CatalogPlace | null;
  /** Metres between a stop's marker and its linked catalog point, when both exist. */
  markerOffsetM: number | null;
  /** True when the offset is large enough to flag (over 50 m, as Cardinal Quest checked). */
  markerOffsetFlag: boolean;
};

export type Region = {
  id: string;
  name: string;
  tagline: string;
  frame: Frame;
  basemapUrl: string;
  stops: Stop[];
  catalog: CatalogPlace[];
  catalogMeta: CatalogMeta;
  routes: Route[];
  threads: Thread[];
  events: TimelineEvent[];
  dailyNote: string;
  /** The route the map opens on. */
  openingRouteId: string;
  attribution: { text: string; href: string; licence: string };
};

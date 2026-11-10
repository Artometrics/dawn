import locations from './locations.json' with { type: 'json' };
import stopsFile from './stops.json' with { type: 'json' };
import routesFile from './routes.json' with { type: 'json' };
import threadsFile from './threads.json' with { type: 'json' };
import eventsFile from './events.json' with { type: 'json' };
import { CARDINAL_FRAME } from '../../lib/basemap-spec.ts';
import type { CatalogMeta, CatalogPlace, Region, Route, Stop, Thread, TimelineEvent } from '../../lib/types.ts';

export const CARDINAL: Region = {
  id: 'cardinal',
  name: 'Cardinal',
  tagline: 'Stanford, the Stanfords, the farm, the founding, the campus.',
  frame: CARDINAL_FRAME,
  basemapUrl: '/maps/atlas/cardinal-basemap.json',
  stops: stopsFile.stops as Stop[],
  catalog: locations.locations as CatalogPlace[],
  catalogMeta: locations._meta as CatalogMeta,
  routes: routesFile.routes as unknown as Route[],
  threads: threadsFile.threads as Thread[],
  events: eventsFile.events as TimelineEvent[],
  dailyNote: threadsFile.dailyNote,
  openingRouteId: 'founders',
  attribution: {
    text: '\u00a9 OpenStreetMap contributors',
    href: 'https://www.openstreetmap.org/copyright',
    licence: 'ODbL',
  },
};

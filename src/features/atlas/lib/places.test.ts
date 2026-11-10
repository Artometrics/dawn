import assert from 'node:assert/strict';
import test from 'node:test';
import { CARDINAL } from '../data/cardinal/index.ts';
import { buildPlaces, matchesQuery, osmUrl, pinnedPlaces, shortName } from './places.ts';

const places = buildPlaces(CARDINAL);
const byId = new Map(places.map((p) => [p.id, p]));

test('27 stops plus the 12 catalog places no stop links to', () => {
  assert.equal(places.length, 39);
  assert.equal(places.filter((p) => p.kind === 'stop').length, 27);
  assert.equal(places.filter((p) => p.kind === 'catalog').length, 12);
  assert.equal(new Set(places.map((p) => p.id)).size, 39);
});

test('map states follow the data flags', () => {
  const state = (id: string) => byId.get(id)?.mapState;
  assert.equal(state('quad'), 'stop');
  for (const id of ['el-palo-alto', 'palm-drive', 'hp-garage', 'stanford-daily-building', 'street-name-walk']) assert.equal(state(id), 'pin', id);
  for (const id of ['stanford-research-park', 'sand-hill-3000', 'rosewood-sand-hill']) assert.equal(state(id), 'off-map', id);
  assert.equal(state('san-francisquito-creek'), 'line');
  assert.equal(state('memorial-arch-site'), 'needs-point');
  assert.equal(state('applied-electronics-laboratory'), 'needs-point');
  assert.equal(state('google-garage-menlo-park'), 'no-pin');
  assert.equal(pinnedPlaces(places).length, 27 + 5);
});

test('a place that says no pin never gets coordinates, and private places are never stops', () => {
  const google = byId.get('google-garage-menlo-park');
  assert.equal(google?.lat, null);
  assert.equal(google?.lng, null);
  assert.equal(osmUrl(google!.catalog!), null);
  for (const place of places) if (place.catalog?.privateProperty) assert.equal(place.kind, 'catalog', place.id);
  assert.equal(byId.get('hp-garage')?.catalog?.exteriorOnly, true);
});

test('only Encina Hall is flagged: its marker is 64 m from the catalog point', () => {
  const flagged = places.filter((p) => p.markerOffsetFlag);
  assert.deepEqual(flagged.map((p) => p.id), ['encina']);
  assert.equal(Math.round(flagged[0].markerOffsetM ?? 0), 64);
  assert.equal(places.filter((p) => p.markerOffsetM !== null).length, 12);
  assert.ok(places.filter((p) => p.markerOffsetM !== null && !p.markerOffsetFlag).every((p) => (p.markerOffsetM ?? 0) <= 50));
});

test('a linked stop keeps its own name and shows the catalog name as aka', () => {
  assert.equal(byId.get('barn')?.name, 'Red Barn');
  assert.equal(byId.get('barn')?.aka, 'Red Barn (Palo Alto Stock Farm, Muybridge track)');
  assert.equal(shortName('Red Barn (Palo Alto Stock Farm, Muybridge track)'), 'Red Barn');
  assert.equal(osmUrl(byId.get('barn')!.catalog!), 'https://www.openstreetmap.org/way/232494091');
});

test('search matches names, the catalog name, years and facts', () => {
  const find = (q: string) => places.filter((p) => matchesQuery(p, q)).map((p) => p.id);
  assert.ok(find('muybridge').includes('barn'));
  assert.ok(find('1903').includes('memchu'));
  assert.ok(find('hp garage').includes('hp-garage'));
  assert.equal(find('').length, 39);
  assert.deepEqual(find('zzzz'), []);
});

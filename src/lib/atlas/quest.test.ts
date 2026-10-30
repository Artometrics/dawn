import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { CARDINAL_NOTE, CARDINAL_QUEST, DAY_START_NAME, isPlace, questPlaces, type Place } from './quest.ts';
import { pointAlong, walkDurationMs } from './walk.ts';

const places = JSON.parse(readFileSync(new URL('../../../data/atlas/stanford-places.json', import.meta.url), 'utf8')) as unknown[];

test('stanford places are name, lat, and lng only', () => {
  assert.equal(places.length, 50);
  assert.equal(places.every(isPlace), true);
  const names = new Set((places as Place[]).map((place) => place.name));
  assert.equal(names.size, 50);
});

test('cardinal quest resolves five dataset rows and does not invent a note', () => {
  const stops = questPlaces(places as Place[]);
  assert.deepEqual(stops.map((stop) => stop.label), [
    'El Palo Alto',
    'Stanford Red Barn',
    'Arizona Garden',
    'Lake Lagunita',
    'Hanna House',
  ]);
  assert.equal(stops[0].placeName, 'El Palo Alto Tree');
  assert.equal(stops[0].lat, 37.4473095);
  assert.equal(stops[2].name, 'Arizona Garden');
  assert.equal(CARDINAL_NOTE, 'Cardinal note coming soon');
  assert.equal(CARDINAL_QUEST.length, 5);
  assert.ok((places as Place[]).some((place) => place.name === DAY_START_NAME));
});

test('a walk starts at the first point and ends at the next', () => {
  const from = { lat: 37.43, lng: -122.17 };
  const to = { lat: 37.44, lng: -122.16 };
  assert.deepEqual(pointAlong(from, to, 0), from);
  assert.deepEqual(pointAlong(from, to, 1), to);
  const mid = pointAlong(from, to, 0.5);
  assert.ok(mid.lat > from.lat && mid.lat < to.lat);
  assert.ok(walkDurationMs(from, to) >= 1600);
  assert.ok(walkDurationMs(from, from) === 1600);
});

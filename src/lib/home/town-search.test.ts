import assert from 'node:assert/strict';
import test from 'node:test';
import { TOWN_CAST } from '../credits/town.ts';
import { activeMapLayer } from './map-layer.ts';
import { searchTown } from './town-search.ts';

const places = activeMapLayer().hotspots.map((spot) => ({
  id: spot.id,
  name: spot.name,
  kind: spot.kind,
  href: spot.href,
}));
const people = TOWN_CAST.map((person) => ({ id: person.id, name: person.name }));

test('a single letter does not match description words', () => {
  assert.deepEqual(searchTown('y', places, people), []);
  assert.deepEqual(searchTown('Y', places, people), []);
});

test('names open the existing place or person', () => {
  const atlas = searchTown('atlas', places, people);
  assert.equal(atlas.some((hit) => hit.kind === 'place' && hit.href === '/atlas'), true);
  assert.equal(atlas.some((hit) => hit.kind === 'person' && hit.id === 'atlas-scout'), true);
  const letter = searchTown('letter', places, people);
  assert.equal(letter.some((hit) => hit.href === '/letter'), true);
  assert.equal(letter.some((hit) => hit.id === 'letter-carrier'), true);
  assert.equal(searchTown('zzzz', places, people).length, 0);
  assert.equal(searchTown('   ', places, people).length, 0);
});

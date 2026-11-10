import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import test from 'node:test';
import { CARDINAL } from '../data/cardinal/index.ts';
import { decodeBasemap, decodePath, polygonArea, type BakedBasemap } from './basemap.ts';
import { createProjector } from './geo.ts';

const file = new URL('../../../../public/maps/atlas/cardinal-basemap.json', import.meta.url);
const baked = JSON.parse(readFileSync(file, 'utf8')) as BakedBasemap;
const projector = createProjector(CARDINAL.frame);

test('the baked basemap names OpenStreetMap and the ODbL, and uses the app frame', () => {
  assert.equal(baked.meta.attribution, '\u00a9 OpenStreetMap contributors');
  assert.match(baked.meta.licence, /ODbL/);
  assert.equal(baked.meta.copyrightUrl, 'https://www.openstreetmap.org/copyright');
  assert.deepEqual(baked.meta.bbox, CARDINAL.frame.bbox);
  assert.deepEqual(baked.meta.origin, CARDINAL.frame.origin);
  assert.match(baked.meta.osmBaseTimestamp ?? '', /^\d{4}-\d{2}-\d{2}T/);
});

test('the file stays small enough to ship as a static asset', () => {
  assert.ok(statSync(file).size < 1_000_000, `${statSync(file).size} bytes`);
});

test('delta decoding returns metre points and round trips an encoded line', () => {
  assert.deepEqual(decodePath([20, 40, 2, -2, 4, 6]), [[10, 20], [11, 19], [13, 22]]);
  assert.deepEqual(decodePath([]), []);
  assert.equal(polygonArea([[0, 0], [10, 0], [10, 10], [0, 10]]), 100);
});

test('the layers are populated and sit inside the frame', () => {
  const map = decodeBasemap(baked);
  assert.ok(map.buildingsLarge.length > 500 && map.buildingsSmall.length > 500);
  assert.ok(map.roads.major.length > 100 && map.roads.minor.length > 100 && map.roads.path.length > 100);
  assert.ok(map.water.length >= 1 && map.green.length > 50);
  const b = projector.bounds;
  const pad = 400;
  for (const building of [...map.buildingsLarge, ...map.buildingsSmall].slice(0, 2000)) {
    const [x, y] = building[0];
    assert.ok(x > b.x0 - pad && x < b.x1 + pad && y > b.y0 - pad && y < b.y1 + pad);
  }
  assert.ok(map.buildingsLarge.every((p) => polygonArea(p) >= 220));
  assert.ok(map.labels.length > 20 && map.labels.every((l) => l.text && Math.abs(l.angle) <= Math.PI / 2 + 0.01));
});

test('the Cardinal stops sit on the drawn campus: Main Quad is near a building and a road', () => {
  const map = decodeBasemap(baked);
  const quad = projector.toWorld(37.42749, -122.17179);
  const near = (lists: [number, number][][], radius: number) =>
    lists.some((poly) => poly.some(([x, y]) => Math.hypot(x - quad.x, y - quad.y) < radius));
  assert.ok(near(map.buildingsLarge, 80));
  assert.ok(near([...map.roads.minor, ...map.roads.major, ...map.roads.path], 80));
  const lagunita = projector.toWorld(37.42242, -122.17605);
  assert.ok(map.water.some((poly) => poly.some(([x, y]) => Math.hypot(x - lagunita.x, y - lagunita.y) < 200)), 'Lake Lagunita is on the map');
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { CARDINAL } from '../data/cardinal/index.ts';
import { createProjector, metresBetween, polylineLength } from './geo.ts';
import { emptyProgress } from './progress.ts';
import { ease, legDurationMs, legPoints, routeLine, routeProgress, spokenCard, spokenIntro, startStep, stopVertexIndexes, tourStep, walkDurationMs } from './tour.ts';

const projector = createProjector(CARDINAL.frame);
const stops = new Map(CARDINAL.stops.map((s) => [s.id, s]));

test('every route line reaches every stop, in order, within 200 m (the Lagunita marker is mid-lake)', () => {
  for (const route of CARDINAL.routes) {
    const line = routeLine(route, projector);
    const at = stopVertexIndexes(route, line, stops, projector);
    assert.equal(at.length, route.stops.length);
    assert.deepEqual([...at].sort((a, b) => a - b), at, `${route.id} indexes ascend`);
    route.stops.forEach((id, i) => {
      const stop = stops.get(id)!;
      const d = metresBetween({ lat: stop.lat, lng: stop.lng }, projector.fromWorld(line[at[i]]));
      assert.ok(d < 200, `${route.id}/${id} is ${Math.round(d)} m off the line`);
    });
  }
});

test('route line length matches the stated distance within a tenth', () => {
  for (const route of CARDINAL.routes) {
    const km = polylineLength(routeLine(route, projector)) / 1000;
    assert.ok(Math.abs(km - route.km) < 0.15, `${route.id}: ${km.toFixed(2)} vs ${route.km}`);
  }
});

test('legs join end to end and the sprite time stays between 1.4 and 7 seconds', () => {
  const route = CARDINAL.routes[0];
  const line = routeLine(route, projector);
  const at = stopVertexIndexes(route, line, stops, projector);
  let total = 0;
  for (let i = 0; i < route.stops.length - 1; i += 1) {
    const leg = legPoints(line, at, i, i + 1);
    assert.ok(leg.length >= 2);
    assert.deepEqual(leg[0], line[at[i]]);
    assert.deepEqual(leg.at(-1), line[at[i + 1]]);
    const ms = legDurationMs(leg);
    assert.ok(ms >= 1400 && ms <= 7000);
    total += polylineLength(leg);
  }
  assert.ok(Math.abs(total - polylineLength(line.slice(at[0], at.at(-1)! + 1))) < 1);
  assert.deepEqual(legPoints(line, at, 3, 2).at(0), line[at[3]]);
  assert.deepEqual(legPoints(line, at, 0, 99), []);
  assert.equal(walkDurationMs(0), 1400);
  assert.equal(walkDurationMs(1e6), 7000);
});

test('with anchors a leg starts and ends exactly on the stops, even when routing snapped away', () => {
  const route = CARDINAL.routes[3];
  const line = routeLine(route, projector);
  const at = stopVertexIndexes(route, line, stops, projector);
  const anchors = route.stops.map((id) => projector.toWorld(stops.get(id)!.lat, stops.get(id)!.lng));
  const leg = legPoints(line, at, 0, 1, anchors);
  assert.deepEqual(leg[0], anchors[0]);
  assert.deepEqual(leg.at(-1), anchors[1]);
  assert.equal(leg.length, legPoints(line, at, 0, 1).length + 2);
});

test('easing starts and ends at rest', () => {
  assert.equal(ease(0), 0);
  assert.equal(ease(1), 1);
  assert.equal(ease(0.5), 0.5);
  assert.equal(ease(-3), 0);
  assert.equal(ease(Number.NaN), 0);
});

test('route progress counts unlocked stops and names the next one', () => {
  const route = CARDINAL.routes[0];
  assert.deepEqual(routeProgress(route, emptyProgress()), { done: 0, total: 8, nextStopId: 'maus', complete: false });
  const some = { ...emptyProgress(), unlocked: ['maus', 'angel', 'quad'] };
  assert.deepEqual(routeProgress(route, some), { done: 3, total: 8, nextStopId: 'cactus', complete: false });
  assert.equal(startStep(route, some), 2);
  const all = { ...emptyProgress(), unlocked: route.stops };
  assert.equal(routeProgress(route, all).complete, true);
  assert.equal(startStep(route, all), 0);
});

test('spoken lines: welcome on stop one, "Stop N." after, bridges only where the route has them', () => {
  const founders = CARDINAL.routes[0];
  assert.equal(spokenIntro(founders, 0), `Welcome to The Founders' Walk. ${founders.description} Stop one.`);
  assert.equal(spokenIntro(founders, 3), 'Stop 4.');
  const land = CARDINAL.routes[4];
  assert.equal(spokenIntro(land, 0), `Welcome to One Piece of Land. ${land.description} Stop 1. ${land.bridge![0]}`);
  assert.equal(spokenIntro(land, 2), `Stop 3. ${land.bridge![2]}`);
  assert.equal(tourStep(land, 5).outro, land.outro);
  assert.equal(tourStep(land, 4).outro, null);
  assert.equal(tourStep(founders, 7).last, true);
  const quad = stops.get('quad')!;
  assert.equal(spokenCard(quad, 'Stop 7.'), `Stop 7. Main Quad. 1887 to 1906. ${quad.story}`);
});

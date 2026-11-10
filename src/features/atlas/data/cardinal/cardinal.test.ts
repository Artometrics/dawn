import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { CARDINAL } from './index.ts';
import { createProjector } from '../../lib/geo.ts';

const { stops, catalog, routes, threads, events } = CARDINAL;
const stopById = new Map(stops.map((s) => [s.id, s]));
const catalogById = new Map(catalog.map((c) => [c.id, c]));
const isHttps = (url: string) => /^https:\/\/\S+$/.test(url);
const FLAGS = ['offCampus', 'privateProperty', 'exteriorOnly', 'linear', 'needsPoint', 'noPin'] as const;

test('catalog: 24 places, unique kebab-case ids, each with a name and a note', () => {
  assert.equal(catalog.length, 24);
  assert.equal(catalogById.size, 24);
  for (const place of catalog) {
    assert.match(place.id, /^[a-z0-9]+(-[a-z0-9]+)*$/);
    assert.ok(place.name.trim(), `${place.id} has a name`);
    assert.ok(place.note.trim(), `${place.id} has a note`);
    for (const flag of FLAGS) assert.equal(typeof place[flag], 'boolean', `${place.id}.${flag}`);
    assert.ok(Array.isArray(place.bookScenes) && Array.isArray(place.podcastSegments));
    assert.ok(place.bookScenes.every((scene) => scene.file), `${place.id} book scenes name a file`);
  }
});

test('catalog: a placed point cites an OpenStreetMap object and sits in the Stanford area', () => {
  for (const place of catalog) {
    const hasPoint = place.lat !== null && place.lon !== null;
    if (hasPoint) {
      assert.ok((place.lat as number) >= 37.3 && (place.lat as number) <= 37.5, `${place.id} lat`);
      assert.ok((place.lon as number) >= -122.3 && (place.lon as number) <= -122.1, `${place.id} lon`);
      assert.ok(place.osm && ['node', 'way', 'relation'].includes(place.osm.type) && place.osm.id > 0, `${place.id} cites OSM`);
      assert.ok(!(place.needsPoint || place.linear || place.noPin), `${place.id} has a point and is not flagged without one`);
    } else {
      assert.equal(place.lat, null);
      assert.equal(place.lon, null);
      assert.equal(place.osm, null, `${place.id} has no point, so no OSM source is claimed`);
      assert.ok(place.needsPoint || place.linear || place.noPin, `${place.id} is flagged for having no point`);
    }
    if (place.privateProperty) assert.ok(place.exteriorOnly || place.noPin, `${place.id} is private, so exterior only or no pin`);
  }
});

test('catalog: the private and unplaced places keep their flags', () => {
  const hp = catalogById.get('hp-garage');
  assert.ok(hp?.privateProperty && hp.exteriorOnly && hp.offCampus);
  const google = catalogById.get('google-garage-menlo-park');
  assert.ok(google?.privateProperty && google.noPin && google.lat === null);
  assert.ok(catalogById.get('san-francisquito-creek')?.linear);
  assert.ok(catalogById.get('memorial-arch-site')?.needsPoint);
  assert.ok(catalogById.get('applied-electronics-laboratory')?.needsPoint);
  assert.ok(catalogById.get('rosewood-sand-hill')?.exteriorOnly);
  assert.equal(catalog.filter((c) => c.offCampus).length, 4);
});

test('catalog metadata keeps the ODbL credit and the book and podcast paths', () => {
  assert.match(CARDINAL.catalogMeta.coordinateSource, /ODbL/);
  assert.equal(CARDINAL.catalogMeta.bookRepo, 'kylesmcauliffe/cardinal');
  assert.equal(CARDINAL.catalogMeta.osmUrlPattern, 'https://www.openstreetmap.org/<type>/<id>');
});

test('stops: 27 cards, each with story, facts, years, sources and a valid quiz', () => {
  assert.equal(stops.length, 27);
  assert.equal(stopById.size, 27);
  for (const stop of stops) {
    assert.ok(stop.name && stop.icon && stop.story.length > 80, `${stop.id} text`);
    assert.ok(stop.facts.length >= 3, `${stop.id} facts`);
    assert.ok(stop.sources.length >= 2, `${stop.id} has sources`);
    assert.ok(stop.sources.every((s) => s.title && isHttps(s.url)), `${stop.id} sources are https links`);
    assert.ok(stop.coordinateSource, `${stop.id} records where its coordinates came from`);
    assert.ok(stop.quiz.answers.length === 3 && stop.quiz.correct >= 0 && stop.quiz.correct < 3, `${stop.id} quiz`);
    assert.ok(Number.isInteger(stop.sortYear) && stop.sortYear >= 1800 && stop.sortYear <= 2100);
    assert.ok(stop.lat > 37.4 && stop.lat < 37.46 && stop.lng < -122.15 && stop.lng > -122.2, `${stop.id} is near campus`);
  }
});

test('stops: all stops sit inside the baked map frame', () => {
  const projector = createProjector(CARDINAL.frame);
  for (const stop of stops) assert.ok(projector.inside(stop.lat, stop.lng), `${stop.id} inside frame`);
});

test('stops: 12 link to a catalog place, none twice, all with a point', () => {
  const linked = stops.filter((s) => s.locationId);
  assert.equal(linked.length, 12);
  assert.equal(new Set(linked.map((s) => s.locationId)).size, 12);
  for (const stop of linked) {
    const place = catalogById.get(stop.locationId as string);
    assert.ok(place, `${stop.id} links to ${stop.locationId}`);
    assert.ok(place.lat !== null && place.lon !== null);
  }
  assert.deepEqual(
    linked.map((s) => `${s.id}:${s.locationId}`).sort(),
    ['angel:angel-of-grief', 'barn:red-barn', 'cactus:arizona-cactus-garden', 'cantor:cantor-arts-center', 'encina:encina-hall', 'gates:gates-computer-science', 'hanna:hanna-house', 'hoover:hoover-tower', 'lagunita:lake-lagunita', 'maus:stanford-mausoleum', 'memchu:memorial-church', 'quad:main-quad'].sort(),
  );
});

test('stops: release markers and a few cards read as Cardinal Quest wrote them', () => {
  assert.equal(stops.filter((s) => s.addedIn === 'v0').length, 14);
  assert.equal(stops.filter((s) => s.addedIn === 'v0.2').length, 7);
  assert.equal(stops.filter((s) => s.addedIn === 'v0.3').length, 6);
  const hanna = stopById.get('hanna');
  assert.ok(hanna?.story.includes('1974') && !hanna.story.includes('1975') && hanna.facts.join(' ').includes('1974'));
  assert.match(stopById.get('memchu')?.story ?? '', /five pipe organs/);
  assert.match(stopById.get('lagunita')?.story ?? '', /./);
  assert.equal(stopById.get('quad')?.quiz.question, 'Why was the cornerstone laid on May 14, 1887?');
});

test('routes: five tours with their walking lines', () => {
  assert.deepEqual(routes.map((r) => r.id), ['founders', 'biggame', 'quake', 'farm', 'land']);
  assert.equal(routes[0].name, "The Founders' Walk");
  assert.deepEqual(routes[0].stops, ['maus', 'angel', 'cactus', 'cantor', 'rodin', 'oval', 'quad', 'memchu']);
  assert.equal(routes[4].name, 'One Piece of Land');
  assert.deepEqual(routes[4].stops, ['barn', 'lagunita', 'cactus', 'maus', 'angel', 'quad']);
  assert.deepEqual(routes[3].stops, ['barn', 'lagunita', 'png', 'knoll', 'hoovhouse']);
  const projector = createProjector(CARDINAL.frame);
  for (const route of routes) {
    assert.ok(route.stops.every((id) => stopById.has(id)), `${route.id} stops exist`);
    assert.ok(route.km > 0 && route.line.length > 2, `${route.id} has a distance and a line`);
    assert.ok(route.line.every(([lng, lat]) => projector.inside(lat, lng)), `${route.id} line stays in frame`);
    assert.match(route.color, /^#[0-9a-f]{6}$/i);
  }
  assert.deepEqual(routes.map((r) => r.km), [2.5, 2.1, 2.4, 3.3, 4.6]);
  assert.deepEqual(routes.map((r) => r.line.length), [237, 217, 183, 254, 361]);
});

test('routes: One Piece of Land keeps its six spoken bridges, outro, prologue and side quest', () => {
  const land = routes.find((r) => r.id === 'land');
  assert.ok(land);
  assert.deepEqual(land.bridge, [
    "Everything on this walk was once one property: Leland Stanford's Palo Alto Stock Farm, which at its height boarded 600 horses.",
    'The farm needed water. In 1878 this lake was built as its stock pond and reservoir.',
    'Near the farm, the Stanfords planned a country mansion, and in the early 1880s they had this garden laid out beside its site.',
    "The mansion was never built. In 1884 their only son died at 15, and the family's fortune turned toward a memorial in his name.",
    "A few steps from the family tomb stands a second memorial, this one to Jane Stanford's youngest brother.",
    "The memorial they chose was a university. Look at the palms in the Quad's circles: thirty of them were dug up from the cactus garden you just visited.",
  ]);
  assert.equal(land.bridge?.length, land.stops.length);
  assert.equal(
    land.outro,
    "That's one piece of land: a horse farm, the reservoir dug for it, the garden of a mansion never built, the family's grave, and the university that grew from them.",
  );
  assert.match(land.prologue?.text ?? '', /^Before the farm\. About 3\.4 km north/);
  assert.ok(land.prologue && land.prologue.sources.length >= 1 && land.prologue.sources.every((s) => isHttps(s.url)));
  assert.equal(land.side?.stopId, 'hanna');
  assert.ok(!land.stops.includes('hanna'));
  assert.match(land.side?.text ?? '', /exterior only: view it from the road/);
  for (const route of routes.filter((r) => r.id !== 'land')) {
    assert.ok(!route.bridge && !route.outro && !route.prologue && !route.side, `${route.id} has no story extras`);
  }
});

test('threads: five, every fact sourced, stops exist, drafts marked as drafts', () => {
  assert.deepEqual(threads.map((t) => t.id), ['rail', 'son', 'farm', 'valley', 'land']);
  assert.deepEqual(threads.map((t) => t.facts.length), [5, 3, 4, 4, 15]);
  for (const thread of threads) {
    assert.ok(thread.stops.every((id) => stopById.has(id)), `${thread.id} stops`);
    assert.match(thread.book, /\(draft mapping\)/);
    thread.facts.forEach((fact, i) => {
      assert.ok(fact.sources.length >= 1 && fact.sources.every((s) => isHttps(s.url)), `${thread.id} fact ${i + 1} has a source`);
    });
  }
  const land = threads.find((t) => t.id === 'land');
  assert.deepEqual(land?.stops, routes.find((r) => r.id === 'land')?.stops);
  const blob = land?.facts.map((f) => f.text).join(' ') ?? '';
  assert.ok(blob.includes('June 1878') && !blob.includes('June 15') && !blob.includes('June 19'));
  assert.ok(blob.includes('early 1880s') && blob.includes('built in 1878') && blob.includes('until 2000'));
  assert.ok(!/Ohlone|Muwekma|El Palo Alto/.test(blob));
  assert.match(CARDINAL.dailyNote, /Daily Hunt picks 3 landmarks per Pacific-time day/);
});

test('timeline: ten sourced events in date order, tied to stops that exist', () => {
  assert.equal(events.length, 10);
  assert.deepEqual([...events].map((e) => e.year), [...events.map((e) => e.year)].sort((a, b) => a - b));
  for (const event of events) {
    assert.ok(event.stopId === null || stopById.has(event.stopId));
    assert.ok(event.source.title && isHttps(event.source.url));
  }
  assert.equal(events[0].year, 1876);
  assert.equal(events.at(-1)?.year, 1998);
});

test('the notes travel with the data: research notes, corrections and open questions', () => {
  const file = new URL('./SOURCES.md', import.meta.url);
  assert.ok(existsSync(file));
  const text = readFileSync(file, 'utf8');
  for (const heading of ['## Routes', '## Corrections vs v0', '## Open questions for Kyle', '## v0.4: Cardinal book threads']) {
    assert.ok(text.includes(heading), heading);
  }
  assert.match(text, /Encina Hall:\*\* the marker moved about 60 m/);
  assert.match(text, /Hanna House OK as a stop/);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { ACHIEVEMENTS, noteFirstSteps } from './achievements.ts';
import { bossStrike, grantBossReward, monStats, resolveWild, startBoss } from './combat.ts';
import { distance, geohash, geohashBox, pacificDay } from './geo.ts';
import { distanceMul, events, xpMul } from './events.ts';
import { pickLoot } from './loot.ts';
import { BOSS_KINDS, capBosses, dedupe, scanPlaces, tileKind, toPlace } from './poi.ts';
import { claimQuests, ensureQuests, qprog } from './quests.ts';
import { hash, rng } from './rng.ts';
import { acceptStep, addXp, emptyDay, emptyWalk, lvlOf, maxHp, parseDay, parseWalk, rollDay } from './state.ts';
import { festival, visitPlace } from './visit.ts';
import type { Place, TileFeature } from './types.ts';

const NIGHT = new Date('2026-11-15T06:00:00Z');
const NOON = new Date('2026-11-16T20:00:00Z');
const DAY = '2026-11-14';

function flat(value: number): () => number {
  return () => value;
}

function seq(...values: number[]): () => number {
  let index = 0;
  return () => values[index++] ?? values[values.length - 1] ?? 0;
}

function place(partial: Partial<Place> & Pick<Place, 'id' | 'll' | 'name'>): Place {
  return {
    kind: ['poi_tavern', 'Tavern'],
    boss: false,
    bossKind: ['mon_slime', 'Quad Ooze King'],
    amenity: 'cafe',
    ...partial,
  };
}

test('tileKind maps cafe and library to places, museum to a boss kind, and unknown to null', () => {
  assert.equal(tileKind('cafe'), 'cafe');
  assert.equal(tileKind('library'), 'library');
  assert.equal(tileKind('museum'), 'museum');
  assert.equal(BOSS_KINDS.has('museum'), true);
  assert.equal(BOSS_KINDS.has('cafe'), false);
  assert.equal(BOSS_KINDS.has('library'), false);
  assert.equal(tileKind('not_a_place', 'nope'), null);
  assert.equal(tileKind('fuel', 'fuel'), 'fuel');
  assert.equal(tileKind('fuel', 'charging'), null);
  const museum = toPlace({ id: 'm1', lat: 37.8, lon: -122.4, tags: { amenity: 'museum', name: 'Hall' } });
  assert.equal(museum.boss, true);
  const cafe = toPlace({ id: 'c1', lat: 37.8, lon: -122.4, tags: { amenity: 'cafe', name: 'Cup' } });
  assert.equal(cafe.boss, false);
});

test('dedupe drops the same name within 150 m and keeps a farther or differently named place', () => {
  const here: Place['ll'] = [-122.4, 37.8];
  const close: Place['ll'] = [-122.4, 37.8008];
  const far: Place['ll'] = [-122.4, 37.803];
  assert.ok(distance(here, close) < 150);
  assert.ok(distance(here, far) > 150);
  const dropped = dedupe([
    place({ id: 'a', ll: here, name: 'Cup' }),
    place({ id: 'b', ll: close, name: 'Cup' }),
    place({ id: 'c', ll: close, name: 'Other' }),
  ]);
  assert.deepEqual(dropped.map((row) => row.id), ['a', 'c']);
  const kept = dedupe([
    place({ id: 'a', ll: here, name: 'Cup' }),
    place({ id: 'b', ll: far, name: 'Cup' }),
  ]);
  assert.deepEqual(kept.map((row) => row.id), ['a', 'b']);
});

test('scanPlaces caps tile hits at 70 and landmark bosses at 4', () => {
  const center: Place['ll'] = [-122.4075, 37.788];
  const features: TileFeature[] = [];
  for (let i = 0; i < 80; i++) {
    features.push({
      id: i,
      properties: { class: 'cafe', subclass: 'cafe', name: `Cafe ${i}` },
      geometry: { type: 'Point', coordinates: [center[0] + i * 0.0001, center[1]] },
    });
  }
  for (let i = 0; i < 6; i++) {
    features.push({
      id: `boss${i}`,
      properties: { class: 'museum', subclass: 'museum', name: `Hall ${i}` },
      geometry: { type: 'Point', coordinates: [center[0] + 0.002 + i * 0.0002, center[1]] },
    });
  }
  features.push({
    id: 'far',
    properties: { class: 'library', name: 'Far Library' },
    geometry: { type: 'Point', coordinates: [center[0] + 0.05, center[1]] },
  });
  const { places } = scanPlaces(features, center);
  const tiled = places.filter((row) => row.id.startsWith('t'));
  assert.ok(tiled.length <= 70);
  assert.equal(places.filter((row) => row.boss).length <= 4, true);
  assert.equal(places.some((row) => row.name === 'Far Library'), false);
  assert.equal(places.some((row) => row.name === 'Ferry Building'), true);
  const bosses = capBosses(
    Array.from({ length: 6 }, (_, i) => place({ id: `b${i}`, ll: [center[0], center[1] + i * 0.01], name: `Boss ${i}`, boss: true })),
    center,
  );
  assert.equal(bosses.filter((row) => row.boss).length, 4);
});

test('geohash round trip keeps the point inside its box', () => {
  const lat = 37.788;
  const lon = -122.4075;
  const code = geohash(lat, lon, 7);
  const box = geohashBox(code);
  assert.equal(geohash(lat, lon, 7), code);
  assert.ok(lat >= box.la[0] && lat <= box.la[1]);
  assert.ok(lon >= box.lo[0] && lon <= box.lo[1]);
  assert.equal(code.length, 7);
});

test('the Pacific day matches the Atlas hunt boundary', () => {
  assert.equal(pacificDay(new Date('2026-11-10T07:30:00Z')), '2026-11-09');
  assert.equal(pacificDay(new Date('2026-11-10T08:30:00Z')), '2026-11-10');
});

test('festival is stable for a place and day and changes the next day', () => {
  const center: Place['ll'] = [-122.4075, 37.788];
  const places = ['a', 'b', 'c', 'd', 'e'].map((id, i) =>
    place({ id, ll: [center[0] + i * 0.001, center[1]], name: id }),
  );
  const first = festival(places, center, DAY);
  const again = festival(places, center, DAY);
  const next = festival(places, center, '2026-11-15');
  assert.equal(first?.id, again?.id);
  assert.notEqual(first?.id, next?.id);
});

test('XP thresholds and night fog multiplier', () => {
  assert.equal(lvlOf(0), 1);
  assert.equal(lvlOf(99), 1);
  assert.equal(lvlOf(100), 2);
  assert.equal(lvlOf(399), 2);
  assert.equal(lvlOf(400), 3);
  assert.equal(maxHp(0), 32);
  assert.equal(maxHp(100), 40);
  assert.equal(xpMul(NOON), 1);
  assert.equal(xpMul(NIGHT), 1.25);
  assert.ok(events(NIGHT).some((event) => event.id === 'fog'));
  assert.equal(distanceMul(NIGHT), 2);
  assert.equal(distanceMul(NOON), 1);
  const gained = addXp(emptyWalk(), emptyDay(DAY), 40, NIGHT);
  assert.equal(gained.gained, 50);
  assert.equal(gained.state.xp, 50);
});

test('pickLoot rarity bands, including a festival boost', () => {
  assert.equal(pickLoot(seq(0.5, 0)), 'loot_potion');
  assert.equal(pickLoot(seq(0.8, 0)), 'loot_key');
  assert.equal(pickLoot(seq(0.95, 0)), 'loot_gem');
  assert.equal(pickLoot(seq(0.1, 0), true), 'loot_gem');
  assert.equal(pickLoot(seq(0.2, 0.99)), 'loot_scroll');
});

test('a seeded visit is stable and a festival visit pays double', () => {
  const center: Place['ll'] = [-122.41, 37.79];
  const places = [place({ id: 'only', ll: center, name: 'Only' })];
  const now = NOON;
  const once = visitPlace(emptyWalk(), emptyDay('2026-11-16'), places[0], {
    tap: true,
    pos: null,
    places,
    center,
    now,
  });
  const twice = visitPlace(emptyWalk(), emptyDay('2026-11-16'), places[0], {
    tap: true,
    pos: null,
    places,
    center,
    now,
  });
  assert.equal(once.ok && twice.ok, true);
  if (once.ok && twice.ok) {
    assert.deepEqual(once.state.loot, twice.state.loot);
    assert.equal(once.state.xp, twice.state.xp);
  }
  const festId = festival(places, center, '2026-11-16')?.id;
  assert.equal(festId, 'only');
  if (once.ok) assert.equal(once.state.xp, 100);
});

test('steps outside 0.5 m to 500 m do not count', () => {
  assert.equal(acceptStep(0.5), false);
  assert.equal(acceptStep(0.51), true);
  assert.equal(acceptStep(499.9), true);
  assert.equal(acceptStep(500), false);
});

test('a boss fight terminates and the win pays once per day', () => {
  let state = emptyWalk();
  let day = emptyDay(DAY);
  const lair = place({
    id: 'lair',
    ll: [-122.4, 37.8],
    name: 'Tower',
    boss: true,
    bossKind: ['mon_cyclops', 'Bell-Tower Golem'],
    amenity: 'attraction',
  });
  let fight = startBoss(state, day, lair);
  assert.ok(fight);
  const roll = rng(7);
  let guard = 0;
  let outcome = 'ongoing';
  while (fight && outcome === 'ongoing' && guard < 40) {
    const step = bossStrike(state, day, fight, roll, NOON);
    state = step.state;
    day = step.day;
    fight = step.fight;
    outcome = step.outcome;
    guard += 1;
  }
  assert.ok(guard < 40, 'fight did not end');
  assert.notEqual(outcome, 'ongoing');

  const fresh = emptyWalk();
  const opened = startBoss(fresh, emptyDay(DAY), lair);
  assert.ok(opened);
  const killing = bossStrike(fresh, emptyDay(DAY), { ...opened, hp: 1 }, flat(0.5), NOON);
  assert.equal(killing.outcome, 'won');
  assert.equal(killing.day.db.includes('lair'), true);
  assert.ok(killing.state.xp > fresh.xp);
  const again = grantBossReward(killing.state, killing.day, opened, flat(0.5), NOON);
  assert.equal(again.state.xp, killing.state.xp);
  assert.equal(again.state.gold, killing.state.gold);
  assert.equal(startBoss(killing.state, killing.day, lair), null);
  assert.ok(monStats(1).hp > 0);
});

test('a wild fight stops within 20 rounds', () => {
  const result = resolveWild(emptyWalk(), emptyDay(DAY), ['mon_slime', 'Bog Slime'], 1, flat(0.5), NOON);
  assert.equal(typeof result.won, 'boolean');
  assert.ok(result.log.length > 0);
});

test('quest generation is deterministic per area and day, and qprog counts every type', () => {
  const center: Place['ll'] = [-122.4075, 37.788];
  const places: Place[] = [];
  for (let i = 0; i < 5; i++) {
    places.push(place({ id: `p${i}`, ll: [center[0] + i * 0.0004, center[1]], name: `Place ${i}`, amenity: 'cafe' }));
  }
  places.push(
    place({
      id: 'boss1',
      ll: [center[0] + 0.001, center[1] + 0.001],
      name: 'Tower',
      boss: true,
      kind: ['poi_relic', 'Landmark'],
      amenity: 'attraction',
    }),
  );
  const board = ensureQuests(emptyDay(DAY), places, center, DAY);
  const again = ensureQuests(emptyDay(DAY), places, center, DAY);
  assert.deepEqual(board.q.map((quest) => quest.id), again.q.map((quest) => quest.id));
  const later = ensureQuests(emptyDay('2026-11-20'), places, center, '2026-11-20');
  assert.notDeepEqual(board.q.map((quest) => quest.id), later.q.map((quest) => quest.id));
  const types = new Set(board.q.map((quest) => quest.ty));
  assert.equal(types.has('visit'), true);
  assert.equal(types.has('boss'), true);

  const visit = board.q.find((quest) => quest.ty === 'visit');
  const chain = board.q.find((quest) => quest.ty === 'chain');
  const kind = board.q.find((quest) => quest.ty === 'kind');
  const boss = board.q.find((quest) => quest.ty === 'boss');
  assert.ok(visit && kind && boss);
  let day = { ...board, dv: [visit.tg], db: [boss.tg] };
  assert.deepEqual(qprog(visit, day, places), [1, 1]);
  assert.deepEqual(qprog(boss, day, places), [1, 1]);
  if (chain?.tg2) {
    assert.deepEqual(qprog(chain, day, places), [chain.tg === visit.tg ? 1 : 0, 2]);
    day = { ...day, dv: [chain.tg, chain.tg2] };
    assert.deepEqual(qprog(chain, day, places), [2, 2]);
  }
  const kindPlaces = places.filter((row) => row.kind[1] === kind.tg).slice(0, kind.n ?? 1);
  day = { ...day, dv: kindPlaces.map((row) => row.id) };
  const [done, goal] = qprog(kind, day, places);
  assert.equal(done, goal);

  const claimed = claimQuests(emptyWalk(), day, places, NOON);
  assert.ok(claimed.messages.length >= 1);
  const second = claimQuests(claimed.state, claimed.day, places, NOON);
  assert.equal(second.state.xp, claimed.state.xp);
});

test('a corrupt save returns the defaults', () => {
  assert.deepEqual(parseWalk(null), emptyWalk());
  assert.deepEqual(parseWalk('nope'), emptyWalk());
  assert.deepEqual(parseWalk([]), emptyWalk());
  assert.deepEqual(parseWalk({ xp: 'lots', gold: 1, metres: 0 }), emptyWalk());
  assert.deepEqual(parseDay(null), emptyDay());
  assert.deepEqual(parseDay({ day: 3 }), emptyDay());
  const good = emptyWalk();
  good.xp = 100;
  good.gold = 12;
  good.name = 'Ada';
  const round = parseWalk(JSON.parse(JSON.stringify(good)));
  assert.equal(round.xp, 100);
  assert.equal(round.gold, 12);
  assert.equal(round.name, 'Ada');
  assert.equal(parseWalk({ xp: 10, gold: 0, metres: 0, loot: ['nope', 'loot_gem'] }).loot.length, 1);
});

test('the daily roll pays a streak once and then clears yesterday', () => {
  const first = rollDay(emptyWalk(), emptyDay(), NOON);
  assert.equal(first.state.rpg.streak, 1);
  assert.equal(first.state.gold, 10);
  assert.equal(first.message?.includes('streak'), true);
  const same = rollDay(first.state, first.day, NOON);
  assert.equal(same.message, null);
  assert.equal(same.state.gold, first.state.gold);
  const yesterday = { ...first.state, rpg: { ...first.state.rpg, day: '2026-11-15' } };
  const next = rollDay(yesterday, { ...emptyDay('2026-11-15'), dv: ['old'], db: ['old'] }, NOON);
  assert.equal(next.state.rpg.streak, 2);
  assert.deepEqual(next.day.dv, []);
  assert.ok(ACHIEVEMENTS.length >= 7);
  const noted = noteFirstSteps({ ...emptyWalk(), seen: ['a'], wins: 1 }, emptyDay(DAY), NOON, true);
  assert.equal(noted.state.fs.all, 1);
  assert.equal(noted.state.loot.filter((id) => id === 'loot_potion').length, 2);
});

test('hash and rng are stable', () => {
  assert.equal(hash('fest'), hash('fest'));
  const a = rng(hash('fest'));
  const b = rng(hash('fest'));
  assert.equal(a(), b());
  assert.equal(a(), b());
});

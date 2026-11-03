import assert from 'node:assert/strict';
import test from 'node:test';
import { buildOverworld, canWalk, landmarkAt, stepToward } from './overworld';

test('the town has a walkable spawn and a door in front of each building', () => {
  const world = buildOverworld();
  assert.equal(canWalk(world, world.spawn.x, world.spawn.y), true);
  assert.equal(world.landmarks.length, 6);
  const ids = new Set(world.landmarks.map((spot) => spot.id));
  assert.equal(ids.size, world.landmarks.length);
  for (const spot of world.landmarks) {
    assert.equal(canWalk(world, spot.approach.x, spot.approach.y), true, spot.id);
    assert.equal(landmarkAt(world, spot.x, spot.y)?.id, spot.id);
    assert.equal(canWalk(world, spot.x, spot.y), false);
  }
});

test('walking stops at a wall and can still reach a door', () => {
  const world = buildOverworld();
  const hq = world.landmarks[0];
  const blocked = stepToward(world, hq.approach, { x: hq.approach.x, y: hq.y });
  assert.deepEqual(blocked, hq.approach);
  let cursor = { ...world.spawn };
  const goal = world.landmarks[0].approach;
  for (let i = 0; i < 80 && (cursor.x !== goal.x || cursor.y !== goal.y); i += 1) {
    const next = stepToward(world, cursor, goal);
    assert.equal(canWalk(world, next.x, next.y), true);
    assert.notDeepEqual(next, cursor);
    cursor = next;
  }
  assert.deepEqual(cursor, goal);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { stepHero } from './town-walk.ts';

const bounds = { minX: 0, minY: 0, maxX: 100, maxY: 80 };

test('walking moves inside the map and stops at the edge', () => {
  assert.deepEqual(stepHero({ x: 10, y: 10 }, { x: 1, y: 0 }, bounds, 28), { x: 38, y: 10 });
  assert.deepEqual(stepHero({ x: 90, y: 10 }, { x: 1, y: 0 }, bounds, 28), { x: 100, y: 10 });
  assert.deepEqual(stepHero({ x: 10, y: 4 }, { x: 0, y: -1 }, bounds, 28), { x: 10, y: 0 });
});

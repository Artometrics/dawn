import assert from 'node:assert/strict';
import test from 'node:test';
import { isPaintedPlayerPixel, isTownPath, isTownWalkable, pathCell, TOWN_DOORS } from './town-ground.ts';

test('dirt path is walkable and grass, roofs, and trees are not', () => {
  assert.equal(isTownPath(180, 140, 90), true);
  assert.equal(isTownWalkable(88, 169, 102), true);
  assert.equal(isTownWalkable(200, 60, 55), false);
  assert.equal(isTownWalkable(20, 30, 20), false);
  assert.equal(isPaintedPlayerPixel(200, 50, 48), true);
  assert.equal(isPaintedPlayerPixel(88, 169, 102), false);
});

test('a step onto a blocked cell is refused and a path cell is kept', () => {
  const cols = 4;
  const grid = new Uint8Array([0, 1, 0, 0]);
  assert.equal(pathCell(grid, cols, 12, 330, 330, 8), true);
  assert.equal(pathCell(grid, cols, 2, 330, 330, 8), false);
  assert.equal(TOWN_DOORS.some((door) => door.href === '/letter'), true);
  assert.equal(new Set(TOWN_DOORS.map((door) => door.person)).size, TOWN_DOORS.length);
});

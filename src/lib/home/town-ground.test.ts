import assert from 'node:assert/strict';
import test from 'node:test';
import { coverPaintedFigure, isPaintedPlayerPixel, isTownPath, isTownWalkable, PAINTED_PLAYER, pathCell, TOWN_DOORS } from './town-ground.ts';

test('dirt path is walkable and grass, roofs, and trees are not', () => {
  assert.equal(isTownPath(180, 140, 90), true);
  assert.equal(isTownWalkable(88, 169, 102), true);
  assert.equal(isTownWalkable(200, 60, 55), false);
  assert.equal(isTownWalkable(20, 30, 20), false);
  assert.equal(isPaintedPlayerPixel(200, 50, 48), true);
  assert.equal(isPaintedPlayerPixel(88, 169, 102), false);
});

test('the painted figure pixels are covered from the grass above them', () => {
  const width = 800;
  const pixels = new Uint8Array(width * 1400 * 4);
  for (let index = 0; index < pixels.length; index += 4) {
    pixels[index] = 90;
    pixels[index + 1] = 166;
    pixels[index + 2] = 100;
    pixels[index + 3] = 255;
  }
  const spot = ((PAINTED_PLAYER.y + 10) * width + (PAINTED_PLAYER.x + 10)) * 4;
  pixels[spot] = 210;
  pixels[spot + 1] = 40;
  pixels[spot + 2] = 40;
  const beside = ((PAINTED_PLAYER.y + 10) * width + (PAINTED_PLAYER.x + PAINTED_PLAYER.w + 2)) * 4;
  pixels[beside] = 210;
  pixels[beside + 1] = 40;
  pixels[beside + 2] = 40;
  const covered = coverPaintedFigure(width, pixels);
  assert.ok(covered > 0);
  assert.equal(pixels[spot + 1] > pixels[spot], true);
  assert.equal(pixels[beside], 210);
});

test('a step onto a blocked cell is refused and a path cell is kept', () => {
  const cols = 4;
  const grid = new Uint8Array([0, 1, 0, 0]);
  assert.equal(pathCell(grid, cols, 12, 330, 330, 8), true);
  assert.equal(pathCell(grid, cols, 2, 330, 330, 8), false);
  assert.equal(TOWN_DOORS.some((door) => door.href === '/letter'), true);
  assert.equal(new Set(TOWN_DOORS.map((door) => door.person)).size, TOWN_DOORS.length);
});

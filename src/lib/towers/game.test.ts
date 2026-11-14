import assert from 'node:assert/strict';
import test from 'node:test';
import { START_GOLD } from './config.ts';
import { interestFor } from './economy.ts';
import { Game } from './game.ts';

test('interest is a capped share of the gold on hand', () => {
  assert.equal(interestFor(0), 0);
  assert.equal(interestFor(100), 5);
  assert.equal(interestFor(10_000), 40);
});

test('placing a ranger spends its price and a second tower cannot take the slot', () => {
  const game = new Game({ seed: 1 });
  assert.equal(game.placeTower(0, 'archer').ok, true);
  assert.equal(game.gold, START_GOLD - 60);
  const again = game.placeTower(0, 'mage');
  assert.equal(again.ok, false);
});

test('a wave of minions can be cleared by rangers', () => {
  const game = new Game({ seed: 2 });
  assert.equal(game.placeTower(0, 'archer').ok, true);
  assert.equal(game.placeTower(1, 'archer').ok, true);
  assert.equal(game.startWave().ok, true);
  for (let i = 0; i < 60 * 90; i += 1) game.step(1 / 60);
  assert.ok(game.kills > 0);
  assert.notEqual(game.phase, 'wave');
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { DilemmaVillage, pickAction, scoreRound } from './dilemma.ts';

test('a round pays the classic prisoner table', () => {
  assert.deepEqual(scoreRound('C', 'C'), [3, 3]);
  assert.deepEqual(scoreRound('C', 'D'), [0, 5]);
  assert.deepEqual(scoreRound('D', 'C'), [5, 0]);
  assert.deepEqual(scoreRound('D', 'D'), [1, 1]);
});

test('tit for tat opens with cooperate and then copies', () => {
  assert.equal(pickAction('TitForTat', [], [], () => 0), 'C');
  assert.equal(pickAction('TitForTat', ['D'], ['C'], () => 0), 'D');
  assert.equal(pickAction('Grudger', ['C', 'D'], [], () => 0), 'D');
  assert.equal(pickAction('AlwaysCooperate', ['D'], ['D'], () => 0), 'C');
});

test('the village scores meetings and stays inside the field', () => {
  const village = new DilemmaVillage(undefined, 3);
  let snap = village.snapshot();
  for (let i = 0; i < 400; i += 1) snap = village.step(0.05);
  const total = snap.standings.reduce((sum, row) => sum + row.score, 0);
  assert.ok(total > 0, 'someone scored');
  for (const agent of snap.agents) {
    assert.ok(agent.x > 0 && agent.x < snap.width);
    assert.ok(agent.y > 0 && agent.y < snap.height);
  }
});

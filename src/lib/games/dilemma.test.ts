import assert from 'node:assert/strict';
import test from 'node:test';
import { DilemmaVillage, pickAction, readableEvent, scoreRound } from './dilemma.ts';

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
  assert.equal(pickAction('GenerousTitForTat', ['D'], ['C'], () => 0.149), 'C');
  assert.equal(pickAction('GenerousTitForTat', ['D'], ['C'], () => 0.15), 'D');
  assert.equal(pickAction('Pavlov', ['C'], ['C'], () => 0), 'C');
  assert.equal(pickAction('Pavlov', ['D'], ['C'], () => 0), 'D');
});

test('seed 7 replays the same walk, facing, and scores', () => {
  const left = new DilemmaVillage();
  const right = new DilemmaVillage();
  let a = left.snapshot();
  let b = right.snapshot();
  for (let i = 0; i < 160; i += 1) {
    a = left.step(0.05);
    b = right.step(0.05);
  }
  assert.equal(a.agents.length, 7);
  assert.deepEqual(
    a.agents.map((agent) => [agent.name, agent.x, agent.y, agent.score, agent.facing]),
    b.agents.map((agent) => [agent.name, agent.x, agent.y, agent.score, agent.facing]),
  );
  assert.equal(readableEvent('GenerousTitForTat C (3) vs TitForTat C (3)'), 'Generous TFT C (3) vs Tit-for-Tat C (3)');
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

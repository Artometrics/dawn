import assert from 'node:assert/strict';
import test from 'node:test';
import { buildHq } from '../hq-map.ts';
import { parseImportance, trimSpeakerPrefix } from './prompts.ts';
import { rankMemories, shouldReflect, stepToward } from './loop.ts';

test('agents step closer on the floor', () => {
  const grid = buildHq();
  const next = stepToward(grid, { x: 4, y: 3 }, { x: 3, y: 7 }, []);
  assert.ok(next.y > 3 || next.x !== 4);
});

test('memory rank prefers a name mentioned in the query', () => {
  const ranked = rankMemories(
    [
      { text: 'I sorted crates.', createdAt: Date.now(), importance: 2 },
      { text: 'I talked with Kali about the plan.', createdAt: Date.now() - 1000, importance: 4 },
    ],
    'What do you think about Kali?',
    1,
  );
  assert.match(ranked[0].text, /Kali/);
});

test('importance parses a bare digit and reflection waits for a real sum', () => {
  assert.equal(parseImportance('5'), 5);
  assert.equal(parseImportance('nope'), 5);
  assert.equal(shouldReflect(14), false);
  assert.equal(shouldReflect(15), true);
});

test('speaker prefix is stripped the way AI Town trims a completion', () => {
  assert.equal(trimSpeakerPrefix('Trinity to Kali: Hello there.', 'Trinity', 'Kali'), 'Hello there.');
});

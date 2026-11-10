// Ported from Pantheon Forge (tools/forge/src/bones.test.js). Assertions are unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import { BONE_NAMES, GAME_RIG_MAP, MIXAMO_MAP, POSES } from './bones.ts';

test('bone names are unique and safe as animation tracks', () => {
  assert.equal(new Set(BONE_NAMES).size, BONE_NAMES.length);
  for (const name of BONE_NAMES) {
    assert.equal(name.includes('.'), false, name);
    assert.match(name, /^[A-Za-z][A-Za-z0-9]*$/);
  }
});

test('every bone except root maps to Mixamo and the game rig', () => {
  const body: string[] = BONE_NAMES.filter((n) => n !== 'root');
  assert.deepEqual(Object.keys(MIXAMO_MAP).sort(), body.slice().sort());
  assert.deepEqual(Object.keys(GAME_RIG_MAP).sort(), body.slice().sort());
  assert.equal(new Set(Object.values(MIXAMO_MAP)).size, body.length);
});

test('the shared clip set is idle and guard', () => {
  assert.deepEqual(POSES, ['idle', 'guard']);
});

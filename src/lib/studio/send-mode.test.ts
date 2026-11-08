import assert from 'node:assert/strict';
import test from 'node:test';
import { studioSendMode } from './send-mode.ts';

test('studio does not select the provider path for local or offline hosts', () => {
  assert.equal(studioSendMode('offline'), 'local');
  assert.equal(studioSendMode('emulator'), 'local');
  assert.equal(studioSendMode('hosted'), 'provider');
  assert.equal(studioSendMode(''), 'local');
});

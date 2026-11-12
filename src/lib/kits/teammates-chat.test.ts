import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { TeammatesDesk } from './teammates-chat.ts';

test('a teammate chat hands the turn to the other bot and restores it', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'dawn-team-'));
  const dbPath = path.join(root, 'teammates.sqlite');
  try {
    const desk = new TeammatesDesk(dbPath);
    const { id } = desk.createRoom();
    const asked = await desk.postMessage(id, 'Write the note');
    assert.match(asked.messages.at(-1)?.body || '', /Fixture reply from Builder/);
    assert.equal(asked.active, 'builder');
    const handed = await desk.postMessage(id, 'handoff reviewer Check the note');
    assert.equal(handed.active, 'reviewer');
    assert.match(handed.messages.at(-1)?.body || '', /Reviewer took the turn/);
    assert.equal(handed.messages.at(-1)?.handoffTo, 'reviewer');
    await assert.rejects(() => desk.postMessage(id, 'handoff stranger no'), /not in this chat/);
    const again = new TeammatesDesk(dbPath).getRoom(id);
    assert.equal(again.active, 'reviewer');
    assert.ok(again.messages.length >= 4);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { NightcodeDesk } from './nightcode-agent.ts';

test('a NightCode session plans without writing and builds only after build mode', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'dawn-nightcode-'));
  const dbPath = path.join(root, 'nightcode.sqlite');
  try {
    const desk = new NightcodeDesk(dbPath);
    const { id } = desk.createSession('Page');
    const planned = await desk.postMessage(id, 'write notes/secret.txt leaked', 'plan');
    assert.match(planned.messages.at(-1)?.body || '', /PLAN mode/);
    assert.deepEqual(planned.files, []);
    const built = await desk.postMessage(id, 'write notes/page.txt export const page = 1', 'build');
    assert.ok(built.files.includes('notes/page.txt'));
    const read = await desk.postMessage(id, 'read notes/page.txt', 'plan');
    assert.match(read.messages.at(-1)?.body || '', /export const page/);
    const again = new NightcodeDesk(dbPath).getSession(id);
    assert.equal(again.messages.length, 6);
    assert.equal(desk.modelState().gemini, 'off');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

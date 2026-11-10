import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { NightcodeDesk, systemPrompt, toolsFor } from './nightcode-agent.ts';

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
    assert.equal(again.tools.join(','), 'readFile,listDirectory,glob,grep');
    assert.match(again.prompt, /plan mode/);
    assert.match(again.messages.find((message) => message.tool === 'readFile')?.body || '', /export const page/);
    assert.equal(desk.modelState().gemini, 'off');
    assert.deepEqual(desk.searchSessions('page').map((session) => session.id), [id]);
    assert.deepEqual(desk.searchSessions('missing'), []);
    assert.deepEqual([...toolsFor('plan')], ['readFile', 'listDirectory', 'glob', 'grep']);
    assert.ok(toolsFor('build').includes('bash'));
    assert.match(systemPrompt('build'), /build mode/);
    const searched = await desk.postMessage(id, 'grep page', 'plan');
    assert.match(searched.messages.at(-1)?.body || '', /page\.txt/);
    const shell = await desk.postMessage(id, 'bash printf hi', 'build');
    assert.match(shell.messages.at(-1)?.body || '', /hi/);
    const blocked = await desk.postMessage(id, 'bash printf no', 'plan');
    assert.match(blocked.messages.at(-1)?.body || '', /not available in PLAN mode/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

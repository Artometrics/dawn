import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { handoffNote, playableGame, refuseRemote } from './connected';
import { cancelParked, latestBotSession, resumeApprovedWrite, runBotTask } from './bot-session';
import { startAgentsServer } from './http';

async function blank() {
  const dir = await mkdtemp(path.join(tmpdir(), 'dawn-connected-'));
  const work = path.join(dir, 'work');
  await mkdir(work);
  await writeFile(path.join(work, 'readme.txt'), 'Dawn desk note.\n', 'utf8');
  return { dir, work, sqlite: path.join(dir, 'session.sqlite') };
}

test('WF01 plan stays stored, approval writes once, and the diff matches the file', async () => {
  const { work, sqlite } = await blank();
  const plan = await runBotTask({
    sqlitePath: sqlite,
    workspace: work,
    mode: 'plan',
    level: 'edits',
    spentUsd: 0,
    capUsd: 20,
    calls: [{ tool: 'readFile', path: 'readme.txt' }],
  });
  assert.equal(plan.model, 'not_called');
  assert.equal(plan.status, 'completed');
  const parked = await runBotTask({
    sqlitePath: sqlite,
    workspace: work,
    mode: 'build',
    level: 'ask',
    spentUsd: 0,
    capUsd: 20,
    calls: [{ tool: 'writeFile', path: 'note.txt', content: 'approved line\n' }],
    proposal: { path: 'note.txt', content: 'approved line\n' },
  });
  assert.equal(parked.status, 'needs_input');
  await assert.rejects(readFile(path.join(work, 'note.txt'), 'utf8'));
  const approved = await resumeApprovedWrite({ sqlitePath: sqlite, workspace: work, assignmentId: parked.assignmentId!, spentUsd: 0, capUsd: 20 });
  assert.equal(approved.ok, true);
  assert.equal(await readFile(path.join(work, 'note.txt'), 'utf8'), 'approved line\n');
  assert.match(approved.diff, /\+approved line/);
  const again = await resumeApprovedWrite({ sqlitePath: sqlite, workspace: work, assignmentId: parked.assignmentId!, spentUsd: 0, capUsd: 20 });
  assert.equal(again.idempotent, true);
  assert.equal(await readFile(path.join(work, 'note.txt'), 'utf8'), 'approved line\n');
  const stored = latestBotSession(sqlite);
  assert.ok((stored?.events.length || 0) >= 2);
});

test('WF02 a model-free game is playable, then a revision changes the goal', async () => {
  const first = playableGame('collect 3 coins');
  const revised = playableGame('collect 4 coins');
  assert.match(first.html, /const goal = 3/);
  assert.match(first.html, /id="tap"/);
  assert.notEqual(first.signature, revised.signature);
  const { work, sqlite } = await blank();
  const parked = await runBotTask({
    sqlitePath: sqlite,
    workspace: work,
    mode: 'build',
    level: 'ask',
    spentUsd: 0,
    capUsd: 20,
    calls: [{ tool: 'writeFile', path: 'game.html', content: first.html }],
    proposal: { path: 'game.html', content: first.html },
  });
  await assert.rejects(readFile(path.join(work, 'game.html'), 'utf8'));
  const saved = await resumeApprovedWrite({ sqlitePath: sqlite, workspace: work, assignmentId: parked.assignmentId!, spentUsd: 0, capUsd: 20 });
  assert.equal(await readFile(path.join(work, 'game.html'), 'utf8'), first.html);
  const next = await runBotTask({
    sqlitePath: sqlite,
    workspace: work,
    mode: 'build',
    level: 'edits',
    spentUsd: 0,
    capUsd: 20,
    calls: [{ tool: 'writeFile', path: 'game.html', content: revised.html }],
  });
  assert.equal(next.status, 'completed');
  const after = await readFile(path.join(work, 'game.html'), 'utf8');
  assert.match(after, /const goal = 4/);
  assert.notEqual(after, first.html);
  assert.equal(saved.model, 'not_called');
});

test('WF03 local fixture evidence is handed off and remote pages are refused', async () => {
  const { work, sqlite } = await blank();
  await writeFile(path.join(work, 'fixture.html'), '<p id="clue">The fixture says north.</p>\n', 'utf8');
  const remote = refuseRemote('https://example.com/page');
  assert.equal(remote.ok, false);
  if (!remote.ok) assert.equal(remote.outbound, false);
  const read = await runBotTask({
    sqlitePath: sqlite,
    workspace: work,
    mode: 'plan',
    level: 'ask',
    spentUsd: 0,
    capUsd: 20,
    botId: 'dawn-observer',
    brief: JSON.stringify({ provenance: 'local fixture.html', outbound: false }),
    calls: [{ tool: 'readFile', path: 'fixture.html' }],
  });
  assert.match(JSON.stringify(read.tools), /The fixture says north/);
  const handed = await runBotTask({
    sqlitePath: sqlite,
    workspace: work,
    mode: 'plan',
    level: 'ask',
    spentUsd: 0,
    capUsd: 20,
    botId: 'dawn-receiver',
    brief: JSON.stringify({ from: 'dawn-observer', evidence: 'The fixture says north.', provenance: 'local fixture.html' }),
    calls: [{ tool: 'readFile', path: 'fixture.html' }],
  });
  assert.equal(handed.status, 'completed');
  assert.match(handed.events.map((event) => event.kind).join(' '), /enqueued/);
});

test('WF04 two bots share a memory file that survives a reopen and is not written twice', async () => {
  const { work, sqlite } = await blank();
  const first = await handoffNote({ sqlitePath: sqlite, workspace: work, spentUsd: 0, capUsd: 20, note: 'Meet at the studio.' });
  assert.match(first.memory, /Meet at the studio/);
  assert.equal(first.reader.status, 'completed');
  const reopened = latestBotSession(sqlite);
  assert.ok(reopened?.assignmentId);
  const second = await handoffNote({ sqlitePath: sqlite, workspace: work, spentUsd: 0, capUsd: 20, note: 'Meet at the studio.' });
  assert.equal(second.memory, first.memory);
  assert.equal(await readFile(path.join(work, 'memory.json'), 'utf8'), first.memory);
});

test('SAFE a symlink, a cancel, a step cap, and a missing owner do not escape the desk', async () => {
  const { dir, work, sqlite } = await blank();
  await writeFile(path.join(dir, 'secret.txt'), 'secret\n', 'utf8');
  await symlink(path.join(dir, 'secret.txt'), path.join(work, 'leak.txt'));
  const leaked = await runBotTask({
    sqlitePath: sqlite,
    workspace: work,
    mode: 'plan',
    level: 'ask',
    spentUsd: 0,
    capUsd: 20,
    calls: [{ tool: 'readFile', path: 'leak.txt' }],
  });
  assert.equal(leaked.status, 'failed');
  assert.match(leaked.reason || '', /outside/);

  const parked = await runBotTask({
    sqlitePath: sqlite,
    workspace: work,
    mode: 'build',
    level: 'ask',
    spentUsd: 0,
    capUsd: 20,
    calls: [{ tool: 'writeFile', path: 'note.txt', content: 'no\n' }],
    proposal: { path: 'note.txt', content: 'no\n' },
  });
  assert.equal(cancelParked(sqlite, parked.assignmentId!).status, 'cancelled');
  const resumed = await resumeApprovedWrite({ sqlitePath: sqlite, workspace: work, assignmentId: parked.assignmentId!, spentUsd: 0, capUsd: 20 });
  assert.equal(resumed.ok, false);
  await assert.rejects(readFile(path.join(work, 'note.txt'), 'utf8'));

  const capped = await runBotTask({
    sqlitePath: path.join(dir, 'steps.sqlite'),
    workspace: work,
    mode: 'plan',
    level: 'ask',
    spentUsd: 0,
    capUsd: 20,
    calls: Array.from({ length: 9 }, () => ({ tool: 'readFile' as const, path: 'readme.txt' })),
  });
  assert.match(capped.reason || '', /8/);
  assert.equal(capped.tools.length, 0);

  const blockedSpend = await resumeApprovedWrite({ sqlitePath: sqlite, workspace: work, assignmentId: parked.assignmentId!, spentUsd: 20, capUsd: 20 });
  assert.equal(blockedSpend.usage.capAllows, false);

  const server = await startAgentsServer({
    storePath: path.join(dir, 'store.json'),
    ownerEmail: 'owner@example.com',
    workerToken: 'worker-token',
    editorToken: 'editor-token',
    forceStandIn: true,
    schedule: false,
    port: 0,
  });
  try {
    const anonymous = await fetch(`${server.url}/api/bot-session`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    assert.equal(anonymous.status, 401);
    const stranger = await fetch(`${server.url}/api/bot-session`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-auth-request-email': 'other@example.com' },
      body: JSON.stringify({ action: 'plan' }),
    });
    assert.equal(stranger.status, 401);
    const owner = await fetch(`${server.url}/api/bot-session`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-auth-request-email': 'owner@example.com' },
      body: JSON.stringify({ action: 'plan' }),
    });
    assert.equal(owner.status, 200);
    const body = await owner.json() as { session: { model: string } };
    assert.equal(body.session.model, 'not_called');
  } finally {
    await server.close();
  }
});

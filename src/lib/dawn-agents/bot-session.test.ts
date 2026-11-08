import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { latestBotSession, runBotTask } from './bot-session';

async function workspace() {
  const dir = await mkdtemp(path.join(tmpdir(), 'dawn-bot-'));
  await writeFile(path.join(dir, 'readme.txt'), 'Dawn desk note.\n', 'utf8');
  return dir;
}

test('plan lists and reads inside the workspace and refuses a write', async () => {
  const dir = await workspace();
  const sqlite = path.join(dir, 'session.sqlite');
  const work = path.join(dir, 'work');
  await writeFile(path.join(dir, 'readme.txt'), 'Dawn desk note.\n', 'utf8');
  const { mkdir } = await import('node:fs/promises');
  await mkdir(work);
  await writeFile(path.join(work, 'readme.txt'), 'Dawn desk note.\n', 'utf8');
  const plan = await runBotTask({
    sqlitePath: sqlite,
    workspace: work,
    mode: 'plan',
    level: 'edits',
    spentUsd: 0,
    capUsd: 20,
    calls: [
      { tool: 'listDirectory', path: '.' },
      { tool: 'readFile', path: 'readme.txt' },
      { tool: 'writeFile', path: 'nope.txt', content: 'no' },
    ],
  });
  assert.equal(plan.runtime, 'openmausbot');
  assert.equal(plan.model, 'not_called');
  assert.equal(plan.toolSource, process.env.DAWN_NIGHTCODE_HOME ? 'nightcode-private' : 'dawn');
  assert.equal(plan.usage.capChecked, true);
  assert.equal(plan.usage.ledgerWrites, 0);
  assert.equal(plan.status, 'failed');
  assert.match(plan.reason || '', /plan mode|PLAN mode/);
  const read = plan.tools.find((item) => item.tool === 'readFile');
  assert.equal(read?.ok, true);
  assert.match(JSON.stringify(read?.result), /Dawn desk note/);
  await assert.rejects(readFile(path.join(work, 'nope.txt'), 'utf8'));
  const again = latestBotSession(sqlite);
  assert.equal(again?.assignmentId, plan.assignmentId);
  assert.ok((again?.events.length || 0) >= 2);
});

test('ask level does not write, and edits level writes only inside the workspace', async () => {
  const dir = await workspace();
  const work = path.join(dir, 'work');
  const { mkdir } = await import('node:fs/promises');
  await mkdir(work);
  await writeFile(path.join(work, 'readme.txt'), 'Dawn desk note.\n', 'utf8');
  const asked = await runBotTask({
    sqlitePath: path.join(dir, 'ask.sqlite'),
    workspace: work,
    mode: 'build',
    level: 'ask',
    spentUsd: 0,
    capUsd: 20,
    calls: [{ tool: 'writeFile', path: 'desk-line.txt', content: 'wait\n' }],
  });
  assert.equal(asked.status, 'needs_input');
  await assert.rejects(readFile(path.join(work, 'desk-line.txt'), 'utf8'));

  const built = await runBotTask({
    sqlitePath: path.join(dir, 'build.sqlite'),
    workspace: work,
    mode: 'build',
    level: 'edits',
    spentUsd: 0,
    capUsd: 20,
    calls: [
      { tool: 'writeFile', path: 'desk-line.txt', content: 'saved\n' },
      { tool: 'editFile', path: 'desk-line.txt', oldString: 'saved', newString: 'kept' },
      { tool: 'writeFile', path: '../escape.txt', content: 'no' },
    ],
  });
  assert.equal(await readFile(path.join(work, 'desk-line.txt'), 'utf8'), 'kept\n');
  assert.equal(built.status, 'failed');
  assert.match(built.reason || '', /outside/);
  await assert.rejects(readFile(path.join(dir, 'escape.txt'), 'utf8'));
});

test('a reached spend cap runs no tools', async () => {
  const dir = await workspace();
  const work = path.join(dir, 'work');
  const { mkdir } = await import('node:fs/promises');
  await mkdir(work);
  const blocked = await runBotTask({
    sqlitePath: path.join(dir, 'cap.sqlite'),
    workspace: work,
    mode: 'plan',
    level: 'ask',
    spentUsd: 20,
    capUsd: 20,
    calls: [{ tool: 'listDirectory', path: '.' }],
  });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.usage.capAllows, false);
  assert.equal(blocked.tools.length, 0);
  assert.equal(blocked.model, 'not_called');
});

test('bash stays off the allowlist and out of plan mode', async () => {
  const dir = await workspace();
  const work = path.join(dir, 'work');
  const { mkdir } = await import('node:fs/promises');
  await mkdir(work);
  const planned = await runBotTask({
    sqlitePath: path.join(dir, 'bash-plan.sqlite'),
    workspace: work,
    mode: 'plan',
    level: 'edits',
    spentUsd: 0,
    capUsd: 20,
    calls: [{ tool: 'bash', command: 'ls' }],
  });
  assert.match(planned.reason || '', /plan mode|PLAN mode/);
  const built = await runBotTask({
    sqlitePath: path.join(dir, 'bash-build.sqlite'),
    workspace: work,
    mode: 'build',
    level: 'edits',
    spentUsd: 0,
    capUsd: 20,
    calls: [{ tool: 'bash', command: 'curl https://example.com' }],
  });
  assert.match(built.reason || '', /allowlist|refused/);
});

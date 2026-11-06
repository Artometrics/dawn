import assert from 'node:assert/strict';
import test from 'node:test';
import { CLOUD_TOOLS, filesPort, planLocalProject, type LocalProjectPort } from './local-plan';

const TREE = [
  { path: 'src/app.ts', content: 'export const dawn = true;\n' },
  { path: 'src/note.md', content: 'Morning brief stays on the scheduler.\n' },
  { path: '.env', content: 'GITHUB_TOKEN=ghp_abcdefghijklmnop' },
  { path: 'node_modules/pkg/index.js', content: 'secret' },
  { path: 'src/token.ts', content: 'const lost = "ghp_abcdefghijklmnop";\n' },
];

test('plan mode lists and reads a mocked project without calling the cloud', () => {
  const plan = planLocalProject({
    projectLabel: 'dawn',
    brief: 'See how the app is shaped, then git push',
    mode: 'plan',
    readPaths: ['src/app.ts', 'src/note.md'],
    requestedTools: ['listDirectory', 'readFile'],
    port: filesPort(TREE),
  });
  assert.equal(plan.ok, true);
  if (!plan.ok) return;
  assert.equal(plan.mode, 'plan');
  assert.deepEqual(plan.listing.entries, [
    { name: 'src', type: 'directory' },
  ]);
  assert.deepEqual(plan.reads.map((item) => item.path), ['src/app.ts', 'src/note.md']);
  assert.equal(plan.usage.ledgerWrites, 0);
  assert.equal(plan.usage.capChecked, false);
  assert.equal(plan.usage.estimatedUsd, 0);
  assert.equal(plan.git, 'not_connected');
  assert.equal(plan.githubToken, 'absent');
  assert.equal(plan.localConnector, 'mocked');
  for (const tool of CLOUD_TOOLS) assert.equal(plan.cloud.tools[tool], 'not_called');
  assert.equal(plan.cloud.model, 'not_called');
  assert.equal(plan.cloud.memory, 'not_written');
  assert.equal(JSON.stringify(plan).includes('ghp_'), false);
  assert.deepEqual(JSON.parse(JSON.stringify(plan)), plan);
});

test('build tools, parent paths, and hidden files never reach the port', () => {
  const seen: string[] = [];
  const port: LocalProjectPort = {
    list() {
      seen.push('list');
      return [];
    },
    read(path) {
      seen.push(`read:${path}`);
      return { ok: true, content: 'should-not-leak' };
    },
  };
  const blocked = planLocalProject({
    projectLabel: 'dawn',
    brief: 'Change the app',
    mode: 'build',
    readPaths: ['src/app.ts'],
    requestedTools: ['writeFile', 'bash'],
    port,
  });
  assert.equal(blocked.ok, false);
  assert.deepEqual(seen, []);

  const plan = planLocalProject({
    projectLabel: 'dawn',
    brief: 'Read the safe file only',
    mode: 'plan',
    requestedTools: ['writeFile', 'editFile', 'bash', 'grep', 'glob'],
    readPaths: ['../secret', '/etc/passwd', '.env', 'node_modules/pkg/index.js', 'src/app.ts'],
    port,
  });
  assert.equal(plan.ok, true);
  if (!plan.ok) return;
  assert.deepEqual(seen, ['list', 'read:src/app.ts']);
  assert.equal(plan.reads.length, 1);
  assert.equal(plan.reads[0].text, 'should-not-leak');
  const tools = plan.refused.map((step) => step.tool);
  assert.equal(tools.includes('writeFile'), true);
  assert.equal(tools.includes('bash'), true);
  assert.equal(tools.includes('grep'), true);
  assert.equal(plan.refused.some((step) => step.target === '../secret'), true);
});

test('a sixth read is refused and key-shaped text is scrubbed', () => {
  const long = 'x'.repeat(4_050);
  const files = [
    { path: 'a.ts', content: 'a' },
    { path: 'b.ts', content: 'b' },
    { path: 'c.ts', content: 'c' },
    { path: 'd.ts', content: 'd' },
    { path: 'e.ts', content: long },
    { path: 'f.ts', content: 'too many' },
    { path: 'src/token.ts', content: TREE[4].content },
  ];
  const plan = planLocalProject({
    projectLabel: 'dawn',
    brief: 'note sk-or-v1-abcdefghijklmnopqrstuvwxyz',
    readPaths: ['a.ts', 'b.ts', 'c.ts', 'd.ts', 'e.ts', 'f.ts', 'src/token.ts'],
    port: filesPort(files),
  });
  assert.equal(plan.ok, true);
  if (!plan.ok) return;
  assert.equal(plan.brief.includes('sk-or'), false);
  assert.equal(plan.reads.length, 5);
  assert.equal(plan.reads[4].truncated, true);
  assert.equal(plan.reads[4].text.length, 4_000);
  assert.equal(plan.refused.some((step) => step.target === 'f.ts'), true);
  const token = planLocalProject({
    projectLabel: 'dawn',
    brief: 'check the token file',
    readPaths: ['src/token.ts'],
    port: filesPort(files),
  });
  assert.equal(token.ok, true);
  if (!token.ok) return;
  assert.equal(JSON.stringify(token).includes('ghp_'), false);
  assert.match(token.reads[0].text, /\[redacted\]/);
  assert.equal(planLocalProject({ projectLabel: 'other/app', brief: 'x', port: filesPort([]) }).ok, false);
  assert.equal(planLocalProject({ projectLabel: 'dawn', brief: 'x', product: 'elsewhere', port: filesPort([]) }).ok, false);
});

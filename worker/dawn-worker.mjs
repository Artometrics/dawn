/**
 * Dawn Agents worker.
 * Dials the gateway and never listens. Each agent gets its own directory.
 * Linux (Hetzner) is the default. Set DAWN_WORKER_KIND=mac on a Mac.
 */
import { spawn } from 'node:child_process';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { assessTask, resolveInRoot } from './sandbox.mjs';

const major = Number(process.versions.node.split('.')[0]);
if (major < 22) {
  console.error('Dawn Agents worker needs Node.js 22 or newer.');
  process.exit(1);
}

const gateway = (process.env.DAWN_AGENTS_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');
const token = process.env.DAWN_WORKER_TOKEN || '';
const kind = process.env.DAWN_WORKER_KIND === 'mac' || (process.env.DAWN_WORKER_KIND !== 'linux' && process.platform === 'darwin')
  ? 'mac'
  : 'linux';

function defaultHome() {
  if (kind === 'mac') return path.join(os.homedir(), 'dawn-agents');
  return process.getuid && process.getuid() === 0 ? '/var/lib/dawn-agents/sandboxes' : path.join(os.homedir(), 'dawn-agents');
}

const home = process.env.DAWN_AGENTS_HOME || defaultHome();

if (!token) {
  console.error('Set DAWN_WORKER_TOKEN to the same value as the gateway. The token is not printed.');
  process.exit(1);
}

function safeEnv(root) {
  return {
    PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/opt/homebrew/bin',
    HOME: root,
    TMPDIR: path.join(root, '.tmp'),
    LANG: 'C.UTF-8',
    TERM: 'dumb',
  };
}

function runProcess(root, argv, shellCommand) {
  return new Promise((resolve) => {
    const child = shellCommand
      ? spawn('/bin/sh', ['-c', shellCommand], { cwd: root, env: safeEnv(root), timeout: 15_000 })
      : spawn(argv[0], argv.slice(1), { cwd: root, env: safeEnv(root), timeout: 15_000, shell: false });
    let stdout = '';
    let stderr = '';
    const take = (chunk, which) => {
      const text = String(chunk);
      if (which === 'out' && stdout.length < 64_000) stdout += text.slice(0, 64_000 - stdout.length);
      if (which === 'err' && stderr.length < 16_000) stderr += text.slice(0, 16_000 - stderr.length);
    };
    child.stdout?.on('data', (chunk) => take(chunk, 'out'));
    child.stderr?.on('data', (chunk) => take(chunk, 'err'));
    child.on('error', (error) => {
      resolve({ status: 'error', message: error.code === 'ENOENT' ? `Command not found: ${argv[0] || 'shell'}` : 'The command could not start.' });
    });
    child.on('close', (code) => {
      resolve({ status: 'ok', stdout: stdout.trim(), stderr: stderr.trim(), exitCode: code ?? 1 });
    });
  });
}

async function agentRoot(agentId) {
  if (!/^a_[a-f0-9]{8,}$/.test(agentId)) throw new Error('Bad agent id.');
  const root = path.join(home, agentId);
  await mkdir(path.join(root, '.tmp'), { recursive: true });
  return root;
}

async function execute(agentId, task) {
  const gate = assessTask(task);
  if (gate.decision === 'deny') return { status: 'denied', reason: gate.reason };
  if (gate.decision === 'confirm' && !task.confirmed) return { status: 'needs_confirm', reason: gate.reason };
  const root = await agentRoot(agentId);
  if (task.action === 'list') {
    const dir = await resolveInRoot(root, task.path && task.path !== '.' ? task.path : '.');
    const entries = await readdir(dir, { withFileTypes: true });
    const files = entries.filter((entry) => entry.name !== '.tmp').map((entry) => (entry.isDirectory() ? `${entry.name}/` : entry.name));
    return { status: 'ok', stdout: files.join('\n'), stderr: '', exitCode: 0, files };
  }
  if (task.action === 'read') {
    const file = await resolveInRoot(root, task.path);
    const text = await readFile(file, 'utf8');
    return { status: 'ok', stdout: text.slice(0, 20_000), stderr: '', exitCode: 0 };
  }
  if (task.action === 'write') {
    const file = await resolveInRoot(root, task.path);
    await writeFile(file, String(task.content ?? ''), 'utf8');
    const relative = path.relative(root, file);
    return { status: 'ok', stdout: `wrote ${relative}`, stderr: '', exitCode: 0, files: [relative] };
  }
  if (task.action === 'exec') {
    if (task.shell) return runProcess(root, [], task.command);
    return runProcess(root, task.argv || [], null);
  }
  return { status: 'error', message: 'Unknown task.' };
}

async function post(pathname, body) {
  const response = await fetch(`${gateway}${pathname}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }
  if (!response.ok) {
    const message = data.error || `Gateway responded ${response.status}`;
    throw new Error(message);
  }
  return data;
}

async function loop() {
  await mkdir(home, { recursive: true });
  const hello = await post('/api/worker/hello', {
    token,
    kind,
    host: os.hostname(),
    platform: `${process.platform} ${os.release()}`,
  });
  const workerId = hello.workerId;
  console.log(`Dawn Agents worker connected (${kind}). Sandboxes: ${home}`);
  for (;;) {
    let job = null;
    try {
      const polled = await post('/api/worker/poll', { token, workerId, kind });
      job = polled.job;
    } catch (error) {
      console.error(error instanceof Error ? error.message : 'Poll failed.');
      await new Promise((resolve) => setTimeout(resolve, 2000));
      continue;
    }
    if (!job) continue;
    let result;
    try {
      result = await execute(job.agentId, job.task);
    } catch (error) {
      result = { status: 'error', message: error instanceof Error ? error.message : 'Task failed.' };
    }
    try {
      await post('/api/worker/result', { token, jobId: job.id, result });
    } catch (error) {
      console.error(error instanceof Error ? error.message : 'Could not report the result.');
    }
  }
}

loop().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Worker stopped.');
  process.exit(1);
});

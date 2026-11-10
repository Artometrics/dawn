/**
 * File jail for Dawn kit checks. It uses only node:fs and node:path.
 * It does not read the parent environment and it does not open a network socket.
 * Adapted from the path rule in code-with-antonio/nightcode packages/cli/src/lib/local-tools.ts
 * (plan mode refuses writes) and the 20_000 character clip in ai-teammates lib/sandbox-tools.ts.
 * Daytona, Bun, and bash are not used.
 */
import { spawn } from 'node:child_process';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const jail = path.resolve(process.argv[2] || '');
const request = JSON.parse(process.argv[3] || '{}');

try {
await run();
} catch (error) {
  process.stderr.write(error instanceof Error ? error.message : 'The jail process stopped.');
  process.exit(1);
}

async function run() {

function inside(target) {
  const resolved = path.resolve(jail, target);
  const rel = path.relative(jail, resolved);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error('Path is outside the project directory');
  }
  return { resolved, rel: rel || '.' };
}

function clip(text) {
  return text.length > 20_000 ? `${text.slice(0, 20_000)}\n… truncated` : text;
}

const mode = request.mode === 'plan' ? 'plan' : 'build';
const planTools = new Set(['readFile', 'listDirectory', 'glob', 'grep']);
if (mode === 'plan' && request.suite === 'nightcode' && !planTools.has(request.tool)) {
  throw new Error(`Tool ${request.tool} is not available in PLAN mode`);
}
if (mode === 'plan' && request.suite !== 'nightcode' && ['writeFile', 'editFile', 'remember', 'handoff', 'bash'].includes(request.tool)) {
  throw new Error(`Tool ${request.tool} is not available in PLAN mode`);
}

let result;
if (request.tool === 'writeFile') {
  const { resolved, rel } = inside(String(request.path || ''));
  const content = String(request.content || '').slice(0, 20_000);
  await mkdir(path.dirname(resolved), { recursive: true });
  await writeFile(resolved, content, 'utf8');
  result = { path: rel, bytes: Buffer.byteLength(content) };
} else if (request.tool === 'readFile') {
  const { resolved, rel } = inside(String(request.path || ''));
  result = { path: rel, content: clip(await readFile(resolved, 'utf8')) };
} else if (request.tool === 'listDirectory') {
  const { resolved, rel } = inside(String(request.path || '.'));
  const entries = (await readdir(resolved)).filter((name) => !name.startsWith('.')).sort();
  result = { path: rel, entries };
} else if (request.tool === 'glob') {
  const { resolved } = inside(String(request.path || '.'));
  const pattern = String(request.pattern || '*');
  const files = [];
  await collectFiles(resolved, resolved, files);
  const matched = files.filter((file) => globMatch(pattern, file)).slice(0, 200);
  result = { files: matched };
} else if (request.tool === 'grep') {
  const { resolved } = inside(String(request.path || '.'));
  const pattern = new RegExp(String(request.pattern || ''), 'i');
  const files = [];
  await collectFiles(resolved, resolved, files);
  const matches = [];
  for (const file of files) {
    if (matches.length >= 50) break;
    const text = await readFile(path.join(resolved, file), 'utf8').catch(() => '');
    const lines = text.split('\n');
    for (let index = 0; index < lines.length && matches.length < 50; index += 1) {
      if (pattern.test(lines[index])) matches.push({ file, line: index + 1, content: lines[index].slice(0, 200) });
    }
  }
  result = { matches };
} else if (request.tool === 'editFile') {
  const { resolved, rel } = inside(String(request.path || ''));
  const content = await readFile(resolved, 'utf8');
  const oldString = String(request.oldString || '');
  const occurrences = content.split(oldString).length - 1;
  if (!oldString || occurrences === 0) throw new Error('oldString not found in file');
  if (occurrences > 1) throw new Error(`oldString is ambiguous; found ${occurrences} matches`);
  await writeFile(resolved, content.replace(oldString, String(request.newString || '')), 'utf8');
  result = { path: rel, edited: true };
} else if (request.tool === 'bash') {
  const command = String(request.command || '').slice(0, 400);
  if (!command || /\b(curl|wget|ssh|nc|ncat|sudo|scp)\b/i.test(command) || /\brm\s+-[^\n]*\//.test(command)) {
    throw new Error('That command is refused.');
  }
  const output = await new Promise((resolve, reject) => {
    const child = spawn('bash', ['-c', command], {
      cwd: jail,
      env: { PATH: process.env.PATH || '/usr/bin', HOME: jail, LANG: 'C' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    const timer = setTimeout(() => { child.kill(); reject(new Error('The command timed out.')); }, 1500);
    child.once('exit', (status) => {
      clearTimeout(timer);
      if (status !== 0) reject(new Error(stderr.trim() || 'The command failed.'));
      else resolve(clip(stdout.trim()));
    });
  });
  result = { output };
} else if (request.tool === 'remember') {
  const { resolved } = inside('memory.json');
  const prior = JSON.parse(await readFile(resolved, 'utf8').catch(() => '{}'));
  prior[String(request.key || '').slice(0, 40)] = String(request.value || '').slice(0, 500);
  await writeFile(resolved, JSON.stringify(prior), 'utf8');
  result = { remembered: true };
} else if (request.tool === 'recall') {
  const { resolved } = inside('memory.json');
  const prior = JSON.parse(await readFile(resolved, 'utf8').catch(() => '{}'));
  result = { value: prior[String(request.key || '')] ?? null };
} else if (request.tool === 'handoff') {
  const { resolved } = inside('handoff.json');
  const note = { to: String(request.to || '').slice(0, 40), text: String(request.text || '').slice(0, 500) };
  await writeFile(resolved, JSON.stringify(note), 'utf8');
  result = note;
} else {
  throw new Error('Tool is not available');
}

process.stdout.write(JSON.stringify({ ok: true, result }));
}

async function collectFiles(root, dir, out) {
  const entries = await readdir(dir);
  for (const name of entries) {
    if (name.startsWith('.') || name === 'node_modules') continue;
    const next = path.join(dir, name);
    const info = await stat(next);
    if (info.isDirectory()) await collectFiles(root, next, out);
    else out.push(path.relative(root, next));
  }
}

function globMatch(pattern, file) {
  const source = pattern.split('*').map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*');
  return new RegExp(`^${source}$`).test(file) || new RegExp(`^${source}$`).test(path.basename(file));
}

/**
 * File jail for Dawn kit checks. It uses only node:fs and node:path.
 * It does not read the parent environment and it does not open a network socket.
 * Adapted from the path rule in code-with-antonio/nightcode packages/cli/src/lib/local-tools.ts
 * (plan mode refuses writes) and the 20_000 character clip in ai-teammates lib/sandbox-tools.ts.
 * Daytona, Bun, and bash are not used.
 */
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
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
const writes = new Set(['writeFile', 'editFile', 'remember', 'handoff']);
if (mode === 'plan' && writes.has(request.tool)) {
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

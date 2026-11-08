/**
 * Workspace tools for one Dawn bot task.
 *
 * Provenance: original Dawn code. It follows the Plan / Build split described
 * by NightCode (read and search, then write, edit, and command) without copying
 * that source. The purchased adaptation lives outside this public repository
 * and is loaded only when DAWN_NIGHTCODE_HOME points at it.
 *
 * Plan may list, read, and search. Build may also write and edit inside the
 * workspace, and may run an allowlisted command with no shell. A path that
 * leaves the workspace is refused before the filesystem call.
 */

import { spawn } from 'node:child_process';
import { mkdir, readdir, readFile, realpath, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { scrubText } from './scrub';

export type ToolMode = 'plan' | 'build';

export type ToolCall =
  | { tool: 'listDirectory'; path: string }
  | { tool: 'readFile'; path: string }
  | { tool: 'grep'; path: string; pattern: string }
  | { tool: 'glob'; path: string; pattern: string }
  | { tool: 'writeFile'; path: string; content: string }
  | { tool: 'editFile'; path: string; oldString: string; newString: string }
  | { tool: 'bash'; command: string };

const PLAN = new Set(['listDirectory', 'readFile', 'grep', 'glob']);
const MAX_READ = 4_000;
const MAX_LIST = 40;
const MAX_MATCHES = 20;
const MAX_FILES = 40;

const ALLOWED = new Set(['ls', 'cat', 'wc', 'pwd']);

export type ToolOutcome =
  | { ok: true; result: unknown }
  | { ok: false; reason: string };

function outside(reason = 'That path is outside the workspace.'): ToolOutcome {
  return { ok: false, reason };
}

export async function resolveInside(root: string, rel: string): Promise<string> {
  if (typeof rel !== 'string' || !rel.trim() || rel.length > 180 || rel.includes('\0')) {
    throw new Error('That path is outside the workspace.');
  }
  const text = rel.trim().replace(/\\/g, '/');
  if (text === '.') return realpath(root);
  if (text.startsWith('/') || text.startsWith('~') || /^[A-Za-z]:\//.test(text)) {
    throw new Error('That path is outside the workspace.');
  }
  const parts = text.split('/');
  if (parts.some((part) => !part || part === '..' || part === '.' || part.startsWith('.') || part === 'node_modules')) {
    throw new Error('That path is outside the workspace.');
  }
  const rootReal = await realpath(root);
  const target = path.resolve(rootReal, text);
  if (target !== rootReal && !target.startsWith(rootReal + path.sep)) {
    throw new Error('That path is outside the workspace.');
  }
  const parent = path.dirname(target);
  const parentReal = await realpath(parent);
  if (parentReal !== rootReal && !parentReal.startsWith(rootReal + path.sep)) {
    throw new Error('That path is outside the workspace.');
  }
  try {
    const fileReal = await realpath(target);
    if (fileReal !== rootReal && !fileReal.startsWith(rootReal + path.sep)) {
      throw new Error('That path is outside the workspace.');
    }
    return fileReal;
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
    if (code === 'ENOENT') return target;
    throw error;
  }
}

async function walk(rootReal: string, dir: string, out: string[], depth: number): Promise<void> {
  if (out.length >= MAX_FILES || depth > 4) return;
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (out.length >= MAX_FILES) return;
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(rootReal, full, out, depth + 1);
    else if (entry.isFile()) out.push(path.relative(rootReal, full).split(path.sep).join('/'));
  }
}

function matches(pattern: string, rel: string): boolean {
  const text = pattern.trim();
  if (!text || text.length > 80 || text.includes('..')) return false;
  if (text === '*' || text === '**') return true;
  if (text.startsWith('*.')) return rel.endsWith(text.slice(1));
  return rel.endsWith(text) || rel.includes(text);
}

function parseArgv(command: string): string[] | null {
  const text = command.trim();
  if (!text || text.length > 180) return null;
  if (/[|&;<>`$\\\n()]/.test(text)) return null;
  const argv: string[] = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) argv.push(match[1] ?? match[2] ?? match[3] ?? '');
  return argv.length ? argv : null;
}

export async function runDawnTool(root: string, mode: ToolMode, call: ToolCall): Promise<ToolOutcome> {
  if (mode === 'plan' && !PLAN.has(call.tool)) {
    return { ok: false, reason: 'That tool is not available in plan mode.' };
  }
  try {
    if (call.tool === 'listDirectory') {
      const dir = await resolveInside(root, call.path);
      const info = await stat(dir);
      if (!info.isDirectory()) return outside('That path is not a directory.');
      const entries = await readdir(dir, { withFileTypes: true });
      const listed = entries
        .filter((entry) => !entry.name.startsWith('.') && entry.name !== 'node_modules')
        .slice(0, MAX_LIST)
        .map((entry) => ({ name: entry.name, type: entry.isDirectory() ? 'directory' as const : 'file' as const }));
      listed.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'directory' ? -1 : 1));
      return { ok: true, result: { path: call.path, entries: listed } };
    }
    if (call.tool === 'readFile') {
      const file = await resolveInside(root, call.path);
      const content = scrubText(await readFile(file, 'utf8'));
      const truncated = content.length > MAX_READ;
      return { ok: true, result: { path: call.path, content: truncated ? content.slice(0, MAX_READ) : content, truncated } };
    }
    if (call.tool === 'grep') {
      const pattern = call.pattern.trim();
      if (!pattern || pattern.length > 80) return { ok: false, reason: 'The search text is empty or too long.' };
      const dir = await resolveInside(root, call.path);
      const rootReal = await realpath(root);
      const files: string[] = [];
      const info = await stat(dir);
      if (info.isDirectory()) await walk(rootReal, dir, files, 0);
      else files.push(path.relative(rootReal, dir).split(path.sep).join('/'));
      const matchesFound: { file: string; line: number; content: string }[] = [];
      for (const rel of files) {
        if (matchesFound.length >= MAX_MATCHES) break;
        const text = await readFile(path.join(rootReal, rel), 'utf8');
        if (text.length > 100_000) continue;
        const lines = text.split('\n');
        for (let i = 0; i < lines.length; i += 1) {
          if (!lines[i].includes(pattern)) continue;
          matchesFound.push({ file: rel, line: i + 1, content: scrubText(lines[i]).slice(0, 200) });
          if (matchesFound.length >= MAX_MATCHES) break;
        }
      }
      return { ok: true, result: { matches: matchesFound } };
    }
    if (call.tool === 'glob') {
      const rootReal = await realpath(root);
      const start = await resolveInside(root, call.path);
      const files: string[] = [];
      await walk(rootReal, start, files, 0);
      return { ok: true, result: { files: files.filter((rel) => matches(call.pattern, rel)).slice(0, MAX_FILES) } };
    }
    if (call.tool === 'writeFile') {
      if (call.content.length > 8_000) return { ok: false, reason: 'The file is too long.' };
      const file = await resolveInside(root, call.path);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, call.content, 'utf8');
      return { ok: true, result: { path: call.path, bytesWritten: Buffer.byteLength(call.content) } };
    }
    if (call.tool === 'editFile') {
      const file = await resolveInside(root, call.path);
      const content = await readFile(file, 'utf8');
      const count = content.split(call.oldString).length - 1;
      if (count === 0) return { ok: false, reason: 'The old text was not found.' };
      if (count > 1) return { ok: false, reason: 'The old text appears more than once.' };
      await writeFile(file, content.replace(call.oldString, call.newString), 'utf8');
      return { ok: true, result: { path: call.path } };
    }
    const argv = parseArgv(call.command);
    if (!argv || !ALLOWED.has(argv[0])) return { ok: false, reason: 'That command is not on the allowlist.' };
    for (const arg of argv.slice(1)) {
      if (arg.startsWith('-') || arg === '.') continue;
      await resolveInside(root, arg);
    }
    const rootReal = await realpath(root);
    const output = await new Promise<{ stdout: string; stderr: string; exitCode: number }>((resolve, reject) => {
      const child = spawn(argv[0], argv.slice(1), {
        cwd: rootReal,
        shell: false,
        env: { PATH: process.env.PATH || '' } as unknown as NodeJS.ProcessEnv,
      });
      let stdout = '';
      let stderr = '';
      child.stdout.setEncoding('utf8');
      child.stderr.setEncoding('utf8');
      child.stdout.on('data', (chunk: string) => { stdout += chunk; });
      child.stderr.on('data', (chunk: string) => { stderr += chunk; });
      child.on('error', reject);
      child.on('close', (code) => resolve({ stdout: stdout.slice(0, 2_000), stderr: stderr.slice(0, 500), exitCode: code ?? 1 }));
    });
    return { ok: true, result: output };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The tool failed.';
    return outside(message);
  }
}

export const dawnTools = { source: 'dawn' as const, runTool: runDawnTool };

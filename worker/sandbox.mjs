import { realpath, mkdir, lstat } from 'node:fs/promises';
import path from 'node:path';

/**
 * Command policy for an agent sandbox.
 * Allowlisted commands may run immediately. Anything else waits for Kyle.
 * A short denylist never runs, even after approval.
 * File tools stay inside the agent directory. Approved shell does not.
 */

export const ALLOWED_BINS = new Set([
  'ls',
  'pwd',
  'cat',
  'head',
  'tail',
  'wc',
  'echo',
  'printf',
  'mkdir',
  'touch',
  'date',
  'basename',
  'dirname',
  'stat',
  'du',
  'grep',
  'find',
  'git',
  'sort',
  'uniq',
  'cut',
  'tr',
  'true',
]);

const GIT_READ = new Set(['status', 'diff', 'log', 'show', 'rev-parse']);

const DENY = [
  /\bsudo\b/i,
  /\b(shutdown|reboot|halt|poweroff|mkfs|diskutil)\b/i,
  /\brm\s+(-[^\n]*\s+)?(\/|~|\$HOME|\$\{HOME\})(\s|$)/i,
  /\b(curl|wget)\b[^\n]*169\.254\.169\.254/i,
  /:\(\)\s*\{/,
  /\blaunchctl\b/i,
  /\bchmod\s+[0-7]*\s+\//,
  /\b(dd|mkfs\.?\w*)\b/i,
];

export function isSafeRelative(value) {
  if (typeof value !== 'string' || value.length === 0 || value.length > 240) return false;
  if (value.includes('\0')) return false;
  if (path.posix.isAbsolute(value) || path.win32.isAbsolute(value)) return false;
  if (value.split(/[\\/]/).includes('..')) return false;
  return true;
}

export function pathsInArgsStayRelative(argv) {
  for (const arg of argv.slice(1)) {
    if (!arg || arg.startsWith('-')) continue;
    if (!isSafeRelative(arg)) return false;
  }
  return true;
}

export function parseCommand(command) {
  const text = String(command ?? '').trim();
  if (!text) return { argv: [], shell: false, command: '' };
  if (/[|&;<>`$\\\n]/.test(text) || /\(|\)/.test(text)) {
    return { argv: [], shell: true, command: text };
  }
  const argv = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match;
  while ((match = re.exec(text))) argv.push(match[1] ?? match[2] ?? match[3]);
  return { argv, shell: false, command: text };
}

function denied(text) {
  return DENY.some((pattern) => pattern.test(text));
}

export function assessTask(task) {
  const action = task?.action;
  if (action === 'list') {
    const rel = task.path && task.path !== '.' ? task.path : '.';
    if (rel !== '.' && !isSafeRelative(rel)) {
      return { decision: 'deny', reason: 'That path leaves the sandbox.' };
    }
    return { decision: 'allow', reason: '' };
  }
  if (action === 'read' || action === 'write') {
    if (!isSafeRelative(task.path || '')) {
      return { decision: 'deny', reason: 'That path leaves the sandbox.' };
    }
    if (action === 'write' && String(task.content ?? '').length > 200_000) {
      return { decision: 'deny', reason: 'That file is too large.' };
    }
    return { decision: 'allow', reason: '' };
  }
  if (action !== 'exec') {
    return { decision: 'deny', reason: 'Unknown computer action.' };
  }

  const parsed = task.argv?.length && !task.shell ? { argv: task.argv, shell: false, command: task.argv.join(' ') } : parseCommand(task.command || '');
  const shown = parsed.shell ? parsed.command : parsed.argv.join(' ');
  if (!shown) return { decision: 'deny', reason: 'Missing command.' };
  if (denied(shown)) return { decision: 'deny', reason: 'That command is blocked.' };

  if (parsed.shell) {
    if (task.confirmed) return { decision: 'allow', reason: '' };
    return { decision: 'confirm', reason: 'Shell syntax needs your approval before it runs.' };
  }

  const bin = path.basename(parsed.argv[0] || '');
  const needs = (reason) =>
    task.confirmed ? { decision: 'allow', reason: '' } : { decision: 'confirm', reason };

  if (!ALLOWED_BINS.has(bin)) return needs(`${bin || 'That command'} is not on the allowlist.`);
  if (bin === 'git' && !GIT_READ.has(parsed.argv[1])) return needs('That git command needs approval.');
  if (bin === 'find' && parsed.argv.some((arg) => arg === '-exec' || arg === '-delete' || arg === '-ok')) {
    return needs('find -exec needs approval.');
  }
  if (!pathsInArgsStayRelative(parsed.argv)) return needs('A path outside the sandbox needs approval.');
  return { decision: 'allow', reason: '' };
}

export async function ensureRoot(root) {
  await mkdir(root, { recursive: true });
  return realpath(root);
}

export async function resolveInRoot(root, rel) {
  const base = await ensureRoot(root);
  const requested = !rel || rel === '.' ? '.' : rel;
  if (requested !== '.' && !isSafeRelative(requested)) {
    throw new Error('That path leaves the sandbox.');
  }
  const full = path.resolve(base, requested);
  const relative = path.relative(base, full);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('That path leaves the sandbox.');
  }
  if (relative === '') return base;
  const parent = path.dirname(full);
  await mkdir(parent, { recursive: true });
  const realParent = await realpath(parent);
  const parentRel = path.relative(base, realParent);
  if (parentRel.startsWith('..') || path.isAbsolute(parentRel)) {
    throw new Error('That path leaves the sandbox.');
  }
  try {
    const info = await lstat(full);
    if (info.isSymbolicLink()) throw new Error('Symlinks are not used in the sandbox.');
  } catch (error) {
    if (error && error.code !== 'ENOENT') throw error;
  }
  return full;
}

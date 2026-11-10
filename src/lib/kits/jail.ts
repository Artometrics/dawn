import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

export type JailRequest = {
  tool: string;
  mode?: 'plan' | 'build';
  suite?: 'nightcode';
  path?: string;
  content?: string;
  pattern?: string;
  oldString?: string;
  newString?: string;
  command?: string;
  key?: string;
  value?: string;
  to?: string;
  text?: string;
};

const CLEAN_ENV = ['PATH', 'LANG', 'LC_ALL'];

/** Runs one allowlisted file tool in a short-lived process. The child receives no parent secrets. */
export async function runJail(root: string, request: JailRequest): Promise<Record<string, unknown>> {
  const script = path.resolve(process.cwd(), 'scripts/kit-jail.mjs');
  const env: NodeJS.ProcessEnv = { NODE_ENV: process.env.NODE_ENV || 'production' };
  for (const key of CLEAN_ENV) {
    if (process.env[key]) env[key] = process.env[key];
  }
  env.HOME = root;
  const child = spawn(process.execPath, [script, root, JSON.stringify(request)], {
    cwd: root,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  const timer = setTimeout(() => child.kill(), 2000);
  const code = await new Promise<number>((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (status) => resolve(status ?? 1));
  });
  clearTimeout(timer);
  if (code !== 0) throw new Error(stderr.trim() || stdout.trim() || 'The jail process stopped.');
  const parsed = JSON.parse(stdout) as { ok: boolean; result: Record<string, unknown> };
  if (!parsed.ok) throw new Error('The jail process refused the tool.');
  return parsed.result;
}

export async function withJail<T>(fn: (root: string) => Promise<T>): Promise<T> {
  const root = await mkdtemp(path.join(tmpdir(), 'dawn-kit-'));
  try {
    return await fn(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

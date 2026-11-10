import { appendFile, mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import path from 'node:path';

export type ChatLine = { personId: string; text: string; at: number };
export type SendDraft = { id: string; to: string; body: string; status: 'review' | 'approved' };

/**
 * Dawn-owned desk files. Chat lines and send drafts stay on disk.
 * A send draft is never delivered. Remote pages are refused.
 * This module does not import the unlicensed Code-with-Antonio trees.
 */
export async function initLocalDesk(root: string): Promise<string> {
  await mkdir(root, { recursive: true });
  await mkdir(path.join(root, 'sandbox'), { recursive: true });
  return realpath(root);
}

export async function appendChat(root: string, personId: string, text: string): Promise<ChatLine> {
  const home = await initLocalDesk(root);
  const line: ChatLine = {
    personId: personId.trim().slice(0, 40),
    text: text.trim().slice(0, 500),
    at: Date.now(),
  };
  if (!line.personId || !line.text) throw new Error('Say who and what.');
  await appendFile(inside(home, 'chat.jsonl'), `${JSON.stringify(line)}\n`, 'utf8');
  return line;
}

export async function readChat(root: string, personId: string): Promise<ChatLine[]> {
  const home = await initLocalDesk(root);
  const raw = await readFile(inside(home, 'chat.jsonl'), 'utf8').catch(() => '');
  return raw
    .split('\n')
    .filter(Boolean)
    .map((row) => JSON.parse(row) as ChatLine)
    .filter((line) => line.personId === personId);
}

export async function draftSend(root: string, to: string, body: string): Promise<SendDraft> {
  const home = await initLocalDesk(root);
  const draft: SendDraft = {
    id: `d_${Date.now().toString(36)}`,
    to: to.trim().slice(0, 80),
    body: body.trim().slice(0, 2000),
    status: 'review',
  };
  if (!draft.to || !draft.body) throw new Error('A draft needs a recipient and a body.');
  await appendFile(inside(home, 'sends.jsonl'), `${JSON.stringify(draft)}\n`, 'utf8');
  return draft;
}

export async function readSends(root: string): Promise<SendDraft[]> {
  const home = await initLocalDesk(root);
  const raw = await readFile(inside(home, 'sends.jsonl'), 'utf8').catch(() => '');
  return raw.split('\n').filter(Boolean).map((row) => JSON.parse(row) as SendDraft);
}

/** Marks a draft approved. Does not deliver it. */
export async function approveSend(root: string, id: string): Promise<SendDraft> {
  const home = await initLocalDesk(root);
  const sends = await readSends(home);
  const found = sends.find((item) => item.id === id);
  if (!found) throw new Error('Draft not found.');
  found.status = 'approved';
  await writeFile(inside(home, 'sends.jsonl'), sends.map((item) => JSON.stringify(item)).join('\n') + '\n', 'utf8');
  return found;
}

/** Outbound stays off unless DAWN_ALLOW_OUTBOUND=1. Tests do not set that. */
export function deliverSend(draft: SendDraft): { delivered: false; reason: string } {
  if (draft.status !== 'approved') return { delivered: false, reason: 'Approve the draft first.' };
  if (process.env.DAWN_ALLOW_OUTBOUND !== '1') return { delivered: false, reason: 'Outbound is off.' };
  return { delivered: false, reason: 'No sender is configured.' };
}

export async function writeSandboxPage(root: string, name: string, html: string): Promise<string> {
  const home = await initLocalDesk(root);
  if (!/^[a-z0-9-]{1,40}\.(html|js)$/.test(name)) throw new Error('Use a short html or js file name.');
  const file = inside(home, path.join('sandbox', name));
  await writeFile(file, html, 'utf8');
  return file;
}

export async function readLocalPage(root: string, name: string): Promise<string> {
  if (/^[a-z]+:/i.test(name) || name.includes('..')) throw new Error('Only a local sandbox file.');
  const home = await initLocalDesk(root);
  return readFile(inside(home, path.join('sandbox', name)), 'utf8');
}

const FILE_NAME = /^[a-z0-9][a-z0-9.-]{0,40}$/;

export async function writeProjectFile(root: string, name: string, text: string): Promise<void> {
  if (!FILE_NAME.test(name) || name.includes('..')) throw new Error('Use a plain file name.');
  const home = await initLocalDesk(root);
  await mkdir(path.join(home, 'files'), { recursive: true });
  await writeFile(inside(home, path.join('files', name)), text.slice(0, 20_000), 'utf8');
}

export async function readProjectFile(root: string, name: string): Promise<string> {
  if (!FILE_NAME.test(name) || name.includes('..')) throw new Error('Use a plain file name.');
  const home = await initLocalDesk(root);
  return readFile(inside(home, path.join('files', name)), 'utf8');
}

export async function listProjectFiles(root: string): Promise<string[]> {
  const home = await initLocalDesk(root);
  const { readdir } = await import('node:fs/promises');
  return readdir(path.join(home, 'files')).catch(() => []);
}

/** Reads one sandbox file. A URL or an escaped path is refused and nothing is fetched. */
/** Runs a persisted sandbox file in a fresh context. No process, network, or filesystem. */
export async function runSandboxFile(root: string, name: string): Promise<string> {
  const code = await readLocalPage(root, name);
  if (code.length > 4000) throw new Error('Fixture is too large.');
  if (/\b(process|require|fetch|import|Function|constructor)\b/.test(code)) throw new Error('Fixture is refused.');
  try {
    const value = runInNewContext(code, Object.create(null), { timeout: 200 });
    return String(value).slice(0, 500);
  } catch {
    throw new Error('Fixture stopped.');
  }
}

export async function runBrowserJob(root: string, target: string): Promise<string> {
  if (/^[a-z]+:/i.test(target) || target.includes('..') || target.includes('/') || target.includes('\\')) {
    throw new Error('Remote pages and escaped paths are refused.');
  }
  return readLocalPage(root, target);
}

function inside(root: string, target: string): string {
  const resolved = path.resolve(root, target);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) throw new Error('Outside the desk.');
  return resolved;
}

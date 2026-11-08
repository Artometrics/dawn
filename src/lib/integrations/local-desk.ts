import { appendFile, mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';

export type ChatLine = { personId: string; text: string; at: number };
export type SendDraft = { id: string; to: string; body: string; status: 'review' };

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

export async function writeSandboxPage(root: string, name: string, html: string): Promise<string> {
  const home = await initLocalDesk(root);
  if (!/^[a-z0-9-]{1,40}\.html$/.test(name)) throw new Error('Use a short html file name.');
  const file = inside(home, path.join('sandbox', name));
  await writeFile(file, html, 'utf8');
  return file;
}

export async function readLocalPage(root: string, name: string): Promise<string> {
  if (/^[a-z]+:/i.test(name) || name.includes('..')) throw new Error('Only a local sandbox file.');
  const home = await initLocalDesk(root);
  return readFile(inside(home, path.join('sandbox', name)), 'utf8');
}

function inside(root: string, target: string): string {
  const resolved = path.resolve(root, target);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) throw new Error('Outside the desk.');
  return resolved;
}

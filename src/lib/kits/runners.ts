import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { runJail, withJail } from './jail.ts';
import type { KitId } from './registry.ts';

export type KitResult = {
  id: KitId;
  ok: boolean;
  model: 'mock';
  delivered: false;
  summary: string;
  detail: Record<string, unknown>;
};

const SAFE_PATH = /^[a-zA-Z0-9._/-]+$/;

function blockedHost(host: string): boolean {
  const name = host.toLowerCase().replace(/\.$/, '');
  if (name === 'localhost' || name.endsWith('.local') || name === '::1' || name === '0.0.0.0') return true;
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(name);
  if (!match) return false;
  const parts = match.slice(1).map(Number);
  if (parts.some((part) => part > 255)) return true;
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a >= 224) return true;
  return false;
}

export function browserDecision(target: string): { allow: true; host: string } | { allow: false; reason: string } {
  let url: URL;
  try {
    url = new URL(target);
  } catch {
    return { allow: false, reason: 'Not a URL.' };
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return { allow: false, reason: 'Only http or https.' };
  if (url.username || url.password) return { allow: false, reason: 'Credentials in the URL are refused.' };
  if (blockedHost(url.hostname)) return { allow: false, reason: 'Private and local addresses are blocked.' };
  return { allow: false, reason: 'External browsing is not enabled. Nothing was opened.' };
}

export async function runKit(id: KitId): Promise<KitResult> {
  if (id === 'teammates') return teammates();
  if (id === 'assistant') return assistant();
  if (id === 'sandbox') return sandboxGame();
  if (id === 'browser') return browserFixture();
  if (id === 'sendkit') return sendkit();
  return nightcode();
}

async function teammates(): Promise<KitResult> {
  return withJail(async (root) => {
    await runJail(root, { tool: 'writeFile', mode: 'build', path: 'notes/hello.txt', content: 'team note' });
    const read = await runJail(root, { tool: 'readFile', mode: 'plan', path: 'notes/hello.txt' });
    await runJail(root, { tool: 'remember', mode: 'build', key: 'project', value: 'dawn' });
    const memory = await runJail(root, { tool: 'recall', mode: 'plan', key: 'project' });
    const handoff = await runJail(root, { tool: 'handoff', mode: 'build', to: 'reviewer', text: 'Look at notes/hello.txt' });
    let escaped = false;
    try {
      await runJail(root, { tool: 'readFile', mode: 'plan', path: '../secret' });
    } catch {
      escaped = true;
    }
    if (read.content !== 'team note' || memory.value !== 'dawn' || !escaped) {
      throw new Error('Teammate tools did not round-trip inside the jail.');
    }
    return {
      id: 'teammates',
      ok: true,
      model: 'mock',
      delivered: false,
      summary: 'Wrote a note, remembered a value, handed it to reviewer, and refused a path escape. No model was called.',
      detail: { read, memory, handoff },
    };
  });
}

async function assistant(): Promise<KitResult> {
  return withJail(async (root) => {
    await runJail(root, { tool: 'writeFile', mode: 'build', path: 'inbox.json', content: JSON.stringify({ from: 'kyle', text: 'What is on the desk?' }) });
    const inbound = await runJail(root, { tool: 'readFile', mode: 'plan', path: 'inbox.json' });
    const draft = {
      to: 'kyle',
      body: 'Mock reply. The desk check is local. Nothing was sent.',
      transport: 'mock',
      delivered: false as const,
    };
    await runJail(root, { tool: 'writeFile', mode: 'build', path: 'draft.json', content: JSON.stringify(draft) });
    const saved = JSON.parse(String((await runJail(root, { tool: 'readFile', mode: 'plan', path: 'draft.json' })).content));
    if (!String(inbound.content).includes('desk') || saved.delivered !== false) throw new Error('Assistant draft was not stored.');
    return {
      id: 'assistant',
      ok: true,
      model: 'mock',
      delivered: false,
      summary: 'Stored one inbox line and a reply draft. Telegram and iMessage were not called.',
      detail: { draft: saved },
    };
  });
}

async function sandboxGame(): Promise<KitResult> {
  return withJail(async (root) => {
    const question = { dimension: 'goal', question: 'How does the round end?', options: ['coins', 'time'] };
    if (!SAFE_PATH.test('index.html')) throw new Error('Path rule failed.');
    let escaped = false;
    try {
      await runJail(root, { tool: 'writeFile', mode: 'build', path: '../index.html', content: 'no' });
    } catch {
      escaped = true;
    }
    if (!escaped) throw new Error('Path rule failed.');
    const html = '<!doctype html><title>Dawn game</title><button id="collect">Collect</button><p id="coins">3</p><script>document.getElementById("collect").onclick=()=>{document.getElementById("coins").textContent="4"}</script>';
    await runJail(root, { tool: 'writeFile', mode: 'build', path: 'index.html', content: html });
    const file = await runJail(root, { tool: 'readFile', mode: 'plan', path: 'index.html' });
    if (!String(file.content).includes('Collect')) throw new Error('Game file was not written.');
    return {
      id: 'sandbox',
      ok: true,
      model: 'mock',
      delivered: false,
      summary: 'Asked one design question and wrote a seeded page. No model generated it.',
      detail: { question, html: file.content },
    };
  });
}

async function sendkit(): Promise<KitResult> {
  const chatId = '1001';
  const message = 'Hold this note';
  if (!/^-?\d+$/.test(chatId) || !message.trim()) throw new Error('A draft needs a chat id and a message.');
  const draft = {
    ok: true,
    chatId,
    message,
    transport: 'mock',
    delivered: false as const,
    note: 'Draft only. Telegram was not called.',
  };
  return {
    id: 'sendkit',
    ok: true,
    model: 'mock',
    delivered: false,
    summary: draft.note,
    detail: draft,
  };
}

async function nightcode(): Promise<KitResult> {
  return withJail(async (root) => {
    let blocked = false;
    try {
      await runJail(root, { tool: 'writeFile', mode: 'plan', path: 'page.ts', content: 'no' });
    } catch (error) {
      blocked = error instanceof Error && /PLAN mode/.test(error.message);
    }
    await runJail(root, { tool: 'writeFile', mode: 'build', path: 'page.ts', content: 'export const page = 1\n' });
    const listed = await runJail(root, { tool: 'listDirectory', mode: 'plan', path: '.' });
    const read = await runJail(root, { tool: 'readFile', mode: 'plan', path: 'page.ts' });
    if (!blocked || !String(read.content).includes('page') || !Array.isArray(listed.entries)) {
      throw new Error('NightCode plan and build did not hold.');
    }
    return {
      id: 'nightcode',
      ok: true,
      model: 'mock',
      delivered: false,
      summary: 'Plan mode refused the write. Build mode saved page.ts. Bash was not run.',
      detail: { listed, read: read.content },
    };
  });
}

async function browserFixture(): Promise<KitResult> {
  const chrome = ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium'].find((item) => existsSync(item));
  if (!chrome) throw new Error('Chrome is not installed on this host. Nothing was opened.');
  const refused = browserDecision('http://169.254.169.254/latest');
  if (refused.allow) throw new Error('The metadata address was not blocked.');
  const home = await mkdtemp(path.join(tmpdir(), 'dawn-kit-browser-'));
  const server = createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end('<!doctype html><title>Relay fixture</title><button id="go">Collect</button><p id="out">waiting</p><script>document.getElementById("go").onclick=()=>{document.getElementById("out").textContent="collected"}</script>');
  });
  const port = 9700 + Math.floor(Math.random() * 200);
  const chromeProc = spawn(chrome, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--no-proxy-server',
    '--disable-background-networking', `--remote-debugging-port=${port}`, `--user-data-dir=${home}/profile`,
  ], { stdio: 'ignore' });
  try {
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', () => resolve());
    });
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Fixture did not bind.');
    await wait(`http://127.0.0.1:${port}/json/version`);
    const tab = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' }).then((response) => response.json()) as { webSocketDebuggerUrl: string };
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise((resolve) => ws.addEventListener('open', resolve));
    let next = 1;
    const pending = new Map<number, (value: { result?: { result?: { value?: unknown } } }) => void>();
    ws.addEventListener('message', (event) => {
      const data = JSON.parse(String(event.data)) as { id?: number };
      if (data.id && pending.has(data.id)) {
        const done = pending.get(data.id)!;
        pending.delete(data.id);
        done(data as { result?: { result?: { value?: unknown } } });
      }
    });
    const call = (method: string, params: Record<string, unknown> = {}) => new Promise<{ result?: { result?: { value?: unknown } } }>((resolve, reject) => {
      const id = next;
      next += 1;
      const timer = setTimeout(() => reject(new Error(method)), 8000);
      pending.set(id, (value) => { clearTimeout(timer); resolve(value); });
      ws.send(JSON.stringify({ id, method, params }));
    });
    await call('Page.enable');
    await call('Page.navigate', { url: `http://127.0.0.1:${address.port}/` });
    await new Promise((resolve) => setTimeout(resolve, 300));
    const box = await call('Runtime.evaluate', {
      expression: '(() => { const r=document.getElementById("go").getBoundingClientRect(); return {x:r.x+4,y:r.y+4}; })()',
      returnByValue: true,
    });
    const point = box.result?.result?.value as { x: number; y: number };
    await call('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 });
    await call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 });
    const text = String((await call('Runtime.evaluate', { expression: 'document.getElementById("out").textContent', returnByValue: true })).result?.result?.value || '');
    ws.close();
    if (text !== 'collected') throw new Error('The browser did not see the click.');
    return {
      id: 'browser',
      ok: true,
      model: 'mock',
      delivered: false,
      summary: 'Chrome clicked the local fixture. A metadata address was refused and nothing external was opened.',
      detail: { text, refused: refused.reason },
    };
  } finally {
    chromeProc.kill();
    server.close();
    await new Promise((resolve) => setTimeout(resolve, 150));
    await rm(home, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function wait(url: string) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      if ((await fetch(url)).ok) return;
    } catch { /* retry */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(url);
}

import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { existsSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { startAgentsServer } from '../dawn-agents/http.ts';
import { forwardedApiHeaders } from './forward-headers.ts';

const chromeBin = ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium'].find((item) => existsSync(item));
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../..', 'out');

test('same-origin owner desk persists a file, a draft, and a local booth', { skip: chromeBin && existsSync(root) ? false : 'Chrome or the static build is missing' }, async () => {
  const home = await mkdtemp(path.join(tmpdir(), 'dawn-same-'));
  const gateway = await startAgentsServer({
    storePath: path.join(home, 'store.json'),
    ownerEmail: 'kyle@example.com',
    workerToken: 'worker',
    editorToken: 'editor',
    forceStandIn: true,
    schedule: false,
    port: 0,
    trustedOrigins: ['http://127.0.0.1:3000'],
  });
  const token = 'session-token';
  const front = createServer((req, res) => { void handle(req, res, gateway.url, root, token); });
  await new Promise<void>((resolve, reject) => {
    front.once('error', reject);
    front.listen(3000, '127.0.0.1', () => resolve());
  });
  const chrome = spawn(chromeBin!, ['--headless=new', '--disable-gpu', '--no-sandbox', '--no-proxy-server', '--remote-debugging-port=9521', `--user-data-dir=/tmp/dawn-same-${process.pid}`], { stdio: 'ignore' });
  try {
    await waitFor('http://127.0.0.1:9521/json/version');
    const tab = await fetch('http://127.0.0.1:9521/json/new?http://127.0.0.1:3000/__session', { method: 'PUT' }).then((response) => response.json()) as { webSocketDebuggerUrl: string };
    const result = await drive(tab.webSocketDebuggerUrl);
    assert.equal(result.spoof, 401);
    assert.equal(result.file, true);
    assert.match(result.booth, /Saved page read back/);
    assert.match(result.remote, /refused/i);
    assert.match(result.draft, /review/i);
  } finally {
    chrome.kill();
    front.close();
    await gateway.close();
    await rm(home, { recursive: true, force: true });
  }
});

async function handle(req: IncomingMessage, res: ServerResponse, gateway: string, out: string, token: string) {
  const url = new URL(req.url || '/', 'http://127.0.0.1');
  if (url.pathname === '/__session') {
    res.writeHead(302, { location: '/', 'set-cookie': `dawn_session=${token}; Path=/; HttpOnly` });
    res.end();
    return;
  }
  if (url.pathname.startsWith('/api/')) {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    const pairs: [string, string][] = [];
    for (const [key, value] of Object.entries(req.headers)) {
      const list = Array.isArray(value) ? value : value ? [value] : [];
      for (const item of list) pairs.push([key, item]);
    }
    const cookie = header(req, 'cookie');
    const session = cookie.includes(`dawn_session=${token}`) ? 'kyle@example.com' : null;
    const upstream = await fetch(gateway + url.pathname + url.search, {
      method: req.method,
      headers: forwardedApiHeaders(pairs, session),
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : Buffer.concat(chunks),
      redirect: 'manual',
    });
    res.writeHead(upstream.status, { 'content-type': upstream.headers.get('content-type') || 'application/json' });
    res.end(Buffer.from(await upstream.arrayBuffer()));
    return;
  }
  let file = decodeURIComponent(url.pathname).replace(/^\/+/, '');
  if (!file || file.endsWith('/')) file += 'index.html';
  for (const candidate of [file, `${file}.html`, path.join(file, 'index.html')]) {
    const next = path.resolve(out, candidate);
    if (!next.startsWith(out)) continue;
    try {
      if ((await stat(next)).isFile()) {
        const ext = path.extname(next);
        const type = ext === '.js' ? 'text/javascript' : ext === '.css' ? 'text/css' : ext === '.png' ? 'image/png' : ext === '.json' ? 'application/json' : 'text/html';
        res.writeHead(200, { 'content-type': type });
        res.end(await readFile(next));
        return;
      }
    } catch { /* next */ }
  }
  res.writeHead(404, { 'content-type': 'text/html' });
  res.end('<h1>This page could not be found</h1>');
}

function header(req: IncomingMessage, name: string): string {
  const value = req.headers[name];
  return Array.isArray(value) ? value.join('; ') : value || '';
}

async function drive(webSocketUrl: string) {
  const ws = new WebSocket(webSocketUrl);
  await new Promise((resolve) => ws.addEventListener('open', resolve));
  let next = 1;
  const pending = new Map<number, (value: unknown) => void>();
  ws.addEventListener('message', (event) => {
    const data = JSON.parse(String(event.data)) as { id?: number };
    if (data.id && pending.has(data.id)) {
      const done = pending.get(data.id)!;
      pending.delete(data.id);
      done(data);
    }
  });
  const call = (method: string, params: Record<string, unknown> = {}) => new Promise<unknown>((resolve, reject) => {
    const id = next;
    next += 1;
    const timer = setTimeout(() => reject(new Error(method)), 20000);
    pending.set(id, (value) => { clearTimeout(timer); resolve(value); });
    ws.send(JSON.stringify({ id, method, params }));
  });
  const ev = async (expression: string) => ((await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })) as { result?: { result?: { value?: unknown } } }).result?.result?.value;
  await call('Page.enable');
  await call('Runtime.enable');
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await new Promise((resolve) => setTimeout(resolve, 1600));
  const spoof = await fetch('http://127.0.0.1:3000/api/local-drafts', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:3000', 'sec-fetch-site': 'same-origin', 'x-auth-request-email': 'attacker@example.com' },
    body: JSON.stringify({ kind: 'chat', personId: 'letter-carrier', text: 'spoof' }),
  });
  await call('Page.navigate', { url: 'http://127.0.0.1:3000/projects' });
  await new Promise((resolve) => setTimeout(resolve, 800));
  await ev(`(() => { const name=document.querySelector('input'); const text=document.querySelector('textarea'); const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; const setText=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set; set.call(name,'note.txt'); name.dispatchEvent(new Event('input',{bubbles:true})); setText.call(text,'hello file'); text.dispatchEvent(new Event('input',{bubbles:true})); name.form.requestSubmit(); })()`);
  await new Promise((resolve) => setTimeout(resolve, 500));
  await call('Page.reload');
  await new Promise((resolve) => setTimeout(resolve, 800));
  const file = Boolean(await ev(`document.body.innerText.includes('note.txt')`));
  await call('Page.navigate', { url: 'http://127.0.0.1:3000/code/editor' });
  await new Promise((resolve) => setTimeout(resolve, 800));
  await ev(`(() => { const area=document.getElementById('file-body'); const set=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set; set.call(area,'export const page = 1'); area.dispatchEvent(new Event('input',{bubbles:true})); [...document.querySelectorAll('button')].find(el=>el.textContent.trim()==='Save')?.click(); })()`);
  await new Promise((resolve) => setTimeout(resolve, 400));
  await call('Page.reload');
  await new Promise((resolve) => setTimeout(resolve, 800));
  const editorFile = String(await ev(`document.getElementById('file-body')?.value || ''`));
  if (!editorFile.includes('export const page')) throw new Error(`editor readback ${editorFile}`);
  await ev(`[...document.querySelectorAll('button')].find(el=>el.textContent.includes('Open local booth'))?.click()`);
  await new Promise((resolve) => setTimeout(resolve, 400));
  const booth = String(await ev(`document.body.innerText`) || '');
  await ev(`[...document.querySelectorAll('button')].find(el=>el.textContent.includes('Try a remote page'))?.click()`);
  await new Promise((resolve) => setTimeout(resolve, 300));
  const remote = String(await ev(`document.body.innerText`) || '');
  await ev(`[...document.querySelectorAll('button')].find(el=>el.textContent.includes('Hold a draft'))?.click()`);
  await new Promise((resolve) => setTimeout(resolve, 300));
  const draft = String(await ev(`document.body.innerText`) || '');
  ws.close();
  return { spoof: spoof.status, file, booth, remote, draft };
}

async function waitFor(url: string) {
  for (let i = 0; i < 40; i += 1) {
    try { if ((await fetch(url)).ok) return; } catch { /* retry */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(url);
}

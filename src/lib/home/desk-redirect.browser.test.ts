import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer, type Server } from 'node:http';
import { existsSync } from 'node:fs';
import test from 'node:test';
import { classifyDesk } from './town-action.ts';

const chromeBin = ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium'].find((path) => existsSync(path));

test('a real browser reports redirect:manual as an opaque redirect, and a refused connection is not sign-in', { skip: chromeBin ? false : 'Chrome is not installed' }, async () => {
  const login = await listen((req, res) => {
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('login');
  });
  const app = await listen((req, res) => {
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    if (url.pathname === '/api/state') {
      res.writeHead(302, { location: `${login.url}/oauth2/start` });
      res.end();
      return;
    }
    if (url.pathname === '/api/ready') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end('{}');
      return;
    }
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end('<!doctype html><title>desk</title>');
  });

  const chrome = spawn(chromeBin!, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--no-proxy-server',
    '--remote-debugging-port=0',
    `--user-data-dir=/tmp/dawn-desk-${process.pid}`,
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  let stderr = '';
  chrome.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });
  const debugPort = await new Promise<number>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Chrome did not open a debug port')), 10000);
    chrome.stderr.on('data', () => {
      const match = stderr.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)/);
      if (!match) return;
      clearTimeout(timer);
      resolve(Number(match[1]));
    });
  });

  try {
    const page = await fetch(`http://127.0.0.1:${debugPort}/json/new?about:blank`, { method: 'PUT' }).then((response) => response.json()) as { webSocketDebuggerUrl: string };
    const observed = await readFetch(page.webSocketDebuggerUrl, app.url, `
      async function look(url) {
        try {
          const response = await fetch(url, { method: 'GET', redirect: 'manual', credentials: 'include' });
          return { status: response.status, ok: response.ok, type: response.type, thrown: false };
        } catch (error) {
          return { status: 0, ok: false, type: 'thrown', thrown: true, message: String(error && error.message || error) };
        }
      }
      const redirect = await look(${JSON.stringify(`${app.url}/api/state`)});
      const ready = await look(${JSON.stringify(`${app.url}/api/ready`)});
      const refused = await look('http://127.0.0.1:9/api/state');
      return { redirect, ready, refused };
    `) as {
      redirect: { status: number; ok: boolean; type: string; thrown: boolean };
      ready: { status: number; ok: boolean; type: string };
      refused: { status: number; ok: boolean; type: string; thrown: boolean };
    };

    console.log(`browser redirect ${JSON.stringify(observed.redirect)} ready ${JSON.stringify(observed.ready)} refused ${JSON.stringify(observed.refused)}`);
    assert.equal(classifyDesk(observed.redirect), 'signin', JSON.stringify(observed.redirect));
    assert.ok(observed.redirect.type === 'opaqueredirect' || observed.redirect.status === 302 || observed.redirect.status === 303, JSON.stringify(observed.redirect));
    assert.equal(classifyDesk(observed.ready), 'ready', JSON.stringify(observed.ready));
    assert.equal(classifyDesk(observed.refused), 'offline', JSON.stringify(observed.refused));
    assert.notEqual(classifyDesk(observed.refused), 'signin');
    assert.notEqual(classifyDesk(observed.refused), 'ready');
  } finally {
    chrome.kill();
    app.server.close();
    login.server.close();
  }
});

function listen(handler: (req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => void) {
  const server = createServer(handler);
  return new Promise<{ server: Server; url: string }>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('no port');
      resolve({ server, url: `http://127.0.0.1:${address.port}` });
    });
  });
}

async function readFetch(webSocketUrl: string, pageUrl: string, expression: string) {
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
    const timer = setTimeout(() => reject(new Error(method)), 15000);
    pending.set(id, (value) => {
      clearTimeout(timer);
      resolve(value);
    });
    ws.send(JSON.stringify({ id, method, params }));
  });
  await call('Page.enable');
  await call('Page.navigate', { url: pageUrl });
  await new Promise((resolve) => setTimeout(resolve, 300));
  const data = await call('Runtime.evaluate', { expression: `(async () => { ${expression} })()`, awaitPromise: true, returnByValue: true }) as {
    result?: { result?: { value?: unknown }; exceptionDetails?: { text?: string; exception?: { description?: string } } };
  };
  ws.close();
  if (data.result?.exceptionDetails) {
    throw new Error(data.result.exceptionDetails.exception?.description || data.result.exceptionDetails.text || 'browser exception');
  }
  if (data.result?.result?.value === undefined) throw new Error(`empty browser result ${JSON.stringify(data.result).slice(0, 500)}`);
  return data.result.result.value;
}

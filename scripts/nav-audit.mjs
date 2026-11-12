import { createServer } from 'node:http';
import { readFile, stat, writeFile, mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';

const root = '/agent/repos/dawn/out';
const logPath = '/opt/cursor/artifacts/nav-audit.log';
const lines = [];
const note = (line) => {
  lines.push(line);
  console.log(line);
};

function start(mode) {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    if (url.pathname === '/api/state') {
      if (mode === 'redirect') {
        res.writeHead(302, { location: 'http://127.0.0.1:9/oauth2/start' });
        res.end();
        return;
      }
      if (mode === 'ready') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({
          ownerEmail: 'owner@example.com',
          agents: [],
          threads: [{ id: 't1', kind: 'direct', title: 'Atlas Scout', agentIds: ['a'], updatedAt: 5 }],
          messages: [{ threadId: 't1', role: 'assistant', content: 'Saved atlas line', createdAt: 5 }],
          memories: [],
          routines: [],
          spend: { month: '2026-11', spentUsd: 0, capUsd: 20, entries: [] },
          workers: { linux: null, mac: null },
          keys: { gemini: false, xai: false, openrouter: false },
          editorTokenSet: false,
          training: { enabled: false, providers: {}, count: 0, exportable: 0 },
          events: [],
          data: { counts: {}, syntheticRoom: 0, queue: 0 },
          articles: [{ id: 'p1', title: 'Desk project' }],
          subscribers: [],
          sends: [],
          mailProvider: 'none',
          recipes: [],
        }));
        return;
      }
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('missing');
      return;
    }
    if (url.pathname === '/api/data' && mode === 'ready') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end('{"queue":[]}');
      return;
    }
    let file = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    if (file.endsWith('/')) file += 'index.html';
    for (const candidate of [file, `${file}.html`, path.join(file, 'index.html')]) {
      const next = path.resolve(root, candidate);
      if (!next.startsWith(root)) continue;
      try {
        if ((await stat(next)).isFile()) {
          const type = next.endsWith('.js') ? 'text/javascript' : next.endsWith('.css') ? 'text/css' : next.endsWith('.png') ? 'image/png' : 'text/html';
          res.writeHead(200, { 'content-type': type });
          res.end(await readFile(next));
          return;
        }
      } catch { /* next candidate */ }
    }
    res.writeHead(404, { 'content-type': 'text/html' });
    res.end('<html><body><h1>This page could not be found</h1></body></html>');
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

const chrome = spawn('/usr/bin/google-chrome', [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--no-proxy-server',
  '--remote-debugging-port=9455', `--user-data-dir=/tmp/dawn-nav-audit-${process.pid}`,
], { stdio: 'ignore' });
for (let i = 0; i < 40; i += 1) {
  try {
    if ((await fetch('http://127.0.0.1:9455/json/version')).ok) break;
  } catch { /* retry */ }
  await new Promise((r) => setTimeout(r, 100));
}
const page = await fetch('http://127.0.0.1:9455/json/new?about:blank', { method: 'PUT' }).then((r) => r.json());
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let n = 0;
const pending = new Map();
const net = [];
ws.addEventListener('message', (ev) => {
  const data = JSON.parse(ev.data);
  if (data.method === 'Network.requestWillBeSent') net.push(data.params.request.url);
  if (data.id && pending.has(data.id)) {
    pending.get(data.id)(data);
    pending.delete(data.id);
  }
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++n;
  pending.set(id, resolve);
  ws.send(JSON.stringify({ id, method, params }));
  setTimeout(() => reject(new Error(method)), 20000);
});
await send('Page.enable');
await send('Runtime.enable');
await send('Network.enable');
const ev = async (expression) => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.result?.value;

async function go(origin, url) {
  const before = net.length;
  await send('Page.navigate', { url: `${origin}${url}` });
  await new Promise((r) => setTimeout(r, 1400));
  return before;
}
async function size(width, height) {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 800 });
  await new Promise((r) => setTimeout(r, 200));
}
const click = (label) => ev(`(() => { const b=[...document.querySelectorAll('button,a')].find(el => el.textContent.trim()===${JSON.stringify(label)}); if(!b) return 'missing'; b.click(); return 'clicked'; })()`);

await mkdir('/opt/cursor/artifacts', { recursive: true });

for (const mode of ['offline', 'redirect', 'ready']) {
  const server = await start(mode);
  const port = server.address().port;
  const origin = `http://127.0.0.1:${port}`;
  note(`mode ${mode}`);
  for (const width of [390, 472, 1280]) {
    const height = width === 1280 ? 900 : width === 472 ? 1024 : 844;
    await size(width, height);
    const before = await go(origin, '/studio');
    const tabs = await ev(`['Home','Chat','Computer','Project'].map(name => [...document.querySelectorAll('a,button')].some(el => el.textContent.trim()===name)).join(',')`);
    note(`studio ${width} tabs ${tabs} overflow ${await ev('document.documentElement.scrollWidth>document.documentElement.clientWidth+1')}`);
    for (const pane of ['Chat', 'Computer', 'Project']) {
      note(`studio ${width} ${pane} ${await click(pane)}`);
      await new Promise((r) => setTimeout(r, 250));
      const marker = pane === 'Computer'
        ? await ev(`document.body.innerText.includes('No computer is connected.')`)
        : pane === 'Project'
          ? await ev(`document.body.innerText.includes('No project files are stored on this host.') || document.body.innerText.includes('Desk project')`)
          : await ev(`document.body.innerText.includes('Sample transcript')`);
      note(`studio ${width} ${pane} visible ${marker}`);
    }
    const providerCalls = net.slice(before).filter((url) => /generativelanguage|openrouter|firebasevertexai|aiplatform/.test(url));
    note(`studio ${width} provider calls ${providerCalls.length}`);
  }
  await size(390, 844);
  await go(origin, '/town?bot=atlas-scout');
  note(`reload bot ${await ev(`document.querySelector('.ph-talk')?.innerText.replace(/\\s+/g,' ').slice(0,180)`)}`);
  await ev(`history.back()`);
  await new Promise((r) => setTimeout(r, 400));
  note(`back ${await ev('location.pathname+location.search')}`);
  await go(origin, '/agents');
  await new Promise((r) => setTimeout(r, 400));
  note(`agents ${await ev(`document.body.innerText.replace(/\\s+/g,' ').slice(0,160)`)}`);
  await go(origin, '/town');
  await ev(`document.querySelector('button[aria-label="Menu"]').click()`);
  note(`drawer ${await ev(`document.querySelector('#dawn-menu')?.innerText.replace(/\\s+/g,' ').slice(0,220)`)}`);
  note(`chats entry ${await ev(`!![...document.querySelectorAll('#dawn-menu a, #dawn-menu button')].find(el => el.textContent.trim()==='Chats')`)}`);
  server.close();
}

await writeFile(logPath, `${lines.join('\n')}\n`);
ws.close();
chrome.kill();

import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { spawn, type ChildProcess } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const OUT = path.resolve('out');
const PAGE = '/preview/village';

async function hasExport(): Promise<boolean> {
  try {
    await stat(path.join(OUT, 'preview/village.html'));
    return true;
  } catch {
    return false;
  }
}

function serve(root: string): Promise<{ server: Server; port: number }> {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    let file = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    if (file.endsWith('/')) file += 'index.html';
    const candidates = [file, `${file}.html`, path.join(file, 'index.html')];
    let full = '';
    for (const candidate of candidates) {
      const next = path.resolve(root, candidate);
      if (!next.startsWith(root)) continue;
      try {
        const info = await stat(next);
        if (!info.isFile()) continue;
        full = next;
        break;
      } catch {
        /* try the next shape */
      }
    }
    if (!full) {
      res.writeHead(404);
      res.end();
      return;
    }
    if (!full.startsWith(root)) {
      res.writeHead(403);
      res.end();
      return;
    }
    try {
      const body = await readFile(full);
      const type = full.endsWith('.js')
        ? 'text/javascript'
        : full.endsWith('.css')
          ? 'text/css'
          : full.endsWith('.png')
            ? 'image/png'
            : full.endsWith('.woff2')
              ? 'font/woff2'
              : full.endsWith('.svg')
                ? 'image/svg+xml'
                : 'text/html';
      res.writeHead(200, { 'content-type': type });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      resolve({ server, port });
    });
  });
}

type Measure = {
  scrollWidth: number;
  clientWidth: number;
  scrollHeight: number;
  innerHeight: number;
  navBottom: number;
  navRight: number;
  navCount: number;
};

async function measure(url: string, width: number, height: number, debugPort: number): Promise<Measure> {
  const chrome: ChildProcess = spawn('/usr/bin/google-chrome', [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--no-proxy-server',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=/tmp/dawn-fit-${process.pid}-${width}`,
  ], { stdio: 'ignore' });
  try {
    let version = '';
    for (let i = 0; i < 40; i += 1) {
      try {
        const res = await fetch(`http://127.0.0.1:${debugPort}/json/version`);
        if (res.ok) {
          version = await res.text();
          break;
        }
      } catch {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    if (!version) throw new Error('Chrome did not start');
    const page = await fetch(`http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' }).then((res) => res.json()) as { webSocketDebuggerUrl: string };
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve) => ws.addEventListener('open', resolve));
    let n = 0;
    const pending = new Map<number, (value: { result?: { result?: { value?: Measure } } }) => void>();
    ws.addEventListener('message', (event) => {
      const data = JSON.parse(String(event.data)) as { id?: number; result?: { result?: { value?: Measure } } };
      if (data.id && pending.has(data.id)) {
        pending.get(data.id)?.(data);
        pending.delete(data.id);
      }
    });
    const send = (method: string, params: Record<string, unknown> = {}) => new Promise<{ result?: { result?: { value?: Measure } } }>((resolve, reject) => {
      const id = ++n;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => reject(new Error(method)), 20000);
    });
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 500 });
    await send('Page.navigate', { url });
    await new Promise((r) => setTimeout(r, 2500));
    const ran = await send('Runtime.evaluate', {
      expression: `(() => {
        const root = document.documentElement;
        const nav = document.querySelector('.pv-village-nav');
        const buttons = nav ? [...nav.querySelectorAll('button')] : [];
        const last = buttons.at(-1);
        const box = last ? last.getBoundingClientRect() : { bottom: 0, right: 0 };
        return {
          href: location.href,
          scrollWidth: root.scrollWidth,
          clientWidth: root.clientWidth,
          scrollHeight: root.scrollHeight,
          innerHeight: window.innerHeight,
          navBottom: box.bottom,
          navRight: box.right,
          navCount: buttons.length,
        };
      })()`,
      returnByValue: true,
    });
    ws.close();
    const value = ran.result?.result?.value;
    if (!value) throw new Error('No measurement');
    return value;
  } finally {
    chrome.kill();
  }
}

test('village preview stays inside 390×900 and 1280×900', async (t) => {
  if (!(await hasExport())) {
    t.skip('Run npm run build so out/preview/village exists.');
    return;
  }
  const { server, port } = await serve(OUT);
  try {
    const sizes = [[390, 900, 9331], [1280, 900, 9332]] as const;
    for (const [width, height, debugPort] of sizes) {
      const box = await measure(`http://127.0.0.1:${port}${PAGE}`, width, height, debugPort);
      assert.equal(box.navCount, 5, `${width} nav`);
      assert.ok(box.scrollWidth <= box.clientWidth + 1, `${width} scrollWidth ${box.scrollWidth} > ${box.clientWidth}`);
      assert.ok(box.navBottom <= box.innerHeight + 1, `${width} nav bottom ${box.navBottom} > ${box.innerHeight}`);
      assert.ok(box.navBottom > box.innerHeight - 80, `${width} nav is not on the bottom (${box.navBottom})`);
      assert.ok(box.navRight <= box.clientWidth + 1, `${width} nav right ${box.navRight}`);
      assert.ok(box.scrollHeight <= box.innerHeight + 1, `${width} page scrolls ${box.scrollHeight} > ${box.innerHeight}`);
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

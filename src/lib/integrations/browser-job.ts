import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

export type BrowseDecision =
  | { allow: true; host: string }
  | { allow: false; reason: string };

const BLOCKED_REASON = 'Private and local addresses are blocked.';

/** Owner allow list for a public page. Private and local hosts never pass. */
export function decideBrowserTarget(target: string, allow: readonly string[]): BrowseDecision {
  let url: URL;
  try {
    url = new URL(target);
  } catch {
    return { allow: false, reason: 'Not a URL.' };
  }
  if (url.username || url.password) return { allow: false, reason: 'Credentials in the URL are refused.' };
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return { allow: false, reason: 'Only http or https.' };
  const host = url.hostname.toLowerCase();
  if (isBlockedHost(host)) return { allow: false, reason: BLOCKED_REASON };
  if (!allow.includes(host)) return { allow: false, reason: 'Host is not on the owner allow list. The page was refused.' };
  return { allow: true, host };
}

export function isBlockedAddress(address: string): boolean {
  return isBlockedHost(address.replace(/^\[|\]$/g, ''));
}

export function isBlockedHost(host: string): boolean {
  const name = host.toLowerCase().replace(/\.$/, '');
  if (name === 'localhost' || name.endsWith('.localhost') || name.endsWith('.local') || name === '0.0.0.0' || name === '::1' || name === '::') return true;
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(name);
  if (!match) return false;
  const parts = match.slice(1).map(Number);
  if (parts.some((part) => part > 255)) return true;
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a >= 224) return true;
  return false;
}

export type FixtureBrowse = {
  engine: 'chrome';
  clicked: true;
  title: string;
  text: string;
  screenshotBytes: number;
};

/**
 * Drives the installed Chrome at one page this process serves on 127.0.0.1.
 * The caller does not choose the URL. This is the local browser check.
 */
export async function runFixtureBrowser(chromeBin: string): Promise<FixtureBrowse> {
  const home = await mkdtemp(path.join(tmpdir(), 'dawn-browse-'));
  const port = 9600 + Math.floor(Math.random() * 300);
  const page = `<!doctype html><title>Dawn fixture</title><button id="go">Collect</button><p id="out">waiting</p><script>document.getElementById('go').addEventListener('click',()=>{document.getElementById('out').textContent='collected';});</script>`;
  const server = createServer((req, res) => {
    const host = req.headers.host || '';
    if (!host.startsWith('127.0.0.1:')) {
      res.writeHead(403);
      res.end('no');
      return;
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(page);
  });
  const chrome = spawn(chromeBin, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--no-proxy-server',
    '--disable-background-networking',
    '--disable-sync',
    '--no-first-run',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${home}/profile`,
  ], { stdio: 'ignore' });
  try {
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', () => resolve());
    });
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Fixture server did not bind.');
    await wait(`http://127.0.0.1:${port}/json/version`);
    const tab = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' }).then((response) => response.json()) as { webSocketDebuggerUrl: string };
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise((resolve) => ws.addEventListener('open', resolve));
    let next = 1;
    const pending = new Map<number, (value: { result?: { data?: string; result?: { value?: unknown } } }) => void>();
    ws.addEventListener('message', (event) => {
      const data = JSON.parse(String(event.data)) as { id?: number };
      if (data.id && pending.has(data.id)) {
        const done = pending.get(data.id)!;
        pending.delete(data.id);
        done(data as { result?: { data?: string; result?: { value?: unknown } } });
      }
    });
    const call = (method: string, params: Record<string, unknown> = {}) => new Promise<{ result?: { data?: string; result?: { value?: unknown } } }>((resolve, reject) => {
      const id = next;
      next += 1;
      const timer = setTimeout(() => reject(new Error(method)), 8000);
      pending.set(id, (value) => { clearTimeout(timer); resolve(value); });
      ws.send(JSON.stringify({ id, method, params }));
    });
    await call('Page.enable');
    await call('Runtime.enable');
    await call('Page.navigate', { url: `http://127.0.0.1:${address.port}/` });
    await new Promise((resolve) => setTimeout(resolve, 400));
    const box = await call('Runtime.evaluate', {
      expression: `(() => { const node=document.getElementById('go'); const rect=node.getBoundingClientRect(); return {x:rect.x+rect.width/2,y:rect.y+rect.height/2}; })()`,
      returnByValue: true,
    });
    const point = box.result?.result?.value as { x: number; y: number };
    await call('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 });
    await call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 });
    await new Promise((resolve) => setTimeout(resolve, 100));
    const title = String((await call('Runtime.evaluate', { expression: 'document.title', returnByValue: true })).result?.result?.value || '');
    const text = String((await call('Runtime.evaluate', { expression: 'document.getElementById("out").textContent', returnByValue: true })).result?.result?.value || '');
    const shot = await call('Page.captureScreenshot', { format: 'png' });
    const bytes = Buffer.from(shot.result?.data || '', 'base64').length;
    ws.close();
    if (title !== 'Dawn fixture' || text !== 'collected' || bytes < 500) throw new Error('Browser check did not see the click.');
    return { engine: 'chrome', clicked: true, title, text, screenshotBytes: bytes };
  } finally {
    chrome.kill();
    server.close();
    await new Promise((resolve) => setTimeout(resolve, 200));
    await rm(home, { recursive: true, force: true }).catch(() => undefined);
  }
}

/**
 * External pages stay closed unless connect is set, the host is allow-listed,
 * and every resolved address is public. Tests leave connect false.
 */
export async function runApprovedBrowse(target: string, allow: readonly string[], options: {
  connect: boolean;
  lookup: (host: string) => Promise<string[]>;
  chromeBin?: string;
}): Promise<FixtureBrowse> {
  const decision = decideBrowserTarget(target, allow);
  if (!decision.allow) throw new Error(decision.reason);
  const addresses = await options.lookup(decision.host);
  if (addresses.length === 0 || addresses.some((address) => isBlockedAddress(address))) {
    throw new Error('Resolved address is private. Nothing was opened.');
  }
  if (!options.connect || !options.chromeBin) throw new Error('External browsing is not enabled. Nothing was opened.');
  return navigateChrome(options.chromeBin, target);
}

async function navigateChrome(chromeBin: string, url: string): Promise<FixtureBrowse> {
  const home = await mkdtemp(path.join(tmpdir(), 'dawn-browse-ext-'));
  const port = 9600 + Math.floor(Math.random() * 300);
  const chrome = spawn(chromeBin, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--no-proxy-server',
    '--disable-background-networking', '--disable-sync', '--no-first-run',
    `--remote-debugging-port=${port}`, `--user-data-dir=${home}/profile`,
  ], { stdio: 'ignore' });
  const timer = setTimeout(() => chrome.kill(), 8000);
  try {
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
      const clock = setTimeout(() => reject(new Error(method)), 8000);
      pending.set(id, (value) => { clearTimeout(clock); resolve(value); });
      ws.send(JSON.stringify({ id, method, params }));
    });
    await call('Page.enable');
    await call('Page.navigate', { url });
    await new Promise((resolve) => setTimeout(resolve, 500));
    const title = String((await call('Runtime.evaluate', { expression: 'document.title', returnByValue: true })).result?.result?.value || '');
    ws.close();
    return { engine: 'chrome', clicked: true, title, text: '', screenshotBytes: 0 };
  } finally {
    clearTimeout(timer);
    chrome.kill();
    await new Promise((resolve) => setTimeout(resolve, 200));
    await rm(home, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function wait(url: string) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      if ((await fetch(url)).ok) return;
    } catch { /* retry */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(url);
}

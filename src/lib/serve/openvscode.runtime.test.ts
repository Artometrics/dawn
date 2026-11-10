import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createServer, request as httpRequest } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

const binary = '/tmp/dawn-code-cache/openvscode-server-v1.109.5-linux-x64/bin/openvscode-server';
const gateway = path.resolve('editor/dist/gateway.cjs');

test('OpenVSCode workbench answers only after the session cookie', { skip: existsSync(binary) || process.env.CI ? false : 'OpenVSCode is not downloaded on this machine' }, async () => {
  let owned: ReturnType<typeof spawn> | null = null;
  if (!(await reachable('http://127.0.0.1:3010/editor/'))) {
    const data = await mkdtemp(path.join(tmpdir(), 'dawn-vscode-'));
    owned = spawn(binary, [
      '--host', '127.0.0.1',
      '--port', '3010',
      '--server-base-path', '/editor',
      '--without-connection-token',
      '--accept-server-license-terms',
      '--server-data-dir', data,
      '--default-folder', process.cwd(),
    ], { stdio: 'ignore' });
    if (!(await reachable('http://127.0.0.1:3010/editor/'))) throw new Error('OpenVSCode did not bind.');
  }
  const token = 'editor-session';
  const front = createServer((req, res) => {
    const cookie = req.headers.cookie || '';
    if (!cookie.includes(`dawn_session=${token}`)) {
      res.writeHead(401, { 'content-type': 'text/plain' });
      res.end('Sign in required.');
      return;
    }
    const upstream = httpRequest({ hostname: '127.0.0.1', port: 3010, path: req.url, method: req.method || 'GET' }, (response) => {
      res.writeHead(response.statusCode || 502, { 'content-type': String(response.headers['content-type'] || 'text/html') });
      response.pipe(res);
    });
    upstream.on('error', () => { res.writeHead(502); res.end('editor down'); });
    upstream.end();
  });
  await new Promise<void>((resolve) => front.listen(0, '127.0.0.1', () => resolve()));
  const address = front.address();
  const origin = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`;
  try {
    const anon = await fetch(`${origin}/editor/`);
    assert.equal(anon.status, 401);
    const authed = await fetch(`${origin}/editor/`, { headers: { cookie: `dawn_session=${token}` } });
    const html = await authed.text();
    assert.equal(authed.status, 200);
    assert.match(html, /code\/didStartRenderer/);
  } finally {
    front.close();
    if (owned) {
      owned.kill();
      await rm(path.join(tmpdir(), 'dawn-vscode-'), { recursive: true, force: true }).catch(() => undefined);
    }
  }
});

test('the code gateway starts in mock mode and does not claim a provider', { skip: existsSync(gateway) || process.env.CI ? false : 'editor/dist/gateway.cjs is not built' }, async () => {
  const data = await mkdtemp(path.join(tmpdir(), 'dawn-gateway-'));
  const child = spawn(process.execPath, [gateway], {
    env: {
      ...process.env,
      DAWN_CODE_TOKEN: 'test-token',
      DAWN_CODE_MOCK: '1',
      DAWN_CODE_PORT: '8793',
      DAWN_CODE_DATA: data,
      DAWN_CODE_HOST: '127.0.0.1',
    },
    stdio: 'ignore',
  });
  try {
    if (!(await reachable('http://127.0.0.1:8793/health'))) throw new Error('Gateway did not listen.');
    const health = await fetch('http://127.0.0.1:8793/health').then((response) => response.json()) as { mock: boolean; providers: { google: boolean; xai: boolean; openrouter: boolean } };
    assert.equal(health.mock, true);
    assert.equal(health.providers.google, false);
    assert.equal(health.providers.xai, false);
    assert.equal(health.providers.openrouter, false);
    assert.equal((await fetch('http://127.0.0.1:8793/v1/models')).status, 401);
    assert.equal((await fetch('http://127.0.0.1:8793/v1/models', { headers: { authorization: 'Bearer test-token' } })).status, 200);
  } finally {
    child.kill();
    await rm(data, { recursive: true, force: true });
  }
});

async function reachable(url: string) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      if ((await fetch(url)).ok) return true;
    } catch { /* retry */ }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return false;
}

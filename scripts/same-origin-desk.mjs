/**
 * Same-origin town plus the owner desk.
 *
 * Firebase Hosting cannot run this Node process and cannot attach the
 * oauth2-proxy cookie from https://2-29-173-68.sslip.io.
 *
 * On that host, Caddy already sends /api to 127.0.0.1:8787 after
 * oauth2-proxy. Run the gateway there, and serve this build as
 * DAWN_STATIC_ROOT. Do not set DAWN_ALLOW_LOOPBACK_OWNER.
 *
 *   DAWN_ALLOWED_EMAIL=you@example.com \
 *   DAWN_TRUSTED_ORIGINS=https://2-29-173-68.sslip.io \
 *   node --import ./server/register.mjs server/dawn-agents.mjs
 *
 * This script is the local pair: static files on 127.0.0.1:3000 and the
 * gateway on 127.0.0.1:8787. It strips client auth headers. Sign-in stays
 * 401 until oauth2-proxy is in front. No model is called.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'out');
const port = Number(process.env.DAWN_STATIC_PORT || 3000);
const email = (process.env.DAWN_ALLOWED_EMAIL || '').trim();
if (!email) {
  console.error('Set DAWN_ALLOWED_EMAIL. The address is not printed.');
  process.exit(1);
}

const child = spawn(process.execPath, ['--import', './server/register.mjs', 'server/dawn-agents.mjs'], {
  cwd: root,
  env: {
    ...process.env,
    DAWN_ALLOWED_EMAIL: email,
    DAWN_ALLOW_LOOPBACK_OWNER: '',
    DAWN_TRUSTED_ORIGINS: process.env.DAWN_TRUSTED_ORIGINS || 'https://2-29-173-68.sslip.io,http://127.0.0.1:3000,http://localhost:3000',
    DAWN_AGENTS_HOST: '127.0.0.1',
    DAWN_AGENTS_PORT: process.env.DAWN_AGENTS_PORT || '8787',
  },
  stdio: 'inherit',
});

const gateway = `http://127.0.0.1:${process.env.DAWN_AGENTS_PORT || '8787'}`;
const dropped = new Set(['x-auth-request-email', 'x-auth-request-user', 'x-auth-request-preferred-username', 'x-forwarded-email', 'host', 'content-length']);

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://127.0.0.1');
  if (url.pathname.startsWith('/api/')) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (dropped.has(key.toLowerCase())) continue;
      const list = Array.isArray(value) ? value : value ? [value] : [];
      for (const item of list) headers.append(key, item);
    }
    const upstream = await fetch(gateway + url.pathname + url.search, {
      method: req.method,
      headers,
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : Buffer.concat(chunks),
      redirect: 'manual',
    });
    const bytes = Buffer.from(await upstream.arrayBuffer());
    res.writeHead(upstream.status, { 'content-type': upstream.headers.get('content-type') || 'application/json' });
    res.end(bytes);
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
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Dawn same-origin on http://127.0.0.1:${port}`);
  console.log('Sign-in is 401 until oauth2-proxy sets the owner header. No model is called.');
});

function stop() {
  child.kill();
  server.close();
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import { KITS, kitById, type KitId } from './registry.ts';
import { NightcodeDesk } from './nightcode-agent.ts';
import { TeammatesDesk } from './teammates-chat.ts';
import { runKit } from './runners.ts';

type SendJson = (res: ServerResponse, status: number, body: unknown) => void;

export async function handleKits(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  _dataRoot: string,
  sendJson: SendJson,
): Promise<void> {
  if (req.method === 'GET' && pathname === '/api/kits') {
    sendJson(res, 200, {
      host: 'local-gateway',
      model: 'mock',
      delivered: false,
      kits: KITS.map((kit) => ({
        id: kit.id,
        title: kit.title,
        href: kit.href,
        liveUrl: kit.liveUrl,
        adapted: kit.adapted,
        replaced: kit.replaced,
        status: 'local check ready',
      })),
    });
    return;
  }
  if (pathname.startsWith('/api/kits/nightcode/')) {
    await nightcodeRoute(req, res, pathname, _dataRoot, sendJson);
    return;
  }
  if (pathname.startsWith('/api/kits/teammates/')) {
    await teammatesRoute(req, res, pathname, _dataRoot, sendJson);
    return;
  }
  const id = pathname.slice('/api/kits/'.length);
  const kit = kitById(id);
  if (!kit || req.method !== 'POST') {
    sendJson(res, 404, { error: 'Unknown kit.' });
    return;
  }
  const raw = await readBody(req);
  let body: { check?: string } = {};
  try {
    body = raw ? JSON.parse(raw) as { check?: string } : {};
  } catch {
    sendJson(res, 400, { error: 'JSON is required.' });
    return;
  }
  if (body.check !== 'run') {
    sendJson(res, 400, { error: 'Send {"check":"run"}.' });
    return;
  }
  try {
    const result = await runKit(kit.id as KitId);
    sendJson(res, 200, { ...result, title: kit.title, source: kit.source, replaced: kit.replaced });
  } catch (error) {
    sendJson(res, 400, { error: error instanceof Error ? error.message : 'The check failed.', delivered: false, model: 'mock' });
  }
}

async function nightcodeRoute(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  dataRoot: string,
  sendJson: SendJson,
): Promise<void> {
  const desk = new NightcodeDesk(path.join(dataRoot, 'nightcode.sqlite'));
  const model = desk.modelState();
  if (req.method === 'GET' && pathname === '/api/kits/nightcode/sessions') {
    const query = new URL(req.url || '/', 'http://127.0.0.1').searchParams.get('q') || '';
    sendJson(res, 200, { sessions: desk.searchSessions(query), ...model });
    return;
  }
  if (req.method === 'POST' && pathname === '/api/kits/nightcode/sessions') {
    const created = desk.createSession();
    sendJson(res, 201, { ...desk.getSession(created.id), ...model });
    return;
  }
  const message = pathname.match(/^\/api\/kits\/nightcode\/sessions\/([^/]+)(?:\/messages)?$/);
  if (!message) {
    sendJson(res, 404, { error: 'Unknown NightCode route.' });
    return;
  }
  const id = decodeURIComponent(message[1]);
  if (req.method === 'GET') {
    try {
      sendJson(res, 200, { ...desk.getSession(id), ...model });
    } catch (error) {
      sendJson(res, 404, { error: error instanceof Error ? error.message : 'Session not found' });
    }
    return;
  }
  if (req.method !== 'POST' || !pathname.endsWith('/messages')) {
    sendJson(res, 404, { error: 'Unknown NightCode route.' });
    return;
  }
  const raw = await readBody(req);
  let body: { text?: string; mode?: string } = {};
  try {
    body = JSON.parse(raw) as { text?: string; mode?: string };
  } catch {
    sendJson(res, 400, { error: 'JSON is required.' });
    return;
  }
  const mode = body.mode === 'build' ? 'build' : 'plan';
  try {
    const session = await desk.postMessage(id, String(body.text || ''), mode);
    sendJson(res, 200, { ...session, ...model });
  } catch (error) {
    sendJson(res, 400, { error: error instanceof Error ? error.message : 'The turn stopped.', ...model });
  }
}

async function teammatesRoute(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  dataRoot: string,
  sendJson: SendJson,
): Promise<void> {
  const desk = new TeammatesDesk(path.join(dataRoot, 'teammates.sqlite'));
  if (req.method === 'POST' && pathname === '/api/kits/teammates/rooms') {
    const created = desk.createRoom();
    sendJson(res, 201, { ...desk.getRoom(created.id), model: 'mock', delivered: false });
    return;
  }
  const match = pathname.match(/^\/api\/kits\/teammates\/rooms\/([^/]+)(?:\/messages)?$/);
  if (!match) {
    sendJson(res, 404, { error: 'Unknown teammates route.' });
    return;
  }
  const id = decodeURIComponent(match[1]);
  if (req.method === 'GET') {
    try {
      sendJson(res, 200, { ...desk.getRoom(id), model: 'mock', delivered: false });
    } catch (error) {
      sendJson(res, 404, { error: error instanceof Error ? error.message : 'Room not found' });
    }
    return;
  }
  if (req.method !== 'POST' || !pathname.endsWith('/messages')) {
    sendJson(res, 404, { error: 'Unknown teammates route.' });
    return;
  }
  const raw = await readBody(req);
  let body: { text?: string } = {};
  try {
    body = JSON.parse(raw) as { text?: string };
  } catch {
    sendJson(res, 400, { error: 'JSON is required.' });
    return;
  }
  try {
    const room = await desk.postMessage(id, String(body.text || ''));
    sendJson(res, 200, { ...room, model: 'mock', delivered: false });
  } catch (error) {
    sendJson(res, 400, { error: error instanceof Error ? error.message : 'The turn stopped.', model: 'mock', delivered: false });
  }
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > 20_000) {
        reject(new Error('Body is too large.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

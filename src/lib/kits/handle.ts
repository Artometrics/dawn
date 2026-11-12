import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import { KITS, kitById, type KitId } from './registry.ts';
import { NightcodeDesk, modelState, nightcodeArmed } from './nightcode-agent.ts';
import { TeammatesDesk } from './teammates-chat.ts';
import { runKit } from './runners.ts';
import { DailyRequestCap, dailyRequestCap } from '../dawn-agents/model-choice.ts';
import { createKitModel, type Generate, type GenerateAgent, type KitModel, type SpendHooks } from '../dawn-agents/model-reply.ts';

/** What the gateway lends the kit routes: the dollar cap and ledger, and (in tests) a stand-in for the provider call. */
export type KitRuntime = { spend?: SpendHooks; generate?: Generate; generateAgent?: GenerateAgent; env?: Record<string, string | undefined> };

const FIXTURE_NOTE = 'Fixture replies. No model key is set on this server.';

function kitModel(root: string, requested: unknown, runtime: KitRuntime): KitModel | null {
  return createKitModel({
    requested,
    cap: new DailyRequestCap(path.join(root, 'daily-requests.json'), dailyRequestCap()),
    spend: runtime.spend,
    generate: runtime.generate,
    generateAgent: runtime.generateAgent,
    env: runtime.env,
  });
}

function modelFields(model: KitModel | null): { model: string; reason?: string } {
  return model ? { model: `${model.choice.provider}:${model.choice.model}` } : { model: 'mock', reason: FIXTURE_NOTE };
}

function ncState(model: KitModel | null, runtime: KitRuntime) {
  return modelState(model, runtime.env);
}

type SendJson = (res: ServerResponse, status: number, body: unknown) => void;

export async function handleKits(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  _dataRoot: string,
  sendJson: SendJson,
  runtime: KitRuntime = {},
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
    await nightcodeRoute(req, res, pathname, _dataRoot, sendJson, runtime);
    return;
  }
  if (pathname.startsWith('/api/kits/teammates/')) {
    await teammatesRoute(req, res, pathname, _dataRoot, sendJson, runtime);
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
  runtime: KitRuntime,
): Promise<void> {
  const desk = new NightcodeDesk(path.join(dataRoot, 'nightcode.sqlite'));
  if (req.method === 'GET' && pathname === '/api/kits/nightcode/sessions') {
    const query = new URL(req.url || '/', 'http://127.0.0.1').searchParams.get('q') || '';
    sendJson(res, 200, { sessions: desk.searchSessions(query), ...ncState(kitModel(dataRoot, undefined, runtime), runtime) });
    return;
  }
  if (req.method === 'POST' && pathname === '/api/kits/nightcode/sessions') {
    const created = desk.createSession();
    sendJson(res, 201, { ...desk.getSession(created.id), ...ncState(kitModel(dataRoot, undefined, runtime), runtime) });
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
      sendJson(res, 200, { ...desk.getSession(id), ...ncState(kitModel(dataRoot, undefined, runtime), runtime) });
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
  let body: { text?: string; mode?: string; model?: unknown } = {};
  try {
    body = JSON.parse(raw) as { text?: string; mode?: string; model?: unknown };
  } catch {
    sendJson(res, 400, { error: 'JSON is required.' });
    return;
  }
  const mode = body.mode === 'build' ? 'build' : 'plan';
  const candidate = kitModel(dataRoot, body.model, runtime);
  const model = candidate && nightcodeArmed(runtime.env) ? candidate : null;
  try {
    const session = await desk.postMessage(id, String(body.text || ''), mode, model);
    sendJson(res, 200, { ...session, ...ncState(candidate, runtime) });
  } catch (error) {
    sendJson(res, 400, { error: error instanceof Error ? error.message : 'The turn stopped.', ...ncState(candidate, runtime) });
  }
}

async function teammatesRoute(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  dataRoot: string,
  sendJson: SendJson,
  runtime: KitRuntime,
): Promise<void> {
  const desk = new TeammatesDesk(path.join(dataRoot, 'teammates.sqlite'));
  if (req.method === 'POST' && pathname === '/api/kits/teammates/rooms') {
    const created = desk.createRoom();
    sendJson(res, 201, { ...desk.getRoom(created.id), ...modelFields(kitModel(dataRoot, undefined, runtime)), delivered: false });
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
      sendJson(res, 200, { ...desk.getRoom(id), ...modelFields(kitModel(dataRoot, undefined, runtime)), delivered: false });
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
  let body: { text?: string; model?: unknown } = {};
  try {
    body = JSON.parse(raw) as { text?: string; model?: unknown };
  } catch {
    sendJson(res, 400, { error: 'JSON is required.' });
    return;
  }
  const model = kitModel(dataRoot, body.model, runtime);
  try {
    const room = await desk.postMessage(id, String(body.text || ''), model);
    sendJson(res, 200, { ...room, ...modelFields(model), delivered: false });
  } catch (error) {
    sendJson(res, 400, { error: error instanceof Error ? error.message : 'The turn stopped.', ...modelFields(model), delivered: false });
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

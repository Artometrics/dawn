import type { IncomingMessage, ServerResponse } from 'node:http';
import { KITS, kitById, type KitId } from './registry.ts';
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

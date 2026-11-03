import type { IncomingMessage, ServerResponse } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { redact } from '../shared/redact.ts';

export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function tokensMatch(given: string, expected: string): boolean {
  const left = Buffer.from(given);
  const right = Buffer.from(expected);
  if (left.length !== right.length) {
    timingSafeEqual(left, left);
    return false;
  }
  return timingSafeEqual(left, right);
}

export function bearer(req: IncomingMessage): string {
  const header = req.headers.authorization;
  if (!header || Array.isArray(header)) return '';
  const match = header.match(/^Bearer\s+(\S+)$/i);
  return match?.[1] ?? '';
}

export async function readJson(req: IncomingMessage, limit: number): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > limit) throw new HttpError(413, 'Request is too large');
    chunks.push(buffer);
  }
  const text = Buffer.concat(chunks).toString('utf8');
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, 'Request body is not JSON');
  }
}

export function json(res: ServerResponse, status: number, body: unknown, env?: Record<string, string | undefined>): void {
  const payload = JSON.stringify(body, (_key, value) => (typeof value === 'string' ? redact(value, env) : value));
  if (res.headersSent) return;
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(payload);
}

export function startSse(res: ServerResponse): void {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
}

export function writeEvent(res: ServerResponse, event: string, data: unknown, env?: Record<string, string | undefined>): void {
  const payload = JSON.stringify(data, (_key, value) => (typeof value === 'string' ? redact(value, env) : value));
  res.write(`event: ${event}\ndata: ${payload}\n\n`);
}

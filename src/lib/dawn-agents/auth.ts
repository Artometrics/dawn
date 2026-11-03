import { createHmac, timingSafeEqual, createHash } from 'node:crypto';

const SESSION_MS = 14 * 24 * 60 * 60 * 1000;

export function passwordsMatch(given: string, expected: string): boolean {
  const left = createHash('sha256').update(given).digest();
  const right = createHash('sha256').update(expected).digest();
  return timingSafeEqual(left, right);
}

export function signSession(secret: string, email: string, now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ email, exp: now + SESSION_MS })).toString('base64url');
  const sig = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifySession(secret: string, token: string, now = Date.now()): { email: string } | null {
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = createHmac('sha256', secret).update(payload).digest('base64url');
  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { email?: string; exp?: number };
    if (!parsed.email || typeof parsed.exp !== 'number' || parsed.exp < now) return null;
    return { email: parsed.email };
  } catch {
    return null;
  }
}

export function tokensMatch(given: string, expected: string): boolean {
  if (!given || !expected) return false;
  return passwordsMatch(given, expected);
}

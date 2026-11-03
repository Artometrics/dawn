import type { IncomingHttpHeaders } from 'node:http';

/** Headers oauth2-proxy sets when --set-xauthrequest is on. */
const EMAIL_HEADERS = ['x-auth-request-email', 'x-forwarded-email'] as const;

export function isLoopback(address: string | undefined): boolean {
  if (!address) return false;
  const host = address.replace(/^::ffff:/i, '').toLowerCase();
  return host === '127.0.0.1' || host === '::1' || host === 'localhost';
}

export function emailFromProxyHeaders(headers: IncomingHttpHeaders): string {
  for (const name of EMAIL_HEADERS) {
    const value = headers[name];
    const text = Array.isArray(value) ? value[0] : value;
    if (typeof text === 'string' && text.trim()) return text.trim().toLowerCase();
  }
  return '';
}

/**
 * The proxy header is trusted only when the TCP peer is loopback.
 * A request that reached this process from anywhere else cannot become the owner
 * by setting the header itself.
 */
export function proxyUserAllowed(
  remoteAddress: string | undefined,
  headers: IncomingHttpHeaders,
  allowedEmail: string,
): boolean {
  if (!isLoopback(remoteAddress)) return false;
  const allowed = allowedEmail.trim().toLowerCase();
  const email = emailFromProxyHeaders(headers);
  if (!allowed || !email) return false;
  return email === allowed;
}

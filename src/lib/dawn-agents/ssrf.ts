import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

function ipv4Blocked(ip: string): boolean {
  const match = ip.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return false;
  const a = Number(match[1]);
  const b = Number(match[2]);
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a >= 224) return true;
  return false;
}

export function ipBlocked(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower.startsWith('::ffff:')) return ipBlocked(lower.slice(7));
  if (lower === '::1' || lower === '::') return true;
  if (lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80')) return true;
  return ipv4Blocked(ip);
}

const BLOCKED_HOSTS = new Set(['localhost', 'metadata.google.internal', 'metadata.internal']);

export async function assertPublicHttpUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('That URL is not valid.');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('Only http and https URLs can be fetched.');
  if (url.username || url.password) throw new Error('URLs with a username or password are blocked.');
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (BLOCKED_HOSTS.has(host) || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new Error('That host is blocked.');
  }
  if (isIP(host)) {
    if (ipBlocked(host)) throw new Error('That address is blocked.');
    return url;
  }
  const records = await lookup(host, { all: true, verbatim: true });
  if (!records.length) throw new Error('That host did not resolve.');
  for (const record of records) {
    if (ipBlocked(record.address)) throw new Error('That host resolves to a blocked address.');
  }
  return url;
}

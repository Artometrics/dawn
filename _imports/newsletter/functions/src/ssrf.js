import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { HttpError } from './http.js';

export function ipIsBlocked(ip) {
  const normalized = String(ip).toLowerCase().replace(/^::ffff:/, '');
  if (normalized === '::1' || normalized === '::' || normalized === '0.0.0.0') return true;
  if (normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe80')) return true;
  if (!normalized.includes('.')) return true;
  const parts = normalized.split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true;
  }
  const [a, b] = parts;
  if (a === 10 || a === 127 || a === 0 || a === 255) return true;
  if (a === 169 && b === 254) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

const BLOCKED_HOSTS = new Set(['localhost', 'metadata.google.internal', 'metadata.google.com']);

export async function assertPublicHost(hostname) {
  const host = String(hostname || '').replace(/\.+$/, '').toLowerCase();
  if (!host || BLOCKED_HOSTS.has(host) || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new HttpError(400, 'That address cannot be fetched.', 'blocked_url');
  }
  if (isIP(host)) {
    if (ipIsBlocked(host)) throw new HttpError(400, 'That address cannot be fetched.', 'blocked_url');
    return;
  }
  let records;
  try {
    records = await lookup(host, { all: true, verbatim: true });
  } catch {
    throw new HttpError(400, 'That link could not be resolved.', 'bad_url');
  }
  if (!records.length || records.some((record) => ipIsBlocked(record.address))) {
    throw new HttpError(400, 'That address cannot be fetched.', 'blocked_url');
  }
}

export function htmlToText(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 12000);
}

export async function fetchPublicText(rawUrl) {
  let current;
  try {
    current = new URL(rawUrl);
  } catch {
    throw new HttpError(400, 'That link is not a URL.', 'bad_url');
  }
  if (current.protocol !== 'http:' && current.protocol !== 'https:') {
    throw new HttpError(400, 'Only http(s) links can be drafted.', 'bad_url');
  }
  for (let hop = 0; hop < 3; hop += 1) {
    await assertPublicHost(current.hostname);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    let response;
    try {
      response = await fetch(current, {
        redirect: 'manual',
        signal: controller.signal,
        headers: { 'User-Agent': 'ArtometricsNewsletter/1.0' },
      });
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw new HttpError(400, 'That link could not be fetched.', 'bad_url');
    } finally {
      clearTimeout(timer);
    }
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) throw new HttpError(400, 'The link redirected nowhere.', 'bad_url');
      current = new URL(location, current);
      continue;
    }
    if (!response.ok) throw new HttpError(400, `The link returned ${response.status}.`, 'bad_url');
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > 500_000) {
      throw new HttpError(400, 'That page is too large to draft from.', 'bad_url');
    }
    return htmlToText(new TextDecoder().decode(buffer));
  }
  throw new HttpError(400, 'Too many redirects.', 'bad_url');
}

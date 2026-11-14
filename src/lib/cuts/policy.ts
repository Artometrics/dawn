import { LICENSES, VOICES, type LicenseId, type VoiceName } from './types';

export type PolicyFailure = { ok: false; code: string; error: string };
export type PolicyOk<T> = { ok: true } & T;

const VIDEO_HOSTS = [
  'youtube.com',
  'youtu.be',
  'youtube-nocookie.com',
  'vimeo.com',
  'tiktok.com',
  'instagram.com',
  'dailymotion.com',
  'twitch.tv',
];

export const VIDEO_HOST_MESSAGE =
  'Loom does not download YouTube or other video hosts. Paste an article, or upload a file you have the rights to.';

export function isVoice(value: string): value is VoiceName {
  return (VOICES as readonly string[]).includes(value);
}

export function isLicense(value: string): value is LicenseId {
  return (LICENSES as readonly string[]).includes(value);
}

function hostIs(host: string, root: string): boolean {
  return host === root || host.endsWith(`.${root}`);
}

export function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  return VIDEO_HOSTS.some((root) => hostIs(host, root));
}

export function isPrivateIp(host: string): boolean {
  const lower = host.toLowerCase();
  if (lower === '::1' || lower === '0:0:0:0:0:0:0:1') return true;
  if (lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80:')) return true;
  const match = lower.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) return false;
  const parts = match.slice(1).map(Number);
  if (parts.some((part) => part > 255)) return true;
  const [a, b] = parts;
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

export function inspectUrl(raw: string): PolicyOk<{ url: string }> | PolicyFailure {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, url: '' };
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, code: 'BAD_INPUT', error: 'That URL is not readable.' };
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, code: 'BAD_INPUT', error: 'Use an http or https link.' };
  }
  if (parsed.username || parsed.password) {
    return { ok: false, code: 'BAD_INPUT', error: 'Remove the username and password from that URL.' };
  }
  const host = parsed.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || host === 'metadata.google.internal' || host.endsWith('.internal')) {
    return { ok: false, code: 'BAD_INPUT', error: 'That host is not a public article.' };
  }
  if (isPrivateIp(host)) {
    return { ok: false, code: 'BAD_INPUT', error: 'That host is not a public article.' };
  }
  if (isBlockedHost(host)) {
    return { ok: false, code: 'YOUTUBE_BLOCKED', error: VIDEO_HOST_MESSAGE };
  }
  return { ok: true, url: parsed.toString() };
}

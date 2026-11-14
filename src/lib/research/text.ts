import type { Passage } from './types';

const CUE_ARROW = /(\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d{1,3})?)\s*-->\s*\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d{1,3})?/;
const BRACKET = /^\[(\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d{1,3})?)\]\s*(.*)$/;

export function formatTimestamp(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
  return `${m}:${String(r).padStart(2, '0')}`;
}

export function timestampToSeconds(raw: string): number {
  const clean = raw.trim().replace(',', '.');
  const [clock] = clean.split('.');
  const parts = clock.split(':').map((part) => Number(part));
  if (parts.some((n) => Number.isNaN(n))) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] ?? 0;
}

export function htmlToText(input: string): string {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function passage(text: string, timestamp: string | null): Passage {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  return { text: trimmed, page: null, timestamp, startSec: timestamp ? timestampToSeconds(timestamp) : null };
}

export function parseTranscript(raw: string): Passage[] {
  const text = raw.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const blocks = text.split(/\n{2,}/);
  const cues: Passage[] = [];
  for (const block of blocks) {
    const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
    const arrowIndex = lines.findIndex((line) => CUE_ARROW.test(line));
    if (arrowIndex >= 0) {
      const match = lines[arrowIndex].match(CUE_ARROW);
      const body = lines.slice(arrowIndex + 1).join(' ').trim();
      if (match && body && !/^WEBVTT/i.test(body)) cues.push(passage(body, formatTimestamp(timestampToSeconds(match[1]))));
      continue;
    }
    for (const line of lines) {
      const bracket = line.match(BRACKET);
      if (bracket && bracket[2].trim()) cues.push(passage(bracket[2], formatTimestamp(timestampToSeconds(bracket[1]))));
    }
  }
  if (cues.length > 0) return mergePassages(cues, 900);
  const plain = text.replace(/^WEBVTT.*\n+/i, '').trim();
  if (!plain) return [];
  return [passage(plain, null)];
}

export function mergePassages(passages: Passage[], size = 900): Passage[] {
  const out: Passage[] = [];
  let buf: Passage | null = null;
  for (const item of passages) {
    if (!item.text) continue;
    if (!buf) {
      buf = { ...item };
      continue;
    }
    const sameLocator = buf.page === item.page && buf.timestamp === item.timestamp;
    const fits = buf.text.length + item.text.length + 1 <= size;
    if (sameLocator && fits) {
      buf = { ...buf, text: `${buf.text}\n${item.text}`.trim() };
      continue;
    }
    out.push(buf);
    buf = { ...item };
  }
  if (buf) out.push(buf);
  return out;
}

export function chunkPassages(passages: Passage[], size = 1400, overlap = 180): Passage[] {
  const out: Passage[] = [];
  for (const item of passages) {
    const text = item.text.replace(/[ \t]+/g, ' ').trim();
    if (!text) continue;
    if (text.length <= size) {
      out.push({ ...item, text });
      continue;
    }
    let cursor = 0;
    while (cursor < text.length) {
      const end = Math.min(text.length, cursor + size);
      const slice = text.slice(cursor, end).trim();
      if (slice) out.push({ ...item, text: slice });
      if (end >= text.length) break;
      cursor = Math.max(cursor + 1, end - overlap);
    }
  }
  return out;
}

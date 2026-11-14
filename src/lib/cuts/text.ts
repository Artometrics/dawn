import { COLUMNS, type Chapter, type ColumnId } from './types';

export function newId(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function clip(value: string, max: number): string {
  const trimmed = value.trim().replace(/\s+/g, ' ');
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

export function advanceColumn(current: ColumnId, next: ColumnId): ColumnId {
  const order = COLUMNS.map((column) => column.id);
  return order.indexOf(current) < order.indexOf(next) ? next : current;
}

export function formatClock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const remain = whole % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(remain).padStart(2, '0')}`;
  return `${minutes}:${String(remain).padStart(2, '0')}`;
}

export function chapterBlock(chapters: Chapter[]): string {
  const ordered = [...chapters].sort((a, b) => a.startSeconds - b.startSeconds);
  if (ordered.length > 0 && ordered[0].startSeconds !== 0) {
    ordered[0] = { ...ordered[0], startSeconds: 0 };
  }
  return ordered.map((chapter) => `${formatClock(chapter.startSeconds)} ${chapter.title}`).join('\n');
}

export function formatSrtTime(ms: number): string {
  const clamped = Math.max(0, Math.floor(ms));
  const hours = Math.floor(clamped / 3_600_000);
  const minutes = Math.floor((clamped % 3_600_000) / 60_000);
  const seconds = Math.floor((clamped % 60_000) / 1000);
  const millis = clamped % 1000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
}

export type Cue = { startMs: number; endMs: number; text: string };

export function cuesToSrt(cues: Cue[]): string {
  return cues
    .filter((cue) => cue.text.trim())
    .map((cue, index) => {
      const end = Math.max(cue.endMs, cue.startMs + 200);
      return `${index + 1}\n${formatSrtTime(cue.startMs)} --> ${formatSrtTime(end)}\n${cue.text.trim()}\n`;
    })
    .join('\n');
}

/** Estimated captions. Default pace is 2.6 words a second. Not stored on the desk. */
export function scriptToSrt(script: string, wordsPerSecond = 2.6): string {
  const sentences = script
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const cues: Cue[] = [];
  let cursor = 0;
  for (const sentence of sentences) {
    const words = sentence.split(/\s+/).filter(Boolean).length;
    const duration = Math.max(900, Math.round((words / wordsPerSecond) * 1000));
    cues.push({ startMs: cursor, endMs: cursor + duration, text: sentence });
    cursor += duration + 120;
  }
  return cuesToSrt(cues);
}

export function matchesQuery(haystack: string, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return haystack.toLowerCase().includes(needle);
}

export function chunkText(text: string, max = 3500): string[] {
  const paragraphs = text.split(/\n{2,}/);
  const chunks: string[] = [];
  let current = '';
  const pushOverflow = () => {
    while (current.length > max) {
      chunks.push(current.slice(0, max));
      current = current.slice(max).trimStart();
    }
  };
  for (const paragraph of paragraphs) {
    const next = current ? `${current}\n\n${paragraph}` : paragraph;
    if (next.length > max && current) {
      chunks.push(current);
      current = paragraph;
    } else {
      current = next;
    }
    pushOverflow();
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.filter((chunk) => chunk.length > 0);
}

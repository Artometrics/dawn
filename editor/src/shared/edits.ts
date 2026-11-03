import { safeRelativePath } from './paths.ts';

export type FileEdit = {
  path: string;
  original: string;
  proposed: string;
  summary: string;
};

export type LineStats = {
  added: number;
  removed: number;
};

export function stripFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```[a-zA-Z0-9_-]*\n([\s\S]*?)\n?```$/);
  return fenced ? fenced[1].replace(/\n$/, '') : trimmed;
}

export function parseJsonObject(text: string): unknown {
  const stripped = stripFences(text);
  try {
    return JSON.parse(stripped);
  } catch {
    const start = stripped.indexOf('{');
    const end = stripped.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(stripped.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

export function applySelection(
  fullFile: string,
  selection: string,
  replacement: string,
  startLine?: number,
  endLine?: number,
): string | null {
  if (startLine && endLine && endLine >= startLine) {
    const lines = fullFile.split('\n');
    const start = startLine - 1;
    const end = endLine;
    if (start >= 0 && end <= lines.length && start < lines.length) {
      const slice = lines.slice(start, end).join('\n');
      if (!selection || slice === selection) {
        return lines.slice(0, start).concat(replacement.split('\n'), lines.slice(end)).join('\n');
      }
    }
  }
  if (selection && fullFile.includes(selection)) {
    const index = fullFile.indexOf(selection);
    return fullFile.slice(0, index) + replacement + fullFile.slice(index + selection.length);
  }
  return null;
}

export function lineStats(original: string, proposed: string): LineStats {
  const before = new Map<string, number>();
  for (const line of original.split('\n')) before.set(line, (before.get(line) ?? 0) + 1);
  let added = 0;
  for (const line of proposed.split('\n')) {
    const count = before.get(line) ?? 0;
    if (count > 0) before.set(line, count - 1);
    else added += 1;
  }
  let removed = 0;
  for (const count of before.values()) removed += count;
  return { added, removed };
}

export function validateEdits(value: unknown, originals: Map<string, string>, limit = 12): FileEdit[] {
  if (!value || typeof value !== 'object') return [];
  const raw = (value as { edits?: unknown }).edits;
  if (!Array.isArray(raw)) return [];
  const edits: FileEdit[] = [];
  for (const item of raw) {
    if (edits.length >= limit) break;
    if (!item || typeof item !== 'object') continue;
    const record = item as { path?: unknown; content?: unknown; summary?: unknown; proposed?: unknown };
    const path = typeof record.path === 'string' ? safeRelativePath(record.path) : null;
    const proposed = typeof record.content === 'string' ? record.content : typeof record.proposed === 'string' ? record.proposed : null;
    if (!path || proposed === null || proposed.length > 200_000) continue;
    const original = originals.get(path) ?? '';
    if (original === proposed) continue;
    const summary = typeof record.summary === 'string' && record.summary.trim() ? record.summary.trim().slice(0, 240) : 'Update file';
    edits.push({ path, original, proposed, summary });
  }
  return edits;
}

export function prepareApply(
  edits: FileEdit[],
  current: Map<string, string | null>,
): { ok: FileEdit[]; conflicts: string[] } {
  const ok: FileEdit[] = [];
  const conflicts: string[] = [];
  for (const edit of edits) {
    const path = safeRelativePath(edit.path);
    if (!path) {
      conflicts.push(edit.path || '(empty path)');
      continue;
    }
    const now = current.has(path) ? current.get(path) ?? null : null;
    if (now === null) {
      if (edit.original === '') ok.push({ ...edit, path });
      else conflicts.push(path);
      continue;
    }
    if (now !== edit.original) conflicts.push(path);
    else ok.push({ ...edit, path });
  }
  return { ok: conflicts.length ? [] : ok, conflicts };
}

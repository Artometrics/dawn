import type { ScriptPackage } from './types';

export class PackageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PackageError';
  }
}

export function firstText(payload: unknown): string {
  const candidates = (payload as { candidates?: { content?: { parts?: { text?: string }[] } }[] }).candidates;
  const text = candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || '';
  if (!text) throw new PackageError('The model returned an empty package.');
  return text;
}

export function extractJson(text: string): unknown {
  const fenced = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try {
    return JSON.parse(fenced);
  } catch {
    const start = fenced.indexOf('{');
    const end = fenced.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(fenced.slice(start, end + 1));
      } catch {
        throw new PackageError('The model returned JSON the desk could not read.');
      }
    }
    throw new PackageError('The model returned JSON the desk could not read.');
  }
}

export function parsePackage(text: string): ScriptPackage {
  const json = extractJson(text);
  const record = asRecord(json);
  const scriptText = String(record.scriptText || '').trim();
  if (!scriptText) throw new PackageError('The model returned a package without a script.');
  return {
    titles: asStringList(record.titles),
    description: String(record.description || ''),
    tags: asStringList(record.tags),
    scriptText,
    chapters: asChapters(record.chapters),
    visuals: asVisuals(record.visuals),
    thumbnailConcepts: asThumbs(record.thumbnailConcepts),
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item)).filter(Boolean);
}

function asChapters(value: unknown): ScriptPackage['chapters'] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const record = asRecord(item);
    return {
      title: String(record.title || ''),
      summary: String(record.summary || ''),
      startSeconds: Number(record.startSeconds) || 0,
    };
  });
}

function asVisuals(value: unknown): ScriptPackage['visuals'] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const record = asRecord(item);
    return {
      atSeconds: Number(record.atSeconds) || 0,
      kind: String(record.kind || 'b-roll'),
      direction: String(record.direction || ''),
      chartTitle: String(record.chartTitle || ''),
      chartType: String(record.chartType || ''),
      chartLabels: asStringList(record.chartLabels),
      chartValues: Array.isArray(record.chartValues) ? record.chartValues.map((n) => Number(n)).filter((n) => Number.isFinite(n)) : [],
    };
  });
}

function asThumbs(value: unknown): ScriptPackage['thumbnailConcepts'] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const record = asRecord(item);
    return {
      headline: String(record.headline || ''),
      layout: String(record.layout || ''),
      foreground: String(record.foreground || 'cream'),
      background: String(record.background || 'black'),
    };
  });
}

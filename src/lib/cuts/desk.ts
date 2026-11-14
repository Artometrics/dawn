import { EXCERPT_MAX, SCRIPT_MAX, newCutFields } from './cut';
import { inspectUrl, isLicense } from './policy';
import { newId } from './text';
import type { ColumnId, Cut, CutsData, LicenseId, ShelfItem } from './types';

export const CUT_CAP = 40;
export const SHELF_CAP = 12;

export const EMPTY_CUTS: CutsData = { cuts: [], media: [] };

export function parseCuts(raw: unknown): CutsData {
  if (!raw || typeof raw !== 'object') return EMPTY_CUTS;
  const row = raw as { cuts?: unknown; media?: unknown };
  const cuts = Array.isArray(row.cuts) ? row.cuts.map(parseCut).filter((cut): cut is Cut => Boolean(cut)).slice(0, CUT_CAP) : [];
  const media = Array.isArray(row.media) ? row.media.map(parseShelf).filter((item): item is ShelfItem => Boolean(item)).slice(0, SHELF_CAP) : [];
  return { cuts, media };
}

function parseCut(raw: unknown): Cut | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Partial<Cut>;
  if (typeof row.id !== 'string' || !row.id) return null;
  const made = newCutFields({ title: str(row.title), topic: str(row.topic), sourceUrl: str(row.sourceUrl) });
  const fallback = newCutFields({ topic: str(row.topic) || 'Untitled', sourceUrl: '' });
  const fields = made.ok ? made.fields : fallback.ok ? fallback.fields : null;
  if (!fields) return null;
  return {
    ...fields,
    id: row.id,
    title: str(row.title).slice(0, 140) || fields.title,
    topic: str(row.topic).slice(0, 4000),
    sourceUrl: fields.sourceUrl,
    sourceExcerpt: str(row.sourceExcerpt).slice(0, EXCERPT_MAX),
    column: column(row.column),
    scriptText: str(row.scriptText).slice(0, SCRIPT_MAX),
    chapters: Array.isArray(row.chapters) ? row.chapters.slice(0, 40) : [],
    visuals: Array.isArray(row.visuals) ? row.visuals.slice(0, 40) : [],
    titles: Array.isArray(row.titles) ? row.titles.map((title) => str(title)).filter(Boolean).slice(0, 8) : [],
    description: str(row.description).slice(0, 8000),
    tags: Array.isArray(row.tags) ? row.tags.map((tag) => str(tag)).filter(Boolean).slice(0, 24) : [],
    thumbnailConcepts: Array.isArray(row.thumbnailConcepts) ? row.thumbnailConcepts.slice(0, 6) : [],
    packageStatus: row.packageStatus === 'ready' || row.packageStatus === 'error' || row.packageStatus === 'running' ? row.packageStatus : 'idle',
    generationProvider: row.generationProvider === 'draft' || row.generationProvider === 'gemini' ? row.generationProvider : '',
    generationModel: str(row.generationModel).slice(0, 80),
    generationWarning: str(row.generationWarning).slice(0, 500),
    errorMessage: str(row.errorMessage).slice(0, 500),
    createdAt: num(row.createdAt),
    updatedAt: num(row.updatedAt),
  };
}

function parseShelf(raw: unknown): ShelfItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Partial<ShelfItem>;
  if (typeof row.id !== 'string' || !row.id) return null;
  const license = isLicense(str(row.license)) ? row.license : 'cc0';
  return {
    id: row.id,
    title: str(row.title).slice(0, 180),
    url: str(row.url).slice(0, 2000),
    creator: str(row.creator).slice(0, 180),
    license: license as LicenseId,
    notes: str(row.notes).slice(0, 2000),
    createdAt: num(row.createdAt),
  };
}

export function addCut(data: CutsData, input: { title?: string; topic: string; sourceUrl: string }, now = Date.now()): { ok: true; data: CutsData; cut: Cut } | { ok: false; error: string } {
  if (data.cuts.length >= CUT_CAP) return { ok: false, error: `The board holds ${CUT_CAP} cuts. Archive one first.` };
  const made = newCutFields(input);
  if (!made.ok) return { ok: false, error: made.error };
  const cut: Cut = { ...made.fields, id: newId(), createdAt: now, updatedAt: now };
  return { ok: true, data: { ...data, cuts: [cut, ...data.cuts] }, cut };
}

export function replaceCut(data: CutsData, cut: Cut): CutsData {
  return { ...data, cuts: data.cuts.map((row) => (row.id === cut.id ? { ...cut, scriptText: cut.scriptText.slice(0, SCRIPT_MAX), sourceExcerpt: cut.sourceExcerpt.slice(0, EXCERPT_MAX) } : row)) };
}

export function archiveCut(data: CutsData, id: string): CutsData {
  return { ...data, cuts: data.cuts.filter((cut) => cut.id !== id) };
}

export function addShelf(
  data: CutsData,
  input: { title: string; url: string; creator: string; license: string; notes: string },
  now = Date.now(),
): { ok: true; data: CutsData } | { ok: false; error: string } {
  if (data.media.length >= SHELF_CAP) return { ok: false, error: `The shelf holds ${SHELF_CAP} sources.` };
  const title = input.title.trim();
  if (!title) return { ok: false, error: 'Give the source a title.' };
  if (!isLicense(input.license)) return { ok: false, error: 'Pick a license the shelf records.' };
  const inspected = inspectUrl(input.url);
  if (!inspected.ok) return { ok: false, error: inspected.error };
  if (input.notes.length > 2000) return { ok: false, error: 'Keep the note under 2000 characters.' };
  const item: ShelfItem = {
    id: newId(),
    title: title.slice(0, 180),
    url: inspected.url,
    creator: input.creator.trim().slice(0, 180),
    license: input.license,
    notes: input.notes.trim().slice(0, 2000),
    createdAt: now,
  };
  return { ok: true, data: { ...data, media: [item, ...data.media] } };
}

export function removeShelf(data: CutsData, id: string): CutsData {
  return { ...data, media: data.media.filter((item) => item.id !== id) };
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function num(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function column(value: unknown): ColumnId {
  if (value === 'idea' || value === 'script' || value === 'narration' || value === 'visuals' || value === 'package' || value === 'ready') return value;
  return 'idea';
}

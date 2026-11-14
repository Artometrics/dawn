import { applyPackage, newCutFields } from './cut';
import { inspectUrl, isLicense } from './policy';
import { newId } from './text';
import type { ColumnId, Cut, CutsData, LicenseId, MediaItem, ScriptPackage } from './types';

export const CUT_CAP = 40;
export const MEDIA_CAP = 12;

export const EMPTY_CUTS: CutsData = { cuts: [], media: [] };

export function parseCuts(raw: unknown): CutsData {
  if (!raw || typeof raw !== 'object') return EMPTY_CUTS;
  const row = raw as Record<string, unknown>;
  const cuts = Array.isArray(row.cuts) ? row.cuts.map(parseCut).filter((item): item is Cut => item !== null) : [];
  const media = Array.isArray(row.media) ? row.media.map(parseMedia).filter((item): item is MediaItem => item !== null) : [];
  return { cuts: cuts.slice(0, CUT_CAP), media: media.slice(0, MEDIA_CAP) };
}

export function addCut(
  data: CutsData,
  input: { title?: string; topic: string; sourceUrl: string },
  now = Date.now(),
): { ok: true; data: CutsData; cut: Cut } | { ok: false; error: string } {
  if (data.cuts.length >= CUT_CAP) return { ok: false, error: `The board holds ${CUT_CAP} cuts. Archive one before adding another.` };
  const made = newCutFields(input);
  if (!made.ok) return { ok: false, error: made.error };
  const cut: Cut = { ...made.fields, id: newId(), createdAt: now, updatedAt: now };
  return { ok: true, data: { ...data, cuts: [cut, ...data.cuts] }, cut };
}

export function writePackage(
  data: CutsData,
  id: string,
  pack: ScriptPackage,
  meta: { provider: 'model' | 'draft'; model: string; warning: string; excerpt?: string },
): { ok: true; data: CutsData; cut: Cut } | { ok: false; error: string } {
  const current = data.cuts.find((cut) => cut.id === id);
  if (!current) return { ok: false, error: 'That cut is not on the board.' };
  const next = applyPackage(current, pack, meta);
  return { ok: true, data: { ...data, cuts: data.cuts.map((cut) => (cut.id === id ? next : cut)) }, cut: next };
}

export function moveCut(data: CutsData, id: string, column: ColumnId): CutsData {
  return {
    ...data,
    cuts: data.cuts.map((cut) => (cut.id === id ? { ...cut, column, updatedAt: Date.now() } : cut)),
  };
}

export function updateCut(data: CutsData, id: string, patch: Partial<Pick<Cut, 'title' | 'topic' | 'scriptText' | 'description' | 'column'>>): CutsData {
  return {
    ...data,
    cuts: data.cuts.map((cut) => {
      if (cut.id !== id) return cut;
      return {
        ...cut,
        title: patch.title !== undefined ? patch.title.slice(0, 140) : cut.title,
        topic: patch.topic !== undefined ? patch.topic.slice(0, 4000) : cut.topic,
        scriptText: patch.scriptText !== undefined ? patch.scriptText.slice(0, 20_000) : cut.scriptText,
        description: patch.description !== undefined ? patch.description.slice(0, 8000) : cut.description,
        column: patch.column ?? cut.column,
        updatedAt: Date.now(),
      };
    }),
  };
}

export function archiveCut(data: CutsData, id: string): CutsData {
  return { ...data, cuts: data.cuts.filter((cut) => cut.id !== id) };
}

export function addMedia(
  data: CutsData,
  input: { title: string; url: string; license: string; creator: string; notes: string },
  now = Date.now(),
): { ok: true; data: CutsData; item: MediaItem } | { ok: false; error: string } {
  if (data.media.length >= MEDIA_CAP) return { ok: false, error: `The shelf holds ${MEDIA_CAP} sources.` };
  const title = input.title.trim();
  if (!title) return { ok: false, error: 'Give the source a title.' };
  if (!isLicense(input.license)) return { ok: false, error: 'Pick a license the shelf records.' };
  const inspected = inspectUrl(input.url);
  if (!inspected.ok) return { ok: false, error: inspected.error };
  const item: MediaItem = {
    id: newId(),
    title: title.slice(0, 180),
    url: inspected.url,
    license: input.license,
    creator: input.creator.trim().slice(0, 180),
    notes: input.notes.trim().slice(0, 2000),
    createdAt: now,
  };
  return { ok: true, data: { ...data, media: [item, ...data.media] }, item };
}

export function removeMedia(data: CutsData, id: string): CutsData {
  return { ...data, media: data.media.filter((item) => item.id !== id) };
}

function parseCut(raw: unknown): Cut | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.id !== 'string' || typeof row.title !== 'string') return null;
  const made = newCutFields({
    title: row.title,
    topic: typeof row.topic === 'string' ? row.topic : row.title,
    sourceUrl: typeof row.sourceUrl === 'string' ? row.sourceUrl : '',
  });
  if (!made.ok) return null;
  const cut: Cut = {
    ...made.fields,
    id: row.id,
    createdAt: typeof row.createdAt === 'number' ? row.createdAt : Date.now(),
    updatedAt: typeof row.updatedAt === 'number' ? row.updatedAt : Date.now(),
  };
  if (typeof row.scriptText === 'string') cut.scriptText = row.scriptText.slice(0, 20_000);
  if (typeof row.description === 'string') cut.description = row.description.slice(0, 8000);
  if (typeof row.sourceExcerpt === 'string') cut.sourceExcerpt = row.sourceExcerpt.slice(0, 2_000);
  if (typeof row.column === 'string') {
    const column = ['idea', 'script', 'narration', 'visuals', 'package', 'ready'].find((item) => item === row.column);
    if (column) cut.column = column as Cut['column'];
  }
  if (Array.isArray(row.chapters)) cut.chapters = row.chapters.slice(0, 40) as Cut['chapters'];
  if (Array.isArray(row.visuals)) cut.visuals = row.visuals.slice(0, 40) as Cut['visuals'];
  if (Array.isArray(row.titles)) cut.titles = row.titles.filter((item) => typeof item === 'string').slice(0, 8) as string[];
  if (Array.isArray(row.tags)) cut.tags = row.tags.filter((item) => typeof item === 'string').slice(0, 24) as string[];
  if (Array.isArray(row.thumbnailConcepts)) cut.thumbnailConcepts = row.thumbnailConcepts.slice(0, 6) as Cut['thumbnailConcepts'];
  if (row.generationProvider === 'draft' || row.generationProvider === 'model') cut.generationProvider = row.generationProvider;
  if (typeof row.generationWarning === 'string') cut.generationWarning = row.generationWarning.slice(0, 500);
  if (typeof row.generationModel === 'string') cut.generationModel = row.generationModel.slice(0, 80);
  return cut;
}

function parseMedia(raw: unknown): MediaItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.id !== 'string' || typeof row.title !== 'string') return null;
  const license = typeof row.license === 'string' && isLicense(row.license) ? row.license : null;
  if (!license) return null;
  const url = typeof row.url === 'string' ? row.url : '';
  const inspected = inspectUrl(url);
  if (!inspected.ok) return null;
  return {
    id: row.id,
    title: row.title.slice(0, 180),
    url: inspected.url,
    license: license as LicenseId,
    creator: typeof row.creator === 'string' ? row.creator.slice(0, 180) : '',
    notes: typeof row.notes === 'string' ? row.notes.slice(0, 2000) : '',
    createdAt: typeof row.createdAt === 'number' ? row.createdAt : Date.now(),
  };
}

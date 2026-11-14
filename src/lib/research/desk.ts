import { DAWN_COLLECTIONS } from './collections';
import type { Citation, CollectionRecord, DeskAnswer, DeskSource, ResearchDesk, SourceKind, SourceStatus } from './types';

export const COLLECTION_CAP = 20;
export const SOURCE_CAP = 300;
export const ANSWER_CAP = 100;
export const ANSWER_MAX = 4_000;

export const EMPTY_RESEARCH: ResearchDesk = {
  collections: DAWN_COLLECTIONS.map((row) => ({ ...row })),
  sources: [],
  answers: [],
};

export function parseResearch(raw: unknown): ResearchDesk {
  if (!raw || typeof raw !== 'object') return EMPTY_RESEARCH;
  const row = raw as { collections?: unknown; sources?: unknown; answers?: unknown };
  const collections = Array.isArray(row.collections) ? row.collections.map(parseCollection).filter((item): item is CollectionRecord => Boolean(item)).slice(0, COLLECTION_CAP) : EMPTY_RESEARCH.collections;
  const sources = Array.isArray(row.sources) ? row.sources.map(parseSource).filter((item): item is DeskSource => Boolean(item)).slice(0, SOURCE_CAP) : [];
  const answers = Array.isArray(row.answers) ? row.answers.map(parseAnswer).filter((item): item is DeskAnswer => Boolean(item)).slice(0, ANSWER_CAP) : [];
  return { collections: collections.length ? collections : EMPTY_RESEARCH.collections, sources, answers };
}

export function addCollection(data: ResearchDesk, name: string, blurb: string): { ok: true; data: ResearchDesk } | { ok: false; error: string } {
  const clean = name.trim().slice(0, 80);
  if (!clean) return { ok: false, error: 'Name the collection.' };
  if (data.collections.length >= COLLECTION_CAP) return { ok: false, error: `The desk holds ${COLLECTION_CAP} collections.` };
  const id = clean.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || `c${data.collections.length + 1}`;
  if (data.collections.some((row) => row.id === id)) return { ok: false, error: 'That collection is already on the desk.' };
  const row: CollectionRecord = { id, name: clean, blurb: blurb.trim().slice(0, 240), createdAt: new Date().toISOString() };
  return { ok: true, data: { ...data, collections: [...data.collections, row] } };
}

export function renameCollection(data: ResearchDesk, id: string, name: string, blurb: string): ResearchDesk {
  return {
    ...data,
    collections: data.collections.map((row) => (row.id === id ? { ...row, name: name.trim().slice(0, 80) || row.name, blurb: blurb.trim().slice(0, 240) } : row)),
  };
}

export function deleteCollection(data: ResearchDesk, id: string): ResearchDesk {
  return { ...data, collections: data.collections.filter((row) => row.id !== id) };
}

export function rememberSource(data: ResearchDesk, source: DeskSource): { ok: true; data: ResearchDesk } | { ok: false; error: string } {
  if (!data.sources.some((row) => row.id === source.id) && data.sources.length >= SOURCE_CAP) {
    return { ok: false, error: `The desk lists ${SOURCE_CAP} sources. Remove one first.` };
  }
  const next = data.sources.some((row) => row.id === source.id)
    ? data.sources.map((row) => (row.id === source.id ? source : row))
    : [source, ...data.sources];
  return { ok: true, data: { ...data, sources: next } };
}

export function forgetSource(data: ResearchDesk, id: string): ResearchDesk {
  return { ...data, sources: data.sources.filter((row) => row.id !== id) };
}

export function rememberAnswer(data: ResearchDesk, answer: DeskAnswer): { ok: true; data: ResearchDesk } | { ok: false; error: string } {
  if (data.answers.length >= ANSWER_CAP) return { ok: false, error: `The desk keeps ${ANSWER_CAP} answers. Export some and clear the list.` };
  const clipped: DeskAnswer = { ...answer, answer: answer.answer.slice(0, ANSWER_MAX), citations: answer.citations.slice(0, 12) };
  return { ok: true, data: { ...data, answers: [clipped, ...data.answers] } };
}

function parseCollection(raw: unknown): CollectionRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Partial<CollectionRecord>;
  if (typeof row.id !== 'string' || typeof row.name !== 'string') return null;
  return { id: row.id.slice(0, 40), name: row.name.slice(0, 80), blurb: str(row.blurb).slice(0, 240), createdAt: str(row.createdAt) };
}

function parseSource(raw: unknown): DeskSource | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Partial<DeskSource>;
  if (typeof row.id !== 'string' || typeof row.title !== 'string') return null;
  return {
    id: row.id,
    title: row.title.slice(0, 180),
    kind: kind(row.kind),
    status: status(row.status),
    size: Math.max(0, Math.floor(Number(row.size) || 0)),
    collectionId: str(row.collectionId).slice(0, 40),
    createdAt: str(row.createdAt),
    error: row.error ? str(row.error).slice(0, 500) : null,
  };
}

function parseAnswer(raw: unknown): DeskAnswer | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Partial<DeskAnswer>;
  if (typeof row.id !== 'string' || typeof row.question !== 'string') return null;
  const citations = Array.isArray(row.citations) ? row.citations.map(parseCitation).filter((item): item is Citation => Boolean(item)).slice(0, 12) : [];
  return {
    id: row.id,
    collectionId: str(row.collectionId),
    question: row.question.slice(0, 2000),
    answer: str(row.answer).slice(0, ANSWER_MAX),
    citations,
    createdAt: str(row.createdAt),
  };
}

function parseCitation(raw: unknown): Citation | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Partial<Citation>;
  return {
    chunkId: str(row.chunkId),
    sourceId: str(row.sourceId),
    sourceTitle: str(row.sourceTitle).slice(0, 180),
    page: typeof row.page === 'number' ? row.page : null,
    timestamp: typeof row.timestamp === 'string' ? row.timestamp : null,
    excerpt: str(row.excerpt).slice(0, 280),
    collectionId: str(row.collectionId),
  };
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function kind(value: unknown): SourceKind {
  if (value === 'pdf' || value === 'epub' || value === 'transcript' || value === 'webclip') return value;
  return 'transcript';
}

function status(value: unknown): SourceStatus {
  if (value === 'uploaded' || value === 'processing' || value === 'ready' || value === 'error') return value;
  return 'uploaded';
}

import { SEED_COLLECTIONS } from './collections';
import type { Citation, CollectionRecord, DeskAnswer, DeskSource, ResearchDesk, SourceKind, SourceStatus } from './types';

export const COLLECTION_CAP = 20;
export const SOURCE_CAP = 300;
export const ANSWER_CAP = 100;
export const ANSWER_TEXT_MAX = 4_000;
export const QUESTION_MAX = 500;

export const EMPTY_RESEARCH: ResearchDesk = {
  collections: SEED_COLLECTIONS.map((item) => ({ ...item })),
  sources: [],
  answers: [],
};

export function parseResearch(raw: unknown): ResearchDesk {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_RESEARCH, collections: SEED_COLLECTIONS.map((item) => ({ ...item })) };
  const row = raw as Record<string, unknown>;
  const collections = Array.isArray(row.collections) ? row.collections.map(parseCollection).filter((item): item is CollectionRecord => item !== null) : [];
  const sources = Array.isArray(row.sources) ? row.sources.map(parseSource).filter((item): item is DeskSource => item !== null) : [];
  const answers = Array.isArray(row.answers) ? row.answers.map(parseAnswer).filter((item): item is DeskAnswer => item !== null) : [];
  return {
    collections: (collections.length ? collections : SEED_COLLECTIONS.map((item) => ({ ...item }))).slice(0, COLLECTION_CAP),
    sources: sources.slice(0, SOURCE_CAP),
    answers: answers.slice(0, ANSWER_CAP),
  };
}

export function addCollection(data: ResearchDesk, name: string, blurb: string): { ok: true; data: ResearchDesk } | { ok: false; error: string } {
  const cleaned = name.trim().slice(0, 80);
  if (!cleaned) return { ok: false, error: 'Name the collection.' };
  if (data.collections.length >= COLLECTION_CAP) return { ok: false, error: `The desk holds ${COLLECTION_CAP} collections.` };
  const id = slug(cleaned);
  if (data.collections.some((item) => item.id === id)) return { ok: false, error: 'That collection is already here.' };
  const next: CollectionRecord = { id, name: cleaned, blurb: blurb.trim().slice(0, 160), sort: data.collections.length };
  return { ok: true, data: { ...data, collections: [...data.collections, next] } };
}

export function renameCollection(data: ResearchDesk, id: string, name: string, blurb: string): ResearchDesk {
  return {
    ...data,
    collections: data.collections.map((item) => (item.id === id ? { ...item, name: name.trim().slice(0, 80) || item.name, blurb: blurb.trim().slice(0, 160) } : item)),
  };
}

export function deleteCollection(data: ResearchDesk, id: string): ResearchDesk {
  return { ...data, collections: data.collections.filter((item) => item.id !== id) };
}

export function addSource(data: ResearchDesk, source: DeskSource): { ok: true; data: ResearchDesk } | { ok: false; error: string } {
  if (data.sources.length >= SOURCE_CAP) return { ok: false, error: `The desk holds ${SOURCE_CAP} sources. Remove one before adding another.` };
  if (data.sources.some((item) => item.id === source.id)) {
    return { ok: true, data: { ...data, sources: data.sources.map((item) => (item.id === source.id ? clipSource(source) : item)) } };
  }
  return { ok: true, data: { ...data, sources: [clipSource(source), ...data.sources] } };
}

export function setSourceStatus(data: ResearchDesk, id: string, status: SourceStatus): ResearchDesk {
  return {
    ...data,
    sources: data.sources.map((item) => (item.id === id ? { ...item, status } : item)),
  };
}

export function removeSource(data: ResearchDesk, id: string): ResearchDesk {
  return { ...data, sources: data.sources.filter((item) => item.id !== id) };
}

export function saveAnswer(data: ResearchDesk, answer: DeskAnswer): { ok: true; data: ResearchDesk } | { ok: false; error: string } {
  const clipped = clipAnswer(answer);
  if (data.answers.some((item) => item.id === clipped.id)) {
    return { ok: true, data: { ...data, answers: data.answers.map((item) => (item.id === clipped.id ? clipped : item)) } };
  }
  if (data.answers.length >= ANSWER_CAP) return { ok: false, error: `The desk keeps ${ANSWER_CAP} answers. Delete one before saving another.` };
  return { ok: true, data: { ...data, answers: [clipped, ...data.answers] } };
}

function clipSource(source: DeskSource): DeskSource {
  return {
    id: source.id,
    title: source.title.slice(0, 180),
    kind: source.kind,
    status: source.status,
    size: Math.max(0, Math.round(source.size)),
    collectionId: source.collectionId.slice(0, 80),
    createdAt: source.createdAt,
  };
}

function clipAnswer(answer: DeskAnswer): DeskAnswer {
  return {
    id: answer.id,
    collectionId: answer.collectionId.slice(0, 80),
    question: answer.question.slice(0, QUESTION_MAX),
    answer: answer.answer.slice(0, ANSWER_TEXT_MAX),
    citations: answer.citations.slice(0, 6).map((citation) => ({
      chunkId: citation.chunkId,
      sourceId: citation.sourceId,
      sourceTitle: citation.sourceTitle.slice(0, 180),
      page: citation.page,
      timestamp: citation.timestamp,
      excerpt: citation.excerpt.slice(0, 280),
      collectionId: citation.collectionId,
    })),
    createdAt: answer.createdAt,
  };
}

function parseCollection(raw: unknown): CollectionRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.id !== 'string' || typeof row.name !== 'string') return null;
  return { id: row.id.slice(0, 80), name: row.name.slice(0, 80), blurb: typeof row.blurb === 'string' ? row.blurb.slice(0, 160) : '', sort: typeof row.sort === 'number' ? row.sort : 0 };
}

const KINDS = new Set<SourceKind>(['pdf', 'epub', 'transcript', 'webclip']);
const STATUSES = new Set<SourceStatus>(['uploaded', 'processing', 'ready', 'error']);

function parseSource(raw: unknown): DeskSource | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.id !== 'string' || typeof row.title !== 'string') return null;
  if (typeof row.kind !== 'string' || !KINDS.has(row.kind as SourceKind)) return null;
  const status = typeof row.status === 'string' && STATUSES.has(row.status as SourceStatus) ? (row.status as SourceStatus) : 'uploaded';
  return clipSource({
    id: row.id,
    title: row.title,
    kind: row.kind as SourceKind,
    status,
    size: typeof row.size === 'number' ? row.size : 0,
    collectionId: typeof row.collectionId === 'string' ? row.collectionId : '',
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : new Date(0).toISOString(),
  });
}

function parseAnswer(raw: unknown): DeskAnswer | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.id !== 'string' || typeof row.question !== 'string') return null;
  const citations = Array.isArray(row.citations) ? row.citations.map(parseCitation).filter((item): item is Citation => item !== null) : [];
  return clipAnswer({
    id: row.id,
    collectionId: typeof row.collectionId === 'string' ? row.collectionId : 'everything',
    question: row.question,
    answer: typeof row.answer === 'string' ? row.answer : '',
    citations,
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : new Date(0).toISOString(),
  });
}

function parseCitation(raw: unknown): Citation | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.sourceTitle !== 'string') return null;
  return {
    chunkId: typeof row.chunkId === 'string' ? row.chunkId : '',
    sourceId: typeof row.sourceId === 'string' ? row.sourceId : '',
    sourceTitle: row.sourceTitle,
    page: typeof row.page === 'number' ? row.page : null,
    timestamp: typeof row.timestamp === 'string' ? row.timestamp : null,
    excerpt: typeof row.excerpt === 'string' ? row.excerpt : '',
    collectionId: typeof row.collectionId === 'string' ? row.collectionId : undefined,
  };
}

function slug(value: string): string {
  const cleaned = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return cleaned.slice(0, 40) || 'collection';
}

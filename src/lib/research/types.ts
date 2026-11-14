export type SourceKind = 'pdf' | 'epub' | 'transcript' | 'webclip';
export type SourceStatus = 'uploaded' | 'processing' | 'ready' | 'error';

export type Passage = {
  text: string;
  page: number | null;
  timestamp: string | null;
  startSec: number | null;
};

export type ChunkRecord = Passage & {
  id: string;
  sourceId: string;
  collectionId: string;
  sourceTitle: string;
  chunkIndex: number;
  embedding: number[];
};

/** Gateway copy. File bytes live beside this row, not in the desk. */
export type SourceRecord = {
  id: string;
  collectionId: string;
  title: string;
  kind: SourceKind;
  fileName: string;
  contentType: string;
  status: SourceStatus;
  error: string | null;
  createdAt: string;
  pageCount: number | null;
  chunkCount: number | null;
  size: number;
};

export type Citation = {
  chunkId: string;
  sourceId: string;
  sourceTitle: string;
  page: number | null;
  timestamp: string | null;
  excerpt: string;
  collectionId?: string;
};

export type AnswerRecord = {
  id: string;
  collectionId: string;
  question: string;
  answer: string;
  mode: 'gemini' | 'local';
  citations: Citation[];
  createdAt: string;
};

export type CollectionRecord = {
  id: string;
  name: string;
  blurb: string;
  createdAt: string;
};

/** What the phone keeps. No chunks, embeddings, or file bytes. */
export type DeskSource = {
  id: string;
  title: string;
  kind: SourceKind;
  status: SourceStatus;
  size: number;
  collectionId: string;
  createdAt: string;
  error: string | null;
};

export type DeskAnswer = {
  id: string;
  collectionId: string;
  question: string;
  answer: string;
  citations: Citation[];
  createdAt: string;
};

export type ResearchDesk = {
  collections: CollectionRecord[];
  sources: DeskSource[];
  answers: DeskAnswer[];
};

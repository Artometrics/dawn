import { collectionName } from './collections';
import { cosine } from './embed';
import type { ChunkRecord, Citation } from './types';

export type RankedChunk = ChunkRecord & { score: number };

export function rankChunks(chunks: ChunkRecord[], query: number[], limit = 6): RankedChunk[] {
  return chunks
    .map((chunk) => ({ ...chunk, score: cosine(chunk.embedding, query) }))
    .sort((a, b) => b.score - a.score || a.chunkIndex - b.chunkIndex)
    .slice(0, limit);
}

export function excerpt(text: string, max = 280): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trim()}…`;
}

function heading(passage: RankedChunk, names: { id: string; name: string }[]) {
  const where = passage.timestamp ? passage.timestamp : passage.page ? `p. ${passage.page}` : 'note';
  const name = collectionName(passage.collectionId, names);
  return [name, passage.sourceTitle, where].filter(Boolean).join(' · ');
}

export function localAnswer(question: string, passages: RankedChunk[], names: { id: string; name: string }[] = []): string {
  if (!passages.length) return 'Nothing filed in this collection answers that yet.';
  const lines = passages.slice(0, 4).map((passage, index) => `[${index + 1}] ${heading(passage, names)}\n${excerpt(passage.text, 420)}`);
  return `From the filed sources for “${question}”:\n\n${lines.join('\n\n')}`;
}

export function buildPrompt(collectionLabel: string, question: string, passages: RankedChunk[], names: { id: string; name: string }[] = []): string {
  const body = passages.map((passage, index) => `[${index + 1}] ${heading(passage, names)}\n${excerpt(passage.text, 700)}`).join('\n\n');
  return [
    'You are the research reader for Dawn.',
    'Answer only from the numbered passages. Cite the passages you use with square brackets, like [1].',
    'When you state a fact, keep the page or timestamp next to the claim.',
    'If the passages do not contain the answer, say what is missing. Do not invent sources.',
    '',
    `Collection: ${collectionLabel}`,
    `Question: ${question}`,
    '',
    body,
  ].join('\n');
}

export function citationsFrom(passages: RankedChunk[], answer: string): Citation[] {
  const used = new Set<number>();
  for (const match of answer.matchAll(/\[(\d+)\]/g)) {
    const n = Number(match[1]);
    if (n >= 1 && n <= passages.length) used.add(n - 1);
  }
  const indexes = used.size ? [...used] : passages.map((_, index) => index);
  return indexes.map((index) => {
    const passage = passages[index];
    return {
      chunkId: passage.id,
      sourceId: passage.sourceId,
      sourceTitle: passage.sourceTitle,
      page: passage.page,
      timestamp: passage.timestamp,
      excerpt: excerpt(passage.text),
      collectionId: passage.collectionId,
    };
  });
}

export const LOCAL_NOTE = 'Local matching, no model key.';
export const EMBEDDINGS_OFF_NOTE = 'Model embeddings are off. Matching stays on this machine.';

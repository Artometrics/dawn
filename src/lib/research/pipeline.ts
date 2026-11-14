import { randomUUID } from 'node:crypto';
import { buildPrompt, citationsFrom, localAnswer, rankChunks, type RankedChunk } from './answer';
import { collectionName } from './collections';
import { EMBED_BATCH, embedTexts, hashEmbed, type EmbedTask } from './embed';
import { extractDocument } from './extract';
import type { ResearchStore } from './store';
import type { AnswerRecord, ChunkRecord, SourceRecord } from './types';

export type Embedder = (texts: string[], task: EmbedTask) => Promise<number[][]>;

export type BatchHooks = {
  /** Return a cap message to stop before this batch. No ledger entry is written for a refused batch. */
  beforeBatch: (texts: string[]) => Promise<string | null>;
  afterBatch: (texts: string[]) => Promise<void>;
};

export async function processSource(store: ResearchStore, sourceId: string, embed: Embedder, hooks: BatchHooks): Promise<SourceRecord> {
  const source = await store.getSource(sourceId);
  if (!source) throw new Error('Source not found.');
  if (source.status === 'ready' && (source.chunkCount ?? 0) > 0) return source;
  const claimed = await store.tryClaim(sourceId);
  if (!claimed) return (await store.getSource(sourceId)) ?? source;
  try {
    const passages = await passagesFor(store, source);
    if (!passages.length) throw new Error('No readable text in that file.');
    const kept: ChunkRecord[] = [];
    for (let start = 0; start < passages.length; start += EMBED_BATCH) {
      const slice = passages.slice(start, start + EMBED_BATCH);
      const texts = slice.map((passage) => passage.text);
      const blocked = await hooks.beforeBatch(texts);
      if (blocked) {
        if (kept.length) await store.replaceChunks(sourceId, kept);
        await store.updateSource(sourceId, {
          status: 'error',
          error: blocked.slice(0, 500),
          chunkCount: kept.length || null,
        });
        return (await store.getSource(sourceId)) ?? source;
      }
      const vectors = await embed(texts, 'RETRIEVAL_DOCUMENT');
      await hooks.afterBatch(texts);
      slice.forEach((passage, index) => {
        kept.push({
          ...passage,
          id: `${sourceId}__${start + index}`,
          sourceId,
          collectionId: source.collectionId,
          sourceTitle: source.title,
          chunkIndex: start + index,
          embedding: vectors[index] ?? hashEmbed(passage.text),
        });
      });
    }
    await store.replaceChunks(sourceId, kept);
    const pageCount = passages.reduce((max, passage) => Math.max(max, passage.page ?? 0), 0);
    await store.updateSource(sourceId, {
      status: 'ready',
      error: null,
      chunkCount: kept.length,
      pageCount: pageCount || null,
    });
    return (await store.getSource(sourceId))!;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not read that file.';
    await store.updateSource(sourceId, { status: 'error', error: message.slice(0, 500) });
    throw error;
  }
}

async function passagesFor(store: ResearchStore, source: SourceRecord) {
  const data = await store.readFile(source.id);
  return extractDocument(data, source.kind);
}

export async function askResearch(
  store: ResearchStore,
  collectionId: string,
  question: string,
  embedQuery: Embedder,
  writeModel: ((prompt: string) => Promise<string | null>) | null,
): Promise<AnswerRecord> {
  const clean = question.trim();
  if (clean.length < 2 || clean.length > 2000) throw new Error('Ask a question between 2 and 2000 characters.');
  const everywhere = collectionId === 'everything';
  const collections = await store.listCollections();
  const collection = collections.find((item) => item.id === collectionId);
  if (!everywhere && !collection) throw new Error('That collection is not on the desk.');
  const [query] = await embedQuery([clean], 'RETRIEVAL_QUERY');
  const chunks = await store.listChunks(everywhere ? 'everything' : collectionId);
  const ranked = rankChunks(chunks, query, 6);
  const label = everywhere ? 'Everything' : collectionName(collectionId, collections);
  const composed = await compose(label, clean, ranked, collections, writeModel);
  const answer: AnswerRecord = {
    id: randomUUID(),
    collectionId,
    question: clean,
    answer: composed.answer,
    mode: composed.mode,
    citations: composed.citations,
    createdAt: new Date().toISOString(),
  };
  await store.saveAnswer(answer);
  return answer;
}

async function compose(
  label: string,
  question: string,
  passages: RankedChunk[],
  collections: Awaited<ReturnType<ResearchStore['listCollections']>>,
  writeModel: ((prompt: string) => Promise<string | null>) | null,
): Promise<{ answer: string; mode: 'model' | 'local'; citations: AnswerRecord['citations'] }> {
  if (!passages.length) {
    const empty = label === 'Everything'
      ? 'Nothing is filed yet. Add a PDF, EPUB, transcript, or web clip first.'
      : 'Nothing is filed in this collection yet. Add a PDF, EPUB, transcript, or web clip first.';
    return { answer: empty, mode: 'local', citations: [] };
  }
  let mode: 'model' | 'local' = 'local';
  let answer = localAnswer(question, passages, collections);
  if (writeModel) {
    const written = await writeModel(buildPrompt(label, question, passages, collections));
    if (written) {
      answer = written;
      mode = 'model';
    }
  }
  return { answer, mode, citations: citationsFrom(passages, answer) };
}

export function localEmbedder(): Embedder {
  return async (texts) => texts.map((text) => hashEmbed(text));
}

export function modelEmbedder(apiKey: string | undefined): Embedder {
  return (texts, task) => embedTexts(texts, apiKey, task);
}

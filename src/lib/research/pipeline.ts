import { randomUUID } from 'node:crypto';
import { citationsFrom, localAnswer, LOCAL_NOTE, rankChunks, buildPrompt } from './answer';
import { EMBED_BATCH, embedTexts, type EmbedTask } from './embed';
import { extractDocument } from './extract';
import { collectionName } from './collections';
import type { ResearchVault } from './vault';
import type { AnswerRecord, ChunkRecord, SourceRecord } from './types';

export type EmbedModel = (texts: string[], task: EmbedTask) => Promise<number[][]>;

export type ProcessOptions = {
  embeddingsEnabled: boolean;
  embedModel?: EmbedModel;
  canSpend: () => boolean;
  capMessage: string;
  /** One ledger line for this batch. Called only after a model embed. */
  recordBatch: (texts: string[]) => Promise<void>;
};

export async function processSource(store: ResearchVault, sourceId: string, options: ProcessOptions): Promise<SourceRecord> {
  const source = await store.getSource(sourceId);
  if (!source) throw new Error('Source not found.');
  const paid = options.embeddingsEnabled && Boolean(options.embedModel);
  if (paid && !options.canSpend()) {
    await store.updateSource(sourceId, { status: 'error', error: options.capMessage });
    return { ...(await store.getSource(sourceId))!, error: options.capMessage, status: 'error' };
  }
  await store.updateSource(sourceId, { status: 'processing', error: null });
  try {
    const bytes = await store.readFile(sourceId);
    const passages = await extractDocument(bytes, source.kind);
    if (!passages.length) throw new Error('No readable text in that file.');
    const kept: ChunkRecord[] = [];
    for (let start = 0; start < passages.length; start += EMBED_BATCH) {
      const batch = passages.slice(start, start + EMBED_BATCH);
      if (paid && !options.canSpend()) {
        await store.replaceChunks(sourceId, kept);
        await store.updateSource(sourceId, { status: 'error', error: options.capMessage, chunkCount: kept.length });
        return { ...(await store.getSource(sourceId))! };
      }
      const vectors = await embedTexts(
        batch.map((passage) => passage.text),
        paid,
        options.embedModel,
        'RETRIEVAL_DOCUMENT',
      );
      if (paid) await options.recordBatch(batch.map((passage) => passage.text));
      batch.forEach((passage, index) => {
        kept.push({
          ...passage,
          id: `${sourceId}__${start + index}`,
          sourceId,
          collectionId: source.collectionId,
          sourceTitle: source.title,
          chunkIndex: start + index,
          embedding: vectors[index],
        });
      });
    }
    await store.replaceChunks(sourceId, kept);
    const pageCount = passages.reduce((max, passage) => Math.max(max, passage.page ?? 0), 0);
    await store.updateSource(sourceId, { status: 'ready', error: null, chunkCount: kept.length, pageCount: pageCount || null });
    return { ...(await store.getSource(sourceId))! };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not read that file.';
    await store.updateSource(sourceId, { status: 'error', error: message.slice(0, 500) });
    throw error;
  }
}

export type AskOptions = ProcessOptions & {
  writeAnswer?: (prompt: string) => Promise<string>;
  names: { id: string; name: string }[];
};

export async function askVault(
  store: ResearchVault,
  collectionId: string,
  question: string,
  options: AskOptions,
): Promise<AnswerRecord> {
  const clean = question.trim();
  if (clean.length < 2 || clean.length > 2000) throw new Error('Ask a question between 2 and 2000 characters.');
  const everywhere = collectionId === 'everything';
  const paidEmbed = options.embeddingsEnabled && Boolean(options.embedModel);
  const paidAnswer = Boolean(options.writeAnswer);
  if ((paidEmbed || paidAnswer) && !options.canSpend()) {
    throw new CapStop(options.capMessage);
  }
  const [query] = await embedTexts([clean], paidEmbed, options.embedModel, 'RETRIEVAL_QUERY');
  if (paidEmbed) await options.recordBatch([clean]);
  const chunks = await store.listChunks(everywhere ? 'everything' : collectionId);
  const ranked = rankChunks(chunks, query, 6);
  const label = collectionName(collectionId, options.names);
  let mode: 'gemini' | 'local' = 'local';
  let answer = localAnswer(clean, ranked, options.names);
  if (paidAnswer && ranked.length && options.canSpend()) {
    answer = await options.writeAnswer!(buildPrompt(label, clean, ranked, options.names));
    mode = 'gemini';
  }
  const citations = citationsFrom(ranked, answer);
  return {
    id: randomUUID(),
    collectionId,
    question: clean,
    answer: answer.slice(0, 4000),
    mode,
    citations,
    createdAt: new Date().toISOString(),
  };
}

export class CapStop extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CapStop';
  }
}

export { LOCAL_NOTE };

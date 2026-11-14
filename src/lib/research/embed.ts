import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { embedMany } from 'ai';

export const EMBED_DIM = 768;
export const EMBED_MODEL = 'gemini-embedding-001';
export const EMBED_BATCH = 16;

export function hashEmbed(text: string): number[] {
  const vec = new Array<number>(EMBED_DIM).fill(0);
  const tokens = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  const add = (token: string, weight = 1) => {
    const hash = fnv(token);
    const index = hash % EMBED_DIM;
    vec[index] += ((hash & 1) === 0 ? 1 : -1) * weight;
  };
  for (const token of tokens) add(token);
  for (let i = 0; i < tokens.length - 1; i += 1) add(`${tokens[i]}_${tokens[i + 1]}`, 0.5);
  const norm = Math.sqrt(vec.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vec.map((value) => value / norm);
}

function fnv(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function cosine(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < n; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

export type EmbedTask = 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY';

export function geminiEmbedKey(env: Record<string, string | undefined> = process.env): string | undefined {
  const key = env.GEMINI_API_KEY || env.GOOGLE_GENERATIVE_AI_API_KEY;
  return key?.trim() || undefined;
}

export async function embedTexts(texts: string[], apiKey: string | undefined, task: EmbedTask): Promise<number[][]> {
  if (!apiKey) return texts.map((text) => hashEmbed(text));
  const google = createGoogleGenerativeAI({ apiKey });
  const { embeddings } = await embedMany({
    model: google.embedding(EMBED_MODEL),
    values: texts.map((text) => text.slice(0, 8000)),
    dimensions: EMBED_DIM,
    providerOptions: { google: { taskType: task, outputDimensionality: EMBED_DIM } },
  });
  return embeddings;
}

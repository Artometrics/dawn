export const EMBED_DIM = 768;
export const EMBED_MODEL = 'gemini-embedding-001';

/** Local fallback. Same text always yields the same vector. No network, no spend. */
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

/**
 * Model embeddings stay off unless `enabled` is true.
 * The gateway turns that on only when DAWN_EMBEDDINGS_ENABLED is exactly "true"
 * and the owner setting embeddingsEnabled is true. Otherwise this is hashEmbed.
 */
export async function embedTexts(
  texts: string[],
  enabled: boolean,
  embedModel?: (texts: string[], task: EmbedTask) => Promise<number[][]>,
  task: EmbedTask = 'RETRIEVAL_DOCUMENT',
): Promise<number[][]> {
  if (!enabled || !embedModel) return texts.map((text) => hashEmbed(text));
  if (!texts.length) return [];
  return embedModel(texts, task);
}

export const EMBED_BATCH = 8;

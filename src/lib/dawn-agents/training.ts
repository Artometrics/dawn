import type { TrainingProviders, TrainingRow } from './types';
import { DEFAULT_TRAINING_PROVIDERS, TRAINING_PROVIDER_IDS } from './types';

export function defaultTrainingProviders(): TrainingProviders {
  return { ...DEFAULT_TRAINING_PROVIDERS };
}

export function normalizeTrainingProviders(value: unknown): TrainingProviders {
  const next = defaultTrainingProviders();
  if (!value || typeof value !== 'object') return next;
  const record = value as Partial<TrainingProviders>;
  for (const id of TRAINING_PROVIDER_IDS) {
    if (typeof record[id] === 'boolean') next[id] = record[id];
  }
  return next;
}

export function trainingTarget(row: TrainingRow): string | null {
  const correction = row.correction?.trim();
  if (correction) return correction;
  if (row.feedback === 'down') return null;
  const response = row.response.trim();
  return response || null;
}

/**
 * OpenAI-style chat fine-tune JSONL:
 * {"messages":[{"role":"system","content":"..."},{"role":"user","content":"..."},{"role":"assistant","content":"..."}]}
 * A saved correction replaces the assistant turn. Thumbs-down rows without a
 * correction stay in the table and are left out of the file.
 */
export function toFineTuneJsonl(
  rows: TrainingRow[],
  providers: TrainingProviders = defaultTrainingProviders(),
  skipThreadIds?: ReadonlySet<string>,
): string {
  const lines: string[] = [];
  for (const row of rows) {
    if (skipThreadIds?.has(row.threadId)) continue;
    if (!providers[row.provider]) continue;
    const assistant = trainingTarget(row);
    if (!assistant) continue;
    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [];
    if (row.system.trim()) messages.push({ role: 'system', content: row.system });
    for (const turn of row.messages) {
      const content = turn.content.trim();
      if (!content) continue;
      if (turn.role !== 'user' && turn.role !== 'assistant') continue;
      messages.push({ role: turn.role, content });
    }
    messages.push({ role: 'assistant', content: assistant });
    lines.push(JSON.stringify({ messages }));
  }
  return lines.length ? `${lines.join('\n')}\n` : '';
}

export function exportableCount(rows: TrainingRow[], providers: TrainingProviders): number {
  return rows.filter((row) => providers[row.provider] && trainingTarget(row)).length;
}

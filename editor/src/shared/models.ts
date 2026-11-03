/** Mirrors src/lib/models.ts so Dawn Code and the studio gateway agree. */

export const GROK_MODEL = 'x-ai/grok-4.7';
export const GEMINI_FAST = 'gemini-3.8-flash';
export const GEMINI_PRO = 'gemini-3.1-pro-preview';
export const GPT_MINI = 'openai/gpt-4o-mini';
export const STAND_IN = 'stand-in';

export type ModelChoice = {
  id: string;
  label: string;
};

export const MODEL_CHOICES: ModelChoice[] = [
  { id: GEMINI_FAST, label: 'Gemini 3.8 Flash' },
  { id: GEMINI_PRO, label: 'Gemini 3.1 Pro' },
  { id: GROK_MODEL, label: 'Grok 4.7' },
  { id: GPT_MINI, label: 'GPT-4o mini' },
];

export function remapModelId(requested = GEMINI_FAST): string {
  const trimmed = requested.trim();
  const lower = trimmed.toLowerCase();
  if (!trimmed) return GEMINI_FAST;
  if (lower.includes('grok-2')) return GROK_MODEL;
  if (
    lower.includes('gemini-2') ||
    lower.includes('gemini-flash') ||
    lower === 'gemini' ||
    lower === 'flash'
  ) {
    return GEMINI_FAST;
  }
  if (lower.includes('gemini-1.5') || lower.includes('gemini-pro') || lower === 'pro') {
    return GEMINI_PRO;
  }
  return trimmed;
}

export function isKnownModel(id: string): boolean {
  return MODEL_CHOICES.some((model) => model.id === remapModelId(id));
}

/** xAI's direct API uses the bare slug. OpenRouter keeps the vendor prefix. */
export function xaiModelSlug(id: string): string {
  const mapped = remapModelId(id);
  return mapped.startsWith('x-ai/') ? mapped.slice('x-ai/'.length) : mapped;
}

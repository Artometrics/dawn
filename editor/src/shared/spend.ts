import { STAND_IN, remapModelId } from './models.ts';

/** Estimated USD per 1,000,000 tokens. Labeled estimates, not an invoice. */
export const PRICE_PER_MILLION: Record<string, { input: number; output: number }> = {
  'gemini-3.8-flash': { input: 0.15, output: 0.6 },
  'gemini-3.1-pro-preview': { input: 1.25, output: 10 },
  'x-ai/grok-4.7': { input: 3, output: 15 },
  'grok-4.7': { input: 3, output: 15 },
  'openai/gpt-4o-mini': { input: 0.15, output: 0.6 },
  [STAND_IN]: { input: 0, output: 0 },
};

export const DEFAULT_CAP_USD = 20;

export type Usage = {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  model: string;
  estimated: boolean;
};

export type SpendView = {
  monthKey: string;
  editorUsd: number;
  agentsUsd: number | null;
  capUsd: number;
  totalUsd: number;
  ratio: number;
  warn: boolean;
  blocked: boolean;
  agentsKnown: boolean;
};

export function monthKey(date = new Date()): string {
  return date.toISOString().slice(0, 7);
}

export function roundUsd(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function estimateTokens(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return Math.max(1, Math.ceil(trimmed.length / 4));
}

export function priceUsage(model: string, inputTokens: number, outputTokens: number, estimated: boolean): Usage {
  const id = model === STAND_IN ? STAND_IN : remapModelId(model);
  const price = PRICE_PER_MILLION[id] ?? PRICE_PER_MILLION[STAND_IN];
  const costUsd = id === STAND_IN ? 0 : roundUsd((inputTokens * price.input + outputTokens * price.output) / 1_000_000);
  return {
    inputTokens,
    outputTokens,
    costUsd,
    model: id,
    estimated,
  };
}

export function spendView(input: {
  monthKey: string;
  editorUsd: number;
  agentsUsd: number | null;
  capUsd: number;
}): SpendView {
  const editorUsd = roundUsd(input.editorUsd);
  const agentsKnown = input.agentsUsd !== null && Number.isFinite(input.agentsUsd);
  const agentsUsd = agentsKnown ? roundUsd(input.agentsUsd ?? 0) : null;
  const capUsd = roundUsd(input.capUsd);
  const totalUsd = roundUsd(editorUsd + (agentsUsd ?? 0));
  const ratio = capUsd > 0 ? Math.min(1, totalUsd / capUsd) : 1;
  return {
    monthKey: input.monthKey,
    editorUsd,
    agentsUsd,
    capUsd,
    totalUsd,
    ratio,
    warn: capUsd > 0 && totalUsd >= capUsd * 0.8,
    blocked: capUsd > 0 && totalUsd >= capUsd,
    agentsKnown,
  };
}

export function formatSpend(view: SpendView): string {
  const money = (value: number) => `$${value.toFixed(2)}`;
  const agents = view.agentsKnown ? money(view.agentsUsd ?? 0) : 'not merged';
  return `Est. ${money(view.totalUsd)} of ${money(view.capUsd)} · editor ${money(view.editorUsd)} · agents ${agents}`;
}

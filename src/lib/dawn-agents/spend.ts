import type { LedgerEntry, TrainingProvider } from './types';

/** Estimated USD per 1M tokens. The guard uses these figures, labeled as estimates. */
export const PRICE_PER_MILLION: Record<string, { input: number; output: number }> = {
  'gemini-3.8-flash': { input: 0.15, output: 0.6 },
  'gemini-3.1-pro-preview': { input: 1.25, output: 10 },
  'x-ai/grok-4.7': { input: 3, output: 15 },
  'grok-4.7': { input: 3, output: 15 },
  'openai/gpt-4o-mini': { input: 0.15, output: 0.6 },
  'anthropic/claude-3.5-haiku': { input: 0.8, output: 4 },
  'deepseek/deepseek-chat': { input: 0.3, output: 1.2 },
  'meta-llama/llama-3.3-70b-instruct': { input: 0.6, output: 0.8 },
  'stand-in': { input: 0, output: 0 },
};

const FALLBACK_PRICE = { input: 3, output: 15 };

export function estimateCost(model: string, promptTokens: number, completionTokens: number): number {
  const price = PRICE_PER_MILLION[model] ?? FALLBACK_PRICE;
  const cost = (Math.max(0, promptTokens) / 1_000_000) * price.input + (Math.max(0, completionTokens) / 1_000_000) * price.output;
  return Math.round(cost * 1e8) / 1e8;
}

export function monthKey(now: number): string {
  const date = new Date(now);
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${date.getUTCFullYear()}-${month}`;
}

export function spentThisMonth(ledger: LedgerEntry[], now: number): number {
  const key = monthKey(now);
  const total = ledger.reduce((sum, entry) => {
    if (monthKey(entry.at) !== key) return sum;
    return sum + entry.costUsd;
  }, 0);
  return Math.round(total * 1e8) / 1e8;
}

/** Hard stop once spend has reached the cap. The call that crosses the cap is the last one. */
export function canSpend(spentUsd: number, capUsd: number): boolean {
  return spentUsd < capUsd;
}

export function formatUsd(value: number): string {
  if (value > 0 && value < 0.01) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(2)}`;
}

export function providerPriceNote(provider: TrainingProvider): string {
  if (provider === 'google') return 'Gemini prices are estimates.';
  if (provider === 'xai') return 'xAI prices are estimates.';
  if (provider === 'openrouter') return 'OpenRouter prices are estimates.';
  return 'The stand-in is metered at $0.';
}

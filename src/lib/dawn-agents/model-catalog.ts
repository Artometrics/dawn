import { GEMINI_FAST, GROK_MODEL } from '../models.ts';

/** The three places a chat composer can send a turn. Keys stay in the server environment. */
export type ProviderId = 'google' | 'xai' | 'openrouter';

export type ModelChoice = { provider: ProviderId; model: string };
export type ModelOption = { id: string; label: string };
export type ProviderInfo = { id: ProviderId; label: string; models: ModelOption[] };

/** Short on purpose. Add a line here to offer another model. */
export const CATALOG: ProviderInfo[] = [
  { id: 'google', label: 'Gemini', models: [{ id: GEMINI_FAST, label: 'Gemini Flash' }] },
  { id: 'xai', label: 'xAI Grok', models: [{ id: GROK_MODEL.replace(/^x-ai\//, ''), label: 'Grok' }] },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    models: [
      { id: 'openai/gpt-4o-mini', label: 'GPT-4o mini' },
      { id: 'anthropic/claude-3.5-haiku', label: 'Claude Haiku' },
      { id: 'deepseek/deepseek-chat', label: 'DeepSeek' },
      { id: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 70B' },
    ],
  },
];

export const MODEL_STORAGE_KEY = 'dawn.model';

/** The saved choice if the server still offers it, else the first model of the first provider. Null when nothing is offered. */
export function reconcileChoice(providers: ProviderInfo[], stored: unknown): ModelChoice | null {
  if (stored && typeof stored === 'object') {
    const { provider, model } = stored as { provider?: unknown; model?: unknown };
    const info = providers.find((item) => item.id === provider);
    if (info && info.models.some((item) => item.id === model)) return { provider: info.id, model: String(model) };
  }
  const first = providers[0];
  return first ? { provider: first.id, model: first.models[0].id } : null;
}

export function choiceValue(choice: ModelChoice): string {
  return `${choice.provider}|${choice.model}`;
}

export function parseChoiceValue(value: string): ModelChoice | null {
  const [provider, ...rest] = value.split('|');
  const model = rest.join('|');
  return (provider === 'google' || provider === 'xai' || provider === 'openrouter') && model ? { provider, model } : null;
}

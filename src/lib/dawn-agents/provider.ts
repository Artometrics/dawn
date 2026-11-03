import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { GEMINI_FAST, remapModelId } from '../models';
import type { TrainingProvider } from './types';

export type ModelRoute = {
  provider: TrainingProvider;
  model: string;
};

function geminiKey(): string | undefined {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
}

/** Which provider will actually run. Keys stay in the environment. */
export function describeRoute(requested?: string): ModelRoute {
  const id = remapModelId(requested || GEMINI_FAST);
  if (id.startsWith('gemini')) {
    if (geminiKey()) return { provider: 'google', model: id };
    return { provider: 'stand-in', model: 'stand-in' };
  }
  const grok = id.includes('grok') || id.startsWith('x-ai/');
  if (grok && process.env.XAI_API_KEY) {
    const direct = id.startsWith('x-ai/') ? id.slice('x-ai/'.length) : id;
    return { provider: 'xai', model: direct };
  }
  if (process.env.OPENROUTER_API_KEY) return { provider: 'openrouter', model: id };
  if (geminiKey()) return { provider: 'google', model: GEMINI_FAST };
  return { provider: 'stand-in', model: 'stand-in' };
}

export function keyStatus(): { gemini: boolean; xai: boolean; openrouter: boolean } {
  return {
    gemini: Boolean(geminiKey()),
    xai: Boolean(process.env.XAI_API_KEY),
    openrouter: Boolean(process.env.OPENROUTER_API_KEY),
  };
}

export function modelFor(route: ModelRoute) {
  if (route.provider === 'google') {
    const google = createGoogleGenerativeAI({ apiKey: geminiKey() });
    return google(route.model);
  }
  if (route.provider === 'xai') {
    const xai = createOpenAI({ apiKey: process.env.XAI_API_KEY, baseURL: 'https://api.x.ai/v1' });
    return xai(route.model);
  }
  const openrouter = createOpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
  });
  return openrouter(route.model);
}

export function publicError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Model request failed';
  return message
    .replace(/sk-or-v1-[a-zA-Z0-9_-]+/g, '[key]')
    .replace(/sk-[a-zA-Z0-9_-]+/g, '[key]')
    .replace(/AIza[0-9A-Za-z_-]+/g, '[key]')
    .replace(/xai-[a-zA-Z0-9_-]+/gi, '[key]')
    .slice(0, 300);
}

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { CATALOG, reconcileChoice, type ModelChoice, type ProviderId, type ProviderInfo } from './model-catalog.ts';

export { CATALOG };
export type { ModelChoice, ProviderId, ProviderInfo };

type Env = Record<string, string | undefined>;

const KEYS: Record<ProviderId, (env: Env) => string | undefined> = {
  google: (env) => env.GEMINI_API_KEY || env.GOOGLE_GENERATIVE_AI_API_KEY,
  xai: (env) => env.XAI_API_KEY,
  openrouter: (env) => env.OPENROUTER_API_KEY,
};

/** Only providers whose key is set. The list is what the picker shows; the key itself never leaves the server. */
export function configuredProviders(env: Env = process.env): ProviderInfo[] {
  return CATALOG.filter((provider) => Boolean(KEYS[provider.id](env)?.trim()));
}

/** Gemini first, then xAI, then OpenRouter. Null when no key is configured. */
export function defaultChoice(env: Env = process.env): ModelChoice | null {
  return reconcileChoice(configuredProviders(env), null);
}

/** A choice from the browser is only honored when that provider is configured and lists the model. Anything else falls back to the default. */
export function resolveChoice(requested: unknown, env: Env = process.env): ModelChoice | null {
  return reconcileChoice(configuredProviders(env), requested);
}

const DEFAULT_DAILY_CAP = 200;
const DEFAULT_MAX_TOKENS = 600;
const MAX_TOKENS_CEILING = 1200;

function positive(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

/** Requests per UTC day, shared by every chat and every model. DAWN_DAILY_REQUEST_CAP overrides the default of 200. */
export function dailyRequestCap(env: Env = process.env): number {
  return positive(env.DAWN_DAILY_REQUEST_CAP, DEFAULT_DAILY_CAP);
}

/** Output tokens per reply, the same for every model. DAWN_MAX_OUTPUT_TOKENS can lower it and never raise it past 1200. */
export function maxOutputTokens(env: Env = process.env): number {
  return Math.min(positive(env.DAWN_MAX_OUTPUT_TOKENS, DEFAULT_MAX_TOKENS), MAX_TOKENS_CEILING);
}

export function dayKey(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

export type CapStatus = { day: string; used: number; cap: number };

/** One small JSON file beside the gateway data. A turn takes a slot before it calls a model, so a failed call still counts. */
export class DailyRequestCap {
  private readonly file: string;
  private readonly cap: number;
  private readonly now: () => number;

  constructor(file: string, cap: number, now: () => number = Date.now) {
    this.file = file;
    this.cap = cap;
    this.now = now;
  }

  status(): CapStatus {
    const day = dayKey(this.now());
    let used = 0;
    try {
      const saved = JSON.parse(readFileSync(this.file, 'utf8')) as { day?: string; used?: number };
      if (saved.day === day && typeof saved.used === 'number') used = saved.used;
    } catch {
      /* no counter yet */
    }
    return { day, used, cap: this.cap };
  }

  /** True when the request may run. The count only moves on a granted slot. */
  take(): boolean {
    const state = this.status();
    if (state.used >= state.cap) return false;
    mkdirSync(path.dirname(this.file), { recursive: true });
    writeFileSync(this.file, JSON.stringify({ day: state.day, used: state.used + 1 }));
    return true;
  }
}

export function capMessage(status: CapStatus): string {
  return `Daily model limit reached (${status.used} of ${status.cap} requests today, UTC). It resets at 00:00 UTC.`;
}

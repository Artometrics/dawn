import type { PixelAvatar } from '@/lib/dawn-agents/types';

export type GatewayState = {
  ownerEmail: string;
  agents: Agent[];
  threads: Thread[];
  messages: ChatMessage[];
  memories: { id: string; agentId: string; text: string; createdAt: number }[];
  routines: Routine[];
  spend: { month: string; spentUsd: number; capUsd: number; entries: SpendEntry[] };
  workers: { linux: Worker | null; mac: Worker | null };
  keys: { gemini: boolean; xai: boolean; openrouter: boolean };
  editorTokenSet: boolean;
  training: { enabled: boolean; providers: Record<string, boolean>; count: number; exportable: number };
  events: Engagement[];
  data: { counts: Record<string, number>; syntheticRoom: number; queue: number };
  articles: Article[];
  subscribers: Subscriber[];
  sends: Send[];
  mailProvider: string;
  recipes: { id: string; name: string; tags: string[] }[];
};

export type Agent = {
  id: string;
  name: string;
  instructions: string;
  model: string;
  computer: 'hetzner' | 'mac' | 'cloud-vm';
  avatar: PixelAvatar;
  createdAt: number;
  updatedAt: number;
};

export type Thread = { id: string; kind: 'direct' | 'group' | 'job'; title: string; agentIds: string[]; updatedAt: number };
export type ToolCall = { id: string; name: string; input: unknown; state: string; output?: unknown };
export type ChatMessage = {
  id: string;
  threadId: string;
  role: 'user' | 'assistant';
  agentId?: string;
  content: string;
  tools?: ToolCall[];
  createdAt: number;
  channel?: string;
  usage?: { model: string; provider: string; promptTokens: number; completionTokens: number; costUsd: number };
  feedback?: 'up' | 'down' | null;
  correction?: string | null;
};
export type Routine = { id: string; agentId: string; name: string; cron: string; prompt: string; enabled: boolean; lastRunAt: number | null; nextRunAt: number };
export type SpendEntry = { id: string; at: number; model: string; provider: string; promptTokens: number; completionTokens: number; costUsd: number; source: string };
export type Worker = { kind: string; host: string; platform: string; seenAt: number; online: boolean };
export type Engagement = { id: string; at: number; surface: string; action: string; itemId: string; attributes: Record<string, unknown>; actor: { kind: string; id: string } };
export type Article = { id: string; title: string; slug: string; subject: string; dek: string; body: string; recipeId: string | null; status: 'draft' | 'published'; updatedAt: number; publishedAt: number | null };
export type Subscriber = { id: string; email: string; status: string; consentAt: number | null; createdAt: number };
export type Send = { id: string; articleId: string; sentAt: number; recipients: number; opens: number; clicks: number };

export async function gatewayBase(): Promise<string> {
  const baked = process.env.NEXT_PUBLIC_DAWN_AGENTS_URL;
  if (baked) return baked.replace(/\/$/, '');
  try {
    const response = await fetch('/dawn-agents-config.json', { cache: 'no-store' });
    const json = (await response.json()) as { gatewayUrl?: string };
    if (json.gatewayUrl) return json.gatewayUrl.replace(/\/$/, '');
  } catch {
    /* local default */
  }
  return '';
}

export function googleSignInHref(): string {
  const next = typeof location === 'undefined' ? '/agents' : `${location.pathname}${location.search}`;
  return `/oauth2/start?rd=${encodeURIComponent(next)}`;
}

export async function api<T>(base: string, path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has('content-type') && init.body) headers.set('content-type', 'application/json');
  const response = await fetch(`${base}${path}`, { ...init, headers, credentials: 'include', redirect: 'manual' });
  if (response.status === 401 || response.status === 302 || response.status === 303 || response.type === 'opaqueredirect') {
    throw new Error('Sign in with Google.');
  }
  const text = await response.text();
  const data = text ? (JSON.parse(text) as T & { error?: string }) : ({} as T);
  if (!response.ok) throw new Error((data as { error?: string }).error || 'Request failed.');
  return data;
}

export async function readSse(response: Response, onEvent: (event: string, data: Record<string, unknown>) => void) {
  const reader = response.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split('\n\n');
    buffer = chunks.pop() || '';
    for (const chunk of chunks) {
      const event = chunk.match(/^event: (.+)$/m)?.[1] || 'message';
      const data = chunk
        .split('\n')
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trim())
        .join('\n');
      if (data) onEvent(event, JSON.parse(data) as Record<string, unknown>);
    }
  }
}

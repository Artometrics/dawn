import { GEMINI_FAST, STAND_IN, remapModelId, xaiModelSlug } from '../shared/models.ts';
import { agentUserPrompt, chatSystemPrompt, contextBlock, inlineUserPrompt, standInAgent, standInChat, standInInline, type CodeContext } from '../shared/prompts.ts';
import { redact } from '../shared/redact.ts';
import { estimateTokens, priceUsage, type Usage } from '../shared/spend.ts';

export type GatewayEnv = Record<string, string | undefined>;

export type ChatTurn = {
  role: 'user' | 'assistant';
  content: string;
};

export type ProviderKind = 'mock' | 'google' | 'xai' | 'openrouter';

export function resolveProvider(model: string, env: GatewayEnv, mock: boolean): ProviderKind {
  if (mock) return 'mock';
  const id = remapModelId(model);
  const gemini = Boolean(env.GEMINI_API_KEY || env.GOOGLE_GENERATIVE_AI_API_KEY);
  const xai = Boolean(env.XAI_API_KEY);
  const openrouter = Boolean(env.OPENROUTER_API_KEY);
  if (id.startsWith('gemini')) {
    if (gemini) return 'google';
    return 'mock';
  }
  if (id.includes('grok')) {
    if (xai) return 'xai';
    if (openrouter) return 'openrouter';
    return 'mock';
  }
  if (openrouter) return 'openrouter';
  return 'mock';
}

type StreamResult = {
  text: string;
  usage: Usage;
  standIn: boolean;
};

async function* readDataLines(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('data:')) yield trimmed.slice(5).trim();
    }
  }
  const tail = buffer.trim();
  if (tail.startsWith('data:')) yield tail.slice(5).trim();
}

function chunkText(text: string, size = 28): string[] {
  if (!text) return [];
  const parts: string[] = [];
  for (let index = 0; index < text.length; index += size) parts.push(text.slice(index, index + size));
  return parts;
}

async function providerError(response: Response, env: GatewayEnv): Promise<Error> {
  const body = await response.text();
  return new Error(redact(`Model provider returned ${response.status}: ${body.slice(0, 400)}`, env));
}

async function streamOpenAI(
  url: string,
  token: string,
  model: string,
  messages: { role: string; content: string }[],
  fetchImpl: typeof fetch,
  env: GatewayEnv,
  extraHeaders: Record<string, string>,
  onDelta: (text: string) => void,
): Promise<{ text: string; inputTokens: number; outputTokens: number; estimated: boolean }> {
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      stream_options: { include_usage: true },
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok || !response.body) throw await providerError(response, env);
  let text = '';
  let inputTokens = 0;
  let outputTokens = 0;
  let sawUsage = false;
  for await (const data of readDataLines(response.body)) {
    if (!data || data === '[DONE]') continue;
    let parsed: {
      choices?: { delta?: { content?: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    try {
      parsed = JSON.parse(data);
    } catch {
      continue;
    }
    const delta = parsed.choices?.[0]?.delta?.content;
    if (delta) {
      text += delta;
      onDelta(delta);
    }
    if (parsed.usage && (parsed.usage.prompt_tokens || parsed.usage.completion_tokens)) {
      inputTokens = parsed.usage.prompt_tokens ?? inputTokens;
      outputTokens = parsed.usage.completion_tokens ?? outputTokens;
      sawUsage = true;
    }
  }
  return { text, inputTokens, outputTokens, estimated: !sawUsage };
}

async function streamGemini(
  model: string,
  apiKey: string,
  messages: { role: string; content: string }[],
  fetchImpl: typeof fetch,
  env: GatewayEnv,
  onDelta: (text: string) => void,
): Promise<{ text: string; inputTokens: number; outputTokens: number; estimated: boolean }> {
  const system = messages.filter((message) => message.role === 'system').map((message) => message.content).join('\n\n');
  const contents = messages
    .filter((message) => message.role !== 'system')
    .map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }],
    }));
  const response = await fetchImpl(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        systemInstruction: system ? { parts: [{ text: system }] } : undefined,
        contents,
      }),
      signal: AbortSignal.timeout(60_000),
    },
  );
  if (!response.ok || !response.body) throw await providerError(response, env);
  let text = '';
  let inputTokens = 0;
  let outputTokens = 0;
  let sawUsage = false;
  for await (const data of readDataLines(response.body)) {
    if (!data) continue;
    let parsed: {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
    };
    try {
      parsed = JSON.parse(data);
    } catch {
      continue;
    }
    const delta = parsed.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? '';
    if (delta) {
      text += delta;
      onDelta(delta);
    }
    if (parsed.usageMetadata) {
      inputTokens = parsed.usageMetadata.promptTokenCount ?? inputTokens;
      outputTokens = parsed.usageMetadata.candidatesTokenCount ?? outputTokens;
      sawUsage = true;
    }
  }
  return { text, inputTokens, outputTokens, estimated: !sawUsage };
}

export async function streamChat(input: {
  model: string;
  messages: ChatTurn[];
  context?: CodeContext;
  env: GatewayEnv;
  mock: boolean;
  fetchImpl?: typeof fetch;
  mockDelayMs?: number;
  onDelta: (text: string) => void;
}): Promise<StreamResult> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const model = remapModelId(input.model || GEMINI_FAST);
  const kind = resolveProvider(model, input.env, input.mock);
  const promptMessages = [
    { role: 'system', content: `${chatSystemPrompt()}\n\n${contextBlock(input.context)}` },
    ...input.messages.map((message) => ({ role: message.role, content: message.content })),
  ];
  if (kind === 'mock') {
    const last = [...input.messages].reverse().find((message) => message.role === 'user');
    const text = standInChat(last?.content ?? '', input.context);
    const delay = input.mockDelayMs ?? 0;
    for (const part of chunkText(text)) {
      if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
      input.onDelta(part);
    }
    const usage = priceUsage(STAND_IN, estimateTokens(promptMessages.map((message) => message.content).join('\n')), estimateTokens(text), true);
    return { text, usage, standIn: true };
  }

  const collected = promptMessages.map((message) => message.content).join('\n');
  let result: { text: string; inputTokens: number; outputTokens: number; estimated: boolean };
  if (kind === 'google') {
    const apiKey = input.env.GEMINI_API_KEY || input.env.GOOGLE_GENERATIVE_AI_API_KEY || '';
    result = await streamGemini(model, apiKey, promptMessages, fetchImpl, input.env, input.onDelta);
  } else if (kind === 'xai') {
    result = await streamOpenAI(
      'https://api.x.ai/v1/chat/completions',
      input.env.XAI_API_KEY || '',
      xaiModelSlug(model),
      promptMessages,
      fetchImpl,
      input.env,
      {},
      input.onDelta,
    );
  } else {
    result = await streamOpenAI(
      'https://openrouter.ai/api/v1/chat/completions',
      input.env.OPENROUTER_API_KEY || '',
      model,
      promptMessages,
      fetchImpl,
      input.env,
      { 'HTTP-Referer': 'https://dawn.local', 'X-Title': 'Dawn Code' },
      input.onDelta,
    );
  }
  const inputTokens = result.estimated ? estimateTokens(collected) : result.inputTokens;
  const outputTokens = result.estimated ? estimateTokens(result.text) : result.outputTokens;
  return {
    text: result.text,
    usage: priceUsage(model, inputTokens, outputTokens, result.estimated),
    standIn: false,
  };
}

export async function completeText(input: {
  model: string;
  messages: { role: string; content: string }[];
  env: GatewayEnv;
  mock: boolean;
  mockText?: string;
  fetchImpl?: typeof fetch;
}): Promise<StreamResult> {
  const text = input.mockText ?? '';
  if (input.mock || resolveProvider(input.model, input.env, input.mock) === 'mock') {
    return {
      text,
      usage: priceUsage(STAND_IN, estimateTokens(input.messages.map((message) => message.content).join('\n')), estimateTokens(text), true),
      standIn: true,
    };
  }
  const fetchImpl = input.fetchImpl ?? fetch;
  const model = remapModelId(input.model || GEMINI_FAST);
  const kind = resolveProvider(model, input.env, false);
  const onDelta = () => undefined;
  let result: { text: string; inputTokens: number; outputTokens: number; estimated: boolean };
  if (kind === 'google') {
    result = await streamGemini(model, input.env.GEMINI_API_KEY || input.env.GOOGLE_GENERATIVE_AI_API_KEY || '', input.messages, fetchImpl, input.env, onDelta);
  } else if (kind === 'xai') {
    result = await streamOpenAI('https://api.x.ai/v1/chat/completions', input.env.XAI_API_KEY || '', xaiModelSlug(model), input.messages, fetchImpl, input.env, {}, onDelta);
  } else {
    result = await streamOpenAI(
      'https://openrouter.ai/api/v1/chat/completions',
      input.env.OPENROUTER_API_KEY || '',
      model,
      input.messages,
      fetchImpl,
      input.env,
      { 'HTTP-Referer': 'https://dawn.local', 'X-Title': 'Dawn Code' },
      onDelta,
    );
  }
  const collected = input.messages.map((message) => message.content).join('\n');
  return {
    text: result.text,
    usage: priceUsage(model, result.estimated ? estimateTokens(collected) : result.inputTokens, result.estimated ? estimateTokens(result.text) : result.outputTokens, result.estimated),
    standIn: false,
  };
}

export { contextBlock, inlineUserPrompt, agentUserPrompt, standInInline, standInAgent };

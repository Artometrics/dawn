import { agentById, systemPrompt } from '../agents.ts';
import type { KitModel } from './model-reply.ts';

export type ChatBody = {
  persona?: unknown;
  memories?: unknown;
  messages?: unknown;
  model?: unknown;
};

type Line = { role: 'user' | 'assistant'; content: string };

const QUEST_PROMPT = [
  "You are Dawn's quest guide.",
  'A quest is a goal with three checks: Start, Shape, Finish.',
  'Reply in 1 to 3 short sentences. Plain words. Suggest one next step.',
].join('\n');

/** Keeps the last turns, trimmed, so a request stays small whatever the client sends. */
export function cleanMessages(input: unknown): Line[] {
  if (!Array.isArray(input)) return [];
  const lines: Line[] = [];
  for (const item of input.slice(-12)) {
    if (!item || typeof item !== 'object') continue;
    const { role, text } = item as { role?: unknown; text?: unknown };
    if ((role !== 'user' && role !== 'assistant') || typeof text !== 'string' || !text.trim()) continue;
    lines.push({ role, content: text.trim().slice(0, 1200) });
  }
  while (lines.length && lines[0].role !== 'user') lines.shift();
  return lines;
}

/** The system prompt for a known persona. Callers cannot bring their own, so this is not a free general endpoint. */
export function personaPrompt(persona: unknown, memories: unknown): string | null {
  const recall = Array.isArray(memories)
    ? memories.filter((item): item is string => typeof item === 'string').slice(-6).map((item) => item.slice(0, 400))
    : [];
  if (persona === 'quest') return recall.length ? `${QUEST_PROMPT}\nTheir quests:\n${recall.map((line) => `- ${line}`).join('\n')}` : QUEST_PROMPT;
  const agent = typeof persona === 'string' ? agentById(persona) : undefined;
  if (!agent) return null;
  return systemPrompt(agent, recall);
}

export async function runChat(body: ChatBody, model: KitModel | null): Promise<{ status: number; payload: Record<string, unknown> }> {
  const system = personaPrompt(body.persona, body.memories);
  if (!system) return { status: 400, payload: { error: 'Pick who to talk to.' } };
  const messages = cleanMessages(body.messages);
  if (messages.length === 0) return { status: 400, payload: { error: 'Write a message first.' } };
  if (!model) return { status: 503, payload: { error: 'No model key is set on this server.' } };
  try {
    const reply = await model.reply(system, messages);
    return { status: 200, payload: { reply, model: `${model.choice.provider}:${model.choice.model}` } };
  } catch (error) {
    return { status: 429, payload: { error: error instanceof Error ? error.message : 'The reply stopped.' } };
  }
}

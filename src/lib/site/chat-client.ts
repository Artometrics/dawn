import type { ModelChoice } from '@/lib/dawn-agents/model-catalog';
import { jsonInit, kitCall, type KitResult } from './kit-client';

export type ChatLine = { role: 'user' | 'agent'; text: string };

/** One reply from the Dawn gateway for a quest or a village character. The server picks the prompt and enforces the caps. */
export function askGateway(args: {
  persona: string;
  memories?: string[];
  lines: ChatLine[];
  choice: ModelChoice | null;
}): Promise<KitResult<{ reply: string; model: string }>> {
  return kitCall('/api/chat', jsonInit({
    persona: args.persona,
    memories: args.memories ?? [],
    messages: args.lines.map((line) => ({ role: line.role === 'user' ? 'user' : 'assistant', text: line.text })),
    model: args.choice,
  }));
}

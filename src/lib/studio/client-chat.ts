import { bootFirebase } from '@/lib/firebase-client';
import { GEMINI_FAST, remapModelId } from '@/lib/models';
import type { Teammate } from '@/types/teammate';

export type StudioChatMessage = { role: 'user' | 'assistant'; content: string };

export type StudioChatRequest = {
  messages: StudioChatMessage[];
  model?: string;
  teammate?: Teammate;
  codeContext?: { filename?: string; language?: string; content?: string };
};

/**
 * Studio chat over Firebase AI Logic (Gemini). Streams text via onChunk.
 * OpenRouter / Grok ids fall back to Gemini so the static host stays key-free.
 */
export async function streamStudioChat(
  req: StudioChatRequest,
  onChunk: (text: string) => void,
): Promise<string> {
  const boot = await bootFirebase();
  if (boot.mode !== 'hosted' || !boot.app) {
    throw new Error(
      'Gemini is not on this host yet. Turn on Firebase AI Logic for Dawn, then reload.',
    );
  }

  const { GoogleAIBackend, getAI, getGenerativeModel } = await import('firebase/ai');
  const ai = getAI(boot.app, { backend: new GoogleAIBackend() });

  const requested = remapModelId(req.model || req.teammate?.model || GEMINI_FAST);
  // Firebase AI Logic serves Gemini only on the static host.
  const modelId = requested.startsWith('gemini') ? requested : 'gemini-flash-latest';

  const systemParts: string[] = [];
  if (req.teammate) {
    systemParts.push(
      `You are ${req.teammate.name}, serving in the role of "${req.teammate.role}" inside Dawn Studio.`,
      req.teammate.instructions,
    );
    if (req.teammate.memory?.length) {
      systemParts.push(
        '\n--- PERSISTENT MEMORIES & PROJECT NOTES ---',
        ...req.teammate.memory.map((m, i) => `${i + 1}. ${m}`),
        '--------------------------------------------',
      );
    }
  } else {
    systemParts.push(
      'You are Dawn: a high-leverage software engineer, code intelligence assistant, and reasoning engine inspired by Grok and Cursor.',
    );
  }

  if (req.codeContext?.content) {
    systemParts.push(
      `\n--- ACTIVE CODE CONTEXT ---`,
      `File: ${req.codeContext.filename || 'untitled'} (${req.codeContext.language || 'typescript'})`,
      '```' + (req.codeContext.language || 'typescript'),
      req.codeContext.content,
      '```',
      '---------------------------',
    );
  }

  const model = getGenerativeModel(ai, {
    model: modelId,
    systemInstruction: systemParts.join('\n\n'),
  });

  const history = req.messages.slice(0, -1).slice(-16).map((m) => ({
    role: m.role === 'user' ? ('user' as const) : ('model' as const),
    parts: [{ type: 'text' as const, text: m.content }],
  }));
  const last = req.messages.at(-1);
  if (!last || last.role !== 'user') {
    throw new Error('Studio chat needs a user message.');
  }

  const chat = model.startChat({ history });
  const result = await chat.sendMessageStream(last.content);
  let accumulated = '';
  for await (const chunk of result.stream) {
    const piece = chunk.text();
    if (!piece) continue;
    accumulated += piece;
    onChunk(accumulated);
  }
  if (!accumulated) {
    const final = await result.response;
    accumulated = final.text().trim();
    if (accumulated) onChunk(accumulated);
  }
  return accumulated;
}

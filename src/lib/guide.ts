import { systemPrompt, type Agent } from '@/lib/agents';
import { bootFirebase } from '@/lib/firebase-client';
import { describeGeminiError } from '@/lib/gemini-error';
import { clip, detectKind, splitProposal, type Proposal } from '@/lib/proposals';

export type GuideResult = {
  text: string;
  proposal: Proposal | null;
  source: 'gemini' | 'practice';
  /** Set when the visible text is a stand-in because Gemini did not answer. */
  error: string | null;
};

const GEMINI_TIMEOUT_MS = 12_000;
const GEMINI_MODEL = 'gemini-flash-latest';

type GeminiLine = { text: string | null; error: string | null };

/**
 * Gemini via Firebase AI Logic when the hosted project is configured.
 * A failure returns a short practice reply plus a clear error. No API key is bundled.
 */
/** One-shot Gemini completion. Returns null when Firebase AI Logic is not on this host or the call fails. */
export async function completeText(prompt: string): Promise<string | null> {
  const result = await askGeminiLine(prompt);
  return result.text;
}

/** Same call as completeText, with the reason Gemini did not answer. */
export async function askGeminiLine(prompt: string): Promise<GeminiLine> {
  return runGemini(prompt);
}

export async function askAgent(
  agent: Agent,
  memories: string[],
  history: { role: 'user' | 'agent'; text: string }[],
  prompt: string,
): Promise<GuideResult> {
  const fallback = practiceReply(agent, prompt, memories);
  const gemini = await runGemini(prompt, {
    systemInstruction: systemPrompt(agent, memories),
    history: history.slice(0, -1).slice(-8).map((line) => ({
      role: line.role === 'user' ? ('user' as const) : ('model' as const),
      text: line.text,
    })),
  });

  const answered = Boolean(gemini.text?.trim());
  const raw = answered ? gemini.text!.trim() : fallback;
  const parsed = splitProposal(raw);
  const implied = detectKind(prompt);
  const proposal = parsed.proposal ?? (implied ? { kind: implied, summary: clip(prompt, 200) } : null);
  const text = parsed.text || raw.trim() || fallback;
  return {
    text,
    proposal,
    source: answered ? 'gemini' : 'practice',
    error: answered ? null : gemini.error,
  };
}

async function runGemini(
  prompt: string,
  options?: {
    systemInstruction?: string;
    history?: { role: 'user' | 'model'; text: string }[];
  },
): Promise<GeminiLine> {
  const boot = await bootFirebase();
  if (boot.mode !== 'hosted' || !boot.app) {
    return { text: null, error: describeGeminiError('Gemini is not on this host yet.') };
  }

  try {
    const { GoogleAIBackend, getAI, getGenerativeModel } = await import('firebase/ai');
    const ai = getAI(boot.app, { backend: new GoogleAIBackend() });
    const model = getGenerativeModel(ai, {
      model: GEMINI_MODEL,
      ...(options?.systemInstruction ? { systemInstruction: options.systemInstruction } : {}),
    });
    const request = { timeout: GEMINI_TIMEOUT_MS };
    const history = options?.history?.filter((line) => line.text.trim()) ?? [];
    let text = '';
    if (history.length > 0) {
      const chat = model.startChat({
        history: history.map((line) => ({
          role: line.role,
          parts: [{ type: 'text' as const, text: line.text }],
        })),
      });
      const result = await chat.sendMessage(prompt, request);
      text = result.response.text().trim();
    } else {
      const result = await model.generateContent(prompt, request);
      text = result.response.text().trim();
    }
    if (!text) return { text: null, error: describeGeminiError('empty') };
    return { text, error: null };
  } catch (error) {
    return { text: null, error: describeGeminiError(error) };
  }
}

function practiceReply(agent: Agent, prompt: string, memories: string[]): string {
  const kind = detectKind(prompt);
  const recall = memories.at(-1);
  const memory = recall ? ` I still have this: ${clip(recall, 80)}` : '';
  if (kind) {
    return `${agent.name} will not ${kind} until you approve.${memory}\nPROPOSAL: ${kind} | ${clip(prompt, 180)}`;
  }
  if (agent.role === 'chief') {
    return `Plan: ${clip(prompt, 120)}. Kali can look it up. Nimbus can build it. I will not send, spend, hire, or post unless you approve.`;
  }
  return `On it: ${clip(prompt, 140)}. Anything that leaves the village comes back to you first.`;
}

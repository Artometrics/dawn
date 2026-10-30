import { systemPrompt, type Agent } from '@/lib/agents';
import { bootFirebase } from '@/lib/firebase-client';
import { clip, detectKind, splitProposal, type Proposal } from '@/lib/proposals';

export type GuideResult = {
  text: string;
  proposal: Proposal | null;
  source: 'gemini' | 'practice';
};

/**
 * Gemini via Firebase AI Logic when the hosted project is configured.
 * Otherwise a short practice reply, labeled as such. No API key is bundled.
 */
/** One-shot Gemini completion. Returns null when Firebase AI Logic is not on this host. */
export async function completeText(prompt: string): Promise<string | null> {
  const boot = await bootFirebase();
  if (boot.mode !== 'hosted' || !boot.app) return null;
  const { GoogleAIBackend, getAI, getGenerativeModel } = await import('firebase/ai');
  const ai = getAI(boot.app, { backend: new GoogleAIBackend() });
  const model = getGenerativeModel(ai, { model: 'gemini-flash-latest' });
  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  return text || null;
}

export async function askAgent(
  agent: Agent,
  memories: string[],
  history: { role: 'user' | 'agent'; text: string }[],
  prompt: string,
): Promise<GuideResult> {
  let source: GuideResult['source'] = 'practice';
  let raw = practiceReply(agent, prompt, memories);

  try {
    const gemini = await askGemini(agent, memories, history, prompt);
    if (gemini.trim()) {
      raw = gemini.trim();
      source = 'gemini';
    }
  } catch {
    source = 'practice';
  }

  const parsed = splitProposal(raw);
  const implied = detectKind(prompt);
  const proposal = parsed.proposal ?? (implied ? { kind: implied, summary: clip(prompt, 200) } : null);
  const text = parsed.text || raw.trim();
  return { text, proposal, source };
}

async function askGemini(
  agent: Agent,
  memories: string[],
  history: { role: 'user' | 'agent'; text: string }[],
  prompt: string,
): Promise<string> {
  const boot = await bootFirebase();
  if (boot.mode !== 'hosted' || !boot.app) {
    throw new Error('Gemini is not on this host yet.');
  }

  const { GoogleAIBackend, getAI, getGenerativeModel } = await import('firebase/ai');
  const ai = getAI(boot.app, { backend: new GoogleAIBackend() });
  const model = getGenerativeModel(ai, {
    model: 'gemini-flash-latest',
    systemInstruction: systemPrompt(agent, memories),
  });

  const prior = history.slice(0, -1).slice(-8).map((line) => ({
    role: line.role === 'user' ? ('user' as const) : ('model' as const),
    parts: [{ type: 'text' as const, text: line.text }],
  }));

  const chat = model.startChat({ history: prior });
  const result = await chat.sendMessage(prompt);
  return result.response.text();
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

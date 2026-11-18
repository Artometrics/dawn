export type ChatTurn = { role: 'user' | 'assistant'; content: string };

/**
 * Gemini rejects a history that opens with a model turn ("First Content should be with role user").
 * Keep the last 16 non-empty turns, drop any leading assistant turns (greetings, stand-ins),
 * and fold back-to-back turns from the same side into one.
 */
export function geminiHistory(messages: ChatTurn[]): ChatTurn[] {
  const recent = messages.filter((m) => m.content.trim()).slice(-16);
  const first = recent.findIndex((m) => m.role === 'user');
  if (first < 0) return [];
  const out: ChatTurn[] = [];
  for (const m of recent.slice(first)) {
    const prev = out.at(-1);
    if (prev && prev.role === m.role) prev.content = `${prev.content}\n\n${m.content}`;
    else out.push({ ...m });
  }
  if (out.at(-1)?.role === 'user') out.pop();
  return out;
}


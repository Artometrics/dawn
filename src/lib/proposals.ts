export type ActionKind = 'send' | 'spend' | 'hire' | 'post';

export type Proposal = {
  kind: ActionKind;
  summary: string;
};

const KINDS = new Set<ActionKind>(['send', 'spend', 'hire', 'post']);

export function clip(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}

/** Guess a gated action from the person's words. Casual chat does not match. */
export function detectKind(text: string): ActionKind | null {
  const lower = text.toLowerCase();
  if (/\b(spend|buy|pay|purchase)\b/.test(lower)) return 'spend';
  if (/\b(hire|recruit)\b/.test(lower)) return 'hire';
  if (/\b(post|publish|announce)\b/.test(lower)) return 'post';
  if (/\b(send (this|it|that|the|a|an)|email)\b/.test(lower)) return 'send';
  return null;
}

export function splitProposal(raw: string): { text: string; proposal: Proposal | null } {
  const lines = raw.split('\n');
  const index = lines.findIndex((line) => /^PROPOSAL:/i.test(line.trim()));
  if (index < 0) return { text: raw.trim(), proposal: null };

  const match = lines[index]
    .trim()
    .match(/^PROPOSAL:\s*(send|spend|hire|post)\s*\|\s*(.+)$/i);
  const text = lines.filter((_, i) => i !== index).join('\n').trim();
  if (!match) return { text: raw.trim(), proposal: null };

  const kind = match[1].toLowerCase() as ActionKind;
  if (!KINDS.has(kind)) return { text, proposal: null };
  const summary = clip(match[2], 200);
  if (!summary) return { text, proposal: null };
  return { text, proposal: { kind, summary } };
}

export function actionLabel(kind: ActionKind): string {
  if (kind === 'send') return 'Send';
  if (kind === 'spend') return 'Spend';
  if (kind === 'hire') return 'Hire';
  return 'Post';
}

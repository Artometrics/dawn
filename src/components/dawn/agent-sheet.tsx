'use client';

import { useEffect, useRef, useState } from 'react';
import { agentById, type Agent } from '@/lib/agents';
import { askAgent } from '@/lib/guide';
import { describeGeminiError } from '@/lib/gemini-error';
import { actionLabel } from '@/lib/proposals';
import { useDawn, type Approval } from '@/components/dawn/dawn-provider';

function draftedApproval(
  agentId: Approval['agentId'],
  proposal: { kind: Approval['kind']; summary: string },
): Approval {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    agentId,
    kind: proposal.kind,
    summary: proposal.summary,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };
}

export function AgentSheet({ agent, onClose }: { agent: Agent; onClose: () => void }) {
  const { memories, remember, addApproval, approvals, decide, note } = useDawn();
  const [lines, setLines] = useState<{ role: 'user' | 'agent'; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [source, setSource] = useState<'gemini' | 'practice' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const mine = memories.filter((item) => item.agentId === agent.id).slice(-6);
  const pending = approvals.filter((item) => item.agentId === agent.id && item.status === 'pending');

  async function send() {
    const prompt = input.trim();
    if (!prompt || busy) return;
    setInput('');
    const history = [...lines, { role: 'user' as const, text: prompt }];
    setLines(history);
    setBusy(true);
    setError(null);
    try {
      const result = await askAgent(agent, mine.map((item) => item.text), history, prompt);
      setSource(result.source);
      setError(result.error);
      setLines([...history, { role: 'agent', text: result.text }]);
      remember(agent.id, `You: ${prompt}`.slice(0, 400));
      remember(agent.id, `${agent.name}: ${result.text}`.slice(0, 400));
      if (result.proposal) {
        await addApproval(draftedApproval(agent.id, result.proposal));
      }
    } catch (err: unknown) {
      setSource('practice');
      setError(describeGeminiError(err));
      setLines([...history, { role: 'agent', text: `${agent.name} heard you. Nothing leaves the village until you approve.` }]);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const node = scroller.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [lines, busy, error]);

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3 bg-[var(--dawn-bg)] p-3">
      <div className="flex items-center gap-2">
        <img src={agent.src} alt="" width={36} height={36} className="h-9 w-9 rounded-lg bg-[var(--dawn-chip)] [image-rendering:pixelated]" />
        <div className="min-w-0 flex-1">
          <p className="text-[16px] font-medium">{agent.name}</p>
          <p className="truncate text-[13px] text-[var(--dawn-muted)]">{agent.title}</p>
        </div>
        <button type="button" className="min-h-11 px-3 text-[15px]" onClick={onClose}>Close</button>
      </div>
      {source === 'gemini' && <p className="text-[13px] text-[var(--dawn-accent)]">Gemini</p>}
      {error && (
        <p role="alert" className="rounded-2xl bg-[var(--dawn-elev)] px-3 py-2 text-[15px] leading-snug">
          {error} Showing a stand-in reply.
        </p>
      )}
      {mine.length > 0 && <p className="text-[13px] text-[var(--dawn-muted)]">Remembers: {mine.at(-1)?.text}</p>}
      <div ref={scroller} className="flex min-h-16 flex-1 flex-col gap-2 overflow-y-auto text-[16px]">
        {lines.map((line, index) => (
          <p
            key={`${line.role}-${index}`}
            className={line.role === 'user'
              ? 'ml-8 rounded-2xl bg-[var(--dawn-chip)] px-3 py-2'
              : 'mr-8 rounded-2xl bg-[var(--dawn-elev)] px-3 py-2'}
          >
            {line.text}
          </p>
        ))}
        {busy && <p className="text-[14px] text-[var(--dawn-muted)]">Thinking…</p>}
      </div>
      {pending.map((item) => (
        <ApprovalRow key={item.id} item={item} onDecide={decide} />
      ))}
      {note && <p className="text-[13px] text-[var(--dawn-accent)]">{note}</p>}
      <form
        className="flex shrink-0 gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
      >
        <label className="sr-only" htmlFor="agent-prompt">Message</label>
        <input
          id="agent-prompt"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={`Ask ${agent.name}`}
          className="dawn-field flex-1"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="inline-flex min-h-11 min-w-16 items-center justify-center rounded-full bg-[var(--dawn-pill)] px-4 text-[14px] font-medium text-[var(--dawn-ink)] disabled:opacity-40"
        >
          Ask
        </button>
      </form>
    </section>
  );
}

function ApprovalRow({
  item,
  onDecide,
}: {
  item: Approval;
  onDecide: (id: string, status: 'approved' | 'declined') => Promise<void>;
}) {
  const agent = agentById(item.agentId);
  return (
    <div className="rounded-2xl bg-[var(--dawn-elev)] p-3 text-[15px]">
      <p>{agent?.name} drafted a {actionLabel(item.kind)}: {item.summary}</p>
      <div className="mt-3 flex gap-2">
        <button type="button" className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-[var(--dawn-pill)] text-[14px] font-medium text-[var(--dawn-ink)]" onClick={() => void onDecide(item.id, 'approved')}>
          Approve
        </button>
        <button type="button" className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-[var(--dawn-chip)] text-[14px]" onClick={() => void onDecide(item.id, 'declined')}>
          No
        </button>
      </div>
    </div>
  );
}

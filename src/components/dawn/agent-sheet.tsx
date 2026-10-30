'use client';

import { useEffect, useRef, useState } from 'react';
import { agentById, type Agent } from '@/lib/agents';
import { askAgent } from '@/lib/guide';
import { describeGeminiError } from '@/lib/gemini-error';
import { actionLabel } from '@/lib/proposals';
import { useDawn, type Approval } from '@/components/dawn/dawn-provider';

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
        const approval: Approval = {
          id: crypto.randomUUID(),
          agentId: agent.id,
          kind: result.proposal.kind,
          summary: result.proposal.summary,
          status: 'pending',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        await addApproval(approval);
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
    <section className="flex min-h-0 flex-1 flex-col gap-3 border-t border-[#5a4636] bg-[#241910] p-3">
      <div className="flex items-center gap-2">
        <img src={agent.src} alt="" width={32} height={32} className="h-8 w-8 [image-rendering:pixelated]" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{agent.name}</p>
          <p className="truncate text-xs text-[#d9cbb8]">{agent.title}</p>
        </div>
        <button type="button" className="min-h-11 px-3 text-sm" onClick={onClose}>Close</button>
      </div>
      {source === 'gemini' && <p className="text-xs text-[#e2a04a]">Gemini</p>}
      {error && (
        <p role="alert" className="border border-[#e2a04a] bg-[#3a2414] px-3 py-2 text-sm leading-snug text-[#f3e6d0]">
          {error} Showing a stand-in reply.
        </p>
      )}
      {mine.length > 0 && <p className="text-xs text-[#d9cbb8]">Remembers: {mine.at(-1)?.text}</p>}
      <div ref={scroller} className="flex min-h-16 flex-1 flex-col gap-2 overflow-y-auto text-base">
        {lines.map((line, index) => (
          <p
            key={`${line.role}-${index}`}
            className={line.role === 'user'
              ? 'ml-8 rounded-2xl bg-[#3a2a1c] px-3 py-2 text-[#f0d7a2]'
              : 'mr-8 rounded-2xl border border-[#5a4636] bg-[#1c1410] px-3 py-2'}
          >
            {line.text}
          </p>
        ))}
        {busy && <p className="text-sm text-[#d9cbb8]">Thinking…</p>}
      </div>
      {pending.map((item) => (
        <ApprovalRow key={item.id} item={item} onDecide={decide} />
      ))}
      {note && <p className="text-xs text-[#e2a04a]">{note}</p>}
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
          className="min-h-11 flex-1 border border-[#5a4636] bg-[#1c1410] px-3 text-base"
        />
        <button type="submit" disabled={busy || !input.trim()} className="min-h-11 min-w-16 border border-[#e2a04a] px-3 text-sm disabled:opacity-40">
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
    <div className="border border-[#e2a04a] p-2 text-sm">
      <p className="text-xs uppercase tracking-wide text-[#e2a04a]">{actionLabel(item.kind)} · needs you</p>
      <p className="mt-1">{agent?.name}: {item.summary}</p>
      <div className="mt-2 flex gap-2">
        <button type="button" className="min-h-11 flex-1 bg-[#e2a04a] text-[#1c1410]" onClick={() => void onDecide(item.id, 'approved')}>
          Approve
        </button>
        <button type="button" className="min-h-11 flex-1 border border-[#5a4636]" onClick={() => void onDecide(item.id, 'declined')}>
          No
        </button>
      </div>
    </div>
  );
}

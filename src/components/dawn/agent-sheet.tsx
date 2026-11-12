'use client';

import { useEffect, useRef, useState } from 'react';
import { agentById, type Agent } from '@/lib/agents';
import { askAgent } from '@/lib/guide';
import { describeGeminiError } from '@/lib/gemini-error';
import { actionLabel } from '@/lib/proposals';
import { useDawn, type Approval } from '@/components/dawn/dawn-provider';
import { Bubble, Composer } from '@/components/shell/composer';
import { useModelPicker } from '@/components/shell/model-picker';
import { askGateway } from '@/lib/site/chat-client';

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
  const [source, setSource] = useState<'gateway' | 'gemini' | 'practice' | null>(null);
  const picker = useModelPicker();
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
      const memoryLines = mine.map((item) => item.text);
      const viaGateway = picker.status === 'ready'
        ? async () => {
            const answer = await askGateway({ persona: agent.id, memories: memoryLines, lines: history, choice: picker.choice });
            if (answer.status === 'ok') return answer.data.reply;
            if (answer.status === 'error') setError(answer.message);
            return null;
          }
        : undefined;
      const result = await askAgent(agent, memoryLines, history, prompt, viaGateway);
      setSource(result.source);
      setError(result.source === 'practice' ? (result.error ?? 'Offline preview. Open live Dawn for real replies.') : null);
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
      <div className="flex items-center gap-3">
        <img src={agent.src} alt="" width={40} height={40} className="h-10 w-10 rounded-[var(--dawn-radius-tile)] border border-[var(--dawn-line)] bg-[var(--dawn-chip)] [image-rendering:pixelated]" />
        <div className="min-w-0 flex-1">
          <p className="text-[length:var(--dawn-fs-body)] font-medium">{agent.name}</p>
          <p className="truncate text-[length:var(--dawn-fs-label)] text-[var(--dawn-muted)]">{agent.title}</p>
        </div>
        <button type="button" className="dw-btn" onClick={onClose}>Close</button>
      </div>
      {error && <p role="alert" className="dw-alert">{error}</p>}
      {mine.length > 0 && <p className="text-[length:var(--dawn-fs-label)] text-[var(--dawn-muted)]">Remembers: {mine.at(-1)?.text}</p>}
      <div ref={scroller} className="min-h-16 flex-1 overflow-y-auto">
        <ol className="bb-list">
          {lines.map((line, index) => (
            <Bubble key={`${line.role}-${index}`} who={line.role === 'user' ? 'you' : 'bot'} name={line.role === 'user' ? 'You' : agent.name}>{line.text}</Bubble>
          ))}
          {busy && <li className="dw-note">Thinking…</li>}
        </ol>
      </div>
      {pending.map((item) => (
        <ApprovalRow key={item.id} item={item} onDecide={decide} />
      ))}
      {note && <p className="text-[length:var(--dawn-fs-label)] text-[var(--dawn-muted)]">{note}</p>}
      <Composer
        value={input}
        onChange={setInput}
        onSubmit={() => { void send(); }}
        label="Message"
        placeholder={`Ask ${agent.name}`}
        picker={picker}
        busy={busy}
      />
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
    <div className="rounded-[var(--dawn-radius-panel)] border border-[var(--dawn-line)] bg-[var(--dawn-elev)] p-3 text-[length:var(--dawn-fs-support)]">
      <p>{agent?.name} drafted a {actionLabel(item.kind)}: {item.summary}</p>
      <div className="mt-3 flex gap-2">
        <button type="button" className="dw-btn dw-btn--primary flex-1" onClick={() => void onDecide(item.id, 'approved')}>
          Approve
        </button>
        <button type="button" className="dw-btn flex-1" onClick={() => void onDecide(item.id, 'declined')}>
          No
        </button>
      </div>
    </div>
  );
}

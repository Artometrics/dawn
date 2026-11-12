'use client';

import { useEffect, useState } from 'react';
import { DeskGate } from '@/components/shell/status-card';
import { PageShell } from '@/components/site/page-shell';
import { kitCall } from '@/lib/site/kit-client';

type ToolRow = { tool: string; ok: boolean; reason?: string; result?: unknown };
type Session = {
  ok: boolean;
  reason?: string;
  model: string;
  toolSource: string;
  mode: string;
  level: string;
  status?: string;
  result?: string;
  question?: string;
  events: { kind: string; detail?: string }[];
  tools: ToolRow[];
  usage: { estimatedUsd: number; capChecked: boolean; capAllows: boolean; ledgerWrites: number };
};
type Payload = {
  host: string;
  model: string;
  execution?: string;
  spentUsd: number;
  capUsd: number;
  memory?: string;
  session: (Session & { diff?: string; gameHtml?: string; signature?: string; idempotent?: boolean }) | null;
};

function failure(status: number, what: string) {
  if (status === 401) return 'This is not available right now.';
  return `${what} was refused (status ${status}).`;
}

export function BotDesk() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [desk, setDesk] = useState<'loading' | 'ready' | 'offline' | 'signin'>('loading');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void kitCall<Payload>('/api/bot-session').then((result) => {
      if (cancelled) return;
      if (result.status === 'ok') {
        setPayload(result.data);
        setDesk('ready');
      } else setDesk(result.status === 'closed' ? 'signin' : 'offline');
    });
    return () => { cancelled = true; };
  }, []);

  async function run(action: 'plan' | 'build' | 'ask' | 'approve' | 'game' | 'revise' | 'observe' | 'handoff', label: string) {
    setBusy(true);
    setNotice('');
    try {
      const response = await fetch('/api/bot-session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!response.ok) throw new Error(failure(response.status, label));
      setPayload(await response.json() as Payload);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'The task did not run.');
    } finally {
      setBusy(false);
    }
  }

  const session = payload?.session;
  return (
    <PageShell title="Bot desk" lead="Run one task in a small workspace on the Dawn server.">
      <DeskGate status={desk} offline="Offline preview. Open live Dawn to run a task." />
      {desk === 'ready' && <div className="dw-actions">
        <button type="button" className="dw-btn" disabled={busy} onClick={() => run('plan', 'Read the note')}>Read the note</button>
        <button type="button" className="dw-btn" disabled={busy} onClick={() => run('ask', 'Ask before writing')}>Ask before writing</button>
        <button type="button" className="dw-btn dw-btn--primary" disabled={busy} onClick={() => run('approve', 'Approve')}>Approve</button>
        <button type="button" className="dw-btn" disabled={busy} onClick={() => run('build', 'Save a line')}>Save a line</button>
        <button type="button" className="dw-btn" disabled={busy} onClick={() => run('game', 'Make a game')}>Make a game</button>
        <button type="button" className="dw-btn" disabled={busy} onClick={() => run('revise', 'Revise the game')}>Revise the game</button>
        <button type="button" className="dw-btn" disabled={busy} onClick={() => run('observe', 'Read the fixture')}>Read the fixture</button>
        <button type="button" className="dw-btn" disabled={busy} onClick={() => run('handoff', 'Hand off the note')}>Hand off the note</button>
      </div>}
      {notice && <p className="dw-alert" role="status">{notice}</p>}
      {desk === 'ready' && <>
      <section className="dw-card">
        <h2 className="dw-card-title">Session</h2>
        <p className="dw-note">
          {payload
            ? `Spent $${payload.spentUsd.toFixed(2)} of $${payload.capUsd.toFixed(2)} this month.`
            : 'No session yet.'}
          {session ? ` Status ${session.status}. Level ${session.level}. Mode ${session.mode}. Tools ${session.toolSource}.` : ''}
        </p>
        {session?.question && <p>{session.question}</p>}
        {session?.reason && <p className="dw-alert">{session.reason}</p>}
        {session?.result && <p>{session.result}</p>}
        {session?.diff && <pre>{session.diff}</pre>}
        {payload?.memory && <pre>{payload.memory}</pre>}
        {session?.gameHtml && <iframe title="Game preview" sandbox="allow-scripts" srcDoc={session.gameHtml} style={{ width: '100%', height: 180, border: 0, borderRadius: 'var(--dawn-radius-row)', background: 'var(--dawn-sheet)' }} />}
      </section>
      <section className="dw-card">
        <h2 className="dw-card-title">Events</h2>
        {session?.events?.length ? (
          <ol className="dw-list">
            {session.events.map((event, index) => (
              <li key={`${event.kind}-${index}`}><strong>{event.kind}</strong> <span className="dw-note">{event.detail}</span></li>
            ))}
          </ol>
        ) : <p className="dw-note">Events show up after a task runs.</p>}
      </section>
      <section className="dw-card">
        <h2 className="dw-card-title">Tools</h2>
        {session?.tools?.length ? (
          <ul className="dw-list">
            {session.tools.map((tool, index) => (
              <li key={`${tool.tool}-${index}`}>
                <strong>{tool.tool}</strong> {tool.ok ? 'ok' : 'refused'}
                {tool.reason && <div className="dw-note">{tool.reason}</div>}
                {tool.result !== undefined && <pre>{JSON.stringify(tool.result, null, 2)}</pre>}
              </li>
            ))}
          </ul>
        ) : <p className="dw-note">A finished task lists each tool here.</p>}
      </section>
      </>}
    </PageShell>
  );
}

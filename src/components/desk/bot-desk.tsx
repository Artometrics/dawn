'use client';

import { useEffect, useState } from 'react';
import { PageShell } from '@/components/site/page-shell';

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
  if (status === 401) return 'Sign in on the local gateway.';
  if (status === 404) return `${what} did nothing. This host is the static site and has no bot runtime. Start the local gateway to use the desk.`;
  return `${what} was refused by the gateway (status ${status}).`;
}

export function BotDesk() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [notice, setNotice] = useState('Opening the local gateway…');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/bot-session', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error(failure(response.status, 'The desk'));
        const next = await response.json() as Payload;
        if (cancelled) return;
        setPayload(next);
        setNotice('');
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setNotice(error instanceof Error ? error.message : 'This static site does not run the bot.');
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
      setNotice(error instanceof Error ? error.message : 'This static site does not run the bot.');
    } finally {
      setBusy(false);
    }
  }

  const session = payload?.session;
  return (
    <PageShell
      title="Bot desk"
      current="/desk"
      lead="One task in a workspace on this machine. Plan can read. Build can write only after the level says edits. Nothing here calls a model or leaves the workspace."
    >
      <div className="dw-actions">
        <button type="button" className="dw-btn" disabled={busy} onClick={() => run('plan', 'Read the note')}>Read the note</button>
        <button type="button" className="dw-btn" disabled={busy} onClick={() => run('ask', 'Ask before writing')}>Ask before writing</button>
        <button type="button" className="dw-btn dw-btn--primary" disabled={busy} onClick={() => run('approve', 'Approve')}>Approve</button>
        <button type="button" className="dw-btn" disabled={busy} onClick={() => run('build', 'Save a line')}>Save a line</button>
        <button type="button" className="dw-btn" disabled={busy} onClick={() => run('game', 'Make a game')}>Make a game</button>
        <button type="button" className="dw-btn" disabled={busy} onClick={() => run('revise', 'Revise the game')}>Revise the game</button>
        <button type="button" className="dw-btn" disabled={busy} onClick={() => run('observe', 'Read the fixture')}>Read the fixture</button>
        <button type="button" className="dw-btn" disabled={busy} onClick={() => run('handoff', 'Hand off the note')}>Hand off the note</button>
        <span className="dw-badge" style={{ alignSelf: 'center' }}>Model not called</span>
      </div>
      {notice && <p className="dw-alert" role="status">{notice === 'Failed to fetch' ? 'This host is the static site. The bot runtime is the local gateway, not Firebase.' : notice}</p>}
      <section className="dw-card">
        <h2 className="dw-card-title">Session</h2>
        <p className="dw-note">
          {payload
            ? `Spend ${payload.spentUsd.toFixed(2)} of ${payload.capUsd.toFixed(2)}. Cap checked. Ledger writes 0.`
            : 'No session yet. Connect the local gateway to start one.'}
          {session ? ` Status ${session.status}. Level ${session.level}. Mode ${session.mode}. Tools ${session.toolSource}.` : ''}
        </p>
        {session?.question && <p>{session.question}</p>}
        {session?.reason && <p className="dw-alert">{session.reason}</p>}
        {session?.result && <p>{session.result}</p>}
        {session?.diff && <pre>{session.diff}</pre>}
        {payload?.memory && <pre>{payload.memory}</pre>}
        {session?.gameHtml && <iframe title="Game preview" sandbox="allow-scripts" srcDoc={session.gameHtml} style={{ width: '100%', height: 180, border: 0, borderRadius: 'var(--dawn-radius-row)', background: '#fff' }} />}
      </section>
      <section className="dw-card">
        <h2 className="dw-card-title">Events</h2>
        {session?.events?.length ? (
          <ol className="dw-list">
            {session.events.map((event, index) => (
              <li key={`${event.kind}-${index}`}><strong>{event.kind}</strong> <span className="dw-note">{event.detail}</span></li>
            ))}
          </ol>
        ) : <p className="dw-note">Events show up after a task runs on the local gateway.</p>}
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
      <p className="dw-note">Local gateway only. Firebase hosting does not start this runtime.</p>
    </PageShell>
  );
}

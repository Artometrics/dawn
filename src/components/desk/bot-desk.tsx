'use client';

import { useEffect, useState } from 'react';

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

export function BotDesk() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [notice, setNotice] = useState('Opening the local gateway…');
  const [busy, setBusy] = useState(false);

  async function load() {
    const response = await fetch('/api/bot-session', { cache: 'no-store' });
    if (!response.ok) throw new Error(response.status === 401 ? 'Sign in on the local gateway.' : 'The gateway refused the desk.');
    setPayload(await response.json() as Payload);
    setNotice('');
  }

  useEffect(() => {
    load().catch((error: unknown) => {
      setNotice(error instanceof Error ? error.message : 'This static site does not run the bot.');
    });
  }, []);

  async function run(action: 'plan' | 'build' | 'ask' | 'approve' | 'game' | 'revise' | 'observe' | 'handoff') {
    setBusy(true);
    setNotice('');
    try {
      const response = await fetch('/api/bot-session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!response.ok) throw new Error(response.status === 401 ? 'Sign in on the local gateway.' : 'The gateway refused the task.');
      setPayload(await response.json() as Payload);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'This static site does not run the bot.');
    } finally {
      setBusy(false);
    }
  }

  const session = payload?.session;
  return (
    <main className="bot-desk">
      <div className="desk-shell">
        <header className="desk-top">
          <a className="desk-word" href="/">DAWN</a>
          <a href="/agents">Agents</a>
          <a href="/village">Village</a>
        </header>
        <div>
          <h1>Bot desk</h1>
          <p className="desk-lead">One task in a workspace on this machine. Plan can read. Build can write only after the level says edits. Nothing here calls a model or leaves the workspace.</p>
        </div>
        <div className="desk-actions">
          <button type="button" disabled={busy} onClick={() => run('plan')}>Read the note</button>
          <button type="button" disabled={busy} onClick={() => run('ask')}>Ask before writing</button>
          <button type="button" disabled={busy} onClick={() => run('approve')}>Approve</button>
          <button type="button" disabled={busy} onClick={() => run('build')}>Save a line</button>
          <button type="button" disabled={busy} onClick={() => run('game')}>Make a game</button>
          <button type="button" disabled={busy} onClick={() => run('revise')}>Revise the game</button>
          <button type="button" disabled={busy} onClick={() => run('observe')}>Read the fixture</button>
          <button type="button" disabled={busy} onClick={() => run('handoff')}>Hand off the note</button>
          <span className="desk-badge">Model not called</span>
        </div>
        {notice && <p className="desk-warn">{notice === 'Failed to fetch' ? 'This host is the static site. The bot runtime is the local gateway, not Firebase.' : notice}</p>}
        <section className="desk-panel">
          <h2>Session</h2>
          <p className="desk-k">
            {payload
              ? `Spend ${payload.spentUsd.toFixed(2)} of ${payload.capUsd.toFixed(2)}. Cap checked. Ledger writes 0.`
              : 'No session yet.'}
            {session ? ` Status ${session.status}. Level ${session.level}. Mode ${session.mode}. Tools ${session.toolSource}.` : ''}
          </p>
          {session?.question && <p>{session.question}</p>}
          {session?.reason && <p className="desk-warn">{session.reason}</p>}
          {session?.result && <p>{session.result}</p>}
          {session?.diff && <pre className="desk-pre">{session.diff}</pre>}
          {payload?.memory && <pre className="desk-pre">{payload.memory}</pre>}
          {session?.gameHtml && <iframe title="Game preview" sandbox="allow-scripts" srcDoc={session.gameHtml} style={{ width: '100%', height: 180, border: '1px solid #2a3148', borderRadius: 10, background: '#fff' }} />}
        </section>
        <section className="desk-panel">
          <h2>Events</h2>
          {session?.events?.length ? (
            <ol className="desk-events">
              {session.events.map((event, index) => (
                <li key={`${event.kind}-${index}`}><strong>{event.kind}</strong> <span className="desk-k">{event.detail}</span></li>
              ))}
            </ol>
          ) : <p className="desk-k">Events show up after a task runs on the local gateway.</p>}
        </section>
        <section className="desk-panel">
          <h2>Tools</h2>
          {session?.tools?.length ? (
            <ul className="desk-tools">
              {session.tools.map((tool, index) => (
                <li key={`${tool.tool}-${index}`}>
                  <strong>{tool.tool}</strong> {tool.ok ? 'ok' : 'refused'}
                  {tool.reason && <div className="desk-warn">{tool.reason}</div>}
                  {tool.result !== undefined && <pre className="desk-pre">{JSON.stringify(tool.result, null, 2)}</pre>}
                </li>
              ))}
            </ul>
          ) : <p className="desk-k">A finished task lists each tool here.</p>}
        </section>
        <footer className="desk-foot">
          <span>Local gateway only. Firebase hosting does not start this runtime.</span>
        </footer>
      </div>
    </main>
  );
}

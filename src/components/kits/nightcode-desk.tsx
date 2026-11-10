'use client';

import { useEffect, useState } from 'react';

type Message = { id: string; role: 'user' | 'assistant'; body: string; tool: string };
type Session = { id: string; title: string; mode: 'plan' | 'build'; messages: Message[]; files: string[] };

export function NightcodeDesk() {
  const [sessions, setSessions] = useState<{ id: string; title: string }[]>([]);
  const [current, setCurrent] = useState<Session | null>(null);
  const [mode, setMode] = useState<'plan' | 'build'>('plan');
  const [text, setText] = useState('list');
  const [note, setNote] = useState('Sign in, then start a session. Gemini is off. Bash is off.');

  async function loadList() {
    const response = await fetch('/api/kits/nightcode/sessions', { credentials: 'include', redirect: 'manual' });
    if (response.type === 'opaqueredirect' || response.status === 401) {
      setNote('Google sign-in is in front of this host. Open /oauth2/start, then return here.');
      return;
    }
    if (!response.ok) {
      setNote('The gateway is not answering on this origin.');
      return;
    }
    const data = await response.json() as { sessions: { id: string; title: string }[]; reason?: string };
    setSessions(data.sessions);
    if (data.reason) setNote(data.reason);
  }

  useEffect(() => { void loadList(); }, []);

  async function start() {
    const response = await fetch('/api/kits/nightcode/sessions', {
      method: 'POST',
      credentials: 'include',
      redirect: 'manual',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    if (!response.ok) {
      setNote('Could not start a session.');
      return;
    }
    const data = await response.json() as Session;
    setCurrent(data);
    setSessions((items) => [{ id: data.id, title: data.title }, ...items]);
  }

  async function open(id: string) {
    const response = await fetch(`/api/kits/nightcode/sessions/${id}`, { credentials: 'include', redirect: 'manual' });
    if (!response.ok) return;
    const data = await response.json() as Session;
    setCurrent(data);
    setMode(data.mode);
  }

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (!current) return;
    const response = await fetch(`/api/kits/nightcode/sessions/${current.id}/messages`, {
      method: 'POST',
      credentials: 'include',
      redirect: 'manual',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text, mode }),
    });
    const data = await response.json() as Session & { error?: string; reason?: string };
    if (!response.ok) {
      setNote(data.error || 'The turn stopped.');
      return;
    }
    setCurrent(data);
    setNote(data.reason || 'Turn stored. Nothing was sent and no model was called.');
  }

  return (
    <main className="dawn-agents" style={{ minHeight: '100dvh', padding: '20px 16px 32px' }}>
      <div style={{ width: 'min(960px, 100%)', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p className="word">DAWN</p>
        <h1>NightCode</h1>
        <p><a href="/kits">All kits</a> · <a href="/">Town</a></p>
        <p className="note">Antonio&apos;s chat route used Clerk, Neon, and Polar. This session list is SQLite on the gateway. Plan can read and list. Build can write inside the session folder. Bash is off. Gemini stays off until a spend cap is set, and this build still does not call it.</p>
        <p className="note">Say <code>list</code>, <code>read notes/page.txt</code>, or <code>write notes/page.txt hello</code>.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="primary" onClick={() => { void start(); }}>New session</button>
          {sessions.map((session) => (
            <button type="button" key={session.id} onClick={() => { void open(session.id); }}>{session.title}</button>
          ))}
        </div>
        {current && (
          <>
            <label>
              Mode
              <select value={mode} onChange={(event) => setMode(event.target.value === 'build' ? 'build' : 'plan')}>
                <option value="plan">Plan</option>
                <option value="build">Build</option>
              </select>
            </label>
            <ol style={{ paddingLeft: 18 }}>
              {current.messages.map((message) => (
                <li key={message.id}><strong>{message.role}</strong> {message.tool ? `(${message.tool}) ` : ''}{message.body}</li>
              ))}
            </ol>
            <p className="note">Files: {current.files.length ? current.files.join(', ') : 'none yet'}</p>
            <form onSubmit={(event) => { void send(event); }} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input value={text} onChange={(event) => setText(event.target.value)} aria-label="NightCode message" style={{ flex: '1 1 240px', fontSize: 16 }} />
              <button type="submit" className="primary">Send</button>
            </form>
          </>
        )}
        <p role="status">{note}</p>
      </div>
    </main>
  );
}

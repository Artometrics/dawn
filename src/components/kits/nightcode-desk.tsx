'use client';

import { useEffect, useState } from 'react';

type Message = { id: string; role: 'user' | 'assistant'; body: string; tool: string };
type Session = {
  id: string;
  title: string;
  mode: 'plan' | 'build';
  messages: Message[];
  files: string[];
  tools?: string[];
  prompt?: string;
  reason?: string;
};

export function NightcodeDesk() {
  const [sessions, setSessions] = useState<{ id: string; title: string; mode: 'plan' | 'build' }[]>([]);
  const [current, setCurrent] = useState<Session | null>(null);
  const [mode, setMode] = useState<'plan' | 'build'>('plan');
  const [text, setText] = useState('list');
  const [query, setQuery] = useState('');
  const [dialog, setDialog] = useState(false);
  const [note, setNote] = useState('Sign in, then start a session. Press Tab to switch mode. Gemini is off.');

  async function loadList(search = query) {
    const response = await fetch(`/api/kits/nightcode/sessions?q=${encodeURIComponent(search)}`, { credentials: 'include', redirect: 'manual' });
    if (response.type === 'opaqueredirect' || response.status === 401) {
      setNote('Google sign-in is in front of this host. Open /oauth2/start, then return here.');
      return;
    }
    if (!response.ok) {
      setNote('The gateway is not answering on this origin.');
      return;
    }
    const data = await response.json() as { sessions: { id: string; title: string; mode: 'plan' | 'build' }[]; reason?: string };
    setSessions(data.sessions);
    if (data.reason) setNote(data.reason);
  }

  useEffect(() => { void loadList(''); }, []);

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
    setMode(data.mode);
    setDialog(false);
    void loadList(query);
  }

  async function open(id: string) {
    const response = await fetch(`/api/kits/nightcode/sessions/${id}`, { credentials: 'include', redirect: 'manual' });
    if (!response.ok) return;
    const data = await response.json() as Session;
    setCurrent(data);
    setMode(data.mode);
    setDialog(false);
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
    const data = await response.json() as Session & { error?: string };
    if (!response.ok) {
      setNote(data.error || 'The turn stopped.');
      return;
    }
    setCurrent(data);
    setNote(data.reason || 'Turn stored. The tool list followed the mode. No model was called.');
  }

  const border = mode === 'plan' ? '#c4b5fd' : '#34d399';

  return (
    <main className="dawn-agents" style={{ minHeight: '100dvh', padding: '20px 16px 32px' }}>
      <div style={{ width: 'min(960px, 100%)', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p className="word">DAWN</p>
        <h1>NightCode</h1>
        <p><a href="/kits">All kits</a> · <a href="/">Town</a></p>
        <p className="note">Plan mode only offers readFile, listDirectory, glob, and grep. Build mode adds writeFile, editFile, and bash. The process also refuses a plan-mode write. Press Tab in the input to toggle. Sessions open from a search dialog, not a chat sidebar.</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="primary" onClick={() => { void start(); }}>New session</button>
          <button type="button" onClick={() => { setDialog(true); void loadList(query); }}>Sessions</button>
        </div>
        {dialog && (
          <div role="dialog" aria-label="Sessions" style={{ border: '1px solid #444', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input value={query} onChange={(event) => { setQuery(event.target.value); void loadList(event.target.value); }} aria-label="Search sessions" placeholder="Search sessions" style={{ fontSize: 16 }} />
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {sessions.map((session) => (
                <li key={session.id}><button type="button" onClick={() => { void open(session.id); }}>{session.title} · {session.mode}</button></li>
              ))}
            </ul>
            <button type="button" onClick={() => setDialog(false)}>Close</button>
          </div>
        )}
        {current && (
          <>
            <p role="status" style={{ margin: 0 }}>Mode {mode} · model mock · tools {current.tools?.join(', ')}</p>
            <p className="note">{current.prompt}</p>
            <ol style={{ paddingLeft: 18 }}>
              {current.messages.map((message) => (
                <li key={message.id}><strong>{message.role}</strong> {message.tool ? `(${message.tool}) ` : ''}{message.body}</li>
              ))}
            </ol>
            <p className="note">Files restored with the session: {current.files.length ? current.files.join(', ') : 'none yet'}</p>
            <form onSubmit={(event) => { void send(event); }} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input
                value={text}
                onChange={(event) => setText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Tab') {
                    event.preventDefault();
                    setMode((currentMode) => currentMode === 'plan' ? 'build' : 'plan');
                  }
                }}
                aria-label="NightCode message"
                style={{ flex: '1 1 240px', fontSize: 16, border: `2px solid ${border}`, borderRadius: 8, padding: 8 }}
              />
              <button type="submit" className="primary">Send</button>
            </form>
          </>
        )}
        <p role="status">{note}</p>
      </div>
    </main>
  );
}

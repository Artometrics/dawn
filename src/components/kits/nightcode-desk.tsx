'use client';

import { useEffect, useState } from 'react';
import { Bubble, Composer } from '@/components/shell/composer';
import { useModelPicker } from '@/components/shell/model-picker';
import { DeskGate } from '@/components/shell/status-card';
import { PageShell } from '@/components/site/page-shell';
import { jsonInit, kitCall, type KitResult } from '@/lib/site/kit-client';

type Message = { id: string; role: 'user' | 'assistant'; body: string; tool: string };
type Mode = 'plan' | 'build';
type Session = { id: string; title: string; mode: Mode; messages: Message[]; files: string[]; model?: string; reason?: string };
type SessionSummary = { id: string; title: string; mode: Mode };
type SessionList = { sessions: SessionSummary[]; reason?: string };

export function NightcodeDesk() {
  const picker = useModelPicker();
  const [desk, setDesk] = useState<'loading' | 'ready' | 'offline' | 'signin'>('loading');
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [current, setCurrent] = useState<Session | null>(null);
  const [mode, setMode] = useState<Mode>('plan');
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [dialog, setDialog] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [fixture, setFixture] = useState('');

  function applyList(result: KitResult<SessionList>) {
    if (result.status === 'ok') {
      setDesk('ready');
      setSessions(result.data.sessions ?? []);
      setFixture(result.data.reason ?? '');
    } else if (result.status === 'offline') setDesk('offline');
    else if (result.status === 'closed') setDesk('signin');
    else setNote(result.message);
  }

  async function loadList(search: string) {
    applyList(await kitCall<SessionList>(`/api/kits/nightcode/sessions?q=${encodeURIComponent(search)}`));
  }

  useEffect(() => {
    void kitCall<SessionList>('/api/kits/nightcode/sessions?q=').then(applyList);
  }, []);

  function show(session: Session) {
    setCurrent(session);
    setMode(session.mode);
    setFixture(session.reason ?? '');
  }

  async function start() {
    const result = await kitCall<Session>('/api/kits/nightcode/sessions', jsonInit({}));
    if (result.status !== 'ok') {
      setNote(result.status === 'error' ? result.message : 'Could not start a session.');
      return;
    }
    show(result.data);
    setNote('');
    setDialog(false);
    void loadList(query);
  }

  async function open(id: string) {
    const result = await kitCall<Session>(`/api/kits/nightcode/sessions/${id}`);
    if (result.status !== 'ok') return;
    show(result.data);
    setDialog(false);
  }

  async function send() {
    if (!current) return;
    setBusy(true);
    const result = await kitCall<Session>(`/api/kits/nightcode/sessions/${current.id}/messages`, jsonInit({ text, mode, model: picker.choice }));
    setBusy(false);
    if (result.status !== 'ok') {
      setNote(result.status === 'error' ? result.message : 'The message did not send.');
      return;
    }
    show(result.data);
    setText('');
    setNote('');
  }

  const ready = desk === 'ready';

  return (
    <PageShell title="NightCode" lead="Plan with read-only tools, or switch to build to change files.">
      <DeskGate status={desk} offline="Offline preview. Open live Dawn to start a session and chat." />
      {ready && (
        <div className="dw-actions">
          <button type="button" className="dw-btn dw-btn--primary" onClick={() => { void start(); }}>New session</button>
          <button type="button" className="dw-btn" onClick={() => { setDialog(true); void loadList(query); }}>Sessions</button>
        </div>
      )}
      {dialog && (
        <div role="dialog" aria-label="Sessions" className="dw-card dw-form">
          <input className="dw-field" value={query} onChange={(event) => { setQuery(event.target.value); void loadList(event.target.value); }} aria-label="Search sessions" placeholder="Search sessions" />
          <ul className="dw-list">
            {sessions.length === 0 && <li className="dw-note">No sessions yet.</li>}
            {sessions.map((session) => (
              <li key={session.id}><button type="button" className="dw-row" onClick={() => { void open(session.id); }}>{session.title} · {session.mode}</button></li>
            ))}
          </ul>
          <button type="button" className="dw-btn" onClick={() => setDialog(false)}>Close</button>
        </div>
      )}
      {ready && current && (
        <>
          <ol className="bb-list">
            {current.messages.map((message) => (
              <Bubble key={message.id} who={message.role === 'user' ? 'you' : 'bot'} name={message.role === 'user' ? 'You' : 'NightCode'}>{message.body}</Bubble>
            ))}
          </ol>
          <Composer
            value={text}
            onChange={setText}
            onSubmit={() => { void send(); }}
            label="NightCode message"
            placeholder={mode === 'plan' ? 'Ask, or type list, read, grep' : 'Ask, or type write, edit, bash'}
            picker={picker}
            busy={busy}
            onKeyDown={(event) => {
              if (event.key === 'Tab') {
                event.preventDefault();
                setMode((value) => (value === 'plan' ? 'build' : 'plan'));
              }
            }}
            extra={
              <button type="button" className="dw-btn dw-btn--chip" aria-pressed={mode === 'build'} onClick={() => setMode((value) => (value === 'plan' ? 'build' : 'plan'))}>
                {mode === 'plan' ? 'Plan' : 'Build'}
              </button>
            }
          />
          {current.files.length > 0 && <p className="dw-note">Files: {current.files.join(', ')}</p>}
        </>
      )}
      {ready && fixture && <p className="dw-note">{fixture}</p>}
      {note && <p className="dw-alert" role="status">{note}</p>}
    </PageShell>
  );
}

'use client';

import { useState } from 'react';
import { PageShell } from '@/components/site/page-shell';

type Line = { id: string; speaker: string; body: string; handoffTo: string };
type Room = { id: string; active: string; messages: Line[]; teammates: { id: string; name: string }[] };

export function TeammatesDesk() {
  const [room, setRoom] = useState<Room | null>(null);
  const [text, setText] = useState('Write the note');
  const [note, setNote] = useState('Sign in, then open a group chat. Replies are mock. Nothing is sent.');

  async function start() {
    const response = await fetch('/api/kits/teammates/rooms', {
      method: 'POST',
      credentials: 'include',
      redirect: 'manual',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    if (response.type === 'opaqueredirect' || response.status === 401) {
      setNote('Google sign-in is in front of this host. Open /oauth2/start, then return here.');
      return;
    }
    if (!response.ok) {
      setNote('The gateway is not answering on this origin.');
      return;
    }
    setRoom(await response.json() as Room);
  }

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (!room) return;
    const response = await fetch(`/api/kits/teammates/rooms/${room.id}/messages`, {
      method: 'POST',
      credentials: 'include',
      redirect: 'manual',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    const data = await response.json() as Room & { error?: string };
    if (!response.ok) {
      setNote(data.error || 'The turn stopped.');
      return;
    }
    setRoom(data);
    setNote('Stored on the gateway. No model was called.');
  }

  return (
    <PageShell
      title="AI Teammates"
      current="/kits"
      lead={<>Adapted from Antonio&apos;s handoff tool. Clerk, Neon, Trigger.dev, and Daytona are not used. Builder starts. Hand the turn to Reviewer with the button or with <code>handoff reviewer your note</code>.</>}
    >
      <div className="dw-actions">
        <a className="dw-btn dw-btn--chip" href="/kits">All kits</a>
        <button type="button" className="dw-btn dw-btn--primary" onClick={() => { void start(); }}>New group chat</button>
      </div>
      {room && (
        <>
          <p className="dw-alert" role="status">Speaking: {room.active}</p>
          <ol className="dw-list">
            {room.messages.map((line) => (
              <li key={line.id} className="dw-card dw-card--stone"><strong>{line.speaker}</strong> {line.handoffTo ? `(handoff ${line.handoffTo}) ` : ''}{line.body}</li>
            ))}
          </ol>
          <form className="dw-actions" onSubmit={(event) => { void send(event); }}>
            <input className="dw-field" value={text} onChange={(event) => setText(event.target.value)} aria-label="Message the team" style={{ flex: '1 1 240px' }} />
            <button type="submit" className="dw-btn dw-btn--primary">Send</button>
            <button type="button" className="dw-btn" onClick={() => { setText('handoff reviewer Check the note'); }}>Hand to Reviewer</button>
            <button type="button" className="dw-btn" onClick={() => { setText('handoff builder Your turn'); }}>Hand to Builder</button>
          </form>
        </>
      )}
      <p className="dw-alert" role="status">{note}</p>
    </PageShell>
  );
}

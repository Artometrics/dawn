'use client';

import { useState } from 'react';

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
    <main className="dawn-agents" style={{ minHeight: '100dvh', padding: '20px 16px 32px' }}>
      <div style={{ width: 'min(720px, 100%)', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p className="word">DAWN</p>
        <h1>AI Teammates</h1>
        <p><a href="/kits">All kits</a> · <a href="/">Town</a></p>
        <p className="note">Adapted from Antonio&apos;s handoff tool. Clerk, Neon, Trigger.dev, and Daytona are not used. Builder starts. Hand the turn to Reviewer with the button or with <code>handoff reviewer your note</code>.</p>
        <button type="button" className="primary" onClick={() => { void start(); }}>New group chat</button>
        {room && (
          <>
            <p role="status">Speaking: {room.active}</p>
            <ol style={{ paddingLeft: 18 }}>
              {room.messages.map((line) => (
                <li key={line.id}><strong>{line.speaker}</strong> {line.handoffTo ? `(handoff ${line.handoffTo}) ` : ''}{line.body}</li>
              ))}
            </ol>
            <form onSubmit={(event) => { void send(event); }} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input value={text} onChange={(event) => setText(event.target.value)} aria-label="Message the team" style={{ flex: '1 1 220px', fontSize: 16 }} />
              <button type="submit" className="primary">Send</button>
              <button type="button" onClick={() => { setText('handoff reviewer Check the note'); }}>Hand to Reviewer</button>
              <button type="button" onClick={() => { setText('handoff builder Your turn'); }}>Hand to Builder</button>
            </form>
          </>
        )}
        <p role="status">{note}</p>
      </div>
    </main>
  );
}

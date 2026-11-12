'use client';

import { useEffect, useState } from 'react';
import { Bubble, Composer } from '@/components/shell/composer';
import { useModelPicker } from '@/components/shell/model-picker';
import { DeskGate } from '@/components/shell/status-card';
import { PageShell } from '@/components/site/page-shell';
import { jsonInit, kitCall } from '@/lib/site/kit-client';

type Line = { id: string; speaker: string; body: string; handoffTo: string };
type Room = { id: string; active: string; messages: Line[]; teammates: { id: string; name: string }[]; reason?: string };

const speakerName = (room: Room, id: string) => (id === 'you' ? 'You' : room.teammates.find((item) => item.id === id)?.name ?? id);

export function TeammatesDesk() {
  const picker = useModelPicker();
  const [desk, setDesk] = useState<'loading' | 'ready' | 'offline' | 'signin'>('loading');
  const [room, setRoom] = useState<Room | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    void kitCall<unknown>('/api/kits').then((result) => {
      setDesk(result.status === 'ok' ? 'ready' : result.status === 'closed' ? 'signin' : 'offline');
    });
  }, []);

  async function start() {
    const result = await kitCall<Room>('/api/kits/teammates/rooms', jsonInit({}));
    if (result.status !== 'ok') {
      setNote(result.status === 'error' ? result.message : 'Could not start a chat.');
      return;
    }
    setRoom(result.data);
    setNote('');
  }

  async function send() {
    if (!room) return;
    setBusy(true);
    const result = await kitCall<Room>(`/api/kits/teammates/rooms/${room.id}/messages`, jsonInit({ text, model: picker.choice }));
    setBusy(false);
    if (result.status !== 'ok') {
      setNote(result.status === 'error' ? result.message : 'The message did not send.');
      return;
    }
    setRoom(result.data);
    setText('');
    setNote('');
  }

  const other = room ? room.teammates.find((item) => item.id !== room.active) : undefined;

  return (
    <PageShell title="Teammates" lead="Builder and Reviewer share one chat. Hand the turn on when you want a second look.">
      <DeskGate status={desk} offline="Offline preview. Open live Dawn to start a chat." />
      {desk === 'ready' && (
        <div className="dw-actions">
          <button type="button" className="dw-btn dw-btn--primary" onClick={() => { void start(); }}>New chat</button>
        </div>
      )}
      {desk === 'ready' && room && (
        <>
          <ol className="bb-list">
            {room.messages.map((line) => (
              <Bubble key={line.id} who={line.speaker === 'you' ? 'you' : 'bot'} name={speakerName(room, line.speaker)}>
                {line.handoffTo ? `Hand-off to ${speakerName(room, line.handoffTo)}. ` : ''}{line.body}
              </Bubble>
            ))}
          </ol>
          <Composer
            value={text}
            onChange={setText}
            onSubmit={() => { void send(); }}
            label="Message the team"
            placeholder={`${speakerName(room, room.active)} is up`}
            picker={picker}
            busy={busy}
            extra={other && (
              <button type="button" className="dw-btn dw-btn--chip" onClick={() => setText(`handoff ${other.id} `)}>
                Hand to {other.name}
              </button>
            )}
          />
        </>
      )}
      {note && <p className="dw-alert" role="status">{note}</p>}
    </PageShell>
  );
}

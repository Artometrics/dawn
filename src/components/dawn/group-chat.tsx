'use client';

import { useEffect, useState, type FormEvent } from 'react';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { agentById } from '@/lib/agents';
import { bootFirebase } from '@/lib/firebase-client';
import { useDawn } from '@/components/dawn/dawn-provider';

type ChatMessage = {
  id: string;
  name: string;
  text: string;
  via?: string;
  uid: string;
};

export function GroupChat() {
  const { user, name, mode } = useDawn();
  const [room, setRoom] = useState('hq');
  const [joined, setJoined] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [people, setPeople] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!joined || !user) return;
    let stopMessages = () => {};
    let stopMembers = () => {};
    let dead = false;
    void bootFirebase().then((boot) => {
      if (dead || !boot.db) return;
      const messagesQuery = query(
        collection(boot.db, 'rooms', joined, 'messages'),
        orderBy('createdAt', 'asc'),
      );
      stopMessages = onSnapshot(messagesQuery, (snap) => {
        setMessages(snap.docs.map((item) => {
          const data = item.data() as { name?: string; text?: string; via?: string; uid?: string };
          return {
            id: item.id,
            name: data.name || 'Someone',
            text: data.text || '',
            via: data.via,
            uid: data.uid || '',
          };
        }));
      }, () => setError('Could not read the room.'));
      stopMembers = onSnapshot(collection(boot.db, 'rooms', joined, 'members'), (snap) => {
        setPeople(snap.docs.map((item) => String(item.data().name || 'Someone')));
      });
    });
    return () => {
      dead = true;
      stopMessages();
      stopMembers();
    };
  }, [joined, user]);

  async function join(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!user) {
      setError('Sign in to join a room.');
      return;
    }
    const roomId = room.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '').slice(0, 24);
    if (roomId.length < 2) {
      setError('Use 2 or more letters.');
      return;
    }
    const boot = await bootFirebase();
    if (!boot.db) {
      setError(mode === 'emulator' ? 'Start the local Firebase emulators.' : 'Sign-in needs the Firebase host.');
      return;
    }
    try {
      await setDoc(doc(boot.db, 'rooms', roomId), {
        title: roomId,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      });
    } catch {
      // Someone already created this room.
    }
    try {
      await setDoc(doc(boot.db, 'rooms', roomId, 'members', user.uid), {
        name: name.slice(0, 40) || 'You',
        joinedAt: serverTimestamp(),
      });
      setRoom(roomId);
      setJoined(roomId);
    } catch {
      setError('Could not join that room.');
    }
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !joined || !user) return;
    const boot = await bootFirebase();
    if (!boot.db) return;
    setDraft('');
    try {
      await addDoc(collection(boot.db, 'rooms', joined, 'messages'), {
        uid: user.uid,
        name: name.slice(0, 40) || 'You',
        text: text.slice(0, 200),
        createdAt: serverTimestamp(),
      });
    } catch {
      setError('The room refused that message.');
    }
  }

  if (!user) {
    return <p className="text-sm text-[#d9cbb8]">Sign in, then join a room. Another signed-in person can use the same room name.</p>;
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <form className="flex gap-2" onSubmit={(event) => void join(event)}>
        <label className="sr-only" htmlFor="room-name">Room</label>
        <input
          id="room-name"
          value={room}
          onChange={(event) => setRoom(event.target.value)}
          className="min-h-11 flex-1 border border-[#5a4636] bg-[#1c1410] px-3 text-base"
        />
        <button type="submit" className="min-h-11 border border-[#e2a04a] px-3 text-sm">{joined ? 'Switch' : 'Join'}</button>
      </form>
      {people.length > 0 && <p className="text-xs text-[#d9cbb8]">Here: {people.join(', ')}</p>}
      {error && <p className="text-xs text-[#e2a04a]">{error}</p>}
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
        {joined && messages.length === 0 && <p className="text-sm text-[#d9cbb8]">No one has spoken.</p>}
        {messages.map((message) => {
          const via = message.via ? agentById(message.via) : undefined;
          return (
            <article key={message.id} className="border border-[#5a4636] p-2 text-sm">
              <p className="text-xs text-[#e2a04a]">{via ? `${via.name} · ok by ${message.name}` : message.name}</p>
              <p className="mt-1">{message.text}</p>
            </article>
          );
        })}
      </div>
      {joined && (
        <form className="flex gap-2" onSubmit={(event) => void send(event)}>
          <label className="sr-only" htmlFor="room-draft">Message</label>
          <input
            id="room-draft"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Say something"
            className="min-h-11 flex-1 border border-[#5a4636] bg-[#1c1410] px-3 text-base"
          />
          <button type="submit" disabled={!draft.trim()} className="min-h-11 border border-[#e2a04a] px-3 text-sm disabled:opacity-40">Send</button>
        </form>
      )}
      <p className="text-xs text-[#d9cbb8]">Your words go out when you tap Send. Agents wait for Approve.</p>
    </div>
  );
}

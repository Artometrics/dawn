'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { googleSignInHref, type Thread } from '@/components/dawn-agents/api';
import { ChatWallpaper } from '@/components/dawn-agents/chat-wallpaper';
import { townAction, type DeskStatus } from '@/lib/home/town-action';

export type TownBot = {
  id: string;
  name: string;
  src: string;
  href: string;
};

export type SavedLine = {
  threadId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
};

/**
 * Saved desk messages for this bot, plus the village room.
 * Nothing typed here is stored, and nothing is sent to a model.
 */
export function BotTalk({
  bot,
  desk,
  threads,
  messages,
  onBack,
}: {
  bot: TownBot;
  desk: DeskStatus;
  threads: Thread[];
  messages: SavedLine[];
  onBack: () => void;
}) {
  const [draft, setDraft] = useState('');
  const [localNote, setLocalNote] = useState<string | null>(null);
  const note = localNote ?? deskNote(desk);
  const place = townAction(bot.href, desk);
  useEffect(() => {
    setLocalNote(null);
    setDraft('');
  }, [bot.id]);
  const mine = threads.filter((thread) => thread.title.trim().toLowerCase() === bot.name.trim().toLowerCase());
  const ids = new Set(mine.map((thread) => thread.id));
  const saved = messages
    .filter((message) => ids.has(message.threadId) && message.content.trim())
    .slice()
    .sort((a, b) => a.createdAt - b.createdAt);

  return (
    <div className="ph-talk" role="dialog" aria-label={`${bot.name} conversation`}>
      <ChatWallpaper scene="town" />
      <header className="ph-talk-top">
        <button type="button" className="ph-talk-back" onClick={onBack}>
          <ChevronLeft aria-hidden />
          Back
        </button>
        <img src={bot.src} alt="" width={36} height={36} />
        <div className="ph-talk-who">
          <strong>{bot.name}</strong>
          {place.kind === 'navigate' ? (
            <a href={place.href}>Open the workspace</a>
          ) : (
            <button type="button" onClick={() => setLocalNote(place.reason)}>Desk is not running</button>
          )}
        </div>
      </header>
      <div className="ph-talk-scroll">
        <p className="ph-talk-note" role="status">{note}</p>
        {desk === 'signin' && <a className="ph-talk-link" href={googleSignInHref()}>Sign in with Google</a>}
        <a className="ph-talk-link" href="/village?section=library">Village history</a>
        {saved.length === 0 && <p className="ph-talk-note">No saved messages for {bot.name}.</p>}
        {saved.map((line) => (
          <p key={`${line.threadId}-${line.createdAt}-${line.role}`} className={line.role === 'user' ? 'ph-talk-me' : 'ph-talk-them'}>
            {line.content}
          </p>
        ))}
      </div>
      <form
        className="ph-talk-compose"
        onSubmit={(event) => {
          event.preventDefault();
          if (!draft.trim()) return;
          setDraft('');
          setLocalNote('Not sent. This box is not a saved thread.');
        }}
      >
        <label className="sr-only" htmlFor="bot-draft">Message {bot.name}</label>
        <input
          id="bot-draft"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={`Message ${bot.name}`}
          autoComplete="off"
        />
        <button type="submit" disabled={!draft.trim()}>Send</button>
      </form>
    </div>
  );
}

function deskNote(desk: DeskStatus): string {
  if (desk === 'ready') return 'Saved messages come from the desk. This page does not call a model.';
  if (desk === 'signin') return 'Saved threads are behind Google sign-in.';
  return 'The desk is not running on this host, so its history is not loaded.';
}

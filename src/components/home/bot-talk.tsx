'use client';

import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import type { SavedLine } from '@/components/home/bot-talk-types';

export type { SavedLine } from '@/components/home/bot-talk-types';

export type TownBot = {
  id: string;
  name: string;
  src: string;
  href: string;
};

/**
 * iMessage-style preview for one town person.
 * Lines typed here are a labelled preview. Saved desk rows, when the desk
 * actually returned them, stay separate and are not rewritten.
 */
export function BotTalk({
  bot,
  people,
  preview,
  saved,
  onOpen,
  onPreview,
  onBack,
}: {
  bot: TownBot;
  people: TownBot[];
  preview: string[];
  saved: SavedLine[];
  onOpen: (id: string) => void;
  onPreview: (text: string) => void;
  onBack: () => void;
}) {
  const [draft, setDraft] = useState('');
  return (
    <div className="ph-im" role="dialog" aria-label={`${bot.name} preview`}>
      <header className="ph-im-top">
        <button type="button" className="ph-im-back" onClick={onBack}>
          <ChevronLeft aria-hidden />
          Town
        </button>
        <img src={bot.src} alt="" width={36} height={36} />
        <div className="ph-im-who">
          <strong>{bot.name}</strong>
          <span>Preview. Not a saved chat.</span>
        </div>
      </header>
      <div className="ph-im-people" aria-label="People">
        {people.map((person) => (
          <button
            key={person.id}
            type="button"
            aria-pressed={person.id === bot.id}
            onClick={() => onOpen(person.id)}
          >
            <img src={person.src} alt="" width={28} height={28} />
            {person.name}
          </button>
        ))}
      </div>
      <div className="ph-im-scroll">
        {saved.length > 0 && <p className="ph-im-label">Saved on the desk</p>}
        {saved.map((line) => (
          <p key={`${line.threadId}-${line.createdAt}-${line.role}`} className={line.role === 'user' ? 'ph-im-me' : 'ph-im-them'}>
            {line.content}
          </p>
        ))}
        <p className="ph-im-label">Preview for this visit</p>
        {preview.length === 0 && <p className="ph-im-empty">No preview lines yet.</p>}
        {preview.map((line, index) => (
          <p key={`${index}-${line.slice(0, 12)}`} className="ph-im-me">{line}</p>
        ))}
      </div>
      <form
        className="ph-im-compose"
        onSubmit={(event) => {
          event.preventDefault();
          const text = draft.trim();
          if (!text) return;
          setDraft('');
          onPreview(text);
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

'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { ChatWallpaper } from '@/components/dawn-agents/chat-wallpaper';
import { townAction, type DeskStatus } from '@/lib/home/town-action';

export type TownBot = {
  id: string;
  name: string;
  src: string;
  href: string;
};

const DRAFT_KEY = 'dawn-bot-draft';

/**
 * The approved pixel chat, one thread per town bot.
 * Typing stays in this browser. Nothing here calls Gemini, OpenRouter, or the gateway.
 */
export function BotTalk({
  bot,
  desk,
  onBack,
}: {
  bot: TownBot;
  desk: DeskStatus;
  onBack: () => void;
}) {
  const [lines, setLines] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [note, setNote] = useState('No reply is connected. This page does not call a model.');
  const place = townAction(bot.href, desk);

  useEffect(() => {
    setLines(readDrafts()[bot.id] ?? []);
    setDraft('');
    setNote('No reply is connected. This page does not call a model.');
  }, [bot.id]);

  function keep(text: string) {
    const next = [...lines, text].slice(-40);
    setLines(next);
    const saved = readDrafts();
    saved[bot.id] = next;
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(saved));
    } catch {
      // The lines still show for this visit.
    }
    setNote('Kept in this browser only. Nothing was sent.');
  }

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
            <button type="button" onClick={() => setNote(place.reason)}>Desk is not running</button>
          )}
        </div>
      </header>
      <div className="ph-talk-scroll">
        <p className="ph-talk-note" role="status">{note}</p>
        {lines.map((line, index) => (
          <p key={`${index}-${line.slice(0, 12)}`} className="ph-talk-me">{line}</p>
        ))}
      </div>
      <form
        className="ph-talk-compose"
        onSubmit={(event) => {
          event.preventDefault();
          const text = draft.trim();
          if (!text) return;
          setDraft('');
          keep(text);
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

function readDrafts(): Record<string, string[]> {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as Record<string, string[]>;
  } catch {
    return {};
  }
}

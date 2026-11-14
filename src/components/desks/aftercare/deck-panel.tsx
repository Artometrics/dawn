'use client';

import { useMemo, useState } from 'react';
import { DECK, SUITS, SUIT_BLURB, cardTitle, neighbours } from '@/lib/aftercare/deck';
import type { Card, Suit } from '@/lib/aftercare/types';
import { DeskSwitch } from '../switch';
import { CardFace } from './card-face';

const FILTERS = [
  { id: 'all', label: 'All 78' },
  { id: 'major', label: 'Major' },
  { id: 'wands', label: 'Wands' },
  { id: 'cups', label: 'Cups' },
  { id: 'swords', label: 'Swords' },
  { id: 'pentacles', label: 'Pentacles' },
];

export function DeckPanel() {
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>('the-fool');
  const cards = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DECK.filter((card) => {
      if (filter === 'major' && card.arcana !== 'major') return false;
      if (SUITS.includes(filter as Suit) && card.suit !== filter) return false;
      if (!q) return true;
      return card.name.toLowerCase().includes(q) || card.keywords.some((word) => word.toLowerCase().includes(q));
    });
  }, [filter, query]);
  const selected = DECK.find((card) => card.id === selectedId) ?? cards[0] ?? null;
  const beside = selected ? neighbours(selected.id) : null;

  return (
    <div className="ac-deck-layout">
      <div className="desk-stage">
        <DeskSwitch label="Arcana" views={FILTERS} current={filter} onChange={setFilter} />
        {SUITS.includes(filter as Suit) ? <p className="dw-note">{SUIT_BLURB[filter as Suit]}</p> : null}
        <label className="dw-label">
          Find a card
          <input className="dw-field" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name or keyword" />
        </label>
        <div className="ac-deck">
          {cards.map((card) => (
            <button key={card.id} type="button" className="ac-deck-btn" aria-pressed={selected?.id === card.id} onClick={() => setSelectedId(card.id)}>
              <CardFace card={card} uid={`deck-${card.id}`} />
              <span>{card.name}</span>
            </button>
          ))}
        </div>
        {cards.length === 0 ? <p className="dw-note">No card matches that.</p> : null}
      </div>
      {selected ? <CardDetail card={selected} onPick={setSelectedId} prev={beside?.prev} next={beside?.next} /> : null}
    </div>
  );
}

function CardDetail({ card, onPick, prev, next }: { card: Card; onPick: (id: string) => void; prev?: Card; next?: Card }) {
  return (
    <article className="dw-card ac-detail">
      <CardFace card={card} uid={`detail-${card.id}`} />
      <div>
        <p className="dw-card-title">{cardTitle(card)}</p>
        <p className="dw-note">{card.arcana === 'major' ? 'Major arcana' : card.suit} · {card.element}</p>
        <p>{card.keywords.join(' · ')}</p>
        <p><strong>Upright.</strong> {card.upright}</p>
        <p><strong>Reversed.</strong> {card.reversed}</p>
        <p className="dw-note">{card.reflect}</p>
        <div className="dw-actions">
          {prev ? <button type="button" className="dw-btn" onClick={() => onPick(prev.id)}>{prev.name}</button> : null}
          {next ? <button type="button" className="dw-btn" onClick={() => onPick(next.id)}>{next.name}</button> : null}
        </div>
      </div>
    </article>
  );
}

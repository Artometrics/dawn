'use client';

import { useEffect, useRef, useState } from 'react';
import { openLibraryCover } from '@/lib/books/library';
import type { Book } from '@/lib/books/match';
import { drawReading, type Reading } from '@/lib/books/tarot';
import { BookCover } from './books-cards';

export function BooksOracle({
  saved,
  onSave,
  onCapsule,
}: {
  saved: (id: string) => boolean;
  onSave: (id: string) => void;
  onCapsule: (book: Book) => void;
}) {
  const [reading, setReading] = useState<Reading>(() => drawReading());
  const [flipped, setFlipped] = useState<[boolean, boolean, boolean]>([false, false, false]);
  const timers = useRef<number[]>([]);

  useEffect(() => () => {
    timers.current.forEach((id) => window.clearTimeout(id));
  }, []);

  function clearTimers() {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  }

  function shuffle() {
    clearTimers();
    const next = drawReading();
    setReading(next);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setFlipped([true, true, true]);
      return;
    }
    setFlipped([false, false, false]);
    timers.current = [
      window.setTimeout(() => setFlipped([true, false, false]), 280),
      window.setTimeout(() => setFlipped([true, true, false]), 700),
      window.setTimeout(() => setFlipped([true, true, true]), 1120),
    ];
  }

  function turn(index: 0 | 1 | 2) {
    clearTimers();
    setFlipped((current) => {
      const next: [boolean, boolean, boolean] = [...current];
      next[index] = !next[index];
      return next;
    });
  }

  const revealed = flipped.every(Boolean);
  const faces = [
    {
      label: 'Querent',
      role: 'Who is reading',
      body: (
        <>
          <p className="books-numeral">{reading.querent.numeral}</p>
          <p className="books-glyph" aria-hidden="true">{reading.querent.symbol}</p>
          <p className="books-name">{reading.querent.name}</p>
          <p className="dw-note">{reading.querent.tagline}</p>
          <p>{reading.querent.meaning}</p>
        </>
      ),
    },
    {
      label: 'Crucible',
      role: 'The path',
      body: (
        <>
          <p className="books-numeral">{reading.crucible.numeral}</p>
          <p className="books-glyph" aria-hidden="true">{reading.crucible.symbol}</p>
          <p className="books-name">{reading.crucible.name}</p>
          <p className="dw-note">{reading.crucible.tagline}</p>
          <p>{reading.crucible.meaning}</p>
        </>
      ),
    },
    {
      label: 'Grimoire',
      role: 'The book',
      body: (
        <>
          <p className="books-numeral">III</p>
          <BookCover large src={openLibraryCover(reading.book.isbn, 'L')} title={reading.book.title} />
          <p className="books-name">{reading.book.title}</p>
          <p className="dw-note">by {reading.book.author}</p>
          <p className="books-quote">{reading.book.destinyText}</p>
        </>
      ),
    },
  ];

  return (
    <div className="books-view">
      <div className="books-intro">
        <p className="dw-eyebrow">Literary tarot</p>
        <h2>Three cards</h2>
        <p className="dw-note">Who is reading, what kind of story, and the book that fits. This oracle is not the Aftercare deck.</p>
      </div>
      <div className="dw-actions">
        <button type="button" className="dw-btn dw-btn--primary" onClick={shuffle}>Shuffle and draw</button>
        <button type="button" className="dw-btn" onClick={() => { clearTimers(); setFlipped([false, false, false]); }} disabled={!flipped.some(Boolean)}>
          Turn face down
        </button>
      </div>
      <div className="books-spread">
        {faces.map((face, index) => {
          const up = flipped[index];
          return (
            <div key={face.label} className="books-slot">
              <p className="books-numeral">{face.label}</p>
              <p className="dw-note">{face.role}</p>
              <div className={up ? 'books-flip is-flipped' : 'books-flip'}>
                <button
                  type="button"
                  className="books-flip-btn"
                  aria-pressed={up}
                  onClick={() => turn(index as 0 | 1 | 2)}
                >
                  <span className="books-flip-inner">
                    <span className="books-face books-face--back" aria-hidden={up || undefined}>
                      <p className="books-numeral">{face.label}</p>
                      <p className="books-name">Face down</p>
                      <p className="dw-note">Turn the card</p>
                    </span>
                    <span className="books-face books-face--front" aria-hidden={!up || undefined}>{face.body}</span>
                  </span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div aria-live="polite">
        {revealed ? (
          <article className="dw-card">
            <p className="dw-eyebrow">The reading</p>
            <h3 className="books-name">{reading.querent.name} in {reading.crucible.name}</h3>
            <p>{reading.sentence}</p>
            <div className="dw-actions">
              <button type="button" className="dw-btn" onClick={() => onCapsule(reading.book)}>Study capsule</button>
              <button type="button" className="dw-btn" aria-pressed={saved(reading.book.id)} onClick={() => onSave(reading.book.id)}>
                {saved(reading.book.id) ? 'On shelf' : 'Save'}
              </button>
            </div>
          </article>
        ) : null}
      </div>
    </div>
  );
}

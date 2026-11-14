'use client';

import { useState } from 'react';
import { genreLabel, openLibraryCover } from '@/lib/books/library';
import type { Book, ScoredBook } from '@/lib/books/match';

export function BookCover({ src, title, large }: { src: string; title: string; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  const className = large ? 'books-fated-cover' : 'books-cover';
  if (!src || failed) {
    return <span className={large ? 'books-fated-cover books-cover-fallback' : 'books-cover-fallback'} aria-hidden="true">{title.slice(0, 1)}</span>;
  }
  return (
    // Covers are served by Open Library and Gutenberg. Static export does not optimize them.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={className}
      src={src}
      alt=""
      width={large ? 88 : 72}
      height={large ? 132 : 108}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      onLoad={(event) => {
        if (event.currentTarget.naturalWidth < 2) setFailed(true);
      }}
    />
  );
}

export function ModernBookCard({
  book,
  saved,
  showMatch,
  onSave,
  onCapsule,
}: {
  book: Book | ScoredBook;
  saved: boolean;
  showMatch?: boolean;
  onSave: (id: string) => void;
  onCapsule: (book: Book) => void;
}) {
  const match = showMatch && 'matchPct' in book ? book.matchPct : null;
  return (
    <article className="dw-card books-card">
      <div className="books-book">
        <BookCover src={openLibraryCover(book.isbn)} title={book.title} />
        <div>
          {match !== null ? <span className="dw-badge dw-badge--accent">{match}% match</span> : null}
          <h3 className="dw-card-title">{book.title}</h3>
          <p className="dw-note">by {book.author}</p>
          <div className="books-meta">
            {book.genres.map((genre) => <span key={genre} className="dw-badge">{genreLabel(genre)}</span>)}
          </div>
        </div>
      </div>
      <p>{book.synopsis}</p>
      <p className="dw-note">{book.tropes.join(' · ')}</p>
      {showMatch ? <p className="dw-note">Why it matches: {book.matchReason}</p> : <p className="dw-note">{book.matchReason}</p>}
      <div className="dw-actions">
        <button type="button" className="dw-btn" onClick={() => onCapsule(book)}>Study capsule</button>
        <button type="button" className="dw-btn" aria-pressed={saved} onClick={() => onSave(book.id)}>
          {saved ? 'On shelf' : 'Save'}
        </button>
      </div>
    </article>
  );
}

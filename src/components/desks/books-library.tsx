'use client';

import { useState } from 'react';
import { filterBooks, LIBRARY_GENRES } from '@/lib/books/library';
import { BOOKS, type Book } from '@/lib/books/match';
import { ModernBookCard } from './books-cards';
import { DeskSwitch } from './switch';

export function BooksLibrary({
  saved,
  onSave,
  onCapsule,
}: {
  saved: (id: string) => boolean;
  onSave: (id: string) => void;
  onCapsule: (book: Book) => void;
}) {
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState('all');
  const shown = filterBooks(BOOKS, query, genre);

  return (
    <div className="books-view">
      <div className="books-intro">
        <p className="dw-eyebrow">Library</p>
        <h2>Eight modern titles</h2>
        <p className="dw-note">Search by title, author, trope, or a word from the notes.</p>
      </div>
      <label className="dw-sr-only" htmlFor="library-search">Search the library</label>
      <input
        id="library-search"
        className="dw-field"
        value={query}
        placeholder="Title, author, trope, or keyword"
        onChange={(event) => setQuery(event.target.value)}
      />
      <DeskSwitch label="Genre" views={LIBRARY_GENRES} current={genre} onChange={setGenre} />
      {shown.length === 0 ? <p className="dw-note">No books matched.</p> : (
        <div className="books-grid">
          {shown.map((book) => (
            <ModernBookCard key={book.id} book={book} saved={saved(book.id)} onSave={onSave} onCapsule={onCapsule} />
          ))}
        </div>
      )}
    </div>
  );
}

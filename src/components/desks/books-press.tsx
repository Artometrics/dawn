'use client';

import { useState } from 'react';
import { PRESS, filterPress, pressFromGutendex, pressLinks, type PressBook } from '@/lib/books/press';
import { BookCover } from './books-cards';

export function BooksPress({ onRead }: { onRead: (book: PressBook) => void }) {
  const [query, setQuery] = useState('');
  const [remote, setRemote] = useState<PressBook[] | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const shown = remote ?? filterPress(PRESS, query);

  async function searchArchive() {
    const q = query.trim();
    if (!q || pending) return;
    setPending(true);
    setStatus('Searching Project Gutenberg…');
    try {
      const response = await fetch(`https://gutendex.com/books/?search=${encodeURIComponent(q)}`);
      if (!response.ok) throw new Error(String(response.status));
      const found = pressFromGutendex(await response.json());
      setRemote(found);
      setStatus(found.length === 0 ? `No Gutenberg results for “${q}”.` : null);
    } catch {
      setRemote(null);
      setStatus('The Gutenberg search is not answering. Showing the vault.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="books-view">
      <div className="books-intro">
        <p className="dw-eyebrow">Gutenberg press</p>
        <h2>Public-domain vault</h2>
        <p className="dw-note">{PRESS.length} books you can read on this page. The field filters this vault. Search Gutenberg looks further. Covers and EPUB files come from Project Gutenberg. Nothing here is for sale.</p>
      </div>
      <form className="books-search" onSubmit={(event) => { event.preventDefault(); void searchArchive(); }}>
        <label className="dw-sr-only" htmlFor="press-search">Search the press</label>
        <input
          id="press-search"
          className="dw-field"
          value={query}
          placeholder="Title, author, or subject"
          onChange={(event) => {
            setQuery(event.target.value);
            setRemote(null);
            setStatus(null);
          }}
        />
        <button type="submit" className="dw-btn" disabled={pending || query.trim().length === 0}>Search Gutenberg</button>
        {remote ? (
          <button type="button" className="dw-btn" onClick={() => { setRemote(null); setStatus(null); }}>Back to the vault</button>
        ) : null}
      </form>
      {status ? <p className="dw-note" role="status">{status}</p> : null}
      {shown.length === 0 ? <p className="dw-note">Nothing in the vault matches that.</p> : (
        <div className="books-grid">
          {shown.map((book) => {
            const links = pressLinks(book);
            return (
              <article key={`${book.id}-${book.title}`} className="dw-card books-card">
                <div className="books-book">
                  <BookCover src={links.cover} title={book.title} />
                  <div>
                    <h3 className="dw-card-title">{book.title}</h3>
                    <p className="dw-note">by {book.author}{book.year ? ` · ${book.year}` : ''}</p>
                    <p className="dw-note">Gutenberg {book.id}</p>
                  </div>
                </div>
                {book.subjects ? <p>{book.subjects}</p> : null}
                <div className="dw-actions">
                  <button type="button" className="dw-btn" onClick={() => onRead(book)}>Read</button>
                  <a className="dw-btn" href={links.epub} target="_blank" rel="noreferrer">EPUB</a>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

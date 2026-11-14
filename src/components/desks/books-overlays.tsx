'use client';

import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { bookById, type Book } from '@/lib/books/match';
import { loadPressText, readerParagraphs, type PressBook, type PressText } from '@/lib/books/press';

const TYPE_SIZES = [17, 19, 21, 24];

function useLayer(open: boolean, onClose: () => void) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [open, onClose]);
  return closeRef;
}

function Layer({
  open,
  label,
  titleId,
  shelf,
  onClose,
  closeRef,
  children,
}: {
  open: boolean;
  label: string;
  titleId: string;
  shelf?: boolean;
  onClose: () => void;
  closeRef: RefObject<HTMLButtonElement | null>;
  children: ReactNode;
}) {
  if (!open || typeof document === 'undefined') return null;
  return createPortal(
    <div
      className={shelf ? 'books-layer books-layer--shelf' : 'books-layer'}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="books-sheet">
        <div className="books-sheet-head">
          <p className="dw-eyebrow">{label}</p>
          <button ref={closeRef} type="button" className="dw-btn dw-btn--icon" aria-label="Close" onClick={onClose}>×</button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function CapsuleDialog({ book, onClose }: { book: Book | null; onClose: () => void }) {
  const closeRef = useLayer(Boolean(book), onClose);
  return (
    <Layer open={Boolean(book)} label="Study capsule" titleId="books-capsule-title" onClose={onClose} closeRef={closeRef}>
      {book ? (
        <>
          <h2 id="books-capsule-title">{book.title}</h2>
          <p className="dw-note">by {book.author}. Themes, a line, and a question to sit with.</p>
          <div>
            <h3>Themes</h3>
            <div className="books-meta">
              {book.capsule.themes.map((theme) => <span key={theme} className="dw-badge">{theme}</span>)}
            </div>
          </div>
          <div>
            <h3>A line</h3>
            <p className="books-quote">{book.capsule.quote}</p>
          </div>
          <div>
            <h3>People</h3>
            <div className="books-dossier">
              {book.capsule.characters.map((character) => (
                <article key={character.name} className="dw-card">
                  <strong>{character.name}</strong>
                  <span className="dw-note">{character.role}</span>
                </article>
              ))}
            </div>
          </div>
          <div>
            <h3>Discussion</h3>
            <p>{book.capsule.discussion}</p>
          </div>
        </>
      ) : null}
    </Layer>
  );
}

export function ShelfDrawer({
  open,
  ids,
  onClose,
  onSave,
  onCapsule,
}: {
  open: boolean;
  ids: string[];
  onClose: () => void;
  onSave: (id: string) => void;
  onCapsule: (book: Book) => void;
}) {
  const closeRef = useLayer(open, onClose);
  const books = ids.map((id) => bookById(id)).filter((book): book is Book => Boolean(book));
  return (
    <Layer open={open} shelf label="Your shelf" titleId="books-shelf-title" onClose={onClose} closeRef={closeRef}>
      <h2 id="books-shelf-title">Shelf</h2>
      <p className="dw-note">Saved on this phone. {books.length} {books.length === 1 ? 'book' : 'books'}.</p>
      {books.length === 0 ? <p className="dw-note">Nothing saved yet. Save a book from the library, the quiz, or a reading.</p> : (
        books.map((book) => (
          <article key={book.id} className="dw-card">
            <h3 className="dw-card-title">{book.title}</h3>
            <p className="dw-note">by {book.author}</p>
            <div className="dw-actions">
              <button type="button" className="dw-btn" onClick={() => onCapsule(book)}>Study capsule</button>
              <button type="button" className="dw-btn" onClick={() => onSave(book.id)}>Remove</button>
            </div>
          </article>
        ))
      )}
    </Layer>
  );
}

export function ReaderDialog({ book, onClose }: { book: PressBook | null; onClose: () => void }) {
  const closeRef = useLayer(Boolean(book), onClose);
  const [phase, setPhase] = useState<PressText | { kind: 'loading' }>({ kind: 'loading' });
  const [size, setSize] = useState(1);
  const [paper, setPaper] = useState(false);
  const [count, setCount] = useState(40);

  useEffect(() => {
    if (!book) return;
    let current = true;
    void loadPressText(book).then((result) => {
      if (current) setPhase(result);
    });
    return () => {
      current = false;
    };
  }, [book]);

  const paragraphs = phase.kind === 'text' ? readerParagraphs(phase.text) : [];
  const shown = paragraphs.slice(0, count);

  return (
    <Layer open={Boolean(book)} label="Project Gutenberg" titleId="books-reader-title" onClose={onClose} closeRef={closeRef}>
      {book ? (
        <>
          <h2 id="books-reader-title">{book.title}</h2>
          <p className="dw-note">by {book.author}. Public domain.</p>
          <div className="dw-actions">
            <button type="button" className="dw-btn" aria-label="Smaller type" disabled={size === 0} onClick={() => setSize((current) => Math.max(0, current - 1))}>A−</button>
            <button type="button" className="dw-btn" aria-label="Larger type" disabled={size === TYPE_SIZES.length - 1} onClick={() => setSize((current) => Math.min(TYPE_SIZES.length - 1, current + 1))}>A+</button>
            <button type="button" className="dw-btn" aria-pressed={paper} onClick={() => setPaper((current) => !current)}>{paper ? 'Night' : 'Sepia'}</button>
            {phase.kind !== 'loading' ? <a className="dw-btn" href={phase.epub} target="_blank" rel="noreferrer">EPUB</a> : null}
          </div>
          {phase.kind === 'loading' ? <p className="dw-note" role="status">Opening the Gutenberg text…</p> : null}
          {phase.kind === 'frame' ? (
            <>
              <p className="dw-note">Showing the Gutenberg HTML edition. Type size and sepia apply to the text edition.</p>
              <iframe className="books-reader-frame" title={`Reading ${book.title}`} src={phase.html} referrerPolicy="no-referrer" />
            </>
          ) : null}
          {phase.kind === 'text' ? (
            <div className={paper ? 'books-reader-page is-paper' : 'books-reader-page'} style={{ fontSize: TYPE_SIZES[size] }}>
              <p className="dw-note">Project Gutenberg edition.</p>
              {shown.map((paragraph, index) => <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>)}
              {count < paragraphs.length ? (
                <button type="button" className="dw-btn" onClick={() => setCount((current) => current + 80)}>Keep reading</button>
              ) : <p className="dw-note">End of the text on this page. The EPUB has the same edition.</p>}
            </div>
          ) : null}
        </>
      ) : null}
    </Layer>
  );
}

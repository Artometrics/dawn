'use client';

import { useCallback, useState } from 'react';
import { EMPTY_SHELF, parseShelf, toggleShelf, type Book } from '@/lib/books/match';
import type { PressBook } from '@/lib/books/press';
import { BooksLibrary } from './books-library';
import { BooksOracle } from './books-oracle';
import { CapsuleDialog, ReaderDialog, ShelfDrawer } from './books-overlays';
import { BooksPress } from './books-press';
import { BooksQuiz } from './books-quiz';
import './books-desk.css';
import './desks.css';
import { DeskSwitch } from './switch';
import { useDeskStore } from './use-desk-store';

const VIEWS = [
  { id: 'oracle', label: 'Oracle' },
  { id: 'quiz', label: 'Quiz' },
  { id: 'press', label: 'Press' },
  { id: 'library', label: 'Library' },
];

export function BooksDesk() {
  const desk = useDeskStore('books', parseShelf, EMPTY_SHELF);
  const [view, setView] = useState('oracle');
  const [note, setNote] = useState<string | null>(null);
  const [capsule, setCapsule] = useState<Book | null>(null);
  const [reader, setReader] = useState<PressBook | null>(null);
  const [shelfOpen, setShelfOpen] = useState(false);

  const closeCapsule = useCallback(() => setCapsule(null), []);
  const closeReader = useCallback(() => setReader(null), []);
  const closeShelf = useCallback(() => setShelfOpen(false), []);

  const openCapsule = useCallback((book: Book) => {
    setReader(null);
    setShelfOpen(false);
    setCapsule(book);
  }, []);

  const openReader = useCallback((book: PressBook) => {
    setCapsule(null);
    setShelfOpen(false);
    setReader(book);
  }, []);

  if (!desk.ready) return <p className="dw-note">Opening the desk.</p>;

  function save(id: string) {
    const result = toggleShelf(desk.value, id);
    if (!result.ok) {
      setNote(result.error);
      return;
    }
    desk.replace(result.data);
    setNote(result.data.shelf.includes(id) ? 'On the shelf.' : 'Taken off the shelf.');
  }

  const saved = (id: string) => desk.value.shelf.includes(id);
  const status = note || desk.note;

  return (
    <div className="desk books-desk">
      <p className="dw-note">PageMatch stays on this phone. Shop links stay off.</p>
      {status ? <p className="dw-alert" role="status">{status}</p> : null}
      <div className="books-toolbar">
        <DeskSwitch label="Books" views={VIEWS} current={view} onChange={setView} />
        <button
          type="button"
          className="dw-btn books-shelf-btn"
          aria-expanded={shelfOpen}
          onClick={() => setShelfOpen(true)}
        >
          Shelf
          <span className="books-count">{desk.value.shelf.length}</span>
        </button>
      </div>
      <div hidden={view !== 'oracle'}>
        <BooksOracle saved={saved} onSave={save} onCapsule={openCapsule} />
      </div>
      <div hidden={view !== 'quiz'}>
        <BooksQuiz saved={saved} onSave={save} onCapsule={openCapsule} />
      </div>
      <div hidden={view !== 'press'}>
        <BooksPress onRead={openReader} />
      </div>
      <div hidden={view !== 'library'}>
        <BooksLibrary saved={saved} onSave={save} onCapsule={openCapsule} />
      </div>
      <CapsuleDialog book={capsule} onClose={closeCapsule} />
      <ReaderDialog key={reader ? `${reader.id}:${reader.title}` : 'closed'} book={reader} onClose={closeReader} />
      <ShelfDrawer
        open={shelfOpen}
        ids={desk.value.shelf}
        onClose={closeShelf}
        onSave={save}
        onCapsule={openCapsule}
      />
    </div>
  );
}

'use client';

import { useState } from 'react';
import { BOOKS, EMPTY_SHELF, QUIZ, bookById, parseShelf, scoreBooks, toggleShelf, type Book, type QuizAnswers, type ScoredBook } from '@/lib/books/match';
import './desks.css';
import { DeskSwitch } from './switch';
import { useDeskStore } from './use-desk-store';

const VIEWS = [
  { id: 'quiz', label: 'Quiz' },
  { id: 'library', label: 'Library' },
  { id: 'shelf', label: 'Shelf' },
];

export function BooksDesk() {
  const desk = useDeskStore('books', parseShelf, EMPTY_SHELF);
  const [view, setView] = useState('quiz');
  const [note, setNote] = useState<string | null>(null);
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

  return (
    <div className="desk">
      <p className="dw-note">PageMatch stays on this phone. Buy links and the pet certificates are not on this desk.</p>
      {note || desk.note ? <p className="dw-alert" role="status">{note || desk.note}</p> : null}
      <DeskSwitch label="Books" views={VIEWS} current={view} onChange={setView} />
      {view === 'quiz' ? <Quiz onSave={save} shelf={desk.value.shelf} /> : null}
      {view === 'library' ? <Library onSave={save} shelf={desk.value.shelf} /> : null}
      {view === 'shelf' ? <Shelf ids={desk.value.shelf} onSave={save} /> : null}
    </div>
  );
}

function Quiz({ onSave, shelf }: { onSave: (id: string) => void; shelf: string[] }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const question = QUIZ[step];
  const ranked = step >= QUIZ.length ? scoreBooks(answers).slice(0, 4) : [];
  if (!question) {
    return (
      <div className="desk-stage">
        <div className="desk-stack desk-stack--pair">
          {ranked.map((book) => <BookCard key={book.id} book={book} saved={shelf.includes(book.id)} onSave={onSave} />)}
        </div>
        <button type="button" className="dw-btn" onClick={() => { setStep(0); setAnswers({}); }}>Ask again</button>
      </div>
    );
  }
  return (
    <div className="desk-stage">
      <p className="dw-card-title">{question.prompt}</p>
      <p className="dw-note">{question.subtitle} · {step + 1} of {QUIZ.length}</p>
      <div className="desk-board">
        {question.options.map((option) => (
          <button key={option.val} type="button" className="dw-card dw-btn" onClick={() => {
            setAnswers({ ...answers, [question.key]: option.val });
            setStep(step + 1);
          }}>
            <strong>{option.text}</strong>
            <span className="dw-note">{option.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Library({ onSave, shelf }: { onSave: (id: string) => void; shelf: string[] }) {
  const [genre, setGenre] = useState('all');
  const genres = ['all', ...new Set(BOOKS.flatMap((book) => book.genres))];
  const shown = genre === 'all' ? BOOKS : BOOKS.filter((book) => book.genres.includes(genre));
  return (
    <div className="desk-stage">
      <DeskSwitch label="Genre" views={genres.map((id) => ({ id, label: id }))} current={genre} onChange={setGenre} />
      <div className="desk-stack desk-stack--pair">
        {shown.map((book) => <BookCard key={book.id} book={book} saved={shelf.includes(book.id)} onSave={onSave} />)}
      </div>
    </div>
  );
}

function Shelf({ ids, onSave }: { ids: string[]; onSave: (id: string) => void }) {
  const books = ids.map((id) => bookById(id)).filter((book): book is Book => Boolean(book));
  if (books.length === 0) return <p className="dw-note">Nothing saved yet.</p>;
  return (
    <div className="desk-stack desk-stack--pair">
      {books.map((book) => <BookCard key={book.id} book={book} saved onSave={onSave} />)}
    </div>
  );
}

function BookCard({ book, saved, onSave }: { book: Book | ScoredBook; saved: boolean; onSave: (id: string) => void }) {
  const match = 'matchPct' in book ? book.matchPct : null;
  return (
    <article className="dw-card">
      <p className="dw-card-title">{book.title}</p>
      <p className="dw-note">{book.author}{match !== null ? ` · ${match}% match` : ''}</p>
      <p>{book.synopsis}</p>
      <p className="dw-note">{book.matchReason}</p>
      <details>
        <summary>Study notes</summary>
        <p>{book.capsule.quote}</p>
        <ul>{book.capsule.themes.map((theme) => <li key={theme}>{theme}</li>)}</ul>
        <p className="dw-note">{book.capsule.discussion}</p>
      </details>
      <button type="button" className="dw-btn" onClick={() => onSave(book.id)}>{saved ? 'Remove' : 'Save'}</button>
    </article>
  );
}

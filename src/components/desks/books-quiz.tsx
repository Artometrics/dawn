'use client';

import { useState } from 'react';
import { QUIZ, scoreBooks, type Book, type QuizAnswers } from '@/lib/books/match';
import { ModernBookCard } from './books-cards';

export function BooksQuiz({
  saved,
  onSave,
  onCapsule,
}: {
  saved: (id: string) => boolean;
  onSave: (id: string) => void;
  onCapsule: (book: Book) => void;
}) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const done = step >= QUIZ.length;
  const question = QUIZ[step];
  const ranked = done ? scoreBooks(answers).slice(0, 4) : [];
  const progress = done ? 100 : ((step + 1) / QUIZ.length) * 100;

  function choose(value: string) {
    if (!question) return;
    setAnswers({ ...answers, [question.key]: value });
  }

  return (
    <div className="books-view">
      <div className="books-intro">
        <p className="dw-eyebrow">Reading quiz</p>
        <h2>{done ? 'Four matches' : `Question ${step + 1} of ${QUIZ.length}`}</h2>
        <p className="dw-note">{done ? 'A base of 50, then vibe, genre, and pacing. The top four stay under 99.' : question?.subtitle}</p>
      </div>
      <div className="books-progress" role="progressbar" aria-valuemin={1} aria-valuemax={QUIZ.length} aria-valuenow={done ? QUIZ.length : step + 1} aria-label="Quiz progress">
        <span style={{ width: `${progress}%` }} />
      </div>
      {question ? (
        <>
          <p className="dw-card-title">{question.prompt}</p>
          <div className="books-choices">
            {question.options.map((option) => (
              <button
                key={option.val}
                type="button"
                className="books-choice"
                aria-pressed={answers[question.key] === option.val}
                onClick={() => choose(option.val)}
              >
                {option.icon ? <span className="books-choice-mark" aria-hidden="true">{option.icon}</span> : null}
                <span>
                  <strong>{option.text}</strong>
                  <span className="dw-note">{option.desc}</span>
                </span>
              </button>
            ))}
          </div>
          <div className="dw-actions">
            <button type="button" className="dw-btn" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0}>Back</button>
            <button
              type="button"
              className="dw-btn dw-btn--primary"
              disabled={!answers[question.key]}
              onClick={() => setStep((current) => current + 1)}
            >
              {step === QUIZ.length - 1 ? 'See the matches' : 'Next'}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="books-grid">
            {ranked.map((book) => (
              <ModernBookCard key={book.id} book={book} saved={saved(book.id)} showMatch onSave={onSave} onCapsule={onCapsule} />
            ))}
          </div>
          <button type="button" className="dw-btn dw-btn--primary" onClick={() => { setStep(0); setAnswers({}); }}>Ask again</button>
        </>
      )}
    </div>
  );
}

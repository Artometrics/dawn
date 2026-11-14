import assert from 'node:assert/strict';
import test from 'node:test';
import { BOOKS, QUIZ, parseShelf, scoreBooks, toggleShelf } from './match.ts';

test('the quiz is three questions and the library is the Carrie book list', () => {
  assert.equal(QUIZ.length, 3);
  assert.equal(BOOKS.length, 8);
  assert.ok(BOOKS.every((book) => book.title && book.author && book.isbn));
});

test('a cozy literary balanced reader ranks the matching book first', () => {
  const ranked = scoreBooks({ vibe: 'cozy', genre: 'literary', pacing: 'balanced' });
  assert.equal(ranked[0].id, 'house-in-the-cerulean-sea');
  assert.equal(ranked[0].matchPct, 99);
  assert.ok(ranked.at(-1)!.matchPct <= ranked[0].matchPct);
});

test('the shelf keeps known books and drops the rest', () => {
  assert.deepEqual(parseShelf({ shelf: ['piranesi', 'nope', 'piranesi'] }).shelf, ['piranesi']);
  const saved = toggleShelf({ shelf: [] }, 'piranesi');
  assert.equal(saved.ok, true);
  if (saved.ok) {
    const again = toggleShelf(saved.data, 'piranesi');
    assert.deepEqual(again.ok && again.data.shelf, []);
  }
  assert.equal(toggleShelf({ shelf: [] }, 'pets').ok, false);
});

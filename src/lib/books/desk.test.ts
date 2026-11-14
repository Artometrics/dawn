import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { BOOKS } from './match.ts';
import { filterBooks } from './library.ts';
import {
  PRESS,
  PRESS_CORE_IDS,
  filterPress,
  isGutenbergUrl,
  isMirrorUrl,
  loadPressText,
  prepareReaderText,
  pressFromGutendex,
  pressLinks,
  readerParagraphs,
} from './press.ts';
import { CRUCIBLES, QUERENTS, booksForReading, drawReading } from './tarot.ts';

test('the oracle is six querents and five crucibles, and every pair can find a book', () => {
  assert.equal(QUERENTS.length, 6);
  assert.equal(CRUCIBLES.length, 5);
  assert.deepEqual(QUERENTS.map((card) => card.name), [
    'The Alchemist',
    'The Dreamer',
    'The Shadow Seeker',
    'The Star Voyager',
    'The Hermit',
    'The Rebel',
  ]);
  assert.deepEqual(CRUCIBLES.map((card) => card.name), [
    'The Forbidden Labyrinth',
    'The Slow Burn',
    'The Sanctuary',
    'The Mythic Quest',
    'The Living Archive',
  ]);
  for (const querent of QUERENTS) {
    for (const crucible of CRUCIBLES) {
      assert.ok(booksForReading(querent, crucible).length > 0, `${querent.name} / ${crucible.name}`);
    }
  }
});

test('a zero draw picks the alchemist, the labyrinth, and the first matching book', () => {
  const reading = drawReading(() => 0);
  assert.equal(reading.querent.name, 'The Alchemist');
  assert.equal(reading.crucible.name, 'The Forbidden Labyrinth');
  assert.equal(reading.book.id, 'piranesi');
  assert.match(reading.sentence, /Piranesi/);
  assert.match(reading.sentence, /The Alchemist/);
});

test('library search understands a trope, a character, and a genre', () => {
  assert.equal(BOOKS.length, 8);
  assert.ok(BOOKS.every((book) => book.tropes.length > 0 && book.capsule.themes.length > 0 && book.capsule.quote && book.capsule.discussion));
  assert.deepEqual(filterBooks(BOOKS, 'found family', 'all').map((book) => book.id), ['house-in-the-cerulean-sea']);
  assert.deepEqual(filterBooks(BOOKS, 'Sadie', 'literary').map((book) => book.id), ['tomorrow-and-tomorrow']);
  assert.equal(filterBooks(BOOKS, 'dragons', 'nonfiction').length, 0);
});

test('the press keeps the six original Gutenberg titles and can filter them', () => {
  for (const id of PRESS_CORE_IDS) assert.ok(PRESS.some((book) => book.id === id), String(id));
  assert.ok(PRESS.length >= PRESS_CORE_IDS.length);
  assert.equal(filterPress(PRESS, 'austen')[0]?.id, 1342);
  assert.equal(filterPress(PRESS, 'transylvania')[0]?.id, 345);
  const links = pressLinks(PRESS[0]);
  assert.equal(links.texts[0], PRESS[0].mirror);
  assert.ok(links.texts.some((url) => url.startsWith('https://www.gutenberg.org/files/84/')));
  assert.ok(isGutenbergUrl(links.epub));
  assert.ok(isGutenbergUrl(links.html));
  assert.equal(isGutenbergUrl('https://www.amazon.com/s?k=book'), false);
  assert.equal(isMirrorUrl('https://cdn.jsdelivr.net/gh/GITenberg/Frankenstein_84@master/84-0.txt'), true);
  assert.equal(isMirrorUrl('https://cdn.jsdelivr.net/gh/other/x'), false);
});

test('the reader strips the Gutenberg banner and joins wrapped lines', () => {
  const raw = [
    'header',
    '*** START OF THE PROJECT GUTENBERG EBOOK FRANKENSTEIN ***',
    '',
    'I am by birth.',
    'I was a child.',
    '',
    'Chapter 2',
    '*** END OF THE PROJECT GUTENBERG EBOOK ***',
    'license',
  ].join('\n');
  const text = prepareReaderText(raw);
  assert.equal(text.includes('header'), false);
  assert.equal(text.includes('license'), false);
  assert.deepEqual(readerParagraphs(text), ['I am by birth. I was a child.', 'Chapter 2']);
  assert.equal(prepareReaderText('<!DOCTYPE html><html><body>no</body></html>'), '');
});

test('Gutendex rows keep Gutenberg files and drop everything else', () => {
  const books = pressFromGutendex({
    results: [
      {
        id: 84,
        title: 'Frankenstein',
        authors: [{ name: 'Shelley, Mary Wollstonecraft' }],
        subjects: ['Science fiction', 'Monsters'],
        formats: {
          'text/html': 'https://www.gutenberg.org/files/84/84-h/84-h.htm',
          'application/epub+zip': 'https://evil.example/book.epub',
          'text/plain': 'https://www.gutenberg.org/files/84/84-0.txt',
        },
      },
      { id: 'nope', title: 'Skip' },
    ],
  });
  assert.equal(books.length, 1);
  assert.equal(books[0].htmlUrl, 'https://www.gutenberg.org/files/84/84-h/84-h.htm');
  assert.equal(books[0].textUrl, 'https://www.gutenberg.org/files/84/84-0.txt');
  assert.equal(books[0].epubUrl, undefined);
  assert.equal(pressLinks(books[0]).epub, 'https://www.gutenberg.org/ebooks/84.epub3.images');
});

test('the text reader uses the mirror and otherwise frames the Gutenberg HTML', async () => {
  const calls: string[] = [];
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    calls.push(url);
    if (url.includes('jsdelivr')) {
      const body = `*** START OF THE PROJECT GUTENBERG EBOOK ***\n\n${'A paragraph of the book. '.repeat(40)}\n\n*** END OF THE PROJECT GUTENBERG EBOOK ***\n`;
      return new Response(body, { status: 200 });
    }
    return new Response('no', { status: 500 });
  };
  const loaded = await loadPressText(PRESS[0], fetchImpl);
  assert.equal(loaded.kind, 'text');
  assert.deepEqual(calls, [PRESS[0].mirror]);
  assert.match(loaded.kind === 'text' ? loaded.text : '', /paragraph of the book/);
  const framed = await loadPressText({ ...PRESS[2], mirror: undefined }, fetchImpl);
  assert.equal(framed.kind, 'frame');
  assert.match(framed.html, /gutenberg\.org\/files\/345\//);
});

test('the books desk does not grow shop links', () => {
  const roots = ['src/lib/books', 'src/components/desks', 'src/app/books'];
  const files: string[] = [];
  for (const root of roots) {
    for (const name of readdirSync(root)) {
      if (!/books|match\.ts|catalog\.json/.test(name) && root.endsWith('desks')) continue;
      if (name.endsWith('.test.ts')) continue;
      if (root.endsWith('desks') && !name.startsWith('books')) continue;
      const full = path.join(root, name);
      if (name.endsWith('.ts') || name.endsWith('.tsx') || name.endsWith('.json') || name.endsWith('.css')) files.push(full);
    }
  }
  assert.ok(files.length > 8);
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    assert.equal(/amazon\.com|carrie-20/i.test(text), false, file);
  }
});

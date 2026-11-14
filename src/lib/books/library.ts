import type { Book } from './match';

export const LIBRARY_GENRES: { id: string; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'literary', label: 'Literary' },
  { id: 'fantasy', label: 'Fantasy' },
  { id: 'thriller', label: 'Thriller' },
  { id: 'romance', label: 'Romance' },
  { id: 'nonfiction', label: 'Nonfiction' },
];

const GENRE_LABELS = Object.fromEntries(LIBRARY_GENRES.map((genre) => [genre.id, genre.label]));

export function genreLabel(id: string): string {
  return GENRE_LABELS[id] ?? id;
}

/** Open Library cover for an ISBN. Empty when the ISBN is not digits. */
export function openLibraryCover(isbn: string, size: 'S' | 'M' | 'L' = 'M'): string {
  if (!/^\d{10}(\d{3})?$/.test(isbn)) return '';
  return `https://covers.openlibrary.org/b/isbn/${isbn}-${size}.jpg?default=false`;
}

/**
 * Library search: title, author, trope, synopsis, match reason, themes, or a character name.
 * Genre `all` leaves the list unfiltered.
 */
export function filterBooks(books: Book[], query: string, genre: string): Book[] {
  const q = query.trim().toLowerCase();
  return books.filter((book) => {
    if (genre !== 'all' && !book.genres.includes(genre)) return false;
    if (!q) return true;
    const haystack = [
      book.title,
      book.author,
      book.synopsis,
      book.matchReason,
      book.destinyText,
      book.capsule.quote,
      book.capsule.discussion,
      ...book.tropes,
      ...book.genres,
      ...book.capsule.themes,
      ...book.capsule.characters.flatMap((character) => [character.name, character.role]),
    ].join('\n').toLowerCase();
    return haystack.includes(q);
  });
}

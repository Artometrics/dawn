import catalog from './catalog.json' with { type: 'json' };

export type BookCapsule = {
  themes: string[];
  quote: string;
  characters: { name: string; role: string }[];
  discussion: string;
};

export type Book = {
  id: string;
  title: string;
  author: string;
  isbn: string;
  genres: string[];
  vibe: string;
  pacing: string;
  synopsis: string;
  matchReason: string;
  destinyText: string;
  capsule: BookCapsule;
};

export type QuizQuestion = {
  prompt: string;
  subtitle: string;
  key: 'vibe' | 'genre' | 'pacing';
  options: { text: string; desc: string; val: string }[];
};

export const BOOKS = catalog.books as Book[];
export const QUIZ = catalog.questions as QuizQuestion[];

export type QuizAnswers = Partial<Record<QuizQuestion['key'], string>>;

export type ScoredBook = Book & { matchPct: number };

/** PageMatch scoring: a base of 50, then vibe, genre, and pacing. Capped at 99. */
export function scoreBooks(answers: QuizAnswers): ScoredBook[] {
  return BOOKS.map((book) => {
    let score = 50;
    if (answers.vibe && book.vibe === answers.vibe) score += 25;
    if (answers.genre && book.genres.includes(answers.genre)) score += 20;
    if (answers.pacing && book.pacing === answers.pacing) score += 10;
    return { ...book, matchPct: Math.min(score, 99) };
  }).sort((a, b) => b.matchPct - a.matchPct || a.title.localeCompare(b.title));
}

export function bookById(id: string): Book | undefined {
  return BOOKS.find((book) => book.id === id);
}

const SHELF_CAP = 40;

export type ShelfData = { shelf: string[] };
export const EMPTY_SHELF: ShelfData = { shelf: [] };

export function parseShelf(raw: unknown): ShelfData {
  const ids = raw && typeof raw === 'object' ? (raw as { shelf?: unknown }).shelf : null;
  if (!Array.isArray(ids)) return EMPTY_SHELF;
  const shelf: string[] = [];
  for (const id of ids) {
    if (typeof id === 'string' && bookById(id) && !shelf.includes(id)) shelf.push(id);
    if (shelf.length >= SHELF_CAP) break;
  }
  return { shelf };
}

/** Save or remove a book. A full shelf refuses a new id and says so. */
export function toggleShelf(data: ShelfData, id: string): { ok: true; data: ShelfData } | { ok: false; error: string; data: ShelfData } {
  if (!bookById(id)) return { ok: false, error: 'That book is not in the library.', data };
  if (data.shelf.includes(id)) return { ok: true, data: { shelf: data.shelf.filter((row) => row !== id) } };
  if (data.shelf.length >= SHELF_CAP) return { ok: false, error: 'The shelf is full.', data };
  return { ok: true, data: { shelf: [id, ...data.shelf] } };
}

/**
 * The Gutenberg press vault.
 *
 * Covers, EPUB links, and the HTML edition come from gutenberg.org.
 * That host does not send CORS headers, so a browser cannot read the plain
 * text. Curated titles therefore also name a jsDelivr copy of the same
 * GITenberg file (the Project Gutenberg text) for the in-page reader.
 * If that copy fails, the reader opens the Gutenberg HTML edition.
 */

export type PressBook = {
  id: number;
  title: string;
  author: string;
  year: string;
  subjects: string;
  /** CORS-readable copy of the Gutenberg plain text, when we know one. */
  mirror?: string;
  htmlUrl?: string;
  epubUrl?: string;
  textUrl?: string;
};

export type PressText =
  | { kind: 'text'; text: string; html: string; epub: string }
  | { kind: 'frame'; html: string; epub: string };

const MIRROR = 'https://cdn.jsdelivr.net/gh/GITenberg';

/** The six classics from the original vault, then a few more public-domain titles. */
export const PRESS: PressBook[] = [
  {
    id: 84,
    title: 'Frankenstein; Or, The Modern Prometheus',
    author: 'Mary Wollstonecraft Shelley',
    year: '1818',
    subjects: 'Gothic Fiction, Science Fiction, Promethean Myth',
    mirror: `${MIRROR}/Frankenstein_84@master/84-0.txt`,
  },
  {
    id: 1342,
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    year: '1813',
    subjects: 'Classic Romance, Social Satire, Regency England',
    mirror: `${MIRROR}/Pride-and-Prejudice_1342@master/1342-0.txt`,
  },
  {
    id: 345,
    title: 'Dracula',
    author: 'Bram Stoker',
    year: '1897',
    subjects: 'Vampire Horror, Epistolary Mystery, Transylvania',
    mirror: `${MIRROR}/Dracula_345@master/345.txt`,
  },
  {
    id: 174,
    title: 'The Picture of Dorian Gray',
    author: 'Oscar Wilde',
    year: '1890',
    subjects: 'Aestheticism, Moral Corruption, Gothic Suspense',
    mirror: `${MIRROR}/The-Picture-of-Dorian-Gray_174@master/174.txt`,
  },
  {
    id: 1661,
    title: 'The Adventures of Sherlock Holmes',
    author: 'Arthur Conan Doyle',
    year: '1892',
    subjects: 'Detective Fiction, Logic & Deduction, Victorian London',
    mirror: `${MIRROR}/The-Adventures-of-Sherlock-Holmes_1661@master/1661.txt`,
  },
  {
    id: 11,
    title: 'Alice’s Adventures in Wonderland',
    author: 'Lewis Carroll',
    year: '1865',
    subjects: 'Whimsical Fantasy, Surreal Satire, Wonderland',
    mirror: `${MIRROR}/Alice-s-Adventures-in-Wonderland_11@master/11-0.txt`,
  },
  {
    id: 1260,
    title: 'Jane Eyre',
    author: 'Charlotte Brontë',
    year: '1847',
    subjects: 'Gothic Romance, Independence, Thornfield',
    mirror: `${MIRROR}/Jane-Eyre_1260@master/1260.txt`,
  },
  {
    id: 768,
    title: 'Wuthering Heights',
    author: 'Emily Brontë',
    year: '1847',
    subjects: 'Revenge, The Moors, Gothic Passion',
    mirror: `${MIRROR}/Wuthering-Heights_768@master/768.txt`,
  },
  {
    id: 2701,
    title: 'Moby-Dick; Or, The Whale',
    author: 'Herman Melville',
    year: '1851',
    subjects: 'Whaling, Obsession, The Sea',
    mirror: `${MIRROR}/Moby-Dick--Or-The-Whale_2701@master/2701-0.txt`,
  },
  {
    id: 98,
    title: 'A Tale of Two Cities',
    author: 'Charles Dickens',
    year: '1859',
    subjects: 'Revolution, Sacrifice, Paris and London',
    mirror: `${MIRROR}/A-Tale-of-Two-Cities_98@master/98-0.txt`,
  },
  {
    id: 46,
    title: 'A Christmas Carol',
    author: 'Charles Dickens',
    year: '1843',
    subjects: 'Redemption, Ghosts, Victorian London',
    mirror: `${MIRROR}/A-Christmas-Carol_46@master/46-0.txt`,
  },
  {
    id: 2554,
    title: 'Crime and Punishment',
    author: 'Fyodor Dostoevsky',
    year: '1866',
    subjects: 'Guilt, Conscience, St. Petersburg',
    mirror: `${MIRROR}/Crime-and-Punishment_2554@master/2554-0.txt`,
  },
  {
    id: 64317,
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    year: '1925',
    subjects: 'Jazz Age, Longing, Long Island',
    mirror: `${MIRROR}/The-Great-Gatsby_64317@master/64317-0.txt`,
  },
];

/** The six titles the original press shipped. */
export const PRESS_CORE_IDS = [84, 1342, 345, 174, 1661, 11] as const;

export function isGutenbergUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && (parsed.hostname === 'www.gutenberg.org' || parsed.hostname === 'gutenberg.org');
  } catch {
    return false;
  }
}

export function isMirrorUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname === 'cdn.jsdelivr.net' && parsed.pathname.startsWith('/gh/GITenberg/');
  } catch {
    return false;
  }
}

export type PressLinks = {
  cover: string;
  html: string;
  epub: string;
  texts: string[];
};

export function pressLinks(book: PressBook): PressLinks {
  const id = book.id;
  const texts: string[] = [];
  if (book.mirror && isMirrorUrl(book.mirror)) texts.push(book.mirror);
  if (book.textUrl && isGutenbergUrl(book.textUrl)) texts.push(book.textUrl);
  texts.push(`https://www.gutenberg.org/files/${id}/${id}-0.txt`);
  texts.push(`https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`);
  return {
    cover: `https://www.gutenberg.org/cache/epub/${id}/pg${id}.cover.medium.jpg`,
    html: book.htmlUrl && isGutenbergUrl(book.htmlUrl) ? book.htmlUrl : `https://www.gutenberg.org/files/${id}/${id}-h/${id}-h.htm`,
    epub: book.epubUrl && isGutenbergUrl(book.epubUrl) ? book.epubUrl : `https://www.gutenberg.org/ebooks/${id}.epub3.images`,
    texts,
  };
}

/** Drop the Project Gutenberg header and license footer. HTML pages return empty. */
export function prepareReaderText(raw: string): string {
  const cleaned = raw.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  if (/<!doctype html|<html[\s>]/i.test(cleaned)) return '';
  let text = cleaned;
  const start = text.search(/\*\*\*\s*START OF (THE |THIS )?PROJECT GUTENBERG[^\n]*\n/i);
  if (start >= 0) text = text.slice(start).replace(/^[^\n]*\n/, '');
  const end = text.search(/\*\*\*\s*END OF (THE |THIS )?PROJECT GUTENBERG/i);
  if (end >= 0) text = text.slice(0, end);
  return text.trim();
}

/** Gutenberg files wrap near 70 characters. Blank lines separate paragraphs. */
export function readerParagraphs(text: string): string[] {
  return text
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/[ \t]*\n[ \t]*/g, ' ').replace(/[ \t]{2,}/g, ' ').trim())
    .filter((paragraph) => paragraph.length > 0);
}

export function filterPress(books: PressBook[], query: string): PressBook[] {
  const q = query.trim().toLowerCase();
  if (!q) return books;
  return books.filter((book) => [book.title, book.author, book.subjects, book.year, String(book.id)].join('\n').toLowerCase().includes(q));
}

function gutenbergFormats(formats: unknown): { html?: string; epub?: string; text?: string } {
  if (!formats || typeof formats !== 'object') return {};
  const found: { html?: string; epub?: string; text?: string } = {};
  for (const [key, value] of Object.entries(formats as Record<string, unknown>)) {
    if (typeof value !== 'string' || !isGutenbergUrl(value)) continue;
    if (!found.html && key.startsWith('text/html')) found.html = value;
    else if (!found.epub && key.includes('epub')) found.epub = value;
    else if (!found.text && key.startsWith('text/plain')) found.text = value;
  }
  return found;
}

/** Map a Gutendex payload to press cards. Non-Gutenberg file URLs are dropped. */
export function pressFromGutendex(payload: unknown): PressBook[] {
  if (!payload || typeof payload !== 'object') return [];
  const results = (payload as { results?: unknown }).results;
  if (!Array.isArray(results)) return [];
  const books: PressBook[] = [];
  for (const item of results) {
    if (!item || typeof item !== 'object') continue;
    const row = item as { id?: unknown; title?: unknown; authors?: unknown; subjects?: unknown; formats?: unknown };
    const id = typeof row.id === 'number' && Number.isInteger(row.id) && row.id > 0 ? row.id : 0;
    const title = typeof row.title === 'string' ? row.title.trim().slice(0, 180) : '';
    if (!id || !title) continue;
    const authorRow = Array.isArray(row.authors) ? row.authors.find((author) => author && typeof author === 'object' && typeof (author as { name?: unknown }).name === 'string') : null;
    const author = authorRow ? String((authorRow as { name: string }).name) : 'Unknown author';
    const subjects = Array.isArray(row.subjects)
      ? row.subjects.filter((subject): subject is string => typeof subject === 'string').slice(0, 3).join(', ')
      : '';
    const files = gutenbergFormats(row.formats);
    books.push({
      id,
      title,
      author,
      year: '',
      subjects,
      htmlUrl: files.html,
      epubUrl: files.epub,
      textUrl: files.text,
    });
    if (books.length >= 12) break;
  }
  return books;
}

export async function loadPressText(book: PressBook, fetchImpl: typeof fetch = fetch): Promise<PressText> {
  const links = pressLinks(book);
  // Only the mirror sends CORS headers. Gutenberg plain text is linked for EPUB and
  // for the HTML frame; fetching it from the browser downloads the file and then discards it.
  for (const url of links.texts.filter(isMirrorUrl)) {
    try {
      const response = await fetchImpl(url);
      if (!response.ok) continue;
      const text = prepareReaderText(await response.text());
      if (text.length > 400) return { kind: 'text', text, html: links.html, epub: links.epub };
    } catch {
      /* The HTML edition on gutenberg.org is the fallback. */
    }
  }
  return { kind: 'frame', html: links.html, epub: links.epub };
}

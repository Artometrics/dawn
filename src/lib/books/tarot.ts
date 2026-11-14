import { BOOKS, type Book } from './match';

/** A reader's present vibe. Six cards, from the PageMatch oracle. */
export type Querent = {
  numeral: string;
  symbol: string;
  name: string;
  tagline: string;
  meaning: string;
  vibe: string;
};

/** The story's genre path. Five cards. */
export type Crucible = {
  numeral: string;
  symbol: string;
  name: string;
  tagline: string;
  meaning: string;
  genre: string;
};

export type Reading = {
  querent: Querent;
  crucible: Crucible;
  book: Book;
  sentence: string;
};

export const QUERENTS: Querent[] = [
  {
    numeral: 'I',
    symbol: '🔮',
    name: 'The Alchemist',
    tagline: 'Seeker of Deep Transformation',
    meaning: 'You crave narratives that fundamentally alter how you see reality. You hunger for intellect, layered secrets, and profound personal revelation.',
    vibe: 'deep',
  },
  {
    numeral: 'II',
    symbol: '🌙',
    name: 'The Dreamer',
    tagline: 'Wanderer of Strange Realms',
    meaning: 'You read to step outside ordinary boundaries. You seek wondrous atmosphere, whimsical poetry, and tender emotional resonance.',
    vibe: 'cozy',
  },
  {
    numeral: 'III',
    symbol: '🗡️',
    name: 'The Shadow Seeker',
    tagline: 'Voyager into the Dark & Twisted',
    meaning: 'You are drawn to psychological tension, morally gray protagonists, haunted corridors, and mysteries where nothing is as it seems.',
    vibe: 'dark',
  },
  {
    numeral: 'IV',
    symbol: '⭐',
    name: 'The Star Voyager',
    tagline: 'Explorer of Sprawling Worlds',
    meaning: 'You crave epic scope, intricate magic systems, sweeping cosmic journeys, and high stakes that decide the fate of kingdoms.',
    vibe: 'escapist',
  },
  {
    numeral: 'V',
    symbol: '🕯️',
    name: 'The Hermit',
    tagline: 'Guardian of Quiet Solace',
    meaning: 'You read for gentle companionship, warm teacups, found families, and quiet moments that restore your faith in human kindness.',
    vibe: 'cozy',
  },
  {
    numeral: 'VI',
    symbol: '⚡',
    name: 'The Rebel',
    tagline: 'Defier of Fate & Sharp Wit',
    meaning: 'You desire rapid pacing, biting humor, razor-sharp dialogue, and antiheroes who punch upward against corrupt institutions.',
    vibe: 'gripping',
  },
];

export const CRUCIBLES: Crucible[] = [
  {
    numeral: 'VII',
    symbol: '🗝️',
    name: 'The Forbidden Labyrinth',
    tagline: 'Twisted Puzzles & Unreliable Minds',
    meaning: 'The cards demand a journey where every clue is suspect and the truth must be assembled piece by agonizing piece.',
    genre: 'thriller',
  },
  {
    numeral: 'VIII',
    symbol: '🔥',
    name: 'The Slow Burn',
    tagline: 'Tension Simmering Beneath the Surface',
    meaning: 'A path of aching patience, unspoken loyalties, and electric intimacy that ignites into an unforgettable fire.',
    genre: 'romance',
  },
  {
    numeral: 'IX',
    symbol: '🏡',
    name: 'The Sanctuary',
    tagline: 'Found Family & Gentle Healing',
    meaning: 'A refuge amidst the storm—discovering your chosen people and learning that belonging is the greatest magic of all.',
    genre: 'literary',
  },
  {
    numeral: 'X',
    symbol: '🌌',
    name: 'The Mythic Quest',
    tagline: 'Destiny Across Ancient Horizons',
    meaning: 'A grand odyssey across breathtaking lands, ancient prophecies, and the courage to forge your own legend.',
    genre: 'fantasy',
  },
  {
    numeral: 'XI',
    symbol: '🧬',
    name: 'The Living Archive',
    tagline: 'Ideas That Reshape Human History',
    meaning: 'A collision of science, history, and human curiosity that pulls back the curtain on the mysteries of civilization.',
    genre: 'nonfiction',
  },
];

export function readingSentence(querent: Querent, crucible: Crucible, book: Book): string {
  return `The cards divine that your reading soul is currently aligned with ${querent.name}. You are summoned to conquer ${crucible.name}. Therefore, destiny bestows upon you "${book.title}" by ${book.author}. May its pages enlighten your journey.`;
}

/** Books that share the querent's vibe or the crucible's genre. */
export function booksForReading(querent: Querent, crucible: Crucible): Book[] {
  const matches = BOOKS.filter((book) => book.vibe === querent.vibe || book.genres.includes(crucible.genre));
  return matches.length > 0 ? matches : BOOKS;
}

/**
 * Draw one querent, one crucible, and a book that fits either card.
 * `random` returns a number in [0, 1), the same contract as Math.random.
 */
export function drawReading(random: () => number = Math.random): Reading {
  const querent = QUERENTS[Math.floor(random() * QUERENTS.length)] ?? QUERENTS[0];
  const crucible = CRUCIBLES[Math.floor(random() * CRUCIBLES.length)] ?? CRUCIBLES[0];
  const pool = booksForReading(querent, crucible);
  const book = pool[Math.floor(random() * pool.length)];
  if (!book) throw new Error('The library is empty.');
  return { querent, crucible, book, sentence: readingSentence(querent, crucible, book) };
}

import confetti from 'canvas-confetti';

// ========================================================
// 1. DATASETS: TAROT ARCANA, BOOKS & STUDY CAPSULES
// ========================================================

const TAROT_QUERENTS = [
  {
    numeral: 'I',
    symbol: '🔮',
    name: 'The Alchemist',
    tagline: 'Seeker of Deep Transformation',
    meaning: 'You crave narratives that fundamentally alter how you see reality. You hunger for intellect, layered secrets, and profound personal revelation.',
    vibe: 'deep'
  },
  {
    numeral: 'II',
    symbol: '🌙',
    name: 'The Dreamer',
    tagline: 'Wanderer of Strange Realms',
    meaning: 'You read to step outside ordinary boundaries. You seek wondrous atmosphere, whimsical poetry, and tender emotional resonance.',
    vibe: 'cozy'
  },
  {
    numeral: 'III',
    symbol: '🗡️',
    name: 'The Shadow Seeker',
    tagline: 'Voyager into the Dark & Twisted',
    meaning: 'You are drawn to psychological tension, morally gray protagonists, haunted corridors, and mysteries where nothing is as it seems.',
    vibe: 'dark'
  },
  {
    numeral: 'IV',
    symbol: '⭐',
    name: 'The Star Voyager',
    tagline: 'Explorer of Sprawling Worlds',
    meaning: 'You crave epic scope, intricate magic systems, sweeping cosmic journeys, and high stakes that decide the fate of kingdoms.',
    vibe: 'escapist'
  },
  {
    numeral: 'V',
    symbol: '🕯️',
    name: 'The Hermit',
    tagline: 'Guardian of Quiet Solace',
    meaning: 'You read for gentle companionship, warm teacups, found families, and quiet moments that restore your faith in human kindness.',
    vibe: 'cozy'
  },
  {
    numeral: 'VI',
    symbol: '⚡',
    name: 'The Rebel',
    tagline: 'Defier of Fate & Sharp Wit',
    meaning: 'You desire rapid pacing, biting humor, razor-sharp dialogue, and antiheroes who punch upward against corrupt institutions.',
    vibe: 'gripping'
  }
];

const TAROT_CRUCIBLES = [
  {
    numeral: 'VII',
    symbol: '🗝️',
    name: 'The Forbidden Labyrinth',
    tagline: 'Twisted Puzzles & Unreliable Minds',
    meaning: 'The cards demand a journey where every clue is suspect and the truth must be assembled piece by agonizing piece.',
    genre: 'thriller'
  },
  {
    numeral: 'VIII',
    symbol: '🔥',
    name: 'The Slow Burn',
    tagline: 'Tension Simmering Beneath the Surface',
    meaning: 'A path of aching patience, unspoken loyalties, and electric intimacy that ignites into an unforgettable fire.',
    genre: 'romance'
  },
  {
    numeral: 'IX',
    symbol: '🏡',
    name: 'The Sanctuary',
    tagline: 'Found Family & Gentle Healing',
    meaning: 'A refuge amidst the storm—discovering your chosen people and learning that belonging is the greatest magic of all.',
    genre: 'literary'
  },
  {
    numeral: 'X',
    symbol: '🌌',
    name: 'The Mythic Quest',
    tagline: 'Destiny Across Ancient Horizons',
    meaning: 'A grand odyssey across breathtaking lands, ancient prophecies, and the courage to forge your own legend.',
    genre: 'fantasy'
  },
  {
    numeral: 'XI',
    symbol: '🧬',
    name: 'The Living Archive',
    tagline: 'Ideas That Reshape Human History',
    meaning: 'A collision of science, history, and human curiosity that pulls back the curtain on the mysteries of civilization.',
    genre: 'nonfiction'
  }
];

// Rich Curated Books Catalog with Open Library ISBNs and CliffNotes Study Capsules
const BOOKS_CATALOG = [
  {
    id: 'piranesi',
    title: 'Piranesi',
    author: 'Susanna Clarke',
    isbn: '9781635575637',
    coverFallback: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80',
    genres: ['fantasy', 'literary'],
    vibe: 'deep',
    pacing: 'balanced',
    synopsis: 'Piranesi lives in the House. Perhaps he always has. In his notebooks he day by day records its wonders: the labyrinth of halls, the thousands of statues, the tides that rush up staircases.',
    matchReason: 'A breathtakingly atmospheric literary mystery with profound philosophical depth.',
    destinyText: '"The Beauty of the House is immeasurable; its Kindness infinite. A sacred labyrinth that mirrors your quest for truth."',
    capsule: {
      themes: ['Solitude vs. Isolation', 'The Holiness of Nature & Wonder', 'Corruption of Ambition & Power'],
      quote: '"The Beauty of the House is immeasurable; its Kindness infinite."',
      characters: [
        { name: 'Piranesi', role: 'The Protagonist — innocent, observant scholar of the House' },
        { name: 'The Other', role: 'The Rival — ambitious, arrogant seeker of worldly power' }
      ],
      discussion: 'How does Piranesi’s unconditional gratitude contrast with our modern obsession with conquering our environment?'
    }
  },
  {
    id: 'project-hail-mary',
    title: 'Project Hail Mary',
    author: 'Andy Weir',
    isbn: '9780593135204',
    coverFallback: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=400&q=80',
    genres: ['fantasy'],
    vibe: 'escapist',
    pacing: 'brisk',
    synopsis: 'Ryland Grace is the sole survivor on a desperate, last-chance mission—and if he fails, humanity and the earth itself will perish.',
    matchReason: 'Unstoppable scientific optimism, high-stakes space survival, and one of modern fiction’s greatest friendships.',
    destinyText: '"Alone in the void of space, you discover that interstellar survival hinges on the courage of cross-species connection."',
    capsule: {
      themes: ['Scientific Ingenuity', 'Altruism Across Differences', 'The Will to Survive'],
      quote: '"I am terrifying space monster. You are leaky space blob."',
      characters: [
        { name: 'Ryland Grace', role: 'Reluctant middle-school teacher turned humanity’s last astronaut' },
        { name: 'Rocky', role: 'Ingenious, loyal five-legged alien engineer' }
      ],
      discussion: 'Why is optimism and curiosity often more potent than fear when facing existential extinction?'
    }
  },
  {
    id: 'the-silent-patient',
    title: 'The Silent Patient',
    author: 'Alex Michaelides',
    isbn: '9781250301696',
    coverFallback: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=400&q=80',
    genres: ['thriller'],
    vibe: 'dark',
    pacing: 'brisk',
    synopsis: 'Alicia Berenson’s life is seemingly perfect. One evening she shoots her husband five times in the face, and then never speaks another word.',
    matchReason: 'Gripping psychological labyrinth filled with Greek tragedy motifs and an earth-shattering twist.',
    destinyText: '"Silence is a scream wrapped in memory. Unravel the locked truth before the mind consumes itself."',
    capsule: {
      themes: ['Trauma & Silence', 'Obsession & Transference', 'Myth of Alcestis'],
      quote: '"One of the hardest things to admit is that we weren’t loved when we needed it most."',
      characters: [
        { name: 'Alicia Berenson', role: 'Celebrated painter who murdered her husband in cold blood' },
        { name: 'Theo Faber', role: 'Psychotherapist obsessed with uncovering her motive' }
      ],
      discussion: 'How does childhood neglect warp adult perception, and who was truly the patient in the room?'
    }
  },
  {
    id: 'house-in-the-cerulean-sea',
    title: 'The House in the Cerulean Sea',
    author: 'TJ Klune',
    isbn: '9781250217288',
    coverFallback: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80',
    genres: ['fantasy', 'literary'],
    vibe: 'cozy',
    pacing: 'balanced',
    synopsis: 'Linus Baker is a by-the-book caseworker at the Department in Charge of Magical Youth. He’s tasked with a highly classified assignment on a secluded island orphanage.',
    matchReason: 'A heartwarming, uplifting embrace of found family and standing up for the misunderstood.',
    destinyText: '"A warm blanket for the heart. An island where eccentric magical children teach a bureaucrat how to feel alive."',
    capsule: {
      themes: ['Chosen Family & Acceptance', 'Bureaucracy vs. Compassion', 'Celebrating Difference'],
      quote: '"Change often starts with the smallest of whispers. Like-minded people standing up together."',
      characters: [
        { name: 'Linus Baker', role: 'Rigid caseworker whose heart expands tenfold' },
        { name: 'Arthur Parnassus', role: 'Fiercely protective master of the orphanage' }
      ],
      discussion: 'How does systemic prejudice masquerade as "polite policy" in our daily institutions?'
    }
  },
  {
    id: 'tomorrow-and-tomorrow',
    title: 'Tomorrow, and Tomorrow, and Tomorrow',
    author: 'Gabrielle Zevin',
    isbn: '9780593321201',
    coverFallback: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=400&q=80',
    genres: ['literary'],
    vibe: 'deep',
    pacing: 'balanced',
    synopsis: 'On a bitter-cold day, Sam Masur exits a subway car and sees Sadie Green. Thus begins a legendary collaboration in video game design that will catapult them to stardom.',
    matchReason: 'A profound exploration of creative partnership, lifelong friendship, and grief across thirty years.',
    destinyText: '"To play a game is to believe in second chances. An ode to creativity, collaboration, and enduring love."',
    capsule: {
      themes: ['Creative Intimacy & Complicity', 'Grief & Resilience', 'Play as Healing'],
      quote: '"There is a time for any fledgling artist when one’s taste exceeds one’s abilities."',
      characters: [
        { name: 'Sam Masur', role: 'Brilliant game architect burdened by physical pain' },
        { name: 'Sadie Green', role: 'Visionary coder wrestling with depression and sexism' }
      ],
      discussion: 'Why is platonic creative partnership often more emotionally intense than romantic love?'
    }
  },
  {
    id: 'fourth-wing',
    title: 'Fourth Wing',
    author: 'Rebecca Yarros',
    isbn: '9781649374042',
    coverFallback: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=400&q=80',
    genres: ['fantasy', 'romance'],
    vibe: 'gripping',
    pacing: 'brisk',
    synopsis: 'Twenty-year-old Violet Sorrengail was supposed to enter the quiet Scribe Quadrant. Instead, the commanding general orders her to join the deadly dragon riders.',
    matchReason: 'Relentless pacing, fierce dragons, deadly academy trials, and undeniable romantic tension.',
    destinyText: '"A dragon without its rider is a tragedy. A rider without their dragon is dead. Climb or perish."',
    capsule: {
      themes: ['Survival of the Underdog', 'Forbidden Desire & Trust', 'The Weight of Family Expectation'],
      quote: '"I will not die today. Hope is a fickle, dangerous thing."',
      characters: [
        { name: 'Violet Sorrengail', role: 'Clever, frail cadet defying the brutal death odds' },
        { name: 'Xaden Riorson', role: 'Lethal wing leader harboring rebel secrets' }
      ],
      discussion: 'How does physical vulnerability force characters to rely on mental agility and strategic alliances?'
    }
  },
  {
    id: 'yellowface',
    title: 'Yellowface',
    author: 'R.F. Kuang',
    isbn: '9780063250833',
    coverFallback: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=400&q=80',
    genres: ['literary', 'thriller'],
    vibe: 'dark',
    pacing: 'brisk',
    synopsis: 'When darling author Athena Liu dies in a freak accident, jealous friend June Hayward steals her unfinished manuscript about Chinese laborers in WWI and publishes it as her own.',
    matchReason: 'A razor-sharp, satirical, and uncomfortably addictive look at publishing, cultural appropriation, and internet outrage.',
    destinyText: '"Envy is a poison that tastes like ambition. How far will you run with a stolen ghost?"',
    capsule: {
      themes: ['Cultural Theft & Ownership', 'The Machine of Publishing', 'Social Media Lynch Mobs'],
      quote: '"Writing is a fundamentally isolated, lonely thing. Theft makes it a spectator sport."',
      characters: [
        { name: 'June Hayward (Juniper Song)', role: 'Unreliable, defensively envious narrator' },
        { name: 'Athena Liu', role: 'Dazzling literary prodigy whose shadow looms large' }
      ],
      discussion: 'At what point does "artistic freedom" cross into predatory cultural exploitation?'
    }
  },
  {
    id: 'atomic-habits',
    title: 'Atomic Habits',
    author: 'James Clear',
    isbn: '9780735211292',
    coverFallback: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=400&q=80',
    genres: ['nonfiction'],
    vibe: 'deep',
    pacing: 'brisk',
    synopsis: 'A comprehensive, practical guide on how to change your habits and get 1% better every day through tiny, compounding actions.',
    matchReason: 'Transformative non-fiction that demystifies personal behavior and habit loops.',
    destinyText: '"You do not rise to the level of your goals. You fall to the level of your systems."',
    capsule: {
      themes: ['Identity-Based Habits', 'The 1% Compounding Rule', 'Environment Design'],
      quote: '"You do not rise to the level of your goals. You fall to the level of your systems."',
      characters: [
        { name: 'The Practitioner', role: 'Anyone seeking deliberate compound growth' }
      ],
      discussion: 'Why is focusing on who you want to become far more durable than focusing on what you want to achieve?'
    }
  }
];

// Curated Project Gutenberg Public Domain Classics
const CURATED_GUTENBERG = [
  {
    id: 84,
    title: 'Frankenstein; Or, The Modern Prometheus',
    author: 'Mary Wollstonecraft Shelley',
    year: '1818',
    subjects: 'Gothic Fiction, Science Fiction, Promethean Myth',
    coverUrl: 'https://www.gutenberg.org/cache/epub/84/pg84.cover.medium.jpg',
    readUrl: 'https://www.gutenberg.org/files/84/84-h/84-h.htm',
    epubUrl: 'https://www.gutenberg.org/ebooks/84.epub3.images'
  },
  {
    id: 1342,
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    year: '1813',
    subjects: 'Classic Romance, Social Satire, Regency England',
    coverUrl: 'https://www.gutenberg.org/cache/epub/1342/pg1342.cover.medium.jpg',
    readUrl: 'https://www.gutenberg.org/files/1342/1342-h/1342-h.htm',
    epubUrl: 'https://www.gutenberg.org/ebooks/1342.epub3.images'
  },
  {
    id: 345,
    title: 'Dracula',
    author: 'Bram Stoker',
    year: '1897',
    subjects: 'Vampire Horror, Epistolary Mystery, Transylvania',
    coverUrl: 'https://www.gutenberg.org/cache/epub/345/pg345.cover.medium.jpg',
    readUrl: 'https://www.gutenberg.org/files/345/345-h/345-h.htm',
    epubUrl: 'https://www.gutenberg.org/ebooks/345.epub3.images'
  },
  {
    id: 174,
    title: 'The Picture of Dorian Gray',
    author: 'Oscar Wilde',
    year: '1890',
    subjects: 'Aestheticism, Moral Corruption, Gothic Suspense',
    coverUrl: 'https://www.gutenberg.org/cache/epub/174/pg174.cover.medium.jpg',
    readUrl: 'https://www.gutenberg.org/files/174/174-h/174-h.htm',
    epubUrl: 'https://www.gutenberg.org/ebooks/174.epub3.images'
  },
  {
    id: 1661,
    title: 'The Adventures of Sherlock Holmes',
    author: 'Arthur Conan Doyle',
    year: '1892',
    subjects: 'Detective Fiction, Logic & Deduction, Victorian London',
    coverUrl: 'https://www.gutenberg.org/cache/epub/1661/pg1661.cover.medium.jpg',
    readUrl: 'https://www.gutenberg.org/files/1661/1661-h/1661-h.htm',
    epubUrl: 'https://www.gutenberg.org/ebooks/1661.epub3.images'
  },
  {
    id: 11,
    title: 'Alice’s Adventures in Wonderland',
    author: 'Lewis Carroll',
    year: '1865',
    subjects: 'Whimsical Fantasy, Surreal Satire, Wonderland',
    coverUrl: 'https://www.gutenberg.org/cache/epub/11/pg11.cover.medium.jpg',
    readUrl: 'https://www.gutenberg.org/files/11/11-h/11-h.htm',
    epubUrl: 'https://www.gutenberg.org/ebooks/11.epub3.images'
  }
];

// Quiz Questions
const QUIZ_QUESTIONS = [
  {
    prompt: 'What vibe are you craving right now?',
    subtitle: 'Choose the atmosphere that resonates with your current mood.',
    key: 'vibe',
    options: [
      { text: 'Cozy & Comforting', desc: 'Warm tea, gentle pacing, heartwarming characters', icon: '☕', val: 'cozy' },
      { text: 'Dark & Atmospheric', desc: 'Haunted houses, morally gray minds, brooding secrets', icon: '🕯️', val: 'dark' },
      { text: 'Pure Escapism & Wonder', desc: 'Magic portals, grand horizons, mind-bending concepts', icon: '🌌', val: 'escapist' },
      { text: 'Deep & Philosophical', desc: 'Questions about reality, humanity, and existence', icon: '🏛️', val: 'deep' },
      { text: 'Gripping & Heart-Pounding', desc: 'Cannot put it down, high stakes, adrenaline', icon: '⚡', val: 'gripping' }
    ]
  },
  {
    prompt: 'Which genre calls to you today?',
    subtitle: 'Where does your imagination want to travel?',
    key: 'genre',
    options: [
      { text: 'Sci-Fi & Fantasy', desc: 'Dragons, AI, magic, alien skies', icon: '🐉', val: 'fantasy' },
      { text: 'Mystery & Psychological Thriller', desc: 'Twists, whodunits, unreliable narrators', icon: '🔍', val: 'thriller' },
      { text: 'Literary Fiction', desc: 'Beautiful prose, character studies, emotional journeys', icon: '✍️', val: 'literary' },
      { text: 'Romance & Romantasy', desc: 'Slow-burn chemistry, enemies-to-lovers, longing', icon: '❤️', val: 'romance' },
      { text: 'Non-Fiction & Wisdom', desc: 'Habits, psychology, extraordinary history', icon: '🧠', val: 'nonfiction' }
    ]
  },
  {
    prompt: 'What pacing and story length fit your schedule?',
    subtitle: 'How quickly do you want the narrative to move?',
    key: 'pacing',
    options: [
      { text: 'Brisk & Page-Turning', desc: 'Short chapters, relentless momentum (under 350 pages)', icon: '⚡', val: 'brisk' },
      { text: 'Balanced & Immersive', desc: 'Room to breathe with steady narrative progress', icon: '📖', val: 'balanced' },
      { text: 'Sweeping Epic', desc: 'Massive worldbuilding, complex timelines (500+ pages)', icon: '🏰', val: 'epic' }
    ]
  }
];

// ========================================================
// 2. STATE & CONFIGURATION
// ========================================================
let amazonTag = localStorage.getItem('carrie_amazon_tag') || 'carrie-20';
let readingShelf = JSON.parse(localStorage.getItem('carrie_reading_shelf') || '[]');

let currentQuerent = TAROT_QUERENTS[0];
let currentCrucible = TAROT_CRUCIBLES[0];
let currentDestinyBook = BOOKS_CATALOG[0];

let activeQuizIndex = 0;
let quizAnswers = {};

// ========================================================
// 3. DOM ELEMENTS
// ========================================================
const navTabs = document.querySelectorAll('.nav-tab');
const contentViews = document.querySelectorAll('.content-view');

// Tarot Elements
const shuffleDrawBtn = document.getElementById('shuffleDrawBtn');
const resetOracleBtn = document.getElementById('resetOracleBtn');
const tarotCard1 = document.getElementById('tarotCard1');
const tarotCard2 = document.getElementById('tarotCard2');
const tarotCard3 = document.getElementById('tarotCard3');
const card1Symbol = document.getElementById('card1Symbol');
const card1Name = document.getElementById('card1Name');
const card1Tagline = document.getElementById('card1Tagline');
const card1Meaning = document.getElementById('card1Meaning');
const card2Symbol = document.getElementById('card2Symbol');
const card2Name = document.getElementById('card2Name');
const card2Tagline = document.getElementById('card2Tagline');
const card2Meaning = document.getElementById('card2Meaning');
const card3CoverImg = document.getElementById('card3CoverImg');
const card3BookTitle = document.getElementById('card3BookTitle');
const card3BookAuthor = document.getElementById('card3BookAuthor');
const card3DestinyText = document.getElementById('card3DestinyText');
const fatedCapsuleBtn = document.getElementById('fatedCapsuleBtn');
const fatedAmazonBtn = document.getElementById('fatedAmazonBtn');
const divinationSynthesis = document.getElementById('divinationSynthesis');
const synthesisTitle = document.getElementById('synthesisTitle');
const synthesisText = document.getElementById('synthesisText');

// Quiz Elements
const quizStepIndicator = document.getElementById('quizStepIndicator');
const progressBarFill = document.getElementById('progressBarFill');
const questionPrompt = document.getElementById('questionPrompt');
const questionSubtitle = document.getElementById('questionSubtitle');
const optionsGrid = document.getElementById('optionsGrid');
const prevQuestionBtn = document.getElementById('prevQuestionBtn');
const nextQuestionBtn = document.getElementById('nextQuestionBtn');
const quizResultsContainer = document.getElementById('quizResultsContainer');
const quizResultsGrid = document.getElementById('quizResultsGrid');
const retakeQuizBtn = document.getElementById('retakeQuizBtn');

// Gutenberg Elements
const gutenbergSearchInput = document.getElementById('gutenbergSearchInput');
const gutenbergSearchBtn = document.getElementById('gutenbergSearchBtn');
const gutenbergGrid = document.getElementById('gutenbergGrid');

// Library Elements
const librarySearchInput = document.getElementById('librarySearchInput');
const genreFilterSelect = document.getElementById('genreFilterSelect');
const allBooksGrid = document.getElementById('allBooksGrid');

// Modals
const capsuleModal = document.getElementById('capsuleModal');
const closeCapsuleBtn = document.getElementById('closeCapsuleBtn');
const capsuleContent = document.getElementById('capsuleContent');

const readerModal = document.getElementById('readerModal');
const closeReaderBtn = document.getElementById('closeReaderBtn');
const readerBookTitle = document.getElementById('readerBookTitle');
const readerBookAuthor = document.getElementById('readerBookAuthor');
const readerViewport = document.getElementById('readerViewport');
const readerDownloadEpubLink = document.getElementById('readerDownloadEpubLink');

const shelfDrawer = document.getElementById('shelfDrawer');
const shelfDrawerBtn = document.getElementById('shelfDrawerBtn');
const closeShelfBtn = document.getElementById('closeShelfBtn');
const shelfItemsList = document.getElementById('shelfItemsList');
const shelfBadge = document.getElementById('shelfBadge');

const affiliateModal = document.getElementById('affiliateModal');
const affiliateConfigBtn = document.getElementById('affiliateConfigBtn');
const closeAffiliateBtn = document.getElementById('closeAffiliateBtn');
const affiliateTagInput = document.getElementById('affiliateTagInput');
const saveAffiliateBtn = document.getElementById('saveAffiliateBtn');

// ========================================================
// 4. INITIALIZATION
// ========================================================
function init() {
  setupNavigation();
  setupTarot();
  setupQuiz();
  setupGutenberg();
  setupLibrary();
  setupModals();
  updateShelfBadge();

  // Draw initial Tarot cards
  drawTarotCards(false);
}

// ========================================================
// 5. NAVIGATION BETWEEN TABS
// ========================================================
function setupNavigation() {
  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      navTabs.forEach(t => t.classList.remove('active'));
      contentViews.forEach(v => v.classList.add('hidden'));

      tab.classList.add('active');
      const tabName = tab.dataset.tab;
      document.getElementById(`${tabName}Section`).classList.remove('hidden');

      if (tabName === 'gutenberg' && gutenbergGrid.children.length <= 1) {
        renderGutenbergBooks(CURATED_GUTENBERG);
      }
    });
  });
}

// ========================================================
// 6. THE LITERARY TAROT (BIBLIOMANCY)
// ========================================================
function setupTarot() {
  shuffleDrawBtn.addEventListener('click', () => drawTarotCards(true));
  resetOracleBtn.addEventListener('click', () => {
    [tarotCard1, tarotCard2, tarotCard3].forEach(c => c.classList.remove('flipped'));
    divinationSynthesis.classList.add('hidden');
    resetOracleBtn.classList.add('hidden');
    shuffleDrawBtn.classList.remove('hidden');
  });

  // Tap to flip individual cards
  [tarotCard1, tarotCard2, tarotCard3].forEach(card => {
    card.addEventListener('click', () => {
      card.classList.toggle('flipped');
      checkAllFlipped();
    });
  });

  fatedCapsuleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openStudyCapsule(currentDestinyBook);
  });
}

function drawTarotCards(withAnimation = true) {
  // Randomly select 3 cards
  currentQuerent = TAROT_QUERENTS[Math.floor(Math.random() * TAROT_QUERENTS.length)];
  currentCrucible = TAROT_CRUCIBLES[Math.floor(Math.random() * TAROT_CRUCIBLES.length)];

  // Pick matching book or random book
  const matches = BOOKS_CATALOG.filter(b => b.vibe === currentQuerent.vibe || b.genres.includes(currentCrucible.genre));
  currentDestinyBook = matches.length > 0 
    ? matches[Math.floor(Math.random() * matches.length)]
    : BOOKS_CATALOG[Math.floor(Math.random() * BOOKS_CATALOG.length)];

  // Populate Card 1
  card1Symbol.textContent = currentQuerent.symbol;
  card1Name.textContent = currentQuerent.name;
  card1Tagline.textContent = currentQuerent.tagline;
  card1Meaning.textContent = currentQuerent.meaning;

  // Populate Card 2
  card2Symbol.textContent = currentCrucible.symbol;
  card2Name.textContent = currentCrucible.name;
  card2Tagline.textContent = currentCrucible.tagline;
  card2Meaning.textContent = currentCrucible.meaning;

  // Populate Card 3 (Book)
  card3BookTitle.textContent = currentDestinyBook.title;
  card3BookAuthor.textContent = `by ${currentDestinyBook.author}`;
  card3DestinyText.textContent = currentDestinyBook.destinyText;
  
  // Real Open Library Cover with Fallback
  const openLibraryUrl = `https://covers.openlibrary.org/b/isbn/${currentDestinyBook.isbn}-L.jpg?default=false`;
  card3CoverImg.src = openLibraryUrl;
  card3CoverImg.onerror = () => { card3CoverImg.src = currentDestinyBook.coverFallback; };

  // Amazon Affiliate URL
  fatedAmazonBtn.href = generateAmazonUrl(currentDestinyBook);

  // Populate Synthesis
  synthesisTitle.textContent = `${currentQuerent.name} in ${currentCrucible.name}`;
  synthesisText.textContent = `The cards divine that your reading soul is currently aligned with ${currentQuerent.name}. You are summoned to conquer ${currentCrucible.name}. Therefore, destiny bestows upon you "${currentDestinyBook.title}" by ${currentDestinyBook.author}. May its pages enlighten your journey.`;

  if (withAnimation) {
    // Unflip all cards first
    [tarotCard1, tarotCard2, tarotCard3].forEach(c => c.classList.remove('flipped'));
    divinationSynthesis.classList.add('hidden');

    // Sequential dramatic flip
    setTimeout(() => tarotCard1.classList.add('flipped'), 300);
    setTimeout(() => tarotCard2.classList.add('flipped'), 800);
    setTimeout(() => {
      tarotCard3.classList.add('flipped');
      divinationSynthesis.classList.remove('hidden');
      resetOracleBtn.classList.remove('hidden');
      shuffleDrawBtn.classList.add('hidden');

      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 }
      });
    }, 1400);
  }
}

function checkAllFlipped() {
  const allFlipped = [tarotCard1, tarotCard2, tarotCard3].every(c => c.classList.contains('flipped'));
  if (allFlipped) {
    divinationSynthesis.classList.remove('hidden');
    resetOracleBtn.classList.remove('hidden');
    shuffleDrawBtn.classList.add('hidden');
  }
}

// ========================================================
// 7. CLASSIC QUIZ ENGINE
// ========================================================
function setupQuiz() {
  renderQuestion(0);

  nextQuestionBtn.addEventListener('click', () => {
    if (activeQuizIndex < QUIZ_QUESTIONS.length - 1) {
      activeQuizIndex++;
      renderQuestion(activeQuizIndex);
    } else {
      showQuizResults();
    }
  });

  prevQuestionBtn.addEventListener('click', () => {
    if (activeQuizIndex > 0) {
      activeQuizIndex--;
      renderQuestion(activeQuizIndex);
    }
  });

  retakeQuizBtn.addEventListener('click', () => {
    activeQuizIndex = 0;
    quizAnswers = {};
    quizResultsContainer.classList.add('hidden');
    document.getElementById('quizQuestionCard').parentElement.classList.remove('hidden');
    renderQuestion(0);
  });
}

function renderQuestion(index) {
  const q = QUIZ_QUESTIONS[index];
  quizStepIndicator.textContent = `Question ${index + 1} of ${QUIZ_QUESTIONS.length}`;
  progressBarFill.style.width = `${((index + 1) / QUIZ_QUESTIONS.length) * 100}%`;

  questionPrompt.textContent = q.prompt;
  questionSubtitle.textContent = q.subtitle;

  prevQuestionBtn.disabled = index === 0;
  nextQuestionBtn.disabled = !quizAnswers[q.key];

  optionsGrid.innerHTML = q.options.map(opt => `
    <button class="option-btn ${quizAnswers[q.key] === opt.val ? 'selected' : ''}" data-val="${opt.val}">
      <span class="option-icon">${opt.icon}</span>
      <div class="option-text">
        <strong>${opt.text}</strong>
        <span>${opt.desc}</span>
      </div>
    </button>
  `).join('');

  optionsGrid.querySelectorAll('.option-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      quizAnswers[q.key] = btn.dataset.val;
      optionsGrid.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      nextQuestionBtn.disabled = false;
    });
  });
}

function showQuizResults() {
  document.getElementById('quizQuestionCard').parentElement.classList.add('hidden');
  quizResultsContainer.classList.remove('hidden');

  // Score books
  const scored = BOOKS_CATALOG.map(book => {
    let score = 50;
    if (book.vibe === quizAnswers.vibe) score += 25;
    if (book.genres.includes(quizAnswers.genre)) score += 20;
    if (book.pacing === quizAnswers.pacing) score += 10;
    return { ...book, matchPct: Math.min(score, 99) };
  }).sort((a, b) => b.matchPct - a.matchPct);

  quizResultsGrid.innerHTML = scored.slice(0, 4).map(book => renderBookCardHTML(book, true)).join('');
  attachBookCardHandlers(quizResultsGrid);

  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.5 }
  });
}

// ========================================================
// 8. PROJECT GUTENBERG PRESS VAULT (GUTENDEX API)
// ========================================================
function setupGutenberg() {
  renderGutenbergBooks(CURATED_GUTENBERG);

  gutenbergSearchBtn.addEventListener('click', () => executeGutenbergSearch());
  gutenbergSearchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') executeGutenbergSearch();
  });
}

function renderGutenbergBooks(books) {
  gutenbergGrid.innerHTML = books.map(book => `
    <article class="gutenberg-card">
      <div class="gutenberg-card-top">
        <img src="${book.coverUrl || 'https://www.gutenberg.org/cache/epub/84/pg84.cover.medium.jpg'}" alt="${book.title}" class="gutenberg-thumb" loading="lazy">
        <div class="gutenberg-meta">
          <h4>${book.title}</h4>
          <span>by ${book.author} (${book.year || 'Classic'})</span>
          <span class="gutenberg-downloads">🏛️ Project Gutenberg #${book.id}</span>
        </div>
      </div>
      <div class="gutenberg-actions">
        <button class="btn btn-outline btn-sm read-classic-btn" data-id="${book.id}" data-title="${book.title}" data-author="${book.author}" data-url="${book.readUrl}" data-epub="${book.epubUrl}">
          📖 Read Online Free
        </button>
        <a href="${book.epubUrl || `https://www.gutenberg.org/ebooks/${book.id}.epub3.images`}" target="_blank" class="btn btn-ghost btn-sm">
          📥 EPUB
        </a>
      </div>
    </article>
  `).join('');

  gutenbergGrid.querySelectorAll('.read-classic-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      openEbookReader({
        title: btn.dataset.title,
        author: btn.dataset.author,
        readUrl: btn.dataset.url,
        epubUrl: btn.dataset.epub
      });
    });
  });
}

async function executeGutenbergSearch() {
  const query = gutenbergSearchInput.value.trim();
  if (!query) return;

  gutenbergGrid.innerHTML = `<div class="loading-spinner">Searching Gutenberg archives for "${query}"...</div>`;

  try {
    const res = await fetch(`https://gutendex.com/books/?search=${encodeURIComponent(query)}`);
    const data = await res.json();
    
    if (!data.results || data.results.length === 0) {
      gutenbergGrid.innerHTML = `<div class="empty-shelf">No classics found for "${query}". Try searching for Frankenstein, Dracula, or Austen.</div>`;
      return;
    }

    const transformed = data.results.slice(0, 12).map(item => ({
      id: item.id,
      title: item.title,
      author: item.authors[0] ? item.authors[0].name : 'Unknown Author',
      year: item.authors[0] ? item.authors[0].birth_year : '',
      coverUrl: item.formats['image/jpeg'] || `https://www.gutenberg.org/cache/epub/${item.id}/pg${item.id}.cover.medium.jpg`,
      readUrl: item.formats['text/html'] || item.formats['text/plain; charset=utf-8'],
      epubUrl: item.formats['application/epub+zip'] || `https://www.gutenberg.org/ebooks/${item.id}.epub3.images`
    }));

    renderGutenbergBooks(transformed);
  } catch (err) {
    gutenbergGrid.innerHTML = `<div class="empty-shelf">Could not connect to Gutenberg server. Showing curated classics.</div>`;
    setTimeout(() => renderGutenbergBooks(CURATED_GUTENBERG), 2000);
  }
}

// ========================================================
// 9. MODERN CATALOG LIBRARY
// ========================================================
function setupLibrary() {
  renderLibraryBooks(BOOKS_CATALOG);

  librarySearchInput.addEventListener('input', filterLibrary);
  genreFilterSelect.addEventListener('change', filterLibrary);
}

function filterLibrary() {
  const query = librarySearchInput.value.toLowerCase().trim();
  const selectedGenre = genreFilterSelect.value;

  const filtered = BOOKS_CATALOG.filter(book => {
    const matchesQuery = book.title.toLowerCase().includes(query) ||
      book.author.toLowerCase().includes(query) ||
      book.synopsis.toLowerCase().includes(query);
    const matchesGenre = selectedGenre === 'all' || book.genres.includes(selectedGenre);
    return matchesQuery && matchesGenre;
  });

  renderLibraryBooks(filtered);
}

function renderLibraryBooks(books) {
  if (books.length === 0) {
    allBooksGrid.innerHTML = `<div class="empty-shelf" style="grid-column: 1 / -1;">No books matched your search.</div>`;
    return;
  }
  allBooksGrid.innerHTML = books.map(book => renderBookCardHTML(book, false)).join('');
  attachBookCardHandlers(allBooksGrid);
}

function renderBookCardHTML(book, showMatch = false) {
  const isSaved = readingShelf.some(b => b.id === book.id);
  const openLibraryUrl = `https://covers.openlibrary.org/b/isbn/${book.isbn}-M.jpg?default=false`;

  return `
    <article class="book-card" data-id="${book.id}">
      <div class="book-card-header">
        <img src="${openLibraryUrl}" alt="${book.title}" class="book-cover-img" onerror="this.src='${book.coverFallback}'" loading="lazy">
        <div class="book-header-info">
          ${showMatch ? `<span class="book-match-badge">${book.matchPct}% Match</span>` : ''}
          <h3 class="book-title">${book.title}</h3>
          <span class="book-author">by ${book.author}</span>
          <div class="book-genres">
            ${book.genres.map(g => `<span class="genre-tag">${g}</span>`).join('')}
          </div>
        </div>
      </div>

      <p class="book-synopsis">${book.synopsis}</p>
      
      ${showMatch ? `<div class="book-match-reason">💡 <strong>Why it matches:</strong> ${book.matchReason}</div>` : ''}

      <div class="book-card-footer">
        <button class="btn btn-outline btn-sm open-capsule-btn" data-id="${book.id}">
          📑 Capsule
        </button>
        <a href="${generateAmazonUrl(book)}" target="_blank" class="btn btn-primary btn-sm">
          🛒 Amazon
        </a>
        <button class="btn-save-shelf ${isSaved ? 'saved' : ''}" data-id="${book.id}" title="${isSaved ? 'Saved to Shelf' : 'Save to Shelf'}">
          ${isSaved ? '❤️' : '🤍'}
        </button>
      </div>
    </article>
  `;
}

function attachBookCardHandlers(container) {
  container.querySelectorAll('.open-capsule-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const book = BOOKS_CATALOG.find(b => b.id === btn.dataset.id);
      if (book) openStudyCapsule(book);
    });
  });

  container.querySelectorAll('.btn-save-shelf').forEach(btn => {
    btn.addEventListener('click', () => {
      toggleSaveShelf(btn.dataset.id, btn);
    });
  });
}

// ========================================================
// 10. CLIFFNOTES & QUIZLET STUDY CAPSULE MODAL
// ========================================================
function openStudyCapsule(book) {
  const cap = book.capsule;
  capsuleContent.innerHTML = `
    <div style="margin-bottom: 1.25rem;">
      <h2 style="font-family: var(--font-serif); font-size: 1.8rem; margin-bottom: 0.2rem;">${book.title}</h2>
      <span style="color: var(--gold); font-size: 0.9rem; font-weight: 600;">by ${book.author}</span>
    </div>

    <!-- Core Themes -->
    <div class="capsule-section">
      <h4>🎯 Core Themes & Motifs</h4>
      <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
        ${cap.themes.map(t => `<span class="genre-tag" style="background: rgba(212, 175, 55, 0.15); color: #ffd700; font-size: 0.82rem; padding: 0.35rem 0.75rem;">${t}</span>`).join('')}
      </div>
    </div>

    <!-- Iconic Quote -->
    <div class="capsule-section">
      <h4>💬 Iconic Quote</h4>
      <p class="capsule-quote">${cap.quote}</p>
    </div>

    <!-- Character Guide -->
    <div class="capsule-section">
      <h4>👥 Key Character Dossier</h4>
      <div class="capsule-grid">
        ${cap.characters.map(c => `
          <div class="capsule-grid-item">
            <strong>${c.name}</strong>
            <span>${c.role}</span>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Discussion & Study Takeaway -->
    <div class="capsule-section">
      <h4>🧠 Study Discussion Question</h4>
      <p style="font-size: 0.92rem; color: #e2e8f0; line-height: 1.6;">${cap.discussion}</p>
    </div>

    <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1rem;">
      <a href="${generateAmazonUrl(book)}" target="_blank" class="btn btn-primary">
        🛒 Buy Book on Amazon
      </a>
    </div>
  `;

  capsuleModal.classList.remove('hidden');
}

// ========================================================
// 11. IN-BROWSER GUTENBERG EBOOK READER
// ========================================================
function openEbookReader({ title, author, readUrl, epubUrl }) {
  readerBookTitle.textContent = title;
  readerBookAuthor.textContent = `${author} • Free Public Domain`;
  readerDownloadEpubLink.href = epubUrl;
  readerViewport.innerHTML = `<div class="reader-loading">Opening Gutenberg text stream for "${title}"...</div>`;
  readerModal.classList.remove('hidden');

  // Embed clean readable frame or proxy text
  readerViewport.innerHTML = `
    <div style="max-width: 680px; margin: 0 auto; text-align: left;">
      <p style="font-style: italic; color: var(--gold); margin-bottom: 1.5rem;">
        ✦ Project Gutenberg Complete Public Domain Edition ✦
      </p>
      <iframe src="${readUrl}" style="width: 100%; height: 55vh; border: none; background: #ffffff; border-radius: 8px;"></iframe>
    </div>
  `;
}

// ========================================================
// 12. READING SHELF & AMAZON AFFILIATE HELPERS
// ========================================================
function toggleSaveShelf(bookId, btn) {
  const index = readingShelf.findIndex(b => b.id === bookId);
  const book = BOOKS_CATALOG.find(b => b.id === bookId);

  if (index > -1) {
    readingShelf.splice(index, 1);
    if (btn) {
      btn.classList.remove('saved');
      btn.textContent = '🤍';
    }
  } else if (book) {
    readingShelf.push(book);
    if (btn) {
      btn.classList.add('saved');
      btn.textContent = '❤️';
    }
  }

  localStorage.setItem('carrie_reading_shelf', JSON.stringify(readingShelf));
  updateShelfBadge();
  renderShelfDrawer();
}

function updateShelfBadge() {
  shelfBadge.textContent = readingShelf.length;
}

function renderShelfDrawer() {
  if (readingShelf.length === 0) {
    shelfItemsList.innerHTML = `<div class="empty-shelf">Your shelf is empty! Save books by clicking the heart button on any book card.</div>`;
    return;
  }

  shelfItemsList.innerHTML = readingShelf.map(book => `
    <div class="shelf-item-card">
      <img src="https://covers.openlibrary.org/b/isbn/${book.isbn}-M.jpg" alt="${book.title}" class="gutenberg-thumb" onerror="this.src='${book.coverFallback}'">
      <div style="flex: 1;">
        <h4 style="font-size: 1rem; margin-bottom: 0.2rem;">${book.title}</h4>
        <span style="font-size: 0.8rem; color: var(--text-secondary);">${book.author}</span>
        <div style="display: flex; gap: 0.5rem; margin-top: 0.6rem;">
          <a href="${generateAmazonUrl(book)}" target="_blank" class="btn btn-primary btn-sm" style="font-size: 0.75rem; padding: 0.3rem 0.6rem;">🛒 Buy</a>
          <button class="btn btn-outline btn-sm remove-shelf-btn" data-id="${book.id}" style="font-size: 0.75rem; padding: 0.3rem 0.6rem;">Remove</button>
        </div>
      </div>
    </div>
  `).join('');

  shelfItemsList.querySelectorAll('.remove-shelf-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      toggleSaveShelf(btn.dataset.id, null);
    });
  });
}

function generateAmazonUrl(book) {
  const query = encodeURIComponent(`${book.title} ${book.author}`);
  return `https://www.amazon.com/s?k=${query}&tag=${amazonTag}`;
}

// Modal Listeners
function setupModals() {
  closeCapsuleBtn.addEventListener('click', () => capsuleModal.classList.add('hidden'));
  capsuleModal.addEventListener('click', (e) => {
    if (e.target === capsuleModal) capsuleModal.classList.add('hidden');
  });

  closeReaderBtn.addEventListener('click', () => readerModal.classList.add('hidden'));
  readerModal.addEventListener('click', (e) => {
    if (e.target === readerModal) readerModal.classList.add('hidden');
  });

  shelfDrawerBtn.addEventListener('click', () => {
    renderShelfDrawer();
    shelfDrawer.classList.remove('hidden');
  });
  closeShelfBtn.addEventListener('click', () => shelfDrawer.classList.add('hidden'));

  affiliateConfigBtn.addEventListener('click', () => {
    affiliateTagInput.value = amazonTag;
    affiliateModal.classList.remove('hidden');
  });
  closeAffiliateBtn.addEventListener('click', () => affiliateModal.classList.add('hidden'));
  saveAffiliateBtn.addEventListener('click', () => {
    amazonTag = affiliateTagInput.value.trim() || 'carrie-20';
    localStorage.setItem('carrie_amazon_tag', amazonTag);
    affiliateModal.classList.add('hidden');
    renderLibraryBooks(BOOKS_CATALOG);
  });
}

// Start
init();

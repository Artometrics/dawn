# Carrie / PageMatch — feature inventory

Original repo: `Artometrics/carrie` (deleted 13 Nov 2026 after a verified Drive backup).
Git tip restored here: `a734540001de` on `main` (noindex PR #1 on top of the Literary Tarot / Gutenberg / CliffNotes commit `8835e4f`).

One repo, three static sites. **Only the books side was meant to fold into Dawn.** PawCert (pets) already lives on Bagel; do not merge pets back into Dawn.

Dawn PR #40’s `/books` desk has Quiz / Library / Shelf — a 3-question match plus a short catalog — and explicitly says “Buy links and the pet certificates are not on this desk.” It is missing Literary Tarot, the Gutenberg press/reader, CliffNotes study capsules, affiliate settings, and the original typographic/literary chrome.

The README in this tree still advertises a “5-Question Quiz” and “35+ acclaimed bestsellers.” **That is not what the code does.** Trust `apps/books/main.js`: the shipped quiz has **three questions** and the modern catalog has **eight books**, plus six Gutenberg classics. The richer original is the *other tabs and tools*, not a hidden 5-question / 35-book engine.

---

## Apps in this repo

| Path | Site (retired) | Role |
| --- | --- | --- |
| `apps/books/` | https://carrie-books.web.app | **PageMatch** — this is the merger source |
| `apps/pets/` | https://carrie-pets.web.app | PawCert certificate studio — already folded into Bagel; leave it here only as reference |
| `portal/` | https://carrie-510519.web.app | Landing hub linking the two |

**Stack (books):** vanilla HTML / CSS / JS, Firebase Hosting, no build step required to run (`npm run dev:books` serves `apps/books` on port 3000). **Almost entirely client-side.** External calls: Open Library / Gutenberg cover and text URLs, and Amazon product links if the affiliate tag is set.

---

## PageMatch screens (`apps/books/`)

Four top-level tabs in `index.html` + two drawers/modals:

### 1. Literary Tarot (default tab, `data-tab="tarot"`)

This is not Aftercare’s 78-card deck. It is a **book-taste oracle**:

- Six **querents** (the reader’s present vibe): The Alchemist (deep), The Dreamer (cozy/wonder), The Shadow Seeker (dark), The Star Voyager (escapist), The Hermit (cozy/solace), The Rebel (gripping).
- Five **crucibles** (the story’s genre path): The Forbidden Labyrinth (thriller), The Slow Burn (romance), The Sanctuary (literary / found family), The Mythic Quest (fantasy), The Living Archive (nonfiction).
- Draw: shuffle three cards (`#tarotCard1/2/3`). Flip them; after all three are face-up, the app composes a reading from querent + crucible + meaning copy.
- Buttons: Shuffle & Draw, Reset Oracle.
- **Client-side only.**

A full merger should keep this as a first-class Books surface, not drop it because Dawn already has Aftercare tarot — the two oracles do different jobs.

### 2. Quiz (`data-tab="quiz"`)

Three questions, one key each:

1. **Vibe** — cozy, dark, escapist, deep, gripping (five options with short atmosphere copy).
2. **Genre** — fantasy, thriller, literary, romance, nonfiction.
3. **Pacing / length** — brisk (<350 pages), balanced, sweeping epic (500+).

Scoring (`showQuizResults`): start at 50, +25 exact vibe, +20 genre membership, +10 pacing, cap 99%. Top **four** books rendered as result cards. “Ask again” is just retaking the quiz.

This is the same 3-question shape Dawn already ported. The merger work is to keep it *and* restore everything around it, with the original card chrome and match-reason copy from the catalog.

### 3. Gutenberg Press Vault (`data-tab="gutenberg"`)

Curated Project Gutenberg classics (covers, HTML, EPUB from gutenberg.org):

1. Frankenstein
2. Pride and Prejudice
3. Dracula
4. The Picture of Dorian Gray
5. The Adventures of Sherlock Holmes
6. Alice’s Adventures in Wonderland

**In-page reader modal** (`#readerModal`): fetches/opens the HTML edition, font size A- / A+, sepia / night theme toggle. EPUB download URL is stored per title. **Needs the Gutenberg CDN at runtime** (public domain; no key, but it is a network dependency). Offline would need a cached copy, which this backup does not include.

### 4. Library (`data-tab="library"`)

Search modern titles by title, author, trope, or keyword. Genre filter: literary, plus the catalog’s other genres. Grid of book cards.

Modern catalog (8 titles), each with vibe, genres, pacing, tropes, a written matchReason, Open Library ISBN/cover, Amazon-ready buy URL, and a **CliffNotes-style study capsule**:

- Piranesi
- Project Hail Mary
- The Silent Patient
- The House in the Cerulean Sea
- Tomorrow, and Tomorrow, and Tomorrow
- Fourth Wing
- Yellowface
- Atomic Habits

### 5. Study capsules (`#capsuleModal`)

“Literary Study Capsule — CliffNotes · Key Themes · Study Takeaways.” Per-book `capsule` object includes themes and character notes (e.g. Sadie Green on *Tomorrow, and Tomorrow, and Tomorrow*). Opened from a book card. **Client-side**, original short study text — not a licensed CliffsNotes feed.

### 6. Personal shelf

`localStorage` key `carrie_reading_shelf`. Bookmark toggle on cards, badge counter, shelf drawer (`renderShelfDrawer`). Same idea as Dawn’s Shelf tab; keep the badge / drawer behavior.

### 7. Amazon affiliate settings

Default tag `carrie-20`, overridable in a settings modal and stored as `carrie_amazon_tag`. `generateAmazonUrl` builds buy links. **This is a business feature, not a paid API**, but it must not be silently re-enabled on a public Dawn desk without Kyle confirming the tag and whether Dawn should show buy links at all. The current Dawn desk turned them off on purpose.

### Other chrome

Dark / light literary theme toggle. All of the above is one single-page app (`main.js` + `style.css`).

---

## Pets and portal (do not fold into Dawn)

`apps/pets/` is PawCert: birth / gotcha / birthday / “100% Good Pet” / royal companion certificates, photo upload, four themes, 2400×1700 canvas PNG export, print stylesheet, sample pets. Already live on Bagel (`https://bagel-510519.web.app/pets/`). `portal/` is just the hub.

---

## Client vs backend

| Feature | Needs |
| --- | --- |
| Quiz, tarot oracle, shelf, library search, capsules, theme | Client only |
| Gutenberg covers, HTML reader, EPUB links | Public Gutenberg / cache |
| Open Library covers | Public Open Library |
| Amazon buttons | Affiliate tag (business decision, no API key in this repo) |
| PawCert | Client canvas; already on Bagel |

No server, no paid model, no account system in this repo.

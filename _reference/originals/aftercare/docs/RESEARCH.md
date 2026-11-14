# Aftercare - Research notes

Short and practical. Not legal advice: anything marked "verify" should be re-checked
before we rely on it commercially.

## 1. Tarot deck options (what art can we legally use?)

| Option | Status | Notes |
| --- | --- | --- |
| **Our own procedural / commissioned art** | Ours | Chosen for the MVP. 78 original SVG compositions generated from code, so there is zero provenance risk. |
| **Rider-Waite-Smith (RWS), 1909** | Original art is public domain | Illustrated by Pamela Colman Smith, published by William Rider & Son (London, 1909). Published before 1930, so US public domain; Smith died in 1951, so life+70 countries (UK / EU) cleared it from 2022. **Verify:** modern *colourised or restored* editions (for example the 1971 US Games printing and later re-coloured "restorations") can carry their own claims. Only use scans of an original 1909 printing, record the source URL, library and date fetched next to each file, and keep the file hash. |
| **Where 1909 scans live** | Archives | Wikimedia Commons categories for the 1909 RWS deck, the Internet Archive, and university special collections. Commons records the specific source scan and licence per file; prefer files that say "scan of 1909 original", and skip the recoloured ones. |
| **Pictorial Key to the Tarot (A. E. Waite, 1911)** | Public domain text | Fine to read and cite. We do not copy sentences from it; all meanings in `deck.json` are written fresh. |
| **Tarot de Marseille** (Dodal c.1701-15, Conver 1760) | Public domain designs | Pip cards are purely symbolic, which suits procedural art well. Good future direction for a second deck. |
| **Visconti-Sforza (15th century)** | Public domain | Historic and beautiful, but the surviving scans come from several museums with differing terms. Verify per image. |
| **Thoth (Crowley / Harris, 1938-43)** | Copyrighted | Do not use. |
| **Modern indie decks, Etsy decks, AI-clone decks of RWS** | Copyrighted | Do not use or imitate. |

Decision: ship original art now; keep an `art` field in the deck schema so a verified
1909 RWS scan can be swapped in per card later with a provenance record.

## 2. Numerology basics (what the MVP implements)

Modern Western numerology is usually credited to early 20th-century writers (for
example L. Dow Balliett) who tied the old idea that "numbers have character" to letters.
It is a reflective tradition, not a measurable science, and we present it that way.

- **Digit reduction**: add digits until one remains (29 -> 2+9 = 11 -> 1+1 = 2).
  **Master numbers** 11, 22 and 33 are usually kept instead of reduced.
- **Life path**: reduce month, day and year *separately*, add the three, reduce again
  (keeping masters). Example 1990-07-23: month 7, day 23 -> 5, year 1990 -> 19 -> 10 -> 1;
  7 + 5 + 1 = 13 -> 4.
- **Birthday number**: the day of the month, reduced.
- **Letter values** (Pythagorean): A J S = 1, B K T = 2, C L U = 3, D M V = 4, E N W = 5,
  F O X = 6, G P Y = 7, H Q Z = 8, I R = 9.
- **Expression (destiny)**: all letters of the full name. **Soul urge**: vowels only.
  **Personality**: consonants only. (MVP simplification: Y counts as a consonant.)
- **Personal year**: reduce birth month + birth day + the current year.
- **Tarot bridge** (our own, labelled as ours): life path *n* is paired with the major
  arcana numbered *n* (11 -> Justice, 22 -> The Fool, 33 -> The Lovers via 3+3 = 6).
  The **birth card** adds all digits of the birth date and folds the total into 0-21
  (a popular method in tarot circles); the **soul card** reduces that once more.

## 3. Similar apps (what they do, what we take, what we skip)

| App | Good at | We take | We avoid |
| --- | --- | --- | --- |
| Co-Star | Bold voice, social angle, birth chart | Strong voice and sharing | Fear-driven push notifications, harsh "you will..." tone |
| The Pattern | Deep personality "patterns" | Calm long-form framing, bottom-nav phone layout | Paywalled core content, dense jargon |
| Labyrinthos | Learn-tarot teaching, decks, cheerful tone | Card pages that teach, quizzes later | Copying their deck or card descriptions |
| Golden Thread Tarot, Biddy Tarot | Reading flow, journaling prompts | Question -> spread -> reflect -> save flow | Their meanings and branded spread names |
| Sanctuary, Nebula | Daily rituals, chat with readers | Daily-ritual feel | Pay-per-minute reader marketplaces (for now) |
| Notion / Are.na / Gyroscope | You as a database; maps of self | The "you are a collection of things" idea behind the second self | - |
| Letterboxd / Goodreads | Favourites as identity | Favorite movies and books as profile signal | Social-graph pressure |

## 4. What to avoid copying

- Published card descriptions, spread names or books (Waite, Crowley, Pollack, Greer,
  and every blog). Our deck text is original wording; readings are template-assembled
  from it.
- Any modern deck art, including "inspired by" tracings of RWS or Thoth line work.
- Other apps' logos, color systems, onboarding copy or illustration styles.
- Trademarked terms and spread names we are unsure about. Ours: "One Card",
  "Three Card" (Where you've been / where you are / what's opening) and "Celtic Cross"
  (a historic public-domain layout, positions renamed in our own words).
- Claims. No health, legal, financial or "will happen" predictions; no fear hooks; no
  ranking of religions. Keep a visible "for reflection and entertainment" note.
- Real person data in the repo and any secrets or keys.

## 5. Map data

- Natural Earth (naturalearthdata.com) is public domain. The `world-atlas` npm package
  (ISC licence) redistributes the 110m land topology. We convert it once, at build
  time, into a single SVG path using `topojson-client` and `d3-geo`.
- Built-in birthplaces are a hand-written list of well-known cities with approximate
  coordinates (facts, not copyrighted). No geocoding service is called, so no location
  leaves the device.

## 6. Tech notes for three.js tarot

- Cards: rounded extruded edge plus two alpha-tested planes (front / back); textures are
  rasterised from SVG on demand (max about 10 live card textures) to stay light on
  phones.
- Render on demand; cap pixel ratio at 2; honour `prefers-reduced-motion`.
- Provide a non-WebGL fallback and keyboard access (HTML list that mirrors the table).
- Headless browser tests need software GL (`--use-angle=swiftshader`).

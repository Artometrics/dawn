# Aftercare - Plan

Status: MVP built (see the PR); phases 2+ not started. Owner: Artometrics. Vision: Kyle.

## 1. Vision

Aftercare is an all-in-one spiritual and identity app. You tell it who you are
(name, date of birth, where you were born, the movies, books and things you love)
and it builds a **second self**: a profile you control and can share, with your
numbers, your tarot "birth card", and a map and constellation that show how
everything connects.

It is meant to be a warm, curious home for tarot, numerology, druid and tree lore,
fun facts, historical figures, and anything mystical, biblical or spiritual,
presented side by side the way a good almanac would: "here is what this tradition
says", never "here is what is true".

Later it grows into a marketplace (Goop / Depop flavoured), journaling, a
Tumblr-style blog for stories and comics, and community. None of that is in the MVP.

### Voice and guardrails

- Warm, playful, a bit wry. Never preachy, never converting. Every tradition is
  described as "tradition says...", with no ranking of religions or claims of truth.
- Readings are **for reflection and entertainment**. No medical, legal, financial or
  "this will happen" predictions. The footer note and each reading page say so.
- Local-first and private by default: nothing leaves the device in the MVP.
- Original wording and original art only (see `RESEARCH.md` for what we avoid copying).
- No secrets in the repo. Nothing from other projects or brands.

## 2. What exists today (kept)

The repo already has two apps. We keep both untouched.

| Path | What | Decision |
| --- | --- | --- |
| `web/` | Vite + React + Netlify (Identity, Postgres, Blobs, AI gateway). Journal, mood tracking, simple tarot, sun sign / life-path tools. Deployed from `main`. | Keep as is. It becomes the **account + sync backend** in Phase 2 (its `profiles` and `tarot_pulls` tables already match our model closely). We do not touch its deploy. |
| root (Expo) | Native app shell, kept for a future native release. | Keep, ignore. |
| `web/src/lib/calculators.ts` | sun sign, life path, moon phase | Ideas reused. The new numerology module reduces month, day and year separately (the common method) and handles master numbers with tests. |
| Brand | Name "Aftercare", Fraunces + Outfit type, soft pink | Kept as the base of the new art direction (see section 6). |

The MVP is a **new, self-contained Astro app in `site/`** (static output, three.js for the
tarot table). It needs no accounts, no database and no AI keys, so it can be built,
tested and reviewed without touching production. It is **not deployed** from this PR.

## 3. Phases

| Phase | Scope | Status |
| --- | --- | --- |
| 0 | Plan, research, mockups (desktop + mobile) | this PR |
| 1 (MVP) | Local-first `site/`: profile + "second self" with map and connections, full 78-card deck, 3D tarot table (one card, three card, Celtic Cross), saved readings, numerology / life path, share link, tests, screenshots | this PR |
| 2 | Accounts and sync (reuse `web/` Identity + Postgres), journal (linked to readings), real share pages, more numerology (compatibility, yearly cycle), moon and sun-sign pages | next |
| 3 | Knowledge hub: druid / Ogham trees, historical figures, fun facts, symbols from many traditions (Bible, Kabbalah, Norse, Celtic...), each as an editable "entry" that can link to cards and numbers | later |
| 4 | Marketplace (listings, makers, orders), moderation | later |
| 5 | Blog / comics (Tumblr-style), community, follows, comments | later |

### MVP: in

1. Profile form: name, date of birth, optional birth time, birth location (searchable
   built-in place list or click the map), favorite movies, books and things (each can
   get a theme and an optional place).
2. Second-self page: identity card, world map with saved pins, connection constellation
   (you, life path, sun sign, birth card, themes, favorites, places), per-section
   visibility toggles, share link (data lives in the link, nothing is uploaded).
3. Tarot: 78-card deck, original procedural art, 3D table with shuffle, deal, flip,
   hover / tilt, reversed cards; spreads: one card, three card, Celtic Cross; local
   saved readings with a note; deck browser and card detail pages.
4. Numerology: life path, birthday number, expression, soul urge, personality, personal
   year, each tied to a tarot card and to the profile.
5. Tests: unit (deck, numerology, spreads, shuffle), build, browser smoke test.
6. Docs: `PLAN.md`, `RESEARCH.md`, `URL_SHEET.md`, mockups, process screenshots.

### MVP: out (on purpose)

Accounts, server storage, payments, marketplace, blog, community, real journal
(mockup only), AI-written readings, push notifications, astrology charts (only the sun
sign is used as a connection), real geocoding (no third-party calls), druid and
historical-figure content (the data model leaves room), translations, native apps.

## 4. Data model

Everything in the MVP is plain JSON in `localStorage` (keys prefixed `aftercare.`).
Types live in `site/src/lib/types.ts`. The same shapes map onto Postgres later.

```
Profile            (aftercare.profile, one per device)
  id               string
  displayName      string
  birthDate        "YYYY-MM-DD"
  birthTime?       "HH:MM"
  birthPlace?      Place
  favorites        Favorite[]
  visibility       { birth, numbers, map, favorites, connections }  (booleans; what the share link includes)
  updatedAt        ISO string

Place              { label, lat, lng }

Favorite
  id               string
  kind             "movie" | "book" | "thing"
  title            string
  themeId?         one of 12 themes (love, home, wonder, courage, change, mystery, craft, rest, joy, truth, growth, memory)
  place?           Place

Reading            (aftercare.readings, array, newest first)
  id               string
  spreadId         "one" | "three" | "celtic"
  question?        string
  createdAt        ISO string
  cards            { positionId, cardId, reversed }[]
  note?            string

Card (static deck.json, 78 rows)
  id, slug, name, arcana ("major"|"minor"), suit?, number, element,
  keywords[], upright, reversed

Derived (never stored)
  numerology       lifePath, birthday, expression, soulUrge, personality, personalYear
  birthCard        majors 0-21 from the date digits, plus soul card
  connections      graph of nodes and edges built from the above
```

Phase 2 mapping: `Profile` -> `web/db/schema.ts` `profiles` (+ `places`, `favorites`),
`Reading` -> `tarot_pulls`, new `entries` table for the knowledge hub.

## 5. Architecture (MVP)

- **Astro 5, static output**, TypeScript, no UI framework. Pages are `.astro`; behaviour
  is small TypeScript modules loaded per page.
- **three.js** for the tarot table: thin rounded cards, textures rasterised on demand
  from SVG, tween helper for shuffle / deal / flip, raycasting for hover tilt and tap.
  Render-on-demand to save phone battery; DPR capped at 2; a plain HTML fallback list
  works if WebGL is unavailable, and every card is reachable by keyboard.
- **Card art** is generated from code (`site/src/lib/cardArt.ts`): one deterministic SVG
  per card, shared by the 3D table, the deck browser and card pages. No external images.
- **Map**: world land outline pre-rendered at build time from Natural Earth 110m data
  (public domain, via the `world-atlas` package) into one SVG path, so no tiles and no
  network calls at runtime.
- **Tests**: Vitest (deck, numerology, spreads, shuffle, connections), `astro build`,
  Playwright smoke test (landing, onboarding, three-card reading on a phone viewport,
  save, profile).
- **Deploy**: none in this PR. `netlify.toml` still builds only `web/`.

## 6. Art direction: "the Midnight Almanac"

Not lavender gradients. Think a well-loved printed almanac that someone annotated.

- **Paper and ink**: warm parchment (`#f3ead9`) pages, deep night-teal ink (`#0f2321`)
  for dark sections, never pure black or white.
- **Spot colour like a riso print**: oxblood (`#7b2d3a`), marigold (`#d99a2b`), verdigris
  (`#3f7f73`), and the existing dusty rose (`#d9a7a0`) from the current brand. Shapes
  overprint with `multiply` and sit a few pixels off-register.
- **Type**: Fraunces (soft, slightly wonky display serif) with Outfit for UI text. Small
  caps labels, generous letter-spacing, roman numerals.
- **Ornament**: engraved-style sun, moon, eye and hand marks, constellation lines,
  scalloped card edges, ruled borders. Cards use one accent per suit.
- **Motion**: slow, tactile (cards have weight). Everything respects reduced motion.

Mockups for landing, onboarding, tarot reading, card detail, second self and journal
live in `docs/mockups/` (open `index.html`).

## 7. Milestones and screenshots

Screenshots (desktop and mobile) are saved per milestone in `docs/process/`, captioned
in `docs/process/CAPTIONS.md`:

1. Mockups
2. Site scaffold + landing
3. Card art and deck browser
4. 3D tarot table (shuffle, deal, flip, spreads)
5. Profile, map, connections, numerology
6. Final pass (tests green)

## 8. Risks and open questions

- Procedural card art is original and legally clean but less rich than hand-painted
  decks. Phase 2 could commission an illustrator, or add verified 1909 Rider-Waite-Smith
  scans with provenance (see `RESEARCH.md`).
- Built-in place list is small (a few hundred cities); click-the-map covers the rest.
  Real geocoding needs a privacy-reviewed provider.
- Local-only data means clearing the browser clears the profile. Export / import JSON is
  included for that reason; real sync is Phase 2.
- Share links carry the data in the URL fragment. Fine for a handful of fields, not a
  substitute for real share pages.

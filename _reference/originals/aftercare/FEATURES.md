# Aftercare — feature inventory

Original repo: `Artometrics/aftercare` (deleted 13 Nov 2026 after a verified Drive backup).
Git tip restored here: `a19c6dc8cbec` on `main` (“Add Firebase Hosting GitHub Actions deploy (#8)”).

The repo is **three apps**. The rich original that Dawn’s current `/aftercare` desk is missing is primarily the local-first **Almanac MVP in `site/`** (Three.js tarot table, birth profile / second self, numerology, shareable map). There is also a live **Netlify account app in `web/`** with birth tools, journal, mood tracking, and AI tarot, and an **Expo native shell at the repo root** that was never the production surface.

Dawn PR #40 folded only a flat desk: Cards / Numbers / Journal as HTML lists, with no 3D table, no second-self map, no deck browser, and no birth-place / birth-time profile.

---

## A. Almanac MVP — `site/` (the full original to merge)

**Stack:** Astro static site, TypeScript, **three.js 0.187**, procedural SVG card art, Natural Earth world map pre-rendered at build time. **Client-side only.** No accounts, no API, no paid service. Hosted historically at https://aftercare-510519.web.app (noindex).

**Run:** `cd site && npm install && npm run dev` (port 4321). Tests: `npm test` (Vitest), `npm run test:e2e` (Playwright).

### Screens and routes

| Route | What it does |
| --- | --- |
| `/` | Landing. Midnight Almanac art direction (Fraunces + Outfit, parchment / night-teal / oxblood). Entry to onboarding, table, profile. |
| `/onboarding/` | Profile setup: display name, **birth date**, optional **birth time**, **birth place** (search a built-in list of ~178 cities or click the world map), favorite movies / books / things (each can get one of 12 themes and an optional place). |
| `/profile/` | “Second self” identity card. Derived numerology, sun sign, birth cards. World map with pins. Connection constellation (you, life path, sun sign, birth card, themes, favorites, places). Per-section visibility toggles. Export / import backup. |
| `/tarot/` | **3D Three.js table.** Choose a spread, optional question, shuffle, deal, flip, hover-tilt, select a card. HTML fallback list if WebGL is missing; keyboard access to every card. Respects `prefers-reduced-motion`. Render-on-demand, DPR capped at 2. |
| `/tarot/readings/` | Saved readings (newest first), each with spread, question, cards, and a free-text note. Delete one or clear all. |
| `/tarot/cards/` | Deck browser for all 78 cards. |
| `/tarot/cards/[slug]` | Card detail: procedural art, keywords, upright / reversed / reflect text. |
| `/numerology/` | Life path, birthday number, expression, soul urge, personality, personal year — each tied to a tarot card and to the profile. |
| `/share/` | Share-link landing. Profile data lives in the **URL fragment** (nothing is uploaded). Visibility redaction applied. |
| `/journal/` | Placeholder only (“coming next”). Promises a device-local journal linked to readings; the MVP substitute is the note field on a saved reading. |
| `/privacy/` | Privacy copy. |
| `/404` | 404. |

### Tarot — 3D table (`site/src/scene/TarotTable.ts`)

Public API: `setSpread`, `shuffle`, `deal`, `flip`, `flipAll`, `isFaceUp`, `reset`, `setSelected`, `dispose`.

States: `idle` → `shuffling` → `dealing` → `ready` → `resetting`.

Behaviors to preserve in a full merger:

- 78 thin rounded cards; back and face textures rasterised on demand from SVG (`cardArt.ts` + `textures.ts`).
- Shuffle animation (split halves, riffle), deal to spread coordinates, flip with tweened rotation.
- Hover tilt via raycasting; selected card lifts.
- Spread layouts in table units, including the Celtic Cross **crossing card at 90°**.
- On-demand rendering (no continuous GPU burn). Soft HTML fallback.

**Spreads** (`site/src/lib/spreads.ts`):

1. **One card** — “What to keep in mind right now.”
2. **Three card** — Where you’ve been / where you are / what’s opening.
3. **Celtic Cross** — ten positions: heart, crossing, root, behind, crown, ahead, you, around, hopes, outcome.

Each card is reversed about half the time (`drawSpread`). Wording is original (not Rider-Waite reprints).

### Deck and art

- `site/src/data/deck-src/{major,cups,pentacles,swords,wands}.json` rebuilt into `deck.json` by `scripts/build-deck.mjs`.
- 78 cards: majors 0–21, minors 1–14 (Page / Knight / Queen / King). Fields: id, slug, name, arcana, suit, number, label, element (`fire|water|air|earth|spirit`), keywords, upright, reversed, reflect.
- **Card art is drawn by code** (`cardArt.ts`): deterministic SVG, shared by the 3D table, the browser, and detail pages. No scanned decks. Fonts are Fraunces and Outfit (SIL OFL).

### Birth profile, numerology, and “birth chart”

This is the birth feature set. There is **no full natal-wheel / planetary-house chart** in `site/` (the plan explicitly deferred “astrology charts” past sun sign). What *is* built, and what Dawn’s desk dropped:

From birth date (and name):

- **Life path** — months, days, and years reduced separately; master numbers 11 / 22 / 33 kept (`numerology.ts`).
- **Birthday number**, **personal year**.
- **Name numbers:** expression, soul urge, personality.
- **Birth cards:** major-arcana birth card (0–21 from date digits) plus a soul card (0–9).
- **Sun sign** (`zodiac.ts`, 12 signs) used as a connection node, not a full chart.
- Derived facts: weekday of birth, days alive, days to birthday (`secondSelf.ts`).

Optional **birth time** and **birth place** are stored on the profile even though the MVP does not compute houses or rising sign from them. A full merger should keep those fields so a later chart can use them.

**Second self / map / connections:**

- Profile visibility: `birth`, `numbers`, `map`, `favorites`, `connections`.
- Favorites: `movie | book | thing`, optional theme (love, home, wonder, courage, change, mystery, craft, rest, joy, truth, growth, memory), optional place.
- World outline is a pre-built SVG path from Natural Earth 110m (`world-atlas` at build via `scripts/build-world.mjs`). **No map tiles, no geocoding API.** Place search is a local list (~178 cities) plus click-to-drop a custom coordinate.
- Share codec: encode / decode the view in the URL fragment (`share.ts`).

### Data model (localStorage)

Keys: `aftercare.profile`, `aftercare.readings` (max 200). Shapes in `site/src/lib/types.ts`. `exportAll` / `importAll` produce a JSON backup. Nothing leaves the device.

### Voice / guardrails (keep these)

Readings are for reflection and entertainment. No medical, legal, financial, or “this will happen” predictions. Footer and reading pages say so. Tradition is described as tradition, never as truth.

### Design language to match, not flatten

Documented in `docs/PLAN.md` as “the Midnight Almanac”: warm parchment `#f3ead9`, night-teal `#0f2321`, oxblood / marigold / verdigris / dusty rose, slight riso misregistration, engraved sun/moon/eye/hand marks, scalloped card edges. Motion is slow and tactile. Mockups: `docs/mockups/`. Process screenshots: `docs/process/` (desktop + mobile for landing, table idle, three-card, Celtic Cross, deck browser, numerology, onboarding, second self, share).

---

## B. Netlify account app — `web/` (richer journal / tools / AI)

**Stack:** Vite + React + React Router, Framer Motion, Netlify Identity, Netlify Database (Postgres via Drizzle), Netlify Blobs, OpenAI / Gemini / Anthropic SDKs.

**Production was:** https://aftercare-artometrics.netlify.app  
**Run:** `cd web && npm install && npm run dev`. Auth is incomplete in purely local mode; `npx netlify dev` after a first deploy is how Identity was tested.

**This surface needs a backend / paid services.** Do not call those APIs from Dawn without a later, explicit decision (and a purchase ask if it would incur new spend). The calculators themselves are client-replicable.

### Screens

| Route | What it does | Client vs backend |
| --- | --- | --- |
| `/`, `/login`, `/signup`, `/forgot` | Netlify Identity auth | Backend (Identity) |
| `/app` | Daily home: sky note + ritual shortcuts | Sky note can be a local moon/sun fallback, or `POST /api/sky` which calls **OpenAI gpt-4o-mini** (paid) |
| `/app/journal` | Private mood-tagged entries | **Netlify Postgres** (`journal_entries`) via `journal.ts` |
| `/app/tarot` | Single or three-card spreads, **AI interpretation**, **Gemini card art** cached in Blobs | `tarot.ts`, `tarot-art.ts` (paid model + Blobs) |
| `/app/track` | Daily mood check-ins with a simple chart | Postgres `tracking_logs` |
| `/app/tools` | **Birth profile** (date, time, place), sun sign, life path, next birthday, moon calculator | Mostly client (`web/src/lib/calculators.ts` and the shared Netlify copies). Profile persist goes through `profile.ts` (Postgres). This is a birth-tools page, **not** a full natal wheel. |

### Data model (`web/db/schema.ts`)

Tables: `profiles` (userId, birthDate, birthTime, birthPlace, …), `journal_entries`, `tarot_pulls`, `tracking_logs`, `card_art_cache`.

---

## C. Expo native shell (repo root)

Expo Router app (`app/`, `components/`, `services/`). Screens include welcome, login, signup, forgot-password, profile, edit-profile, help, search, subscription, AI voice, plus a drawer kit (Lottie, mic animation, suggestions). AI providers: OpenAI / Gemini / Claude (`services/providers/`). Maps, location, notifications, image picker.

This looks like a component-kit / future native shell more than the shipped Almanac. The plan says: keep it, ignore it for the web MVP. A merger into Dawn (web) should not treat this as the source of truth for tarot / birth features. `.env.example` lists `EXPO_PUBLIC_OPENAI_API_KEY`, `EXPO_PUBLIC_GEMINI_API_KEY`, `EXPO_PUBLIC_CLAUDE_API_KEY` — placeholders only; do not commit real keys.

Unmerged branch in the Drive bundle (not checked out in this tree): `cursor/aritzia-style-nav-f4e6` — Aritzia-style Expo tabs (shop / search / bag / style / you) and lookbook components, 19 files never merged to `main`. Restore from the bundle if a native merger needs them.

---

## What Dawn’s current desk is missing (priority for a full merger)

Must-have from `site/` (all client-side):

1. Three.js tarot table with shuffle / deal / flip / hover, all three spreads including Celtic Cross.
2. Procedural 78-card art + deck browser + card pages.
3. Birth profile: name, date, optional time and place, favorites, themes.
4. Second-self page: map, constellation of connections, visibility toggles, fragment share link, JSON backup.
5. Full numerology (life path with master numbers, expression / soul urge / personality, personal year, birth + soul cards, sun sign).
6. Saved readings with notes, Midnight Almanac visual language (not a three-pane desk of text cards).

Optional / later, and **not** free:

- Netlify `web/` journal, mood tracking, Identity sync, AI readings, Gemini card art, OpenAI sky notes.
- Full natal-wheel astrology (never built; plan deferred it). Birth time/place fields are already on the profile for it.
- Knowledge hub, marketplace, blog — planned, not built.
- Real journal in `site/` — placeholder only; use reading notes or port `web/` journal.

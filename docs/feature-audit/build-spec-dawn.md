# Build spec — Dawn (Artometrics/dawn)

For a coding agent. Read `audit.md` first for why each item exists. Repo: `Artometrics/dawn`, `main` at `0c6ddaa` (PR #39 merged) or later. Read `AGENTS.md` first: **this is not the Next.js you know**, read `node_modules/next/dist/docs/` before writing routes.

**Rules**
- PR only. Do not push to `main`, do not deploy, do not touch Stratus, Betterment Health or kmcauliffe-rainfall. The reviewer merges.
- Use an explicit `--project dawn-510519` on any Firebase command. Rules tests run on the emulator only.
- No secrets in the repo. No new paid service. No Cloud Functions, no Blaze. Everything below runs in the browser plus the existing Node gateway.
- Every new page is `noindex` (route metadata `robots: { index: false, follow: false }`; Hosting already sends `X-Robots-Tag: noindex, nofollow`).
- Nothing in these features may send mail, post, or spend money outside the gateway's existing spend cap.
- Show 390px phone screenshots in the PR body for every new page (PR #39 did this with `*-390.png`).

**Path shorthand.** `$AUD` = `/workspace/feature-audit/unpacked` on the box (also in Drive: `Unlisted sites 2026-11-13/<app>-archive.zip`, and `Games/Questroad/`).
- `$LOOM` = `$AUD/loom/loom/tree/loom-dep`
- `$RELAY` = `$AUD/relay/relay/tree/relay`
- `$VAULT` = `$AUD/vault/vault/tree/vault-dep`
- `$QR` = `/workspace/feature-audit/games/questroad/github-clone` (from Drive `Games/Questroad/questroad-working-tree.zip`)

## Build order

1. **A. Cuts desk** (M)
2. **B. Shows desk + public feed** (S–M)
3. **C. Research desk** (L)
4. **D. Walk** (M)

Ship each as its own PR. A and B can run in parallel. C touches the gateway store, so merge it after B.

## Desk wiring checklist (every desk: A, B, C)

Copied from PR #39's file list. Miss one line and a route test or the rules test fails. Replace `<kind>` and `<route>` (A: kind `cuts`, route `/cuts`; B: `shows`, `/shows`; C: `research`, `/research`).

1. `src/lib/desks/store.ts`: add `<kind>` to `DESK_KINDS` and a key `dawn.desk.<kind>.v1` to `DESK_KEYS`.
2. `firestore.rules`: add `<kind>` to **both** lists, `validDesk()` (`data.kind in [...]`, about line 161) and the `match /users/{uid}/desks/{deskId}` rule (`deskId in [...]`, about line 294).
3. `tests/rules.mjs`: add a succeed case (owner writes `users/alice/desks/<kind>`), and fail cases (other user, anonymous, wrong `kind` in the payload). Existing `extra` case must still fail.
4. `src/lib/site/nav.ts`: add the id to the union (line 8), a nav item under the Work group (like `contacts` at line 48), and the route in the noindex list (line 146).
5. `src/components/shell/sidebar.tsx`: add the id to the icon map (line 48) using a lucide icon.
6. `src/lib/home/drawer.test.ts`: update the expected `NAV_GROUPS[1]` label list.
7. `scripts/lib/routes.mjs`: add `{ path: '/<route>', name: '<route>', title: '...' }`.
8. `scripts/fix-static-export.mjs`: add `publish('<route>')`.
9. `src/lib/site/routes.test.ts`: add the route to the route list (line 56) and the `publish` regexp list (line 73).
10. `firebase.json`: add the rewrite `/<route>` → `/<route>.html`.
11. `deploy/Caddyfile`: add `/<route>` and `/<route>/*` to the `@public` matcher (line 70).
12. `src/app/preview/page.tsx`: add a row. `docs/process/design/shared-shell/SITEMAP.md`: add a row.
13. Page: `src/app/<route>/page.tsx` in the same shape as `src/app/contacts/page.tsx` (`PageShell`, metadata with `robots` noindex).
14. Desk UI: `src/components/desks/<kind>-desk.tsx`, using `useDeskStore<T>(kind, parse, empty)` from `src/components/desks/use-desk-store.ts`, `DeskSwitch` for sub-views and the shared `desks.css` classes (`dw-btn`, `dw-actions`, `dw-actions--chips`). Do not invent a new design language (see `DESIGN.md`).
15. Add every new test file to the explicit file list in the `test:app` script in `package.json` (it lists files; unlisted tests never run).

Desk payload cap is 350,000 characters (`DESK_PAYLOAD_MAX`); `encodeDesk` returns null above it and the hook shows "That desk is too large to keep." Each desk below states how it stays under the cap.

---

## A. Cuts desk — YouTube cut board (from Loom)

**Goal:** one board per video. Topic or article URL in, script package out, captions and chapter block computed locally, license shelf for sources. Matches the three-channel plan in `/workspace/games/youtube-90-day-plan-v2.md`.

### A1. Port (pure code first)

Copy into `src/lib/cuts/`, convert to the repo's ESM/`.ts` import style (explicit `.ts` extensions as in `src/lib/crm/desk.ts`; the tests run with `--experimental-strip-types`):

| From (`$LOOM/…`) | To | Notes |
| --- | --- | --- |
| `shared/src/types.ts` | `src/lib/cuts/types.ts` | Keep `COLUMNS` (idea, script, narration, visuals, package, ready), `LICENSES`, `LICENSE_LABELS`, `Chapter`, `Visual`, `ThumbnailConcept`, `ScriptPackage`, `Project` → rename `Cut`. **Remove** `ALLOWED_EMAILS` and `ownerUid`/`StudioUser`. Keep `VOICES` only for the optional narration step (A4). |
| `shared/src/text.ts` | `src/lib/cuts/text.ts` | `newId`, `clip`, `advanceColumn`, `formatClock`, `chapterBlock`, `formatSrtTime`, `cuesToSrt`, `scriptToSrt`, `matchesQuery`, `chunkText`. Drop `buildSearchTokens` and `guessMime` if unused. |
| `shared/src/policy.ts` | `src/lib/cuts/policy.ts` | Keep `isBlockedHost`, `isPrivateIp`, `inspectUrl` (video hosts are blocked: youtube.com, youtu.be, vimeo.com, tiktok.com, instagram.com, dailymotion.com, twitch.tv) and `isLicense`. Drop `isAllowlisted`, `isInboxPath`, `isMediaPath`, `assertMedia`. |
| `shared/src/project.ts` | `src/lib/cuts/cut.ts` | `newCutFields`, `applyPackage`, `columnOrCurrent`. Strip `ownerUid`. |
| `shared/src/draft.ts` | `src/lib/cuts/draft.ts` | `draftPackage` is the no-key local draft. Keep `DRAFT_WARNING`; the UI must show it. |
| `shared/src/wav.ts` | `src/lib/cuts/wav.ts` | Only with A4. |
| `functions/src/gemini.ts` `parsePackage`, `extractJson`, `firstText` | `src/lib/cuts/parse-package.ts` | Port only the response parsers. Do **not** port `createGemini` (Dawn already has the model gateway). |
| `functions/src/article.ts` | `src/lib/dawn-agents/article-text.ts` | `htmlToText` + fetch wrapper, but use the repo's own `assertPublicHttpUrl` from `src/lib/dawn-agents/ssrf.ts` instead of `fetchArticle`'s dependency injection, and apply `inspectUrl` (video hosts blocked) first. |

Tests to port: `$LOOM/tests/studio.test.ts` (pipeline rules) and `$LOOM/functions/src/article.test.ts` → `src/lib/cuts/cuts.test.ts`, `src/lib/dawn-agents/article-text.test.ts`.

### A2. Data model and storage

- Desk payload: `{ cuts: Cut[], media: MediaItem[] }`. Parse defensively in `parseCuts(raw)` like `parseNewsletter`.
- Stay under 350,000 chars: cap **40 cuts**, `scriptText` ≤ **20,000** chars, `sourceExcerpt` ≤ 2,000, 12 media rows with no file bytes (title, url, license, creator, notes only). `captionsSrt` and `chapterBlock` are **derived on demand**, not stored. Narration audio is never stored in the desk.
- "Export cut" downloads a `.md` file (title options, description, chapters, script, picture notes, thumbnail concepts) and offers "Archive" which removes the cut from the desk.

### A3. Gateway endpoint (only one)

Add `POST /api/cuts/generate` in `src/lib/dawn-agents/http.ts` (owner-only like the other `/api/*` routes, not under `/api/public`).
- Body: `{ topic: string, sourceUrl?: string, sourceText?: string }`. Reject video-host URLs with the policy message. Fetch the article through `assertPublicHttpUrl`.
- Generate with the existing model gateway (`createKitModel` / `generateWithProvider` in `src/lib/dawn-agents/model-reply.ts`) using the default chosen model. Prompt: port the instruction text from `$LOOM/functions/src/gemini.ts` (the package generator) and require JSON matching `ScriptPackage`. Parse with `parsePackage`.
- Spend: write a ledger entry and refuse when `canSpend` is false, exactly as `/api/chat` does (see the spend guard near `http.ts:1262` and the ledger writes near `:229`/`:245`).
- No model key configured: return `draftPackage(topic, sourceText)` with `provider: "draft"` and the draft warning. Never fake a model reply.
- Response: `{ package: ScriptPackage, provider, model, warning }`. Rate-limit like the other expensive routes (`src/lib/dawn-agents/rate-limit.ts`).

### A4. Optional second PR: narration and transcripts (flagged off)

Behind `DAWN_MEDIA_ENABLED=true` on the gateway, default off. `POST /api/cuts/narrate` ({ text, voice }) → Gemini TTS (port the request/response shape from `createGemini().narrate` in `$LOOM/functions/src/gemini.ts`, `firstAudio` + `pcmToWav`) returning WAV bytes for download; counted against the spend cap; voice limited to `VOICES` with default **Kore**. `POST /api/cuts/transcribe` for an uploaded audio file likewise. If the flag is off the UI says narration is not enabled. Not stored anywhere.

### A5. UI (`src/components/desks/cuts-desk.tsx`)

Views via `DeskSwitch`: **Board** (six columns as a vertical phone list with counts; tap a card to open), **Cut** (topic, source URL/pasted text, "Write the script" button, script editor, chapters, picture notes, 3 titles with copy buttons, description, tags, thumbnail concepts, SRT download, chapter block copy), **Shelf** (license-tracked sources: title, URL, creator, license select from `LICENSE_LABELS`, notes; refuse video-host URLs with the exact policy message), **Find** (`matchesQuery` over cuts and shelf).
Show `DRAFT_WARNING` whenever `generationProvider === "draft"`.

### A6. Acceptance

- `npm test` passes, including new `cuts.test.ts` and `article-text.test.ts` (listed in `test:app`). Tests cover: SRT timing (`scriptToSrt` default 2.6 words/s), `chapterBlock` format, `inspectUrl` blocks youtube.com/youtu.be/vimeo.com/tiktok.com/instagram.com/dailymotion.com/twitch.tv and private IPs, column advance rules, `draftPackage` shape, `parsePackage` on fenced JSON and invalid JSON, payload cap (41st cut refused, 20,001-char script clipped).
- `npm run test:rules` passes with `cuts` allowed and `extra` still denied.
- `npm run build` succeeds, `out/cuts.html` exists, `routes.test.ts` and `drawer.test.ts` pass.
- Gateway tests (add to `src/lib/dawn-agents/`): generate returns a draft with no model key; a video URL is rejected with HTTP 400; spend cap reached returns the existing cap message; response never contains a key.
- Manual: at 390px, create a cut from a topic with no key (draft label visible), add a CC0 source to the shelf, download SRT and `.md`. Screenshot to the PR.

### A7. Not in scope
Firebase Auth allowlist, REST API for other clients, MCP server, Firestore and Storage, media upload to the cloud, anything that downloads video.

---

## B. Shows desk and public feed (from Relay)

**Goal:** manage shows and episodes in a desk; publish a standards-compliant podcast RSS feed, an embeddable player and a download counter from the gateway. First show: Cardinal (real audio is in `/workspace/cardinal-audio-release`).

### B1. Port

| From (`$RELAY/…`) | To | Notes |
| --- | --- | --- |
| `functions/src/rss.ts` (`xmlEscape`, `itunesDuration`, `rfc822`, `buildRss`) | `src/lib/shows/rss.ts` | Pure. Keep `published && publishedAt && audioUrl` filter and ordering by episode number. |
| `functions/src/rss.test.ts` | `src/lib/shows/rss.test.ts` | Keep the escaping case ("Tom & Jerry <live>"). |
| `functions/src/types.ts` `ShowRecord`, `EpisodeRecord` | `src/lib/shows/types.ts` | Drop `PostRecord`, `Platform`, `Release*`, `Secret*`, `OauthState`. Replace `audioUrl` semantic: it is a URL to an audio file Kyle already hosts (Drive public link is **not** acceptable for podcast apps; use a URL on a host he controls). |
| `functions/src/handlers.ts` `handleRss`, `handleDownload`, `handleEmbed` (lines 77–190) | `src/lib/shows/public.ts` (+ routes in the gateway) | Port the behaviours: `HEAD` does not count a download; `Accept: application/json` on the download URL returns `{count, location}`; embed page is plain HTML with an `<audio controls>` and escaped attributes (`escapeHtml`, `escapeAttr`). |

### B2. Desk (`src/components/desks/shows-desk.tsx`, kind `shows`)
- Payload `{ shows: Show[], episodes: Episode[] }`. Fits the cap easily (no audio bytes, URLs only). Cap 10 shows, 300 episodes, summaries ≤ 4,000 chars.
- Views: **Shows** (title, slug, author, owner email, category, explicit, artwork URL, website URL), **Episodes** (title, summary, number, season, audio URL, bytes, content type, duration seconds, published date, status draft/published, GUID generated once and never changed), **Feed** (feed URL, iframe snippet per episode, download counts pulled from the gateway, "Validate" button that runs the pure `buildRss` and shows problems: missing artwork, missing audio URL, non-https URL, duration 0, non-unique GUID).
- "Publish feed" calls `POST /api/shows/publish` (owner-only) which writes the show and its published episodes to the gateway store.

### B3. Gateway
- Store: add `shows: PublishedShow[]` and `listens: Record<string, number>` to the gateway store (`src/lib/dawn-agents/store.ts` `StoreData`, with an empty default so existing store files load). Same pattern as `articles`/`subscribers`.
- Owner routes: `POST /api/shows/publish`, `GET /api/shows/stats`.
- **Public routes** under `/api/public/` (Caddy already passes this prefix without a login; confirm in `deploy/Caddyfile` line 57):
  - `GET /api/public/rss/:slug` → `application/rss+xml; charset=utf-8`, **no** noindex header on this response (directories fetch it). Build with `buildRss`, `feedUrl` = the public URL of this route, `enclosureUrl` = `/api/public/listen/:slug/:episodeId`.
  - `GET|HEAD /api/public/listen/:slug/:episodeId` → count on GET only, then 302 to the episode's `audioUrl`. Only redirect to the stored https URL. Never take a URL from the request.
  - `GET /api/public/embed/:slug/:episodeId` → minimal HTML player.
- No sending, no third-party API. Slugs: `^[a-z0-9-]{1,40}$`.

### B4. Acceptance
- `npm test` passes with `rss.test.ts`, plus new gateway tests: RSS contains only published episodes with audio; unknown slug 404; `HEAD` does not increment; `GET` increments and 302s to the stored URL; the redirect never follows a request-supplied URL; embed escapes a title containing `"><script>`.
- Feed passes a structural check: add a test that parses the XML (use `node:` built-ins or a small dev-only parser) and asserts `itunes:*` required tags.
- `npm run test:rules`, `npm run build` (needs `out/shows.html`).
- Manual (no deploy): run the gateway locally, publish a sample show with two episodes (use the repo's own test fixture URLs), `curl` the feed and a `HEAD` and `GET` on the listen URL, paste the XML into the PR. 390px screenshot of the desk.

### B5. Not in scope
Social queue and connectors, releases shelf, Expo app, Cloud Storage audio upload, Firestore. Submitting the feed to Apple or Spotify is a manual step for Kyle after he approves.

---

## C. Research desk — cited answers over his own files (from Vault, research shelf only)

**Goal:** file PDFs, EPUBs, transcripts and web clips into collections; ask a question; get an answer with page or timestamp citations. Export citations as Markdown or BibTeX.

### C1. Port

| From (`$VAULT/…`) | To | Notes |
| --- | --- | --- |
| `functions/src/types.ts` (`Passage`, `ChunkRecord`, `SourceRecord`, `Citation`, `AnswerRecord`, `CollectionRecord`) | `src/lib/research/types.ts` | Drop `AssetRecord` and `Actor`. |
| `functions/src/text.ts` | `src/lib/research/text.ts` | `formatTimestamp`, `timestampToSeconds`, `htmlToText`, `parseTranscript`, `mergePassages`, `chunkPassages` (1,400 chars, 180 overlap). |
| `functions/src/extract.ts` | `src/lib/research/extract.ts` | `detectKind`, `extractDocument` (PDF via `unpdf`, EPUB via `jszip`, transcript, web clip). New dependencies `unpdf` and `jszip` go in the root `package.json`; they are used **only by the gateway**, never imported from `src/app` or `src/components`. |
| `functions/src/embed.ts` | `src/lib/research/embed.ts` | Keep `hashEmbed` (local fallback, deterministic) and `cosine`. Replace the raw Gemini REST call in `embedTexts` with the AI SDK that Dawn already uses (`@ai-sdk/google`, `embedMany`, model `gemini-embedding-001`, 768 dims) via the gateway's key handling in `src/lib/dawn-agents/provider.ts`. |
| `functions/src/answer.ts` | `src/lib/research/answer.ts` | `rankChunks`, `excerpt`, `localAnswer`, `buildPrompt`, `citationsFrom`. Replace `composeAnswer`'s model call with the model gateway (`createKitModel`). |
| `functions/src/pipeline.ts` `processSource`, `askVault` | `src/lib/research/pipeline.ts` | Remove the watermark, asset and `Actor` parts. |
| `src/lib/citations.ts` (`toMarkdown`, `toBibtex`, `collectionLabel`, `downloadText`) | `src/lib/research/citations.ts` | Keep the rule that exports never include storage paths, uids or embeddings. |
| `src/lib/importQueue.ts`, `src/lib/files.ts` | `src/lib/research/import-queue.ts`, `files.ts` | Folder and zip drop. |
| Tests: `functions/test/pipeline.test.ts`, `share.test.ts` | `src/lib/research/*.test.ts` | Port the cases; adapt the store to the new in-memory fake. |

**Collections:** do **not** copy `functions/src/projects.ts`. Its four collections are ceramics-glaze placeholder text. Seed from Dawn's own projects instead: Cardinal, Pantheon, Artometrics, Prism & Pollen, Dawn (names only, one-line blurbs written fresh, user can add, rename and delete collections).

### C2. Storage (the cap matters)
- Desk kind `research` holds only small metadata: collections, source rows (title, kind, status, size, collection, createdAt), saved answers (question, answer text ≤ 4,000 chars, citation list). Cap 20 collections, 300 sources, 100 saved answers. Chunks and embeddings **must not** go in the desk envelope (350,000 chars).
- Chunks, embeddings and the original file bytes live on the gateway, in their own file next to the existing store (`research.json`, atomic write like `FileStore`). Upload limit per file 25 MB, total 500 MB, with a clear error. Never log file text.

### C3. Gateway routes (owner-only)
- `POST /api/research/sources` (multipart or base64 body; reuse the repo's body-size guard) → store file, status `uploaded`.
- `POST /api/research/sources/:id/process` → extract, chunk, embed, status `ready` or `error`.
- `POST /api/research/ask` `{ collectionId | "everything", question }` → rank, answer, citations.
- `GET /api/research/sources`, `DELETE /api/research/sources/:id`.
- **Spend:** embeddings and answers are model calls. Estimate cost and write ledger entries; refuse with the existing cap message when `canSpend` is false. If the cap is hit mid-source, set status `error` with that message and keep already-embedded chunks.
- No model key: use `hashEmbed` and `localAnswer` (passage matches with real citations), and the UI says "Local matching, no model key."

### C4. Acceptance
- `npm test` with the ported tests passing: PDF page numbers, transcript timestamps (`[mm:ss]`), chunk overlap, ranking order, citations never reference a passage that was not retrieved, exports contain no storage path / uid / embedding values, zip import filters to readable files only.
- Spend-cap tests: with `spentUsd >= cap`, `process` and `ask` return the cap message and write no ledger entry; with a fake embedder the ledger gets one entry per batch.
- Desk payload test: 300 sources + 100 answers stays under 350,000 chars; the 301st source is refused.
- `npm run test:rules`, `npm run build` (needs `out/research.html`).
- Manual at 390px with no key: add one transcript and one PDF to "Cardinal", ask a question, see passage matches with citations, export Markdown. Screenshot to the PR.

### C5. Not in scope
Photo shelf (tags, favourites, zip, watermark), Firebase Auth allowlist, REST API for others, MCP server, `sharp`, Cloud Storage.

---

## D. Walk — `/walk`, real-world quest layer (from Questroad)

**Goal:** a single-player GPS game anywhere: visit nearby places for XP and loot, fight a boss at landmarks, daily quests from real places, daily festival. No accounts, no server, saves on the phone.

### D1. Decision: separate MapLibre view, not Atlas

Questroad finds places with `map.querySourceFeatures('openmaptiles', {sourceLayer:'poi'})` on MapLibre vector tiles (`$QR/public/index.html`, `scanPOI` line 192, `tileKind` line 175). Atlas draws its own baked canvas basemap (`src/features/atlas/components/map-view.tsx`) and the Here chip uses Leaflet raster tiles (`src/components/dawn/atlas-map.tsx`); neither exposes POIs. **Build `/walk` as its own route on `maplibre-gl` with the free OpenFreeMap style `https://tiles.openfreemap.org/styles/liberty`**, as Questroad does. No API key. Add `maplibre-gl` to `package.json` (not loaded unless `/walk` opens: dynamic import in the client component). Add a "Walk" link from the Atlas Here chip; do not change Atlas rules, XP or progress keys.

### D2. Port (split the monolith into modules, add tests)

`$QR/public/index.html` is one 425-line file with dense functions. Extract into `src/features/walk/`:

| Questroad (function, line) | New module | Notes |
| --- | --- | --- |
| `d` distance (140), `gh`/`ghBox`/`ghAround` geohash (147–149), `hash` (150), `rng` seeded RNG (144), `isoWeek` (143), `today` (142) | `lib/geo.ts`, `lib/rng.ts` | Pure. `today` must use the Pacific day like Atlas's `pacificDay` in `src/features/atlas/lib/progress.ts`. |
| `lvlOf`/`maxHp` (124–125), `addxp`, `heal`, `hurt` (136–138), `xpMul` (135), `events()` (133) | `lib/state.ts`, `lib/events.ts` | Pure reducers over a `WalkState`. Time-of-day and weekday events (e.g. night fog) stay. |
| `tileKind` (175), `toP` (181), `dedupe` (183), `scanPOI` (192), `POIK`, `BOSSK`, `BOSSES`, `BASE` (109–117) | `lib/poi.ts` | `tileKind` and `dedupe` pure and testable. `scanPOI` takes a `queryFeatures()` function so tests pass fixtures. Keep the 1,500 m radius, 70-POI cap and 4-boss cap. |
| `visit` (204), `pickLoot` (203), `festival` (200) | `lib/visit.ts`, `lib/loot.ts` | Seeded by place + day so results are stable. |
| `startBoss`/`bossHit`/`bossWin` (225–233), `monStats` (213) | `lib/combat.ts` | Pure turn logic with the UI separate. |
| `ensureQuests` (266), `qprog` (282), `questCheck` (284), `qTarget` (286) | `lib/quests.ts` | Quest types: visit, kind, chain, boss. |
| `ACH` (122), `FS` first-steps (345) | `lib/achievements.ts` | Keep. |
| Sprites `$QR/public/assets/sprites` (51 PNG), `assets/kenney/*-License.txt`, `LICENSES`, `assets/LICENSES.md` | `public/walk/sprites/`, `public/walk/LICENSES.md` | CC0 (Kenney). Keep the license files. |

**Drop on purpose:** `backend.js`, `NET`/`MockNet`, party recruits and `ROLES`/`RECRUITS`, guild (`guildState`, `GUILD_KM`), presence (`drawPlayers`), road reports (`drawReports`), leaderboard (`board`), `profile`, `firestore.rules` and its tests, `config.js`. None of it was ever turned on, and it needs Firestore multiplayer.

### D3. Behaviour
- Saves in `localStorage` key `dawn.walk.v1` (day state `dawn.walk.day.v1`). Never sent anywhere; no new Firestore rules.
- Location: ask only when the user taps "Use my location". "Demo walk" (Questroad's `ROUTES`/`demo`, line 255–257) runs without GPS. Walk distance only counts steps between 0.5 m and 500 m (as Questroad's `move`).
- Privacy note on the page: map tiles come from OpenFreeMap, which sees the area you view. Nothing else leaves the phone.
- Respect `prefers-reduced-motion`. 44 px touch targets. Dark theme matching Atlas tokens.

### D4. Acceptance
- `npm test` with new `src/features/walk/**/*.test.ts` files listed in `test:app`. Cover: `tileKind` mapping (cafe, library, museum → boss, unknown → null), `dedupe` (same name within 150 m dropped), geohash round trip, seeded `festival` is stable for a place+day and changes next day, XP/level thresholds and `xpMul` events, `pickLoot` rarity bands, boss fight terminates and awards once per day, quest generation is deterministic per area+day and `qprog` counts visit/kind/chain/boss, `parse` of a corrupt save returns defaults.
- Browser test (the repo has `*.browser.test.ts` patterns, e.g. `src/features/atlas/atlas.browser.test.ts`): `/walk` loads with no GPS, demo walk awards XP, reload keeps it.
- `npm run build` creates `out/walk.html`; add `/walk` to the wiring list items 4, 7–12 above (no desk kind, so skip items 1–3 and 14).
- 390px screenshots: map with POIs, a boss fight, the quest sheet.
- Verify no network call other than tiles (`tiles.openfreemap.org`), the style and the sprite/asset files.

### D5. Not in scope
Any change to Atlas, any Firestore backend, accounts, multiplayer.

---

## E. In flight elsewhere (do not duplicate)

- **Fernbound.** The archive has **only the compiled Godot web export** (`index.wasm` 39,514,754 bytes, `index.pck` 2,039,352 bytes, bytecode). There is no source, so a rewrite is not possible. Another agent is merging it into Dawn. Guidance for that merge: embed the export as is (an iframe to a same-origin `public/play/fernbound/` folder), serve `.wasm` as `application/wasm` (check the `firebase.json` headers), remember the 39.5 MB asset adds to the repo and Hosting upload, and keep it `noindex`. A "hunt near you" mechanic is new work and would reuse Walk (§D).
- **Aftercare and Carrie Books** into Dawn, **Carrie's Pets** into Bagel: already running as separate agents.
- **Lineage into Pantheon:** Pantheon PR #37 is open. Not part of this spec.
- **Cardinal Quest:** already in Atlas (`src/features/atlas/lib/progress.ts`, "Cardinal Quest's rules, unchanged"). Nothing to port.

## Global definition of done

For every PR above:
1. `npm run lint`, `npm test`, `npm run test:rules`, and `npm run build` all pass locally (route tests need `out/`, rules tests need Java).
2. New tests are listed in the `test:app` script.
3. No secrets, no `.env`, no archive files committed. Do not commit anything from `/workspace/feature-audit/`; port the code by hand.
4. PR body lists what was ported, what was skipped and why (follow PR #39's format) and has 390px screenshots.
5. No deploy. The parent agent merges and deploys with an explicit project, then verifies the live routes.

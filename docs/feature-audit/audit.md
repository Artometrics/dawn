# Retired-app feature audit — 13 Nov 2026

Written 13 Nov 2026, America/Los_Angeles. Read-only audit. No repo was changed, nothing was deployed. Stratus, Betterment Health and kmcauliffe-rainfall were not touched.

Companion files: `build-spec-dawn.md`, `build-spec-bagel.md`.

## 1. Sources and verification

Archives were found through the Drive archive root README (`19l9pSZ9jSxyzEM8s8oNlBUnrWywSEzCJQOrVQMfVLfs`), the **Artometrics Archive Index** sheet (`1FKk6cpiAkheJ1uhZM1kllSyrWgqdH-m9RZzRx3nF4zg`, downloaded to `archives/archive-index.xlsx`) and the Project cleanup Page. Everything was downloaded from Drive, not read from older box copies.

| App | Drive file | Unpacked to |
| --- | --- | --- |
| CRM | `Unlisted sites 2026-11-13/crm-archive.zip` | `unpacked/crm/crm/tree/crm-dep` |
| Invoicing | `invoicing-archive.zip` | `unpacked/invoicing/invoicing/tree/invoices-pdf-scripts` |
| Loom | `loom-archive.zip` | `unpacked/loom/loom/tree/loom-dep` |
| Mia Maps | `mia-maps-archive.zip` | `unpacked/mia-maps/mia-maps/tree/mia-maps` |
| Newsletter | `newsletter-archive.zip` | `unpacked/newsletter/newsletter/tree/newsletter-dep` |
| Priority | `priority-archive.zip` | `unpacked/priority/priority/tree/live-source` |
| Relay | `relay-archive.zip` | `unpacked/relay/relay/tree/relay` |
| Storefront | `storefront-archive.zip` | `unpacked/storefront/storefront/tree/storefront-dep` |
| Style Lab | `style-lab-archive.zip` | `unpacked/style-lab/style-lab/tree/sl-dep` (+ `fb-stylelab`) |
| Vault | `vault-archive.zip` | `unpacked/vault/vault/tree/vault-dep` |
| Games | `Games/<name>/` folders (Questroad, Cardinal Quest, Fernbound, Ashmere, Spidermom, Nightlight, Lampwick, Voltspire, Knightmare, Godot page) | `games/` (README + working tree or git bundle per game; Lampwick and the 83 MB Spidermom/27 MB Nightlight trees were read from README + bundle only) |

- All ten `*-archive.zip` files were checked against Drive `SHA256SUMS`: **10 of 10 OK**. (`tara-music-original-archive.zip` is in the same SHA file and was not downloaded; it is out of scope.)
- Each zip holds a working-tree zip (secrets excluded), a wget live mirror, a manifest and checksums. Both inner zips were unpacked into `tree/` and `mirror/` next to the originals.
- For comparison, current `main` of Dawn (`0c6ddaa`, includes PR #39) and Bagel (`9316e49`) were shallow-cloned read-only into `targets/`.

## 2. Verdict at a glance

| App | Already in Dawn? | Verdict | Where | Size |
| --- | --- | --- | --- | --- |
| Newsletter | Yes, PR #39 | Done. Nothing more to port | — | — |
| Invoices (the invoicing scripts) | Yes, PR #39 | Done | — | — |
| CRM (contacts) | Yes, PR #39 | Done. Leftovers dropped (§3.2) | — | — |
| Loom | No | **Build** | Dawn: **Cuts** desk | M |
| Relay (podcast host) | No | **Build the feed, drop the rest** | Dawn: **Shows** desk + public RSS route | S–M |
| Vault (research shelf) | No | **Build, simplified** | Dawn: **Research** desk | L |
| Vault (photo shelf) | No | Drop | — | — |
| Storefront | No | **Build, mock mode only** | Bagel: mock checkout + discount codes | M |
| Games: Questroad | No | **Build the single-player core** | Dawn: **Walk** (`/walk`) | M |
| Games: Fernbound | In flight elsewhere | Embed the compiled export as is; no source exists | Dawn (other agent) | — |
| Games: Cardinal Quest | Yes, inside Atlas | Drop (already ported) | — | — |
| Games: Lineage, Pantheon prototypes | In flight (Pantheon PR #37) | Not specced here | Pantheon | — |
| Games: everything else | No | Drop | — | — |
| Style Lab | No (Style Recipes already in Dawn) | Drop | — | — |
| Relay queue and releases | No | Drop | — | — |
| Priority | No | Drop | — | — |
| Mia Maps | No | Drop | — | — |

Evidence on usage: the Deletion log records the Firestore databases of Newsletter, Storefront, Loom and Relay as **empty** when they were retired, and Style Lab had 3 `users/` docs. None of these apps were used with real data. That is why recommendations favour small, high-fit slices, not whole products.

Priority order if built: Cuts, Bagel mock checkout (parallel, other repo), Shows, Research, Walk.

---

## 3. Already in Dawn (PR #39) — duplicates skipped

### 3.1 Newsletter
- **What it does:** signup with consent, double opt-in, markdown composer, batch send (50), one-click unsubscribe, open/click counts, public archive.
- **Code:** `newsletter-dep/web/src/pages/admin/*` (Compose 320 lines, Subscribers, Counts, Log), `web/src/pages/{Home,Archive,IssuePage,Confirm,Unsubscribed}.tsx`, `functions/`, `mcp/`. 1,618 lines of web TS. Vite + React + Firebase.
- **Quality:** good (rules tests, compliance footer in `web/src/lib/compliance.ts`).
- **In Dawn:** `src/lib/newsletter/desk.ts`, `/newsletter`, `/letter`, gateway `/api/public/subscribe|confirm|unsubscribe|open|click`. Parity checked against the PR #39 body and the Dawn gateway routes.
- **Left over:** Gemini drafting and the MCP server, both skipped on purpose in PR #39. Dawn agents already draft letters.
- **Recommendation: drop the leftovers.**

### 3.2 CRM
- **What it does:** people, companies, five-stage board, notes, tasks with a Today view, global search, CSV, phone quick-add, PWA, allowlisted sign-in.
- **Code:** `crm-dep/src/pages/{Contact,Pipeline,Today,People,Company,Tasks,Settings}Page.tsx`, `src/lib/{api,crm,search,fields,seed}.ts`, `functions/src/{intake,digest}.ts`. 4,244 lines. React + Vite + Firebase.
- **Quality:** good (rules tests, jobs tests, emulator flow).
- **In Dawn:** `src/lib/crm/desk.ts`, `src/components/desks/contacts-desk.tsx`, `/contacts`.
- **Left over (skipped in PR #39):** file attachments (needs Cloud Storage), 08:00 morning digest (`functions/src/digest.ts`), public form intake (`functions/src/intake.ts`, a token-guarded endpoint that turns a form post into contact + company + deal + task), Gemini drafts.
- **Recommendation: drop all four.**
  - Attachments need Blaze and Storage for little value.
  - The morning digest is a prompt, not code: Dawn already has routines (`src/lib/dawn-agents/cron.ts`, `/api/routines`). Create one routine; no port.
  - Intake would need the gateway to write into a desk that lives in the browser and in `users/{uid}/desks/crm`. That coupling is not worth it until Kyle has a real lead form.

### 3.3 Invoicing
- The Firebase web app source was never found. What exists is `invoices-pdf-scripts` (Python, 138 lines, ART-2026-001 and 002). PR #39 rebuilt it as a desk with PDF output. **Done.**

---

## 4. Apps to build

### 4.1 Loom → Dawn **Cuts** desk (build)
- **What it does:** a board for one video: topic or article URL in, a package out. Columns Idea, Script, Voice, Picture, Package, Ready. Script text with chapters, picture notes (including chart specs), 3 title options, description, tags, thumbnail concepts, SRT captions and a chapter block for the description. Optional Kore narration (Gemini TTS) and a transcriber for uploaded recordings. A media shelf stores files with the license written down (owned, public domain, CC0, CC-BY family). A hard rule blocks YouTube, Vimeo, TikTok, Instagram, Dailymotion and Twitch URLs. Loom never downloads video.
- **Code:** `loom-dep/shared/src/{types,policy,project,draft,text,wav}.ts` (pure, tested), `functions/src/{gemini,article,app,admin,store}.ts`, `src/components/{cut-studio,board,find,listen,shelf,new-cut}.tsx`, `src/lib/data.tsx`. 5,044 lines of TS. Next.js PWA + Cloud Functions + Firestore + Storage.
- **Quality:** good. Pure logic in `shared/` has tests (`tests/studio.test.ts`, `functions/src/app.test.ts`, `article.test.ts`). Rules tests for Storage.
- **Dependencies:** Gemini key for real scripts, TTS and transcripts. Without a key it returns a labelled local draft (`draftPackage`). Firebase Auth, Firestore, Storage, Cloud Functions.
- **Why build it:** `/workspace/games/youtube-90-day-plan-v2.md` has three channels, one flagship every two weeks plus three Shorts a week, and says narration uses **Kore (Gemini TTS)**. Loom is the only tool that already does script → captions → chapters → thumbnail concepts in that shape. Kyle has also approved narrated, multi-format report packages (article, audio, video).
- **What to take:** the data model, board, script package, SRT/chapter helpers, license shelf and URL policy. **What to drop:** Auth allowlist, REST API and MCP, Firestore/Storage layer (Dawn desks use the shared desk store), Next PWA shell.
- **Recommendation: build into Dawn as the Cuts desk.** Spec: `build-spec-dawn.md` §A.

### 4.2 Relay → Dawn **Shows** desk (build the feed; drop the rest)
- **What it does:** three jobs in one Expo app. (1) **Shows:** podcast host with an Apple/Spotify RSS feed, an embeddable player and a download counter on a redirect. (2) **Queue:** social calendar with YouTube/X/Instagram previews; connectors stay off. (3) **Releases:** a shelf for artwork, splits and store links; distribution still happens elsewhere.
- **Code:** `relay/functions/src/{rss,handlers,store,gates,social,types}.ts` (rss.ts 87 lines + `rss.test.ts`), `src/app/(main)/{shows,queue,releases}/…`. 4,023 lines. Expo + Firebase.
- **Quality:** substantial and tested (`handlers.test.ts`, `rss.test.ts`, `gates.test.ts`). The seeded Cardinal show uses placeholder tone audio and demo copy.
- **Dependencies:** Cloud Storage for audio, Cloud Functions for the feed and counter, Firestore.
- **Why only Shows:** `/workspace/cardinal-audio-release` holds real Cardinal episode audio (`Cardinal-Ep01-The-Ledger-*.mp3`) with no RSS feed or host yet. The feed generator is 87 lines of pure code. Queue duplicates Dawn's approval gate (agents draft a post, Kyle taps Approve) and its connectors never went live. Releases is a distribution map Kyle does not need now.
- **Recommendation: build the feed into Dawn (Shows desk + public RSS route on the gateway). Drop Queue, Releases, Expo shell and MCP.** Spec: `build-spec-dawn.md` §B.

### 4.3 Vault → Dawn **Research** desk (build, simplified); photo shelf dropped
- **What it does:** **Research shelf:** file PDFs, EPUBs, transcripts and web clips into collections; chunk (1,400 chars, 180 overlap), embed with `gemini-embedding-001`, ask a question and get an answer with page or timestamp citations; ask one collection or everything; export citations as Markdown or BibTeX. **Photo shelf:** tags, favourites, zip of originals, watermark copy.
- **Code:** `vault-dep/functions/src/{extract,text,embed,answer,pipeline,types,store,firestoreStore}.ts`, `src/lib/{citations,importQueue,files}.ts`, `src/app/{research,ask,assets}/page.tsx`, `functions/test/{pipeline,share,allowlist-sync,rules}.test.ts`, `mcp/`. 4,965 lines. Next + Firebase Functions + Storage.
- **Quality:** good. Local fallback works without a key (`hashEmbed` + passage matches with real citations). Share-safe exports have tests.
- **Dependencies:** `unpdf`, `jszip`, `sharp` (photos), Gemini embeddings and answers, Storage.
- **Catch:** the four seeded collections (`functions/src/projects.ts`) are ceramics-glaze placeholder copy ("red glaze trials… cone six"), not Kyle's Cardinal. They must be replaced with Dawn's real projects.
- **Why build it:** Kyle's work is source-heavy (Cardinal book and podcast, lab reports, article data). Cited answers over his own files is the one thing Dawn does not do; Dawn only has an inline-citation UI component.
- **Recommendation: build the Research shelf into Dawn as a Research desk. Drop the photo shelf** (`asset-library` and Drive already hold the photos; zip and watermark are trivial and unused) **and the REST/MCP layers.** Spec: `build-spec-dawn.md` §C.

### 4.4 Storefront → **Bagel** mock checkout (build, mock mode only)
- **What it does:** Artometrics' own digital-editions counter (replacing Gumroad): products in Firestore, Stripe Checkout, webhook, 15-minute signed downloads, library by email, admin pages for products, discount codes and orders, CSV export, OpenAPI contract. Stripe runs in **mock** mode until secrets exist.
- **Code:** `storefront-dep/functions/src/{http,store,webhook,secrets}.ts` (http.ts 513 lines), `functions/src/domain/{money,tokens,ids,csv,email,origins,admins}.ts` + `domain.test.ts`, `web/src/pages/*`, `tests/rules/rules.test.ts`, `openapi.yaml`, `mcp/`. 4,583 lines. Vite + Firebase Functions gen2 + Stripe.
- **Quality:** good. `quotePrice` and the discount rules (percent off, amount off, expiry, max redemptions, product scope) are pure and tested. `stripeMode()` defaults to mock and only goes live on an `sk_live_` key.
- **Why Bagel, not Dawn:** the earlier recommendation was "commerce is not a Dawn feature", and I agree. Bagel is the only shop Kyle has, and its cart ends in a disabled "Checkout coming soon" button.
- **Hard limits:**
  - Bagel's catalog was copied from a public competitor's product JSON (`referenceVendor: "The Foggy Dog"`, with their selling prices; see `docs/REFERENCE-LOCK.md`). Live checkout would sell goods Kyle does not stock or fulfil. **Mock mode only. No Stripe live, no card capture.**
  - A real backend (Functions) needs Firebase Blaze, which is a purchase. The spec has a static, no-backend phase that costs nothing and a gated backend phase that is *not* to be built without Kyle's price approval.
- **What to take:** `quotePrice` rules rewritten cart-level, `stripeMode()`, ids and CSV helpers. **What to drop:** signed downloads, library, digital-edition admin, MCP, OpenAPI file.
- **Recommendation: build into Bagel, mock only.** Spec: `build-spec-bagel.md`.

### 4.5 Questroad → Dawn **Walk** (build the single-player core)
- **What it does:** a GPS quest RPG on a real map: walk to places, visit them for XP and loot, fight a boss at landmarks, take daily quests from nearby places (visit, kind-of-place, chains, boss), a daily festival with double XP, levels, 51 CC0 sprites. A demo walk in downtown SF runs without GPS. The online backend (anonymous auth, presence, road reports, weekly leaderboard) shipped **off** (`backend:false`).
- **Code:** one file, `questroad/github-clone/public/index.html` (425 dense lines) plus `public/backend.js` (52), `firestore.rules` (147, 47 tests in `tests/rules.test.mjs`), `public/assets/{sprites,kenney}` (232 KB, CC0, `LICENSES`). MapLibre GL from unpkg with OpenFreeMap tiles. Saves in `localStorage` keys `qr1`, `qr1_day`.
- **How POIs are found:** `map.querySourceFeatures('openmaptiles', {sourceLayer:'poi'})` on vector tiles (function `scanPOI`, `tileKind`). No API key, no server.
- **Quality:** works and is versioned (v0.4), but it is a monolith with no unit tests for the game logic.
- **Why build it:** Kyle decided games that fit Dawn are "real-world, hunt near you" (Questroad's index row: "GPS quests and walking the real world fit Dawn"). Cardinal Quest is already in Atlas, so Questroad is the only archive that gives "anywhere" play.
- **Map-engine mismatch (important):** Atlas draws its own baked basemap (`src/features/atlas/components/map-view.tsx`) and the Here chip uses Leaflet with OSM raster tiles (`src/components/dawn/atlas-map.tsx`). Neither has `querySourceFeatures`. The spec therefore ships Walk as its own `/walk` route on MapLibre + OpenFreeMap, as Questroad does, and links to it from the Here chip.
- **Drop:** guild, party recruits, presence, road reports, leaderboard, Firestore backend. They were never on.
- **Recommendation: build into Dawn as `/walk`.** Spec: `build-spec-dawn.md` §D.

---

## 5. Apps and games to drop

### 5.1 Style Lab — drop
- **What it does:** a static gallery for choosing the Artometrics visual system: 28 categories, four options each, circle favourites, export Markdown or JSON, D3 chart widgets, a "report kit" sample download, optional Gemini-minted option sets.
- **Code:** `sl-dep/src/{catalog,thumbs,picks,files,guide}.ts(x)`, `src/specimens/*`, `src/charts/{widgets,maps}.tsx`. 5,105 lines. Vite + React, hash routes.
- **Quality:** good, but it is a one-time decision tool. Picks live in `picks.md` and in Firestore (3 `users/` docs, dumped to Drive as `stylelab-510519-firestore.json`).
- **Overlap:** Dawn already ships Style Recipes (README "Data Studio, Style Recipes, and the letter").
- **Recommendation: drop.** Keep the archive as a design reference. The D3 chart widgets are the only reusable part, and they belong in the Artometrics site, not Dawn or Bagel.

### 5.2 Relay Queue and Releases — drop
See §4.2. Queue duplicates Dawn's approval-gated posting. Releases is a distribution map with no real data (seed catalog only).

### 5.3 Vault photo shelf — drop
See §4.3.

### 5.4 Priority — drop
Rainfall Health command center, a local-only task board (three files, `localStorage`). The archive is missing `data.js` that `app.js` imports. Described no further. Nothing Rainfall.

### 5.5 Mia Maps — drop
A Python pipeline that scrapes SF rental listings, scores and tracks them (SQLite and Excel), drafts landlord outreach and emails a digest. 4,382 lines of Python plus an Expo `mobile/` app. It holds a private person's applicant details and rental history in the database and outreach drafts. **Keep the archive private; do not reuse any of it.** Not a Dawn or Bagel feature.
- `Artometrics/mia-maps` now returns **404** to the gh token, so the inventory's concern about a still-running hourly workflow (`daily_scrape.yml`, with a Firebase CI token and Gmail SMTP) cannot be checked from here. Someone with owner access should confirm it is gone.
- Fact for tomorrow's connector review: `scripts/morph_runner.py` and `morph_reflex.py` use **Morph Cloud** (`MORPH_API_KEY`, `morphcloud` SDK). That is a different product from the `morph` MCP connector. This is not a reason to keep or cancel anything.

### 5.6 Games
| Game | What it is | Code | Verdict |
| --- | --- | --- | --- |
| Questroad | GPS quest RPG | HTML + MapLibre, 425 lines | **Build** `/walk` (§4.5) |
| Fernbound | Godot "Pokémon-style" overworld and battle game | **Compiled export only**: `index.wasm` 39.5 MB, `index.pck` 2.0 MB, `.gdc` bytecode (`overworld`, `battle`, `title`, `win`, `database`). No source in any archive. No GPS code is visible in a strings scan of the pack (the scripts are compiled). | Another agent is merging it. Embed the export as is. A rewrite is not possible from this archive. A "near you" mechanic would be new work |
| Cardinal Quest | 14 Stanford landmarks, XP, daily hunt | HTML, `data.js` 1,082 lines, `data/locations.json` (24 places linked to book scenes and podcast segments) | **Drop.** Dawn Atlas already uses its rules unchanged (`progress.ts`: "Cardinal Quest's rules, unchanged"). `locations.json` is useful to the Cardinal rebuild, not to Dawn or Bagel |
| Ashmere | Godot 4 choose-your-own-adventure | Godot project, 10 MB | **Drop.** Atlas covers story-walks |
| Spidermom rooftops | Rooftop game, rigged 3D character | Web game, 83 MB tree | **Drop** (original IP; archive kept) |
| Nightlight | Flashlight horror walk-around | Web 3D, 27 MB | **Drop** (Kyle's own example of one that does not fit) |
| Lampwick | First-person horror, Godot 4.7 | 40 MB | **Drop** |
| Voltspire | Retro FPS, Godot 4.7 | 0.8 MB tree | **Drop** |
| Knightmare | 3D greybox, "Tuning In" mechanic | 0.6 MB | **Drop** |
| Godot game page | Artometrics rebuilt in Godot | 20 MB | **Drop** |
| Lineage | Battles (Austerlitz, Waterloo playable) | Vanilla JS + Three.js | Merging into Pantheon, PR #37 open. Not specced here |
| Pantheon prototypes | Brawler, FPS, kart, parkour, sandbox, towers | — | Stay with Pantheon |

---

## 6. Constraints that shape every spec

- **Dawn** is a Next.js 16 static export on Firebase Hosting (`output: "export"`, project `dawn-510519`), with a separate Node **gateway** (`server/dawn-agents.mjs`, `src/lib/dawn-agents/http.ts`) behind Caddy and oauth2-proxy. `/api/public/*` is the only open gateway path. All hosting is `noindex`.
- A **desk** is browser-first: `localStorage` key `dawn.desk.<kind>.v1`, mirrored to `users/{uid}/desks/{kind}` when signed in. Hard cap **350,000 characters** of payload (rules enforce it). Anything bigger (chunks, embeddings, audio) must live on the gateway.
- Model calls go through the gateway with spend hooks and a hard stop at `DAWN_SPEND_CAP_USD` (default $20 a month). Any new model, embedding or TTS call must count against it.
- Adding a desk touches a fixed list of files (copied from PR #39). It is spelled out in `build-spec-dawn.md` "Desk wiring checklist". Missing a line breaks route tests or rules.
- **Bagel** is Astro 5, static, `noindex`, no backend, no public URL yet, `docs/HOLDS.md` lists what is deliberately off. It has `npm test` (vitest), `npm run check`, `npm run test:e2e` (Playwright).
- Nothing in these specs enables a purchase, a send, or a deploy. Dawn's mail gate (`NEWSLETTER_SEND_ENABLED`) is untouched.

## 7. Open items for Kyle (two blockers)

1. **Bagel catalog provenance.** The 12 products, prices and images come from The Foggy Dog's public product JSON. Mock checkout is safe as a demo. Anything live needs Kyle's own products, prices and fulfilment.
2. **Firebase Blaze billing.** A real checkout backend (and Cloud Functions for any other feature) needs Blaze. That is a purchase and needs the usual "where, what, how much" check first. Every phase in the specs that is safe to build now avoids it.

# Aftercare MVP (`site/`)

A self-contained Astro app: tarot with a 3D three.js table, numerology, and a shareable "second self"
profile with a map and connections. Everything is local-first: no accounts, no API, nothing uploaded.
It is separate from `web/` (the live Netlify app) and from the root Expo app. It is hosted at https://aftercare-510519.web.app with noindex (meta, `X-Robots-Tag`, and `robots.txt`). The Netlify `web/` deploy is unchanged.

See `../docs/PLAN.md` (vision, phases, data model), `../docs/RESEARCH.md` and `../docs/URL_SHEET.md`.

## Run it

```bash
cd site
npm install
npm run dev        # http://localhost:4321
npm run build      # astro check + static build to dist/
npm run preview    # serve dist/
npm test           # vitest: deck, numerology, second self, share link, storage
npm run test:e2e   # playwright smoke tests (builds, serves on :4322, desktop + mobile)
```

The browser tests use a system Chrome at `/usr/local/bin/google-chrome` if present (set `CHROME_PATH` to
override) and software WebGL flags so the 3D table renders on machines without a GPU.

## Layout

| Path | What it is |
| --- | --- |
| `src/data/deck.json` | The 78-card deck (original wording). Rebuilt from `src/data/deck-src/*.json` by `scripts/build-deck.mjs` |
| `src/lib/numerology.ts` | Life path, birthday, name numbers, personal year, birth cards |
| `src/lib/cardArt.ts` | Procedural SVG art for every card, shared by the 3D textures and the HTML pages |
| `src/lib/secondSelf.ts`, `share.ts`, `renderSelf.ts` | View model, share-link codec (data lives in the URL fragment), and HTML rendering |
| `src/lib/worldMap.ts` | Offline world map (Natural Earth 110m via `world-atlas`, pre-rendered by `scripts/build-world.mjs`) |
| `src/scene/TarotTable.ts` | three.js table: shuffle, deal, flip, hover tilt, on-demand rendering |
| `src/scripts/*.ts` | Page controllers (tarot, onboarding, profile, numerology, readings) |
| `scripts/shoot.mjs`, `scripts/milestones.mjs` | Screenshot helpers for `docs/process/` |

## Card art and content provenance

Card art is drawn by code (original, no scans, no modern deck). All card text, numerology copy and theme
mappings are original. Fonts are Fraunces and Outfit (SIL OFL) via `@fontsource`. The world outline is
Natural Earth (public domain). See `../docs/RESEARCH.md`.

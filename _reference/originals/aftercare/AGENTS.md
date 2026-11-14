# AGENTS.md

## Cursor Cloud specific instructions

This repo (**Aftercare**) contains **two** apps:

- **`web/`** — the primary, live surface: a Vite + React + TypeScript SPA with Netlify Functions,
  Netlify Database (Postgres via Drizzle), Netlify Blobs, and Netlify Identity auth. Deployed to
  Netlify (`netlify.toml` `base = "web"`).
- **root** — a secondary Expo / React Native app (native iOS/Android only) kept for a future
  native release.

Dependencies for both are installed by the startup update script (`npm install` at root and in
`web/`). Standard commands live in `README.md`, `web/package.json`, and root `package.json`.

### web/ (primary — run this)

Run from `web/`:

- `npm run dev` — Vite dev server on `http://localhost:5173`. The `@netlify/vite-plugin` emulates
  the Netlify platform locally (functions, database, blobs, AI gateway, redirects), so `/api/*`
  functions run without a separate `netlify dev` wrapper. It also auto-adds `.netlify/` (the local
  embedded Postgres data dir) to `web/.gitignore`.
- `npm run build` — `tsc -b && vite build` (typecheck + production build). Passes clean.
- `npm run lint` — oxlint (currently 1 benign fast-refresh warning).
- DB migrations live in `web/netlify/database/migrations/`; applied automatically on Netlify
  deploy. Local apply is `netlify database migrations apply`, which needs the Netlify CLI + a
  running local DB (`web/package.json`'s `db:migrate` calls a bare `netlify`, so the CLI must be on
  PATH, e.g. `npx netlify ...`).

**Non-obvious auth limitation (important):** Netlify **Identity is NOT emulated locally**. Signup/
login POST to `/.netlify/identity/*` and return **404** on `localhost`, so the authenticated area
(`/app/*` — journal, tarot, tracking, tools) and all protected `/api/*` routes (they return `401`)
**cannot be exercised on this headless VM**. Public pages (`/`, `/login`, `/signup`, `/forgot`)
render and navigate fine. Full auth + data flows require a **deployed Netlify site / deploy preview**
with Identity enabled (needs a `NETLIFY_AUTH_TOKEN` to `netlify link`/deploy). This is a documented
platform constraint, not a setup bug.

**AI features** (tarot readings, sky notes, Gemini card art) use the Netlify AI Gateway and degrade
gracefully to template/fallback text when unavailable; no provider keys are required to boot.

### root Expo app (secondary — native only)

Native-only Expo app; there is **no web target** and no simulator on the Cloud VM. The dev loop is
`npx expo start` (Metro on `:8081`); verify the app builds by having Metro compile the full JS
bundle and checking for HTTP 200:

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  "http://localhost:8081/node_modules/expo-router/entry.bundle?platform=ios&dev=true&minify=false"
```

`npx tsc --noEmit` passes; `npm run lint` runs but has many pre-existing warnings/errors (not caused
by new changes unless the diff adds new ones). Chat/speech features accept optional `EXPO_PUBLIC_*`
API keys via `.env` (copy `.env.example`); without them the chat shows a built-in mock response.

### Node

`README.md` suggests Node 20; the Cloud VM default Node 22 also works for both apps (install, lint,
typecheck, build, dev servers).

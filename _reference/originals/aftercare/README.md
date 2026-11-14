# Aftercare

Astrology, tarot, and journaling — soft guidance for your inner life.

## Aftercare MVP (`site/`)

A separate, local-first Astro app with a three.js tarot table, numerology and a shareable "second self" profile. Hosted at https://aftercare-510519.web.app (noindex). See [`site/README.md`](./site/README.md), [`docs/PLAN.md`](./docs/PLAN.md) and [`docs/URL_SHEET.md`](./docs/URL_SHEET.md).

## Live web app (Netlify)

Production site: **https://aftercare-artometrics.netlify.app**

The web app lives in [`web/`](./web) and deploys from `main` via Netlify (`netlify.toml` base = `web`).

### Features

- **Netlify Identity** — signup, login, password recovery
- **Journal** — private mood-tagged entries (Netlify Database)
- **Tarot** — single / three-card spreads, AI interpretation, Gemini card art cached in Blobs
- **Tracking** — daily mood check-ins with a simple chart
- **Tools** — birth profile, sun sign, life path, next birthday, moon calculator
- **Daily home** — sky note + ritual shortcuts

### Local development

```bash
cd web
npm install
npm run dev
```

Identity does not fully work with local-only mode until the site has been deployed at least once. Prefer a Netlify deploy preview for auth testing.

```bash
cd web
npx netlify dev
```

### Database

Schema: `web/db/schema.ts`  
Migrations: `web/netlify/database/migrations/` (applied automatically on deploy)

```bash
cd web
npm run db:generate   # after schema edits
npm run db:migrate    # local DB only
```

### Mobile (Expo)

The Expo React Native app remains at the repo root for a future native release. Web is the primary live surface.

## License

Private — Artometrics.

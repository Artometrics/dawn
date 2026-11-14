# Artometrics

The studio letter. Readers join with a confirmation click, the desk writes and sends, and a sent letter stays in a public archive. Leaving is one click.

Firebase project `newsletter-510519`, region `us-west1`, web app `newsletter-web`. Hosting is a static Vite app that reads `/__/firebase/init.json` at runtime, so Auth, Firestore, and Hosting can ship on the Spark plan. Cloud Functions (gen2) are the mail, tracking, and desk API. Until they are deployed, the desk says **The back end is not enabled yet.**

## What it does

- Public signup with stored consent time and the consent sentence. Double opt-in. The response does not say whether an address is already on the list.
- Compose in markdown. Gemini drafts from pasted notes or a public URL when `GEMINI_API_KEY` is a real secret. Otherwise the draft is built locally from the notes.
- Send to confirmed subscribers in batches of 50. `List-Unsubscribe` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click` point at the API. The letter footer links to the human unsubscribe page and includes the postal address.
- Open pixel and rewritten click links. Counts are total and unique.
- Archive pages for issues whose status is `sent`.
- MCP tools: `subscriber_count`, `draft_issue`, `schedule_issue`, `send_issue`, `get_stats`.

The postal address in the footer is a placeholder: Artometrics, 548 Market Street, PMB 00000, San Francisco, CA 94104, United States. Replace it in `functions/src/config.js` and `web/src/lib/compliance.ts` before a real mailing.

Desk accounts: `team@artometrics.com`, `kylesmcauliffe@gmail.com`. Google sign-in, email verified.

## Run locally

Requirements: Node 22, Java 21 (the Firestore emulator).

```bash
npm install
npm install --prefix functions
npm install --prefix web
npm install --prefix mcp
```

Three processes. The API forces a dry run. It does not call Resend.

```bash
npx -y firebase-tools@latest emulators:start --only auth,firestore --project newsletter-510519
npm run dev:api
npm run dev
```

- Site: http://127.0.0.1:43123
- API: http://127.0.0.1:5291/api/health
- Auth emulator: 127.0.0.1:9099
- Firestore emulator: 127.0.0.1:8181 (Standard edition)

On localhost the browser uses a demo Firebase config and the emulators. A hosted build never uses that demo config. It fetches `/__/firebase/init.json`.

Optional specimen letter, emulator only, labeled as a specimen and not mailed:

```bash
npm run seed:emulator
```

Sign in at `/admin` with an allowlisted address. The Auth emulator shows a popup where you pick that address.

## Tests

No test sends mail. The suite wraps `fetch` and fails if `api.resend.com` or the Gemini host is called.

```bash
npm test
```

`npm run test:unit` checks markdown, the SSRF guard, and that the allowlist, address, and consent sentence match across the API, the rules, and the site. `npm run test:rules` and `npm run test:api` start the emulators.

## API

OpenAPI 3.0.3: `functions/openapi.yaml` (also served at `GET /api/openapi.yaml`).

Public: `POST /subscribe`, `GET /confirm`, `GET|POST /unsubscribe`, `GET /archive`, `GET /archive/:slug`, `GET /health`, `GET /track/open/:token`, `GET /track/click/:token`.

Desk, `Authorization: Bearer` a verified allowlisted ID token: subscribers, issues, draft, schedule, send, stats, dry-run log, `POST /scheduled/process`.

A send with no confirmed subscribers returns 409 and puts the issue back to draft or scheduled. With no Resend key, a placeholder key (`dry-run`, `unset`, `placeholder`, `changeme`), `NEWSLETTER_DRY_RUN=1`, or the Functions emulator, delivery is written to `dryRuns` and nobody is mailed.

## MCP

```bash
NEWSLETTER_API_BASE=http://127.0.0.1:5291/api \
NEWSLETTER_ID_TOKEN="<Firebase ID token>" \
node mcp/server.js
```

Stdio, newline-delimited JSON-RPC. The same five tools the desk uses.

## Firestore

Standard edition, database `(default)`, `us-west1`. Rules are default-deny. Subscribers, events, sends, and rate limits are closed to the client SDK. Sent issues are world-readable. An allowlisted, verified account may create a draft and schedule it, and may not mark an issue sent, change counts, or rename a slug. See `firestore.rules`.

## Deploy

Unpack the bundle on a machine already logged in as `team@artometrics.com` and follow `/opt/cursor/artifacts/DEPLOY-BOX.md`. Spark can take `auth`, `firestore`, and `hosting`. Functions need the Blaze plan and two Secret Manager values. Until those secrets are real keys, sends stay in the dry-run log.

## Layout

- `web/` — public site and desk
- `functions/` — gen2 API and the five-minute scheduler
- `mcp/` — stdio MCP server
- `tests/` — unit, rules, and API emulator tests
- `PRODUCT.md`, `DESIGN.md` — product record and the visual system

## Search indexing

SEO/indexing intentionally disabled; re-enable robots, sitemap, meta at promoted launch.

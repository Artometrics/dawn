# Dawn // Studio 🌅

**Dawn Code**, the browser editor, lives in [`editor/`](editor/README.md). It is separate from the village app.

**Dawn** is a pixel-art village of agents, plus a studio and model gateway for the **Artometrics** ecosystem.

Open the app, join with your name (local emulators) or Google (the Firebase host), and tap Trinity, Kali, or Nimbus. They can draft a send, spend, hire, or post, and nothing leaves until you tap Approve. The Map tab is you on OpenStreetMap. Quests are short goals. The older studio UI is at `/studio`. See `ROADMAP.md`.

## Decided

The home shell is a night phone, in the grain of the Claude and Grok screens Kyle attached. Near-black ground, warm grey text, one clay accent, a serif “Dawn” wordmark, and a drawer with Quests, Village, Atlas, and Library. Pinned is the three agents. Recents are quests, with a relative date. A white “+ New quest” pill floats above a search field pinned to the bottom. Round buttons sit in the top corners.

That replaces the espresso pixel header and the five-tab bar as the way you move. The village, the approval gate, group chat, the team card, and Studio stay. Chat, the team card, and Studio live in Library so the drawer stays at four rows. From 768px wide the drawer stays open.

Atlas is a flat night map of real places with the 8/16-bit character on it: charcoal ground, lighter roads, neon only on the walked path, the live zone, and the next leg. Stops are dark-blue pills. Minor names fade as you zoom out. On a phone the sheet drags to 26, 46 and 78 percent; on a desktop it is a side panel. Cardinal, the Stanford story, is the first region. The Here chip is the geolocation map on OpenStreetMap tiles, darkened, with the OpenStreetMap credit.

Quest checks are a hollow or filled mark in a fixed cell. The clay accent marks the open section, a waiting approval, and a selected chip. The one filled action on a screen is the white pill.

## Studio

The studio is an autonomous development workspace and multi-model gateway.

Instead of paying for multiple isolated SaaS subscriptions and battling fragmented MCP setups, Dawn routes directly to high-context, cost-effective model APIs (Google Gemini, xAI Grok, DeepSeek, Claude) while providing a unified code editing and conversational reasoning interface.

---


## Hosting

Firebase Hosting serves the static export in `out/` (`output: "export"` in `next.config.ts`).
The village and Studio chat call Gemini through **Firebase AI Logic** in the browser — no API keys on the page.

**Atlas** is a map of real places at `/atlas`, with Cardinal (Stanford, from Kyle's Cardinal book and podcast) as its first region. It opens on the Founders' Walk with the pixel character at the first stop. It has 27 story stops with sources and a quiz, 12 more catalog places with notes and flags, five walking tours with real foot-routing lines, five book threads, a ten-event timeline, ranks, era stamps and a daily hunt. Progress stays in `localStorage` on the device. There is no sign-in, no API key and no new server path: the basemap is OpenStreetMap data baked into `public/maps/atlas/cardinal-basemap.json` (© OpenStreetMap contributors, ODbL), and the page is static. Embed it with `/atlas?embed=1`. Code, data and tests are in `src/features/atlas/` (see its README). The plan and mockups are in `docs/atlas/`. `data/atlas/stanford-places.json` (the old Apify name list) is no longer read.
The old `/api/chat` server handler is kept at `src/lib/studio/chat-route.ts` for a future Cloud Function if you want OpenRouter/Grok on the host again.

## Dawn Agents

Dawn Agents is Kyle's private desk at `/agents`. One owner. No signups and no billing. The static app stays on Firebase Hosting. Model calls, the worker, and the training log run in a separate Node gateway because the site is a static export.

### Gateway

```bash
cp .env.example .env.local
# Set DAWN_ALLOWED_EMAIL, DAWN_WORKER_TOKEN, and DAWN_EDITOR_TOKEN.
# For local use without Google, also set DAWN_ALLOW_LOOPBACK_OWNER=1.
# Never set that on the public host. Never commit the file.
npm run agents
npm run dev
```

On the public host, Google sign-in is oauth2-proxy. One cookie on `2-29-173-68.sslip.io` opens `/agents`, `/editor`, and the letter admin. The public letter at `/letter` stays open. The redirect URI is `https://2-29-173-68.sslip.io/oauth2/callback`. See `deploy/oauth.env.example` and `editor/scripts/install-ubuntu.sh`. The agents gateway and the code gateway trust `X-Auth-Request-Email` only when the TCP peer is loopback.

`DAWN_ALLOWED_EMAIL` is a comma-separated list. The public host uses `kylesmcauliffe@gmail.com,team@artometrics.com`. oauth2-proxy reads one address per line; the install script splits that list into `/etc/dawn/allowed-emails.txt`. The code gateway forwards training rows as the first address in the list.

Leave `gatewayUrl` empty in `public/dawn-agents-config.json`. An empty string, or a value that is only whitespace, means the browser calls `/api` on the same host. Caddy routes that to the gateway and copies the proxy header. Do not put a host in that file unless the gateway really lives somewhere else. A blank value must not point `/agents` at a hardcoded host.

Spend is estimated per call and hard-stops at `DAWN_SPEND_CAP_USD` (default $20) for the UTC month. Change it in Settings. Prices are estimates.

The training log is on by default. Gemini, xAI, OpenRouter, and the stand-in are included in the JSONL export until you turn one off. Settings notes that some providers' terms restrict training on outputs. Export from Settings. Thumbs-down rows without a correction stay in the table and are left out of the file. A saved correction replaces the assistant turn. Obvious keys, emails, and phone numbers are scrubbed. The log never stores env values.

### Hetzner worker (Ubuntu 24.04)

The computer is a Linux worker that dials out. It does not open a port. Each agent gets `/var/lib/dawn-agents/sandboxes/<agentId>`. Allowlisted commands run immediately. Anything else waits for Allow. A short denylist never runs.

On the server, with Node.js 22+:

```bash
sudo ./worker/install-linux.sh
# Edit /etc/dawn-agents/worker.env
# DAWN_AGENTS_URL=https://your-gateway
# DAWN_WORKER_TOKEN=<same value as the gateway>
sudo systemctl restart dawn-agents
systemctl status dawn-agents
```

The unit runs as `dawn-agents` with `ProtectSystem=strict` and write access only under `/var/lib/dawn-agents`. No Hetzner password goes in the script or the repo.

### Optional Mac worker

The Mac is a second computer, not the default. Assign an agent to Mac in the editor.

```bash
cd worker
cp worker.env.example worker.env
# DAWN_WORKER_KIND=mac, plus the gateway URL and the same token
node dawn-worker.mjs
```

Sandboxes land in `~/dawn-agents/<agentId>`. `worker/com.artometrics.dawn-agents.plist.example` is a launchd sketch. The Mac worker uses the same allowlist. It does not add a separate OS sandbox profile.

### Data Studio, Style Recipes, and the letter

Data Studio (inside the same $20 cap) collects chats, letter drafts, and taste events three times a day UTC (08:00, 14:00, 20:00) or when you press Collect now. Tracks: chart-to-story (a real source URL is required), fact-check with true/false, visual taste from Style Recipes, agent corrections, taste signals, writing, A/B preferences, and synthetic rows. Synthetic rows are tagged, judged, and capped at about half the real set. The default generator is the desk model (an open model through OpenRouter when `DAWN_SYNTHETIC_MODEL` and `OPENROUTER_API_KEY` are set). Exports are JSONL in SFT (`messages`) and DPO (`prompt`, `chosen`, `rejected`) shapes, each with `license`, `provenance`, `consent`, and `ownerId`.

Style Recipes at `/agents` (Recipes) is the board from https://recipes-510519.web.app. That site stays up. Like, save, skip, and mix are engagement events. Agents can apply a recipe in chat, and Dawn Code inserts `GET /api/v1/recipes/:id/snippet`.

The letter (Publish) is the studio newsletter. https://newsletter-510519.web.app stays up. Draft with an agent, apply a recipe, publish a public page at `/letter`, import or export subscribers as CSV, and send only after an explicit confirm. Confirmation mail is also a button, not an automatic send. Opens and clicks are counted when the gateway is the host of the pixel and the link redirect. Resend, Postmark, or SES are used when their env keys are set. Otherwise mail stays in the local outbox.

Anonymous newsletter readers get a random `r_` id in local storage. Engagement events store that id, not the email.

### Backfill JSONL

`POST /api/data/import` accepts chat-format JSONL. `POST /api/data/import-dir` reads `DAWN_BACKFILL_DIR` or `/workspace/personal-model` when that directory exists.

```json
{"messages":[{"role":"system","content":"..."},{"role":"user","content":"..."},{"role":"assistant","content":"..."}],"metadata":{"id":"b1","source":"personal-model","license":"internal","provenance":"Kyle archive"}}
```

`messages` is required. `metadata` is optional. Missing license becomes `unknown` and the row waits in the review queue with `consent: "missing"`.

### Editor API

See `docs/dawn-agents-editor-api.md`. Browser routes use the Google session. The editor service still calls `/api/v1` with `DAWN_EDITOR_TOKEN` from localhost. OpenVSCode does not use a `?tkn=` connection token. Caddy does not ask for a password.

### What is stubbed

- Cloud VM computers implement the same interface and return a clear error.
- Firestore rules reserve `users/{uid}/dawnAgents` for a later mirror. The live store is the gateway's JSON file.
- Without a model key, chat uses a local stand-in that still runs tools. Stand-in rows cost $0 and are included in the training export until you exclude that provider.
- Web search uses the DuckDuckGo instant-answer API.
- The Linux install is confined by systemd. A local dev worker is the directory jail plus the allowlist.
- SES sends only when AWS credentials are set. There is no inbox UI for the console outbox.
- Group replies run one agent after another.
- Dawn Code, the VS Code editor, is in `editor/`. It calls `docs/dawn-agents-editor-api.md` and keeps a local stub when a route is missing.

## Tests

`npm test` runs every suite: `test:app` (all `src/lib` suites, including the kit, browser and OpenVSCode ones) and `test:editor` (the code gateway in `editor/`). Several suites need things on the machine:

- `npm run build` first, so `out/` exists for the route and browser tests, and a local Chrome.
- `npm --prefix editor ci && npm --prefix editor run build` for `editor/dist/gateway.cjs`.
- OpenVSCode Server in `/tmp/dawn-code-cache` (see `editor/scripts/dev.sh`).

The two OpenVSCode runtime tests skip with a reason when the binary or the gateway bundle is missing, except when `CI` is set, where a missing piece fails the run. CI (`.github/workflows/test.yml`) builds and downloads both.

Run separately, because they do not belong in a plain unit run: `npm run check:forge` (Character Maker in Chrome; it writes screenshots, pass an output directory) and `npm run test:rules` (Firestore rules on the local emulator, needs Java). CI runs both. No suite calls a model, Telegram, Google or any mail service.

## ⚡ Architecture & Features

- **Monaco Code Editor**: Full-featured VS Code-style editor with syntax highlighting, auto-completion, and multi-file context tracking.
- **Multi-Model Gateway**: Single unified streaming API route supporting:
  - **Google Gemini 2.0 Flash / 1.5 Pro**: Massive 1M+ token context window, lightning-fast generation, extremely cost-effective.
  - **xAI Grok 2**: High-octane conversational intelligence, unfiltered reasoning, and strategic thinking.
  - **DeepSeek V3 / Claude 3.7**: Universal routing via OpenRouter.
- **Dual Persona Engine**:
  - **Grok Mode**: Strategic, witty, bold engineering partner that challenges assumptions and architects systems.
  - **Cursor Mode**: Laser-focused, minimal fluff, copy-paste ready diffs and surgical code refactoring.
- **Context Injection**: Active file contents and language are automatically attached to prompts so models have zero-setup situational awareness.

---

## 🛠️ Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Keys
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Add your API keys:
- `GOOGLE_GENERATIVE_AI_API_KEY`: Get from [Google AI Studio](https://aistudio.google.com/)
- `OPENROUTER_API_KEY`: Get from [OpenRouter](https://openrouter.ai/) (for Grok, DeepSeek, Claude)
- `XAI_API_KEY`: (Optional) Direct xAI API key

### 3. Launch Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🗺️ Roadmap

- [x] Next.js 15 App Router + Tailwind foundation
- [x] Monaco Editor + live context attachment
- [x] Multi-model unified streaming gateway (`/api/chat`)
- [x] Grok Mode & Cursor Mode persona toggles
- [ ] Local file tree read/write API (hands to edit workspace files)
- [ ] Sandboxed terminal & bash execution (Docker / local child process)
- [ ] Vectorized codebase indexer & embedding search

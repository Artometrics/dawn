# Dawn // Studio 🌅

**Dawn** is a pixel-art village of agents, plus a studio and model gateway for the **Artometrics** ecosystem.

Open the app, join with your name (local emulators) or Google (the Firebase host), and tap Trinity, Kali, or Nimbus. They can draft a send, spend, hire, or post, and nothing leaves until you tap Approve. The Map tab is you on OpenStreetMap. Quests are short goals. The older studio UI is at `/studio`. See `ROADMAP.md`.

The studio is an autonomous development workspace and multi-model gateway.

Instead of paying for multiple isolated SaaS subscriptions and battling fragmented MCP setups, Dawn routes directly to high-context, cost-effective model APIs (Google Gemini, xAI Grok, DeepSeek, Claude) while providing a unified code editing and conversational reasoning interface.

---


## Hosting

Firebase Hosting serves the static export in `out/` (`output: "export"` in `next.config.ts`).
The village and Studio chat call Gemini through **Firebase AI Logic** in the browser — no API keys on the page.

**Atlas** is a Stanford campus day at `/atlas`. A 16-bit character walks the Cardinal Quest (El Palo Alto, Stanford Red Barn, Arizona Garden, Lake Lagunita, Hanna House). Each stop shows “Cardinal note coming soon”. Embed it on the Cardinal site with `/atlas?embed=1`. Tiles are [OpenStreetMap](https://www.openstreetmap.org/copyright) (`© OpenStreetMap`). The place list in `data/atlas/stanford-places.json` is name, latitude, and longitude only, collected from Google Maps via Apify on 2026-10-30 (about $0.30).
The old `/api/chat` server handler is kept at `src/lib/studio/chat-route.ts` for a future Cloud Function if you want OpenRouter/Grok on the host again.

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

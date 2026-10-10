# GOALS & PRODUCT ROADMAP

## 1. Core Mission
Deliver a self-hosted, independent alternative to Cursor Composer and xAI Grok Bots with:
- **Zero SaaS Per-Seat Tax**: You own the workspace, bring your own keys, and run unlimited bots without $20–$120/seat monthly fees.
- **Unified Multi-Bot Team**: Real-time collaboration between specialized autonomous bots (Trinity, Kali, Taskmaster, Oracle, Nimbus, Bali, Scanbot 3).
- **Embedded Browser Preview & Monaco IDE**: Live code modifications with instant hot-reloading side-by-side.

---

## 2. Milestones

### Milestone 1: Studio Foundation (Completed)
- [x] Next.js 16 App Router + Tailwind v4 CSS architecture.
- [x] Code with Antonio UI primitives (60+ Shadcn components).
- [x] Claude warm terracotta + Slack top bar + Grok Bots visual theme.
- [x] Multi-model streaming gateway (Gemini 3.8 Flash, Gemini 3.1 Pro Preview, OpenRouter Grok 2).
- [x] Interactive computer preview with sleep/wake mode and mobile frame mockup.
- [x] Command Palette (`⌘K`) and top search bar area.

### Milestone 2: Autonomous File Operations & Terminal (In Progress)
- [ ] Direct file system reading & editing via WebSocket server bridge.
- [ ] In-browser interactive bash terminal dock.
- [ ] Git commit, branch creation, and push directly from the Composer dock (`Changes +43 -164`).

### Milestone 3: Multi-Bot Orchestration & Autonomous Agent Swarm
- [ ] Bot-to-bot delegation (e.g. Trinity calling Kali to research an API, then delegating implementation to Taskmaster).
- [ ] Shared team memory graph persisted to SQLite or local JSON.
- [ ] Background scheduled cron jobs for repo auditing and health checks.

### Milestone 4: Multi-User Collaboration & Self-Hosted Teams
- [ ] Local peer-to-peer / LAN sync between developer machines.
- [ ] Custom bot persona creation and exportable bot presets.
- [ ] Native macOS desktop app wrapper (Electron / Tauri).

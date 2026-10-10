# DAWN CODEX
> Complete Architectural Blueprint, Agent Specifications, Operator Manuals, and Integration Guides for Project Dawn.

---

## 1. Executive Summary
**Project Dawn** is a self-hosted, vendor-agnostic AI software studio designed for autonomous development. It combines:
1. **Cursor Composer & Agent Workspaces**: Three-column architecture with project trees, active threads, and code generation.
2. **xAI Grok Bots**: Specialized multi-bot team with distinct roles (Trinity, Kali, Taskmaster, Oracle, Nimbus, Bali, Scanbot 3, and Impact Report).
3. **Claude Aesthetic & Interaction Model**: Warm espresso and terracotta theme, "Evening thoughts" hero interface, and Chat/Cowork mode switching.
4. **Slack Workspace Architecture**: Top global search bar (`⌘K`), activity rail, channel tabs, and rich message reaction flows.
5. **Interactive Computer / Live Preview**: Real-time browser webview with mobile frame simulation and Monaco IDE code editing.

---

## 2. Directory Structure

```text
dawn/
├── codex/
│   ├── README.md                     # This master index
│   ├── agents/                       # Specialized bot personas & system prompts
│   │   ├── trinity.md                # Autonomous Executive Bot (Core Orchestrator)
│   │   ├── kali.md                   # Research Assistant (Docs & Step-by-Step Guides)
│   │   ├── taskmaster.md             # PR & Build Orchestrator
│   │   ├── oracle.md                 # Deep Systems Researcher & Code Archaeologist
│   │   ├── nimbus.md                 # Cloud & Infrastructure Lead
│   │   ├── bali.md                   # Creative, Video, & UI Translation Specialist
│   │   ├── scanbot.md                # Security Sentinel & Pre-Launch QA
│   │   └── impact.md                 # Impact Report & Metrics Synthesizer
│   ├── guides/                       # Operational & Developer Guides
│   │   ├── architecture-overview.md  # Next.js 16 App Router, Vercel AI SDK, Tailwind v4
│   │   ├── model-gateway.md          # Multi-LLM Routing (Gemini 3.8, Grok 2, OpenRouter)
│   │   └── environment-and-keys.md   # API Keys, Environment Configuration, Fallbacks
│   ├── manuals/                      # UI/UX Specifications
│   │   ├── ui-design-system.md       # Color Palette (Claude Espresso + Terracotta + Slack)
│   │   └── browser-preview.md        # Computer Sleep/Wake Mode & Mobile Mockup
│   ├── goals/                        # Strategic Milestones & Roadmap
│   │   └── roadmap.md                # 2026 Autonomy, Teams Parity, Local Execution
│   └── integrations/                 # Organization, Theme, & Asset Integrations
│       ├── code-with-antonio.md      # Code with Antonio Primitives, Themes, & Tokens
│       ├── organization-access.md    # Artometrics, kylesmcauliffe, & Partner Orgs
│       └── credentials-and-auth.md   # GitHub OAuth, Tokens, & Sandboxed Creds
├── src/                              # Production Next.js Source
│   ├── app/                          # App Router (page.tsx, globals.css, layout.tsx)
│   ├── components/                   # Shadcn UI, ChatAvatar, TeammateDialog
│   ├── lib/                          # Utilities (cn)
│   └── types/                        # TypeScript Interfaces & DEFAULT_TEAMMATES
└── public/                           # Static Assets & SVGs
```

---

## 3. Quick Links
- [Agent Specifications](./agents/trinity.md)
- [Code with Antonio Integration](./integrations/code-with-antonio.md)
- [Organization & GitHub Access](./integrations/organization-access.md)
- [Model Gateway Routing](./guides/model-gateway.md)
- [UI Design System Manual](./manuals/ui-design-system.md)
- [Project Goals & Roadmap](./goals/roadmap.md)

# HOW TO REPLICATE THIS EXACT AGENT STACK IN CURSOR & GROK BOTS

This manual lists every CLI, SDK, MCP server, Google Cloud / Firebase service, and configuration file needed to give your Grok Bots and Cursor instances the exact same toolset, intelligence, and capabilities as Antigravity.

---

## 1. System CLIs & Package Managers

Install these base command-line tools on macOS:

```bash
# 1. GitHub CLI
brew install gh

# 2. uv (Ultra-fast Python package & environment manager)
curl -LsSf https://astral.sh/uv/install.sh | sh

# 3. Google Cloud SDK (gcloud CLI)
brew install --cask google-cloud-sdk
gcloud auth login
gcloud auth application-default login

# 4. Firebase CLI
npm install -g firebase-tools
firebase login

# 5. Node.js (v20+) and modern runners
brew install node pnpm bun
```

---

## 2. Google Stack (AI Studio, Cloud, Firebase)

### A. Google AI Studio & Gemini API
- **Console**: [aistudio.google.com](https://aistudio.google.com)
- **Key**: `GEMINI_API_KEY`
- **Current Production Models**:
  - `gemini-3.8-flash` (Primary fast coding & streaming agent)
  - `gemini-3.1-pro-preview` (Deep reasoning, security auditing, complex refactors)
  - Embeddings: `text-embedding-004`
- **SDKs**:
  ```bash
  npm install @ai-sdk/google @google/genai
  # or Python:
  uv pip install google-genai
  ```

### B. Google Cloud Platform (GCP)
- **APIs to Enable in GCP Console**:
  - Vertex AI API (`aiplatform.googleapis.com`)
  - Cloud Run Admin API (`run.googleapis.com`)
  - Cloud Storage API (`storage.googleapis.com`)
  - Cloud Build API (`cloudbuild.googleapis.com`)

### C. Firebase Suite
- **Firebase Auth**: Social sign-ins (Google, GitHub), custom JWTs
- **Cloud Firestore**: Realtime NoSQL database with declarative `firestore.rules`
- **Firebase App Hosting**: Next.js 16 SSR / SSG deployment platform
- **Firebase Crashlytics & Remote Config**

---

## 3. MCP (Model Context Protocol) Servers for Cursor

In Cursor, go to **Cursor Settings > Features > MCP**, or edit `~/.cursor/mcp.json` (or `.cursor/mcp.json` in your repo).

Here is the master configuration:

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_your_token_here"
      }
    },
    "google-workspace": {
      "command": "npx",
      "args": ["-y", "@google-workspace/mcp-server"],
      "env": {
        "GOOGLE_APPLICATION_CREDENTIALS": "/path/to/credentials.json"
      }
    },
    "gemini-docs": {
      "command": "npx",
      "args": ["-y", "gemini-api-docs-mcp"]
    },
    "slack": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-slack"],
      "env": {
        "SLACK_BOT_TOKEN": "xoxb-your-token",
        "SLACK_TEAM_ID": "T..."
      }
    },
    "figma": {
      "command": "npx",
      "args": ["-y", "figma-developer-mcp"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "figd_..."
      }
    },
    "elevenlabs": {
      "command": "npx",
      "args": ["-y", "elevenlabs-mcp"],
      "env": {
        "ELEVENLABS_API_KEY": "sk_..."
      }
    },
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp"]
    },
    "notebooklm": {
      "command": "npx",
      "args": ["-y", "notebooklm-mcp"]
    }
  }
}
```

---

## 4. Web & Framework Stack

When building apps like Dawn, use this exact frontend/full-stack combination:

- **Next.js 16 (Turbopack)**: App Router with React 19 Server Components
- **Tailwind CSS v4**: Dynamic `@theme inline` with OKLCH color tokens
- **Vercel AI SDK (`ai` v4+)**: Stream text and UI tools directly to client
- **Shadcn UI (Base UI / Radix)**: Accessible primitives (`button`, `dialog`, `tabs`, `badge`)
- **DiceBear Core & Gaze/Bottts**: High-DPI animated SVG avatars
- **Monaco Editor (`@monaco-editor/react`)**: In-browser VS Code editing
- **Lucide React**: Universal icon set

---

## 5. Master Cursor Rules (`.cursorrules`)

Drop this file into the root of any repository as `.cursorrules` to instruct Cursor:

```markdown
# Agent Identity & Operating Guidelines

You are an expert AI software architect working in Project Dawn / Artometrics.
You follow the Google DeepMind agentic coding style.

## Rules of Engagement:
1. Prefer Next.js 16 App Router, React 19, TypeScript, and Tailwind CSS v4.
2. Always write modular code with Shadcn UI primitives located in @/components/ui.
3. When integrating models, use Google Generative AI (Gemini 3.8 Flash, 3.1 Pro Preview) and OpenRouter (Grok 2).
4. Preserve file and documentation integrity. Never delete comments or remove error handling.
5. Provide working, runnable code blocks. Create clickable links to edited files.
6. Adopt the Claude espresso (#191716) and terracotta (#d97746) design aesthetic.
```

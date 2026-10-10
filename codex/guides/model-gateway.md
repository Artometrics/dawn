# MODEL GATEWAY & AI SDK ROUTING

## 1. Gateway Architecture
Project Dawn's AI Gateway lives in `src/app/api/chat/route.ts`. It acts as a unified, resilient multi-provider router supporting:
- **Google Generative AI (`@ai-sdk/google`)**:
  - `gemini-3.8-flash` (Primary low-latency streaming agent)
  - `gemini-3.1-pro-preview` (Deep reasoning & security audits)
- **OpenRouter Gateway (`@ai-sdk/openai`)**:
  - `x-ai/grok-2-1212` (xAI Grok 2 Bot engine)
  - `openai/gpt-4o-mini` (Universal fast fallback)
  - `anthropic/claude-3.7-sonnet` (Complex refactors)

---

## 2. Dynamic Model Normalizer
Legacy model names (like `gemini-2.0-flash` which Google retired) are automatically intercepted and normalized:
```typescript
function resolveModel(requestedModel: string = 'gemini-3.8-flash') {
  let normalized = requestedModel.toLowerCase().trim();

  if (
    normalized.includes('gemini-2') ||
    normalized.includes('gemini-flash') ||
    normalized === 'gemini'
  ) {
    normalized = 'gemini-3.8-flash';
  } else if (
    normalized.includes('gemini-1.5') ||
    normalized.includes('gemini-pro')
  ) {
    normalized = 'gemini-3.1-pro-preview';
  }

  if (normalized.startsWith('gemini')) {
    return google(normalized);
  }

  if (process.env.OPENROUTER_API_KEY) {
    return openrouter(requestedModel);
  }

  return google('gemini-3.8-flash');
}
```

---

## 3. Context Injection Pipeline
Every request to `/api/chat` injects three contextual layers into the prompt stream:
1. **Teammate Persona & Role**: System prompt matching the selected bot.
2. **Persistent Memories**: Historical notes, design constraints, and project rules stored on the teammate.
3. **Active Monaco Code Context**: Full file contents, language tag, and filename of the current editor buffer.

---

## 4. Environment Variables Required
```bash
GEMINI_API_KEY=AIzaSy...
OPENROUTER_API_KEY=sk-or-v1-...
```

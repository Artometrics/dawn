# Dawn Agents editor API and training log

Dawn Code calls this contract. It was taken from the Dawn Agents design on `cursor/dawn-agents-v1-0f2d` before that branch merged. Where the service is missing, Dawn Code stubs the call and says so.

Base URL: `DAWN_AGENTS_URL` (default `http://127.0.0.1:8787`).

Auth for every `/api/v1` route: `Authorization: Bearer <DAWN_EDITOR_TOKEN>`.

Dawn Code’s own gateway is separate and listens on `127.0.0.1:8791`. It proxies these routes so the browser extension never holds the editor token for Dawn Agents... the extension holds `DAWN_CODE_TOKEN` for the local gateway only. The gateway attaches `DAWN_EDITOR_TOKEN` when it calls Dawn Agents.

## Agents and jobs

`GET /api/v1/agents`

```json
{ "agents": [{ "id": "a_0123456789ab", "name": "Researcher", "instructions": "", "model": "gemini-3.8-flash", "computer": "hetzner" }] }
```

Agent ids match `a_` plus 12 hex characters.

`POST /api/v1/jobs`

```json
{ "agentId": "a_0123456789ab", "prompt": "Refactor the auth module", "title": "Dawn Code handoff" }
```

```json
{
  "jobId": "job_1",
  "status": "completed",
  "agentId": "a_0123456789ab",
  "replies": [{ "agentId": "a_0123456789ab", "content": "Done", "toolCalls": [], "usage": { "inputTokens": 0, "outputTokens": 0, "costUsd": 0 } }]
}
```

`POST /api/v1/jobs/:id/messages`

```json
{ "text": "Also rename the helper", "prompt": "Also rename the helper" }
```

The response has the same job shape. Dawn Code sends both `text` and `prompt` because the planned handler used either name.

Errors are `{ "error": "..." }`. `401` is a refused token and is not treated as a stub. `402` means the shared cap blocked the call. `404` means the route is not merged yet.

## Spend

`GET /api/v1/spend`

```json
{ "spentUsd": 1.5, "capUsd": 20 }
```

This route was not in the merged tree. Dawn Code shows “agents not merged” until it returns `spentUsd`.

## Training log

`POST /api/v1/training-log`

Override the URL with `DAWN_TRAINING_LOG_URL`. The token is `DAWN_TRAINING_LOG_TOKEN`, or `DAWN_EDITOR_TOKEN` when that is empty.

```json
{
  "source": "dawn-code",
  "id": "tl_0123456789abcdef",
  "at": "2026-11-03T08:00:00.000Z",
  "kind": "chat",
  "action": "response",
  "model": "gemini-3.8-flash",
  "prompt": "What does greet return?",
  "response": "It returns a string.",
  "paths": ["editor/sample/hello.ts"],
  "edit": [{ "path": "src/a.ts", "before": "const foo = 1", "after": "const bar = 1" }]
}
```

`kind` is `chat`, `inline`, or `agent`. `action` is `response`, `edit`, `accept`, or `reject`.

A chat reply is `response`. An inline or agent proposal is `edit`. Accept and reject are sent when Kyle decides, and they repeat the prompt, response, model, and the diff.

The gateway also appends every row to `training-log.jsonl` in `DAWN_CODE_DATA`. Secrets are redacted before the file write and before the POST. If this route is down or returns 404, the row stays in the file and the panel says the API is not merged.

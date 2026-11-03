# Dawn Agents editor API

The future Dawn Code editor (VS Code based) calls this HTTP API on the gateway. The static site does not serve it. Base URL is the gateway origin, for example `http://127.0.0.1:8787`.

The browser desk at `/agents` does not use this token. Google sign-in (oauth2-proxy) covers `/agents`, `/editor`, and the letter admin. The public letter at `/letter` does not. `/api/v1` is the service path the editor gateway calls from localhost.

Auth for every `/api/v1` route:

```http
Authorization: Bearer $DAWN_EDITOR_TOKEN
Content-Type: application/json
```

The browser does not send this token. Owner routes trust `X-Auth-Request-Email` only from loopback, after oauth2-proxy. The editor token cannot read the training log or the subscriber list.

## Agents

`GET /api/v1/agents`

```json
{ "agents": [{ "id": "a_…", "name": "Ada", "instructions": "…", "model": "gemini-3.8-flash", "computer": "hetzner" }] }
```

`POST /api/v1/agents/:id/messages`

```json
{ "text": "Look at the snippet", "threadId": "optional" }
```

Response:

```json
{ "threadId": "th_…", "replies": [{ "id": "m_…", "content": "…", "tools": [], "usage": {} }] }
```

## Jobs

A job is a thread the editor owns.

`POST /api/v1/jobs`

```json
{ "agentId": "a_…", "prompt": "Insert the pixel billboard header", "title": "Header" }
```

`GET /api/v1/jobs/:id` returns the thread and its messages.

`POST /api/v1/jobs/:id/messages` is the same shape as the agent message route when you pass `threadId`.

## Style Recipes

`GET /api/v1/recipes` lists id, name, and tags.

`GET /api/v1/recipes/:id/snippet` returns copyable HTML and CSS:

```json
{ "id": "pixel-billboard", "name": "Pixel Mosaic Billboard", "html": "<!-- Pixel Mosaic Billboard — Style Recipe -->…" }
```

Dawn Code inserts `html` into the open document. The live board at https://recipes-510519.web.app is unchanged.

## Spend

Editor turns use the same monthly cap as the desk. A capped call returns an error string in the reply path and does not call the provider.

## Backfill schema

Personal-model backfill is chat-format JSONL with optional metadata. One JSON object per line.

```json
{"messages":[{"role":"system","content":"Be brief."},{"role":"user","content":"Hi"},{"role":"assistant","content":"Hello"}],"metadata":{"id":"b1","source":"personal-model","license":"internal","provenance":"Kyle archive","created":"2026-10-01"}}
```

| Field | Required | Notes |
| --- | --- | --- |
| messages | yes | `role` is `system`, `user`, or `assistant`. `content` is a string. |
| metadata.id | no | Stored as provenance uri `backfill:<id>`. |
| metadata.source | no | Defaults to `backfill`. |
| metadata.license | no | Defaults to `unknown`. |
| metadata.provenance | no | Free text. Defaults to the source. |

Import with `POST /api/data/import` as raw JSONL or `{ "jsonl": "…" }` using the owner session, not the editor token. Or `POST /api/data/import-dir` to read every `.jsonl` file in `DAWN_BACKFILL_DIR` (default `/workspace/personal-model`).

Imported rows start as `consent: "missing"` and `status: "pending"` so they sit in the review queue.

## Data exports (owner session)

`GET /api/data/export?format=sft` chat messages plus `license`, `provenance`, `consent`, `ownerId`, `track`, `synthetic`.

`GET /api/data/export?format=dpo` preference rows: `prompt`, `chosen`, `rejected`, plus the same provenance fields. Includes A/B picks and taste pairs.

`GET /api/data/export?format=taste` is only the taste-signal pairs (recipe like/skip, newsletter click/unsubscribe).

`GET /api/training/export.jsonl` is the model-call log in the same chat `messages` shape. Provider switches in Settings filter it. All providers start included.

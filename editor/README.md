# Dawn Code

Dawn Code is Kyle’s browser editor: OpenVSCode Server plus a Dawn extension. Chat, inline edit, and agent review run through a local gateway. Model keys stay in the environment. The panel shows estimated spend against the shared $20 monthly cap.

The extension, gateway, and install files live in this folder so they do not collide with Dawn Agents.

## Run it here

```bash
cd editor
npm ci
bash scripts/dev.sh
```

Open `http://127.0.0.1:3000/editor`. The dev script forces stand-in answers (`DAWN_CODE_MOCK=1`) unless you export `DAWN_CODE_MOCK=0` and set a model key. The gateway listens on `127.0.0.1:8791`. There is no connection token in the URL.

```bash
npm test
npm run typecheck
npm run package
```

## On the Ubuntu server

`scripts/install-ubuntu.sh` is for Ubuntu 24.04. It installs Node 22 if needed, Caddy, and OpenVSCode Server v1.109.5, builds the extension, and installs systemd units. It does not SSH anywhere.

```bash
sudo bash editor/scripts/install-ubuntu.sh
sudoedit /etc/dawn-code/env
sudo systemctl start dawn-code-gateway dawn-code
```

Set `DAWN_CODE_TOKEN` and at least one of `GEMINI_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`, `XAI_API_KEY`, or `OPENROUTER_API_KEY`. Sign-in is Google through oauth2-proxy, not a password and not a `?tkn=` query. `deploy/oauth.env.example` lists `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `OAUTH2_PROXY_COOKIE_SECRET`, and `DAWN_ALLOWED_EMAIL` (comma-separated; the install script writes one address per line). The redirect URI is `https://2-29-173-68.sslip.io/oauth2/callback`.

OpenVSCode and both gateways bind `127.0.0.1`. Caddy is the public door. It checks the shared `_oauth2_proxy` cookie for `/agents`, `/editor`, and `/api` (the letter admin). `/letter` and `/api/public` are not checked. The gateways honor `X-Auth-Request-Email` only from a loopback peer.

Docker Compose is in `docker/docker-compose.yml`. Copy `.env.example` to `.env` first. The supported path on the Hetzner box is the install script.

## What the extension does

- **Chat** answers about the open file and the selection. Replies stream.
- **Inline edit** takes a selection and an instruction, shows a diff, and writes only after Accept.
- **Agent** drafts edits across the open workspace, lists the steps, and opens a multi-file review. Accept writes them. Reject writes nothing. A file that changed since the review is left alone.
- **Send to Dawn agent** hands the task to Dawn Agents and shows the status.
- **Spend** is an estimate for this UTC month against `DAWN_SPEND_CAP_USD` (default 20). At the cap, paid models stop. Stand-in answers still work.
- **Training log** records each chat response, inline or agent proposal, and each accept or reject: prompt, response, model, and the diff.

The theme is Artometrics Dark (`#0047ff`, `#ff3d8a` on a near-black ground).

## Models

The gateway follows `src/lib/models.ts`. Retired `grok-2` and `gemini-2` ids are remapped. Gemini uses `GEMINI_API_KEY` or `GOOGLE_GENERATIVE_AI_API_KEY`. Grok uses `XAI_API_KEY` at `https://api.x.ai/v1` with the slug `grok-4.7`, or OpenRouter when that key is the one set. Other OpenRouter ids use `OPENROUTER_API_KEY`. A missing key produces a stand-in reply and does not call a provider.

Prices in `src/shared/spend.ts` are estimates. The panel labels the total as estimated.

## Dawn Agents and the training log

The live contract is `docs/dawn-agents-editor-api.md`. Dawn Code calls those routes. A missing route, an empty token, or a connection error still falls back to a local stub.

| Call | Merged behavior | Stub |
| --- | --- | --- |
| `GET /api/v1/agents` | Lists agents. Ids are `a_` plus at least 8 hex characters. | One stub agent when the route is missing. |
| `POST /api/v1/jobs` | Creates a job thread and returns `jobId` plus replies. | The task is not sent. |
| `GET /api/v1/jobs/:id` | Returns the thread and its messages. | The gateway remembers only the stub it created. |
| `POST /api/v1/agents/:id/messages` | Follow-up with `{ text, threadId }`. | If that route is missing, Dawn Code tries `POST /api/v1/jobs/:id/messages`, then a stub. |
| `GET /api/v1/recipes` and `GET /api/v1/recipes/:id/snippet` | **Dawn Code: Insert Style Recipe** inserts the HTML. | No HTML is invented. The command says the recipes were not loaded. |
| `GET /api/v1/spend` | Not in the merged API. Agent turns hit the same cap and return the error in the reply. | The panel says the agents ledger is not merged. Dawn Code’s own ledger still counts toward $20. |
| `POST /api/data/import` | The code gateway calls Dawn Agents on localhost and sets `X-Auth-Request-Email` to `DAWN_ALLOWED_EMAIL`. Dawn Agents accepts that header only from loopback. | The row stays in `$DAWN_CODE_DATA/training-log.jsonl`. A leftover `POST /api/v1/training-log` is tried only when import is not accepted. |

A 401 is a refused token, not a stub. `Agent not found.` is a failed job, not a stub.

## Keys

The gateway reads keys from the environment. The extension reads `DAWN_CODE_TOKEN` and calls `127.0.0.1`. The webview does not receive that token or any model key. Logs and the training dataset pass through a redactor. Do not commit `.env`.

## Layout

```
editor/
  extension/     VS Code extension (chat panel, review, theme)
  src/gateway/   Local model gateway
  src/shared/    Models, spend, edits, Dawn Agents client, training rows
  contract/      Dawn Agents and training-log contract
  deploy/        systemd units, Caddyfile, launch scripts
  docker/        Compose alternative
  scripts/       dev.sh and install-ubuntu.sh
  sample/        Small files for a first chat
```

OpenVSCode Server, code-server, Continue, and Cline are credited in `../THIRD_PARTY.md`. Their source is not in this repo.

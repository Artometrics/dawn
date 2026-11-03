# Dawn Code

Dawn Code is Kyle’s browser editor: OpenVSCode Server plus a Dawn extension. Chat, inline edit, and agent review run through a local gateway. Model keys stay in the environment. The panel shows estimated spend against the shared $20 monthly cap.

The extension, gateway, and install files live in this folder so they do not collide with Dawn Agents.

## Run it here

```bash
cd editor
npm ci
bash scripts/dev.sh
```

Open `http://127.0.0.1:3000/?tkn=dev-connection-token`. The dev script forces stand-in answers (`DAWN_CODE_MOCK=1`) unless you export `DAWN_CODE_MOCK=0` and set a model key. The gateway listens on `127.0.0.1:8791`.

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

Set `DAWN_CODE_TOKEN`, `DAWN_CODE_CONNECTION_TOKEN`, and at least one of `GEMINI_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`, `XAI_API_KEY`, or `OPENROUTER_API_KEY`. Optional `DAWN_CODE_PASSWORD` turns on Caddy basic auth for the user `kyle`. `DAWN_CODE_DOMAIN` is the HTTPS name. With no domain, Caddy uses `tls internal` on `:8443`.

OpenVSCode and the gateway bind `127.0.0.1`. Caddy is the only public door. Do not log query strings: the connection token is `?tkn=`.

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

The contract is `contract/dawn-agents.v1.md`.

| Call | When it is real | When it is stubbed |
| --- | --- | --- |
| `GET /api/v1/agents` | Dawn Agents is up and `DAWN_EDITOR_TOKEN` is set | Empty URL, empty token, connection error, or 404. The picker shows one stub agent. |
| `POST /api/v1/jobs` and `POST /api/v1/jobs/:id/messages` | Same | The task is not sent. The panel says so. A 401 is shown as a refusal, not a stub. |
| `GET /api/v1/spend` | The route returns `spentUsd` | The panel says the agents ledger is not merged. The editor’s own ledger still counts toward the cap. |
| `POST /api/v1/training-log` | `DAWN_TRAINING_LOG_URL` or `$DAWN_AGENTS_URL/api/v1/training-log` returns 2xx | The row is still appended to `$DAWN_CODE_DATA/training-log.jsonl`. |

`cursor/dawn-agents-v1-0f2d` had not merged when this was written, and `docs/dawn-agents-editor-api.md` was not in the tree. Job status for a stub exists only in the gateway process that created it.

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

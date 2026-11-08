# Dawn bot desk

The bot desk runs one task through the OpenMausBot job runtime and Dawn's
workspace tools. It does not call a model, send mail, or touch a device.

## What actually runs

| Piece | What it is |
| --- | --- |
| OpenMausBot `Runtime` and SQLite store | Real. Commit `97b4b57e11910676c7c89e70e888a5aab3378e23`, Apache-2.0. Events, approval level, and the assignment are persisted. |
| Plan tools | Real filesystem list, read, and literal search inside the workspace. |
| Build tools | Real write and edit inside the workspace when the level is `edits`. Level `ask` parks the write and does not create the file. |
| Commands | `bash -c` is not run. `curl` and any command off a short allowlist are refused. Plan mode refuses commands before they start. |
| Model | Not called. There is no provider key on this path. Estimated spend is $0 and the existing cap is still checked. If the month is already at the cap, the task does not start. |
| NightCode | Not in this public repository. A private adaptation can be loaded from `DAWN_NIGHTCODE_HOME` when that directory is outside the git checkout and contains `dawn-tools.mjs`. Without it, Dawn's own tools run. |

## What the static site does not do

Firebase Hosting serves the desk page. It does not serve the gateway. On
dawn-510519 the buttons cannot start a bot. The runtime is the local process:

```
DAWN_ALLOWED_EMAIL=you@example.com DAWN_ALLOW_LOOPBACK_OWNER=1 npm run agents
```

The gateway listens on `127.0.0.1:8787` unless `DAWN_AGENTS_HOST` says otherwise.
Do not set loopback owner on a public host. `POST /api/bot-session` requires the
same owner check as the rest of the desk. It is not a public route. The client
cannot choose the workspace path. The workspace is `bot-workspace` next to the
agent store, and the SQLite file is `bot-runtime.sqlite` beside it, not inside
the workspace.

`npm run dev` rewrites `/api` to that gateway. The static export does not.

## Activation still required for an autonomous bot

A model key, a spend budget, and a hosted process that is not the static site.
This MVP does not turn those on. Cloud Run, Gemini, and Firestore from the
section 5.2 plan stay unwired here.

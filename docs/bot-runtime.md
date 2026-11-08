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

## Connected fixtures

`src/lib/dawn-agents/connected.ts` runs four model-free workflows on the same
runtime. `execution` is `model-free-fixture`. That is not a provider run.

| Id | What the fixture does | What it does not do |
| --- | --- | --- |
| WF01 | Stores a plan, refuses the write, then one approval writes the file and returns a diff. A second approval does not change the file. | No model decides the edit. |
| WF02 | A prompt number becomes one HTML file with a Collect button. A second prompt changes the goal. | No three.js, no Daytona, no model. |
| WF03 | Reads a local `fixture.html`. A second bot assignment records that text. `https://` targets are refused and nothing is fetched. | No Browserbase, no Stagehand, no live site. |
| WF04 | `dawn-a` writes `memory.json` once. `dawn-b` reads it. Reopening the SQLite file still shows the assignment. A second handoff does not rewrite the file. | No Trigger.dev, no shared desktop. |

## Live provider blockers

These accounts are not configured and were not opened. No price was verified.
A pass of the fixtures above is not approval to turn any of them on.

| Piece | Source | Required to run the upstream path | Dawn status |
| --- | --- | --- | --- |
| AI Teammates loop | `code-with-antonio/ai-teammates` `de32f461cc9e0ddf4c5087af07c65cf06df7d683` | Trigger.dev worker, Daytona sandbox, Neon, Clerk. No LICENSE file. | Not imported. Private checkout only. |
| NightCode tools | `code-with-antonio/nightcode` `255883f130d350541e806f2431e7df32369f24bf` | Reference app also uses Clerk, Neon, Polar. No LICENSE file. | Private adapter outside this repo. Public desk uses Dawn tools. |
| Game generator | `code-with-antonio/sandbox` | Anthropic key, Daytona, Trigger.dev, Postgres, Clerk. No LICENSE file. | Not imported. The desk game is a local HTML file. |
| Browser Relay | `code-with-antonio/browser-automation-app` | Browserbase key, Trigger.dev, Liveblocks, Postgres, Clerk. Browserbase's model gateway is not free inference. Clerk's pro plan is not a model entitlement. No LICENSE file. | Not imported. |
| SendKit | `code-with-antonio/sendkit` | Telegram bot token. The remote design puts that token in a URL. README MIT badge, LICENSE file absent, GitHub license null. | Not imported. Dawn does not put tokens in URLs or logs. |
| Personal assistant | `code-with-antonio/ai-personal-assistant` | Telegram or Linq iMessage, Trigger.dev, Daytona, Neon, Firecrawl, Clerk. No channel was requested. | Not connected. |

An autonomous bot still needs a process that is not Firebase Hosting. `LIVE01` is not run. No model call was made for this check.

## Chat connection, checked 2026-11-08

There is no separate Chats app. A pinned town bot opens its workspace. Saved lines are the desk thread with that bot's name, when the desk answers, and the village room at `/village?section=library`. Typing in the town sheet is not stored and does not call a provider. A browser `redirect: 'manual'` response with `type: opaqueredirect` is sign-in. Status 0 with any other type stays offline.

What already exists:

| Piece | Where | Status found, no secret values |
| --- | --- | --- |
| Firebase client config | `https://dawn-510519.web.app/__/firebase/init.json` returns 200 for project `dawn-510519`. Fields `apiKey` and `appId` are present and non-empty. | This is the public web config. It is not a Gemini or OpenRouter key. |
| Village Gemini path | `src/lib/guide.ts` uses Firebase AI Logic (`GoogleAIBackend`) only when `bootFirebase()` is `hosted`. Model id in that file is `gemini-flash-latest`. | Not called. The repo treats a missing App Check token as a 401 (`src/lib/gemini-error.ts`). That id is historical code, not an approved default. |
| Server provider names | `GEMINI_API_KEY` or `GOOGLE_GENERATIVE_AI_API_KEY`, `OPENROUTER_API_KEY`, `XAI_API_KEY` in `.env.example` and `editor/.env.example`. `src/lib/dawn-agents/provider.ts` reports only booleans. | Unset in this environment. No key file in the checkout was read as present. Values were not printed. |
| Agents gateway on Firebase Hosting | `public/dawn-agents-config.json` and the live file both have `gatewayUrl` empty. `https://dawn-510519.web.app/api/state` is 404. | The static site does not run the gateway. |
| Named host `2-29-173-68.sslip.io` | `/` currently serves the Dawn town HTML. An unauthenticated `GET /api/state` is redirected to Google sign-in. | The process behind that sign-in was not opened. Key booleans on that host were not read. |
| `dawn-1` | Not named in this repository. | Nothing here was called `dawn-1`. |
| Spend cap | `DAWN_SPEND_CAP_USD` is a name in `.env.example`. | Unset here. No cap was applied or invented. |
| Saved rooms | `GroupChat` still reads Firestore rooms for a signed-in village user. The drawer links to that page as Village history. | Room documents were not deleted. |

A bot reply on the public map needs the existing gateway process, or Firebase AI Logic with App Check on project `dawn-510519`, and a provider key that is already configured on that process. This check did not add a key, a backend, or a model call.

# ADR 0001: Plan a local Dawn project without replacing the cloud loop

Status: accepted for a mocked planning slice. Cloud Run, Gemini, Firestore, and the five Dawn tools stay unwired.

Dawn is the product. The source plan is the Solo Company Stack Plan, Google Doc `1Sfcg1-jUl5csLe26GCz0-JgNRRzk1--ZcfJkJ5JdlOI`, read 2026-11-06, section 5.2.

## What section 5.2 asks for

Dawn is the personal agent.

- One chat, on the web and on a phone, that can read and write the CRM, the content hub, the calendar, and tasks. It remembers context. It runs a morning brief and a weekly review.
- Stack: a Cloud Run service for the agent loop and tool calls, the Gemini API, Firestore for memory and tasks, Gemini embeddings for note search, Cloud Scheduler for recurring jobs, and Gemini TTS (Kore) for spoken briefs.
- MVP: a chat UI and five tools — CRM search, add task, calendar read, note search, and web search grounding — plus the morning brief email.

Section 2 puts long agent jobs on Cloud Run and server logic on Cloud Functions. Section 6 says every app has a UI, a versioned REST API, and an MCP server. Auth for Kyle's own clients is a Firebase ID token. Keys stay in Secret Manager. Section 8 logs token counts per job. The next-step line in the doc is "Start Dawn on Cloud Run with 5 tools."

This PR does not deploy that loop and does not add a second backend.

## What the Dawn repo does today

| Plan item | In the repo now | This PR |
| --- | --- | --- |
| Cloud Run agent loop | The desk gateway is a Node process (`server/dawn-agents.mjs`, `src/lib/dawn-agents/http.ts`). The village loop is in the browser. | Not moved to Cloud Run. |
| Gemini | `provider.ts` and the editor gateway call Gemini when a key is already in the environment. Otherwise they use the stand-in. | Not called. |
| Firestore memory and tasks | Village state can use Firestore. The desk store is a JSON file (`FileStore`). Rules reserve `users/{uid}/dawnAgents` and do not serve it yet. | Not written. |
| Five tools | The desk has web search, web fetch, computer list/read/write/exec, remember, and Style Recipes. It does not have CRM search, add task, calendar read, or note search. | Named and left `not_called`. |
| Schedules | Desk routines use cron inside the gateway. The plan's morning brief and weekly review are not those routines. | Not called. |
| Auth | Firebase on the hosted village. The desk trusts a loopback oauth2-proxy email, or `DAWN_EDITOR_TOKEN` on `/api/v1`. | Unchanged. |
| Usage | `estimateCost`, `canSpend`, and `settings.spendCapUsd` in `src/lib/dawn-agents/spend.ts`. The editor has its own estimate in `editor/src/shared/spend.ts`. There is no type named CostTracker. | The plan records zero ledger writes and does not check the cap. |
| Local computer | `WorkerHub` plus `worker/sandbox.mjs`. Hetzner and optional Mac workers dial out. Cloud VM is a stub. | Not started. The slice talks to a mock project port. |
| Village, 8/16 avatars, Atlas | Phone shell and pixel scenes. | Untouched. |

`POST /api/v1/jobs` still calls the model turn. This planner is not mounted on that route.

## OpenMausBot is the local connector, not the cloud brain

Rechecked 2026-11-06 at `27b57eff9fc81de649a7c6004579bc0f9c59cfef`.

| Item | Result |
| --- | --- |
| License | Apache-2.0 on the open-source tree. Root `LICENSE` matches. |
| `enterprise/` | Separate enterprise license. Production use needs a key. Not imported. |
| Hosted models | Not included. Engines are the person's own CLIs and keys. |
| Trademarks | OpenMausBot, MausBot, and the mascot stay upstream names. Dawn does not take them as a product name. |

The useful piece for Dawn is the local machine connector: a process on the person's computer, with its own working folder, that asks before it acts. Dawn already has that shape in the worker and the sandbox allowlist. The costly pieces stay out: Electron and phone companions, Composio, Boat cloud desktops, voice, org billing, and the enterprise sign-in adapter.

No OpenMausBot file is in this commit. A later change that vendors an Apache file must keep the upstream notices and say that Dawn changed the file.

## NightCode was assessed and not copied

`code-with-antonio/nightcode` at `255883f130d350541e806f2431e7df32369f24bf` (2026-05-21). GitHub reports the repo public and `license: null`. The tree has no `LICENSE` file. No purchased zipball was on this machine. Public visibility is not a grant, so none of the source is reused.

`packages/cli/src/lib/local-tools.ts` (blob `7330589fbcbf305edeb7678523c4d603dada699a`) and `packages/shared/src/schemas.ts` define the tool split:

| Mode | Tools | What the implementation does |
| --- | --- | --- |
| PLAN | `readFile`, `listDirectory`, `glob`, `grep` | Paths must stay inside the process working directory. `readFile` caps a file at 10,000 characters. `grep` spawns the system `grep`. |
| BUILD | those four, plus `writeFile`, `editFile`, `bash` | Writes files and runs `bash -c` with the process environment. |

PLAN mode throws if the tool is not one of the four read tools. The system prompt says plan mode must not modify files. That permission idea is what Dawn keeps.

What Dawn does not take:

- `grep` and `bash` spawn a shell. `glob` uses the Bun runtime. This slice does not spawn a process.
- The server depends on `@clerk/backend`, `@polar-sh/sdk`, `@prisma/client` through `@nightcode/database`, and `@ai-sdk/openai` plus `@ai-sdk/anthropic`. Sessions, credits, and billing live there. Dawn keeps its own auth and the spend ledger.
- No NightCode identifier, prompt, or schema is copied into `local-plan.ts`.

## Decision

Add one pure function, `planLocalProject`, that builds an inspectable plan against a caller-supplied project port.

- Mode `plan` calls `list('.')` once. Returned names are copied only as `{ name, type }` after a single-segment check. Hidden names, `node_modules`, `..`, `~`, absolute names, and extra fields are dropped. At most 40 names are kept, from the first 200 raw entries.
- The port is asked to `read` at most five times. A missing file spends one of those calls. Text is redacted, then cut at 4,000 characters, so a token is not split by the cut.
- Any mode other than `plan` returns before the port is called. `writeFile`, `editFile`, and `bash` are refused inside plan mode and are not executed. `glob` and `grep` are refused because they would spawn a search.
- A path with `..`, a leading `~`, a hidden segment, `node_modules`, or a drive prefix never reaches `read`.
- Key-shaped text and `ghp_` / `github_pat_` shapes are scrubbed, including text echoed in a refusal. The plan has no GitHub token field and no remote. The brief is capped at 2,000 characters after redaction.
- CRM search, add task, calendar read, note search, and web search are recorded as `not_called`. Cloud Run, Gemini, Firestore, and the scheduler are recorded the same way.
- The local connector is `mocked`. A later acceptance run can put the same read-only list and read on the existing worker.

## Integration matrix

| Surface | Role | This PR | Later, separately |
| --- | --- | --- | --- |
| Cloud Run + Gemini | Section 5.2 agent loop | Not called | One loop, five tools, spend ledger updated with the existing cap |
| Firestore | Memory and tasks | Not written | Emulator first. Desk JSON stays until that migration has its own PR |
| Firebase auth | Section 6 client auth | Unchanged | Do not replace it with Clerk |
| MCP / REST | One door per app | Not added | `@artometrics/mcp-kit` is its own package |
| OpenMausBot core | Local connector and orchestration | Mock project port | Existing worker hello, then list/read inside the sandbox |
| OpenMausBot `enterprise/` | Hosted sign-in and paid computers | Excluded | Stays excluded |
| NightCode PLAN tools | Read-only inspection | List and read only, new Dawn code | Do not port write, edit, or bash |
| NightCode BUILD, Clerk, Polar, Prisma, model SDK | Their app | Not imported | Needs a license before any file is copied |
| Git remotes | Workspace | `git: not_connected` | Allowlisted `git status` only, after the worker is up. No token in source |
| Village and Atlas | 8/16-bit Dawn | Untouched | Stays off the worker |
| AI Teammates archive | Hosted desktop, shell, and handoff | Excluded. No license file | Not a replacement for the Dawn worker |
| Sandbox archive | Game-directory file tools | Excluded. No license file | Path jail already exists on the Dawn worker |

## Provenance

| Path | Origin |
| --- | --- |
| `src/lib/dawn-agents/local-plan.ts` | New Dawn file. No upstream lines. |
| `src/lib/dawn-agents/local-plan.test.ts` | New Dawn test. The project port is in memory. |
| `docs/adr/0001-openmausbot-dawn-seam.md` | This note. |
| `THIRD_PARTY.md` | Attribution only. Upstream license files are not vendored. |

## Acceptance path

This PR is not a live agent.

1. Keep the current gateway auth and the spend cap. Do not add a key, a GitHub token, or a billing change.
2. Cloud slice, separate PR: a Cloud Run handler that calls Gemini with the five section 5.2 tools, writes memory and tasks in the Firestore emulator, and records tokens through `estimateCost` / `canSpend`. Scheduler for the morning brief comes after that handler is tested.
3. Local slice, separate PR: start the existing worker, confirm it is online, and run only the plan's list and read inside that agent's sandbox. Still no shell from the planner.
4. NightCode source stays out until a license or a course grant is attached to an archive Kyle is allowed to reuse.

## Customer archives

Two archives were attached for this review. Neither contains a `LICENSE`, `NOTICE`, or `COPYING` file, and neither `package.json` sets `license`. No source from either archive is imported. Clerk, Daytona, Trigger.dev, Neon, Sentry, and their billing ledgers stay out.

| Archive on disk | Root inside the tar | What it is | Verdict |
| --- | --- | --- | --- |
| `/home/ubuntu/.cursor/projects/agent-repos-dawn/uploads/ai-teammates-main.tar_ca32.gz` (supplied as `ai-teammates-main.tar.gz`) | `code-with-antonio-ai-teammates-de32f46/` | A Grok-Bot-shaped app. `lib/sandbox-tools.ts` gives every bot `bash`, `readFile`, `writeFile`, `listFiles`, `recall`, `remember`, and mouse, keyboard, and screenshot tools on a Daytona desktop. `lib/daytona.ts` creates one sandbox per bot. `lib/handoff-tool.ts` passes a group turn to another bot. There is no allow or confirm gate in those files. Output is cut at 20,000 characters. Auth and plans are Clerk (`lib/billing.ts`). The model goes through Neon. Turns run on Trigger.dev. | **Exclude** as code. **Defer** the hosted desktop. Dawn's worker already confines a local folder and asks before a command that is not on the allowlist. A Daytona desktop is a separate paid computer, not a gap in the mocked plan. |
| `/home/ubuntu/.cursor/projects/agent-repos-dawn/uploads/sandbox-main.tar_7929.gz` (supplied as `sandbox-main.tar.gz`) | `code-with-antonio-sandbox-ac18750/` | A game builder. `lib/games/tools.ts` exposes `ask_player`, `read_file`, `write_file`, `replace_text`, `list_files`, and `delete_file`. `resolveGamePath` keeps paths inside `/home/daytona/game` (`lib/daytona/utils.ts`, `GAME_DIR`) and refuses a path before the sandbox sees it. Names must match a small character set. Reads stop at 128,000 bytes. `mkdir` is the one shell call, and only after that check. `lib/games/authorize.ts` is Clerk organization auth. | **Exclude** as code. **Defer** nothing new. The mocked plan and `worker/sandbox.mjs` already keep reads inside a relative root and refuse writes from this planner. The game tools are a write-enabled builder for a three.js preview, not Dawn's village or desk. |

Neither archive adds an extension point this slice needs. The local connector remains the existing Dawn worker. The cloud loop remains the section 5.2 Cloud Run and Gemini path, still unwired.

## Tests

`src/lib/dawn-agents/local-plan.test.ts` is on `npm test`. It checks the mock listing, the read budget (including failed reads), scrubbing before truncation, a hostile listing, and that build mode and parent paths do not reach `read`. It does not listen, spawn, or call a provider.

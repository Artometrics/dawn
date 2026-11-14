# Third-party

Agent faces are 16×16 frames from [Kenney Tiny Dungeon](https://kenney.nl/assets/tiny-dungeon), CC0 1.0. The full sheet is `public/tiles/kenney-tiny-dungeon.png`. The cropped faces are in `public/sprites/agents/`. CC0 allows later commercial use. Credit is recorded on the Credits page even though CC0 does not require it.

The village still uses [Kenney Tiny Town](https://kenney.nl/assets/tiny-town), also CC0. The packed 16×16 sheet is `public/tiles/kenney-tiny-town.png`.

The live home map is a staging plate, `public/maps/dawn-town-staging.png`: the approved Dawn Town comp, cropped to the map and panned under the chrome. It is not a ripped game map. A Tiled `.tmj` file can replace that layer later. The six pinned agents in `public/sprites/town/` are original Dawn pixel art, listed on the Credits page.

The Character Maker (`src/lib/forge/`) draws with [three.js](https://threejs.org), MIT. It contains a copy of the Pantheon Forge source (Artometrics/pantheon, PR #15, `tools/forge/`), adapted to TypeScript. `src/lib/forge/README.md` lists each copied file and `src/lib/forge/CREDITS.md` is Forge's own asset statement.

Other notices, including AI Town (MIT) and Stanford Generative Agents, stay in `THIRD_PARTY_NOTICES.md`.

## Folded desks

The dilemma village in `src/lib/games/dilemma.ts` is the simulation from [kylesmcauliffe/dawn](https://github.com/kylesmcauliffe/dawn), rewritten as a canvas on `/games`. Pantheon Towers in `src/lib/towers/` is the rules from Artometrics/pantheon `games/towers`. The three.js courtyard and its CC0 meshes stay in that repo.

Fernbound's page loads `public/play/fernbound/`, the published Godot web export (engine [MIT](https://godotengine.org/license/)). The GDScript sources were not in the Artometrics or kylesmcauliffe GitHub accounts, so the desk plays that build.

Aftercare's card text, numerology, and spreads in `src/lib/aftercare/` come from Artometrics/aftercare `site/`. The three.js table, the Netlify app, and Gemini card readings stay there. Books in `src/lib/books/` is the PageMatch oracle, quiz, Gutenberg press, study capsules, and shelf from Artometrics/carrie `apps/books`. The capsule text is Carrie's short study notes, not a CliffsNotes feed. Covers come from Open Library and Project Gutenberg. The in-page text reader uses a public jsDelivr copy of the same Gutenberg file when the browser cannot read gutenberg.org (that host does not send CORS headers). The pet certificates and the Amazon affiliate buttons stay out.

## Dawn Agents

Dawn Agents is original code. The projects below were read for architecture only. No source from them is copied into this repo.

### open-webui/open-webui

https://github.com/open-webui/open-webui

License: a custom license (GitHub SPDX `NOASSERTION`), Copyright (c) 2023- Open WebUI Inc. It allows redistribution only with its conditions, including a branding clause that restricts removing the Open WebUI name. Because that license is not a plain permissive grant, Dawn does not copy Open WebUI source, prompts, or interface text.

What we used from the idea, not the code: a chat desk can route one conversation to more than one model provider, and the provider choice stays on the server.

### All-Hands-AI/OpenHands

https://github.com/All-Hands-AI/OpenHands

License: MIT.

What we used from the idea, not the code: the agent runtime is separate from the computer that runs commands. The computer is reached through a narrow action/result interface. Risky actions wait for a person. Dawn's `ComputerProvider` is that seam. The Hetzner worker and the optional Mac worker are two implementations. A cloud VM can be a third later. No OpenHands files are included.

### argilla-io/argilla

https://github.com/argilla-io/argilla

License: Apache-2.0.

What we used from the idea, not the code: a dataset is a list of records with review status, a person can prefer one answer over another, and export is JSONL with the training fields plus provenance. Dawn's Data Studio records, review queue (approve / fix / reject), A/B pairs, and SFT/DPO exports follow that shape. No Argilla files are included.

Records carry `ownerId`, `consent`, `license`, and `provenance` so a later multi-user version does not have to invent those fields. v1 has a single owner.

### milind-soni/OpenMausBot

https://github.com/milind-soni/OpenMausBot

License: Apache-2.0 for the open-source tree. Rechecked 2026-11-08 at commit `97b4b57e11910676c7c89e70e888a5aab3378e23` (package version 0.1.149). Root `LICENSE` is the Apache License 2.0. `LICENSING.md` keeps `enterprise/` under the OpenMausBot Enterprise License, not Apache-2.0. That folder is not imported.

The job runtime is vendored at `third_party/openmausbot/` with the upstream `LICENSE` and a `NOTICE`. Dawn changed the envelope import so the runtime does not load the desktop host. See `third_party/openmausbot/DAWN-CHANGES.md`.

```
OpenMausBot
Copyright 2026 Milind Soni and OpenMausBot contributors
```

The project was relicensed from MIT to Apache-2.0 with contributor consent. The license text is at https://www.apache.org/licenses/LICENSE-2.0 and in the upstream `LICENSE`. Dawn does not redistribute upstream files in this change, so the upstream `LICENSE` and `NOTICE` are not copied into the tree. Notices in that `NOTICE` for bundled third-party components (T3 Code, Puppeteer, noVNC, and others) do not pertain to Dawn's seam.

`src/lib/dawn-agents/local-plan.ts` is still original Dawn code and is not the runtime. The desk in `src/lib/dawn-agents/bot-session.ts` calls the vendored runtime. OpenMausBot does not provide hosted models. The OpenMausBot and MausBot names and the mascot are trademarks of Supamaus Software Private Limited. Apache-2.0 section 6 grants no trademark license. Dawn does not use those names as a product name. `enterprise/` stays out.

### code-with-antonio/nightcode

https://github.com/code-with-antonio/nightcode

Checked 2026-11-06 at commit `255883f130d350541e806f2431e7df32369f24bf`. GitHub reports the repo public and `license: null`. The tree has no `LICENSE` file. No NightCode source is committed to this public repository. A personal-use adaptation of `packages/cli/src/lib/local-tools.ts` can live outside the checkout and is loaded only through `DAWN_NIGHTCODE_HOME`. The server package depends on Clerk, Polar, Prisma, and the OpenAI and Anthropic SDK packages. Dawn keeps its own auth and `src/lib/dawn-agents/spend.ts`.

### code-with-antonio/ai-teammates

Customer archive `ai-teammates-main.tar.gz`, saved at `/home/ubuntu/.cursor/projects/agent-repos-dawn/uploads/ai-teammates-main.tar_ca32.gz`. Root directory `code-with-antonio-ai-teammates-de32f46/`. No `LICENSE`, `NOTICE`, or `COPYING` file, and `package.json` has no `license` field. No source is copied. `lib/sandbox-tools.ts`, `lib/daytona.ts`, and `lib/handoff-tool.ts` were read for the tool and sandbox shape only. The app depends on Clerk, Daytona, Trigger.dev, and Neon.

### code-with-antonio/sandbox

Customer archive `sandbox-main.tar.gz`, saved at `/home/ubuntu/.cursor/projects/agent-repos-dawn/uploads/sandbox-main.tar_7929.gz`. Root directory `code-with-antonio-sandbox-ac18750/`. No `LICENSE`, `NOTICE`, or `COPYING` file, and `package.json` has no `license` field. No source is copied. `lib/games/tools.ts`, `lib/daytona/utils.ts`, and `lib/games/authorize.ts` were read for the path and auth shape only. The app depends on Clerk, Daytona, Trigger.dev, Neon, and Anthropic.

### Kyle's own sites

Style Recipes (https://recipes-510519.web.app) and the studio letter (https://newsletter-510519.web.app) are ported as behavior and, for recipes, as Kyle's palette, type, and layout data. Those sites are left deployed. Their source was not in the public Artometrics GitHub org, so the port follows the live Style Recipes assets and the letter's public behavior (double opt-in, explicit send, Resend-style transport).

## Dawn Code

Dawn Code does not vendor the source of the projects below. The install script downloads the OpenVSCode Server binary. The chat, inline edit, and agent review behavior was written for this repo after reading how those projects structure the same jobs.

### OpenVSCode Server

The editor process is [gitpod-io/openvscode-server](https://github.com/gitpod-io/openvscode-server) v1.109.5, MIT.

```
MIT License

Copyright (c) 2015 - present Microsoft Corporation
```

The binary is not committed. `editor/scripts/install-ubuntu.sh` and `editor/scripts/dev.sh` download the release tarball. See that repository for the full MIT text (`LICENSE.txt`).

### code-server

[coder/code-server](https://github.com/coder/code-server) is the other MIT browser VS Code distribution that was considered for the same job. Dawn Code ships OpenVSCode Server instead. No code-server source is included.

```
Copyright (c) 2019 Coder Technologies Inc.
```

### Continue

[continuedev/continue](https://github.com/continuedev/continue) is Apache-2.0.

```
Copyright 2023 Continue Dev, Inc.
```

Patterns used, without copying their source: the sidebar chat webview, an inline edit whose prompt is the code before the selection, the selection, and the code after it (`core/edit/streamDiffLines.ts`, `constructEditPrompt`), and an accept-all / reject-all step after the edit (`extensions/vscode/src/quickEdit/QuickEditQuickPick.ts`). Dawn Code shows that review with VS Code’s diff viewer rather than Continue’s vertical diff decorations.

### Cline

[cline/cline](https://github.com/cline/cline) is Apache-2.0.

```
Copyright 2026 Cline Bot Inc.
```

Patterns used, without copying their source: a review diff whose both sides are virtual documents so the workspace file is not written until the edit is accepted (`apps/vscode/src/sdk/sdk-diff-edit-coordinator.ts`), and a multi-file review opened with `vscode.changes` (`apps/vscode/src/hosts/vscode/hostbridge/diff/openMultiFileDiff.ts`). Dawn Code’s agent pass stops at that review. It does not run Cline’s tool loop or a shell.

# Third-party

Village credits stay in `THIRD_PARTY_NOTICES.md`. This file covers Dawn Code.

Dawn Code does not vendor the source of the projects below. The install script downloads the OpenVSCode Server binary. The chat, inline edit, and agent review behavior was written for this repo after reading how those projects structure the same jobs.

## OpenVSCode Server

The editor process is [gitpod-io/openvscode-server](https://github.com/gitpod-io/openvscode-server) v1.109.5, MIT.

```
MIT License

Copyright (c) 2015 - present Microsoft Corporation
```

The binary is not committed. `editor/scripts/install-ubuntu.sh` and `editor/scripts/dev.sh` download the release tarball. See that repository for the full MIT text (`LICENSE.txt`).

## code-server

[coder/code-server](https://github.com/coder/code-server) is the other MIT browser VS Code distribution that was considered for the same job. Dawn Code ships OpenVSCode Server instead. No code-server source is included.

```
Copyright (c) 2019 Coder Technologies Inc.
```

## Continue

[continuedev/continue](https://github.com/continuedev/continue) is Apache-2.0.

```
Copyright 2023 Continue Dev, Inc.
```

Patterns used, without copying their source: the sidebar chat webview, an inline edit whose prompt is the code before the selection, the selection, and the code after it (`core/edit/streamDiffLines.ts`, `constructEditPrompt`), and an accept-all / reject-all step after the edit (`extensions/vscode/src/quickEdit/QuickEditQuickPick.ts`). Dawn Code shows that review with VS Code’s diff viewer rather than Continue’s vertical diff decorations.

## Cline

[cline/cline](https://github.com/cline/cline) is Apache-2.0.

```
Copyright 2026 Cline Bot Inc.
```

Patterns used, without copying their source: a review diff whose both sides are virtual documents so the workspace file is not written until the edit is accepted (`apps/vscode/src/sdk/sdk-diff-edit-coordinator.ts`), and a multi-file review opened with `vscode.changes` (`apps/vscode/src/hosts/vscode/hostbridge/diff/openMultiFileDiff.ts`). Dawn Code’s agent pass stops at that review. It does not run Cline’s tool loop or a shell.

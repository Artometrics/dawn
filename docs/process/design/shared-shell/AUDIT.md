# Route audit at 390px

Every route compared with the Atlas home: layout, outlines, cards, spacing, serif headings, uppercase gray labels, buttons, icons, colors, empty states and the shared shell. "Before" is main at 5c3b4f9. "After" is this branch on the static export (so tool pages show the offline card). Shots with a running gateway, `DAWN_AUTH_DISABLED=1` and no model key are in `live/`. Regenerate with `node scripts/shell-shots.mjs <dir>` and `node scripts/shell-shots-live.mjs <dir>`.

| Route | Before | After | What was wrong | What changed | Remaining |
| --- | --- | --- | --- | --- | --- |
| `/` | `audit/before/home.png` | `audit/after/home.png` | Old Atlas drawer and a separate header. | Atlas map under the shared top bar. Drawer replaced by the shared sidebar. | None. |
| `/agents` | `audit/before/agents.png` | `audit/after/agents.png` | Own header, pill tab bar, loose links, spend meter in the header, login screen. | Rebuilt mobile-first: New agent / New group, spend card, agent cards, groups. Two panes on desktop. Links moved to the sidebar. | Chat info page has no media yet to show. |
| `/village` | `audit/before/village.png` | `audit/after/village.png` | Second sidebar and orange active pills. | One shell. Sections come from the shared sidebar. Atlas palette. | The 8-bit art is unchanged on purpose. |
| `/town` | `audit/before/town.png` | `audit/after/town.png` | A separate 8-bit town with its own nav. | Redirects to Village. | None. |
| `/atlas` | `audit/before/atlas.png` | `audit/after/atlas.png` | A second Atlas entry. | Redirects to Atlas home. | None. |
| `/studio` | `audit/before/studio.png` | `audit/after/studio.png` | Own window bar overlapped the shell bar, h-screen, sample copy, gray Send button. | Window bar hidden, fills the shell, copy removed, cream Send. | Content is still the sample transcript and a Claude-style layout. Needs its own redesign. |
| `/editor` | `audit/before/editor.png` | `audit/after/editor.png` | Desk editor at /editor, clashing with OpenVSCode. | Redirects to Code. The desk editor is /code/editor. | None. |
| `/code` | none (new page) | `audit/after/code.png` | Did not exist. Code tools were hidden. | Code hub: NightCode, Teammates, Editor, Kits, and a secondary Open VS Code button. | OpenVSCode dark theme is set by the installer, not checked on the live host. |
| `/code/editor` | none (new page) | `audit/after/code-editor.png` | Did not exist. | Desk editor in the shell with the offline card on the static origin. | None. |
| `/projects` | `audit/before/projects.png` | `audit/after/projects.png` | Pill nav and footer, developer copy. | Shell, one plain sentence, offline card. | None. |
| `/artifacts` | `audit/before/artifacts.png` | `audit/after/artifacts.png` | Orange chips, no detail view, fixed grid. | Segmented filter, 2 to 6 column size control, clickable detail view, mixer. | None. |
| `/letter` | `audit/before/letter.png` | `audit/after/letter.png` | Pill nav and footer. | Shell, Atlas buttons. | None. |
| `/credits` | `audit/before/credits.png` | `audit/after/credits.png` | Pill nav and footer. | Shell. Added a Code tools section with the provenance moved off the pages. | None. |
| `/desk` | `audit/before/desk.png` | `audit/after/desk.png` | Raw "Not found" download on the live host. | In the shell. Caddy now serves the page, and unknown paths get a styled 404. | Needs the Caddy deploy. |
| `/kits` | `audit/before/kits.png` | `audit/after/kits.png` | Developer copy about Clerk, Neon, Trigger.dev. | Cards with one plain sentence each. | None. |
| `/kits/assistant` | `audit/before/kits-assistant.png` | `audit/after/kits-assistant.png` | Developer copy and own header. | Kit page in the shell. Offline card with Open live Dawn on the static origin. | None. |
| `/kits/browser` | `audit/before/kits-browser.png` | `audit/after/kits-browser.png` | Developer copy and own header. | Kit page in the shell. Offline card with Open live Dawn on the static origin. | None. |
| `/kits/nightcode` | `audit/before/kits-nightcode.png` | `audit/after/kits-nightcode.png` | Long tool list paragraph. Could not start a session. | One sentence, model picker, real model replies when keys are set, plan/build chip. | None. |
| `/kits/sandbox` | `audit/before/kits-sandbox.png` | `audit/after/kits-sandbox.png` | Developer copy and own header. | Kit page in the shell. Offline card with Open live Dawn on the static origin. | None. |
| `/kits/sendkit` | `audit/before/kits-sendkit.png` | `audit/after/kits-sendkit.png` | Developer copy and own header. | Kit page in the shell. Offline card with Open live Dawn on the static origin. | None. |
| `/kits/teammates` | `audit/before/kits-teammates.png` | `audit/after/kits-teammates.png` | Mock replies wording. | Builder and Reviewer chat with the model picker and a handoff tool. | None. |
| `/preview` | `audit/before/preview.png` | `audit/after/preview.png` | Review index with its own nav. | Shell. | Review pages still carry sample and demo wording. They are not linked from the app. |
| `/preview/village` | `audit/before/preview-village.png` | `audit/after/preview-village.png` | Own nav. | Shell. | Sample and demo wording. |
| `/preview/bench` | `audit/before/preview-bench.png` | `audit/after/preview-bench.png` | Own nav. | Shell. | Sample and demo wording. |
| `/preview/habits` | `audit/before/preview-habits.png` | `audit/after/preview-habits.png` | Own nav. | Shell. | Sample and demo wording. |
| `/preview/stuck` | `audit/before/preview-stuck.png` | `audit/after/preview-stuck.png` | Own nav. | Shell. | Sample and demo wording. |
| `/preview/style-guide` | `audit/before/preview-style-guide.png` | `audit/after/preview-style-guide.png` | Own nav. | Shell. | Sample and demo wording. |

## Named shots (`live/`, 390px unless noted)

`home-sidebar-open.png`, `code.png`, `nightcode.png`, `teammates.png`, `kits.png`, `editor.png`, `village.png`, `studio.png`, `projects.png`, `agent-chat.png`, `agents.png`, `recipes.png`, `quests.png`, `not-found.png`, and desktop (1280): `desktop-code.png`, `desktop-agents.png`.

## Not done

- Real-model replies were not shot: no provider key was available here. The tool-calling path is covered by mocked-provider tests.
- Studio needs its own redesign.
- 3D assets from the shared asset library (follow-up, see the PR).

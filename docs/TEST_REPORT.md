# Dawn test report

Date: 2026-11-10. Branch: `cursor/uniform-design-test-report-01fe`, built from `main`.
Tool: Playwright (`playwright-core` with the system Chrome), driven by `scripts/site-audit.mjs`.
Raw data: `docs/process/test/local/audit.json` (before), `docs/process/test/local-after/audit.json` (after),
`docs/process/test/live/audit.json` (live site). Screenshots: `docs/process/test/local/shots/` (before, three
widths per route), `docs/process/test/live/shots/`, and `docs/process/design/after/` (after).

## Short version

- The live site cannot be tested past its front door. Every live URL returns a "Private, enter the shared
  password" page. I did not have the password and did not try to get around it. Details below.
- Locally, all 23 routes render. The static export has no gateway, so nothing that needs the desk, a model
  or a database works. The pages say so; none of them fake a reply.
- Before this branch the site looked like five different products, body text fell back to Times New Roman on
  every page, `/credits` scrolled sideways on phones, `/letter` threw an uncaught error, and phones had 225
  controls under 44px. All of those are fixed here.
- `/chats` is a 404. There is no Chats page and nothing in the repo builds one. It now lands on a branded 404
  that says so.

## How I tested

1. Built `main` (`npm ci --legacy-peer-deps`, `npm run build`) and served `out/` with
   `scripts/lib/static-server.mjs`, which behaves like Firebase Hosting (clean URLs, a real 404 status with
   `404.html`).
2. For every route, at 1440x900, 768x1024 and 390x844: loaded the page, waited for it to settle, recorded
   console errors, failed requests, uncaught errors, horizontal overflow, controls under 44px, text under
   12px, text contrast under WCAG AA, fonts, radii, button looks, broken images, and took a full-page
   screenshot.
3. At 1440 and 390, clicked every link, button, tab and summary (up to 30 to 60 per page, each from a fresh
   load), typed into every text field and pressed Enter, and logged what changed. A second pass emulated a
   light colour scheme.
4. Ran the same checks after the changes and compared.

## Live site: https://dawn-510519.web.app

| Route | Status | What I saw |
| --- | --- | --- |
| `/` | 200 | StaticCrypt "Private" password page. Light cream page, not Dawn. |
| `/kits` | 404 | Same password page body with a 404 status. The page is not in the deployed build. |
| `/chats` | 404 | Same password page body with a 404 status. |

I could only see the gate. It is not in this repo, so it is not covered by the redesign. It is a light page
on a site that is otherwise dark-only. Every other live route would answer with the same gate, so I did not
guess at them. To test the real site, give me the shared password through the secrets store, or point the
audit at a preview deploy: `node scripts/site-audit.mjs --base <url> --out <dir>`.

## What is real and what is not

The deployed site is a static export on Firebase Hosting. There is no Node process, no `/api`, and no model
behind it. Every `/api/*` request returns 404 on that host, and the pages are written to cope.

| Area | Real in the static build | Placeholder or not connected |
| --- | --- | --- |
| `/` Town map | Pixel map, pan and zoom, building search, building sheet, doors that open the other pages, the drawer, the Explore, You and Contribute tabs. | "Talk to" a bot opens that bot's sheet, but no model is called and no thread is saved. "Ask Dawn" says the desk is not running. |
| `/agents` | The same map with the drawer open, the pinned list, links to Projects, Code and Artifacts. | Saved threads need the desk. The page says "No saved threads on this host". |
| `/village` | Quests, library and the side drawer, kept in this browser. | Nothing syncs. |
| `/atlas` | Campus map, filters, search, walk-to, the role switch. | The Cardinal note is still "coming soon". |
| `/studio` | Layout, panes, the sample transcript, tabs, search, the computer and editor panes. | The conversation is a sample, not a live chat. Send only reaches a model on a hosted project with a model configured; here it says "A model is not connected on this host. Nothing was sent." Wake does not open a computer. |
| `/editor` | The Dawn file editor on the shared page shell: page.txt, desk files, local booth and held drafts. | Saving, the booth and drafts need the local gateway (`/api/local-drafts`). Offline the status says so. It is not OpenVSCode and it calls no model. |
| `/projects` | The page and its empty state. | Saved drafts come from `/api/local-drafts`, which only the local gateway serves. |
| `/artifacts` | The recipe board and its poster specimens. | A like is not saved. It is not a Refero or Envato catalog. |
| `/letter` | The page and the sign-up form. | Subscribing and listing letters need `/api/public/letters`, which does not exist on static hosting. The page now shows an empty state instead of crashing. |
| `/desk` | The buttons. | Every button needs the local gateway. Offline they say so. "Model not called" is true. |
| `/kits` and `/kits/*` | Six kit pages with their descriptions. | "Run local check" and NightCode sessions need the local gateway. |
| `/credits` | Real data, rendered from the credits files. | Nothing. |
| `/preview/*` | Browser-only samples (bench, habits, stuck, village fit). | Samples, labelled "Demo, agents off". |
| `/preview/style-guide` | New. Renders the tokens and shared components from the real CSS. | Not linked from the town menu. |

No bot reply anywhere in the app is generated or faked by this branch. The Studio conversation is canned
sample content and is labelled "Sample transcript".

## Findings before the changes

Counts are from the 1440px and 390px passes on `main` (`docs/process/test/local/audit.json`).

1. **Body text rendered in Times New Roman on every page.** `--font-sans: var(--font-sans)` in
   `globals.css` pointed at itself. Fixed by pointing it at Geist.
2. **Five unrelated palettes.** Warm clay (village, atlas), navy and electric blue (agents, desk, kits,
   editor, projects, artifacts, letter, credits), brown and gold (preview), a glassy teal home map, and an
   espresso Studio. Every page set its own hex values and its own button look (55 distinct button looks, 34
   font sizes and about 20 font families on the audited pages, though 14 of those families are the poster
   specimens on `/artifacts`).
3. **Global CSS leaks.** `agents.css` styled bare `label`, `input`, `textarea`, `select` and table cells for
   the whole site. Now scoped to `.dawn-agents`.
4. **`/credits` scrolled sideways** by 68px at 768 and 446px at 390.
5. **`Unexpected token '<'` JSON parse errors.** `/letter` threw it uncaught on load when
   `/api/public/letters` answered with the 404 page. The same error was logged when leaving the town map,
   `/artifacts` and `/preview`. `/letter` now catches the failure and shows an empty state. The click-through
   after the changes logs none of these on any route.
6. **`/chats` is a 404** on the live host and locally. There is no Chats page; `docs/town-controls.csv`
   already records that. The default Next 404 had no way back.
7. **Tap targets.** 225 controls under 44px at 390 (254 at 1440), including the town doors at 36px, map
   buttons at 38px, footer links and every filter chip.
8. **Small text.** 61 elements under 12px at 390, mostly in Studio (9 to 11px) and `/artifacts`.
9. **Low contrast.** 18 text runs under 4.5:1 at 390, in Studio and the poster specimens' captions.
10. **Home map was left-aligned.** At 1440 the map was about 630px wide, pinned to the left of a flat green
    field. On `/agents` the open drawer pushed the right half of the map and the bottom sheet off screen.
11. **Closed mobile drawer on `/village` stayed in the tab order** and was exposed to screen readers.
12. **Five app screens had no `<main>` landmark or no `<h1>`** (home, agents, atlas, village preview, studio).
13. **Next link prefetch on `/preview*` requested `__next._tree.txt` for every link**, 5 to 11 404s per page
    on static hosting.
14. **Dark and light.** `<html>` is hard-coded `dark`; the `ThemeProvider` is unused. Under an emulated light
    scheme every audited route stays dark (8 routes checked before, all 25 after), which is the intended
    behaviour. The live gate page is light.
15. **Studio named a private organisation** in its search placeholder, the avatar tooltip and a seeded
    teammate draft line. Removed from the page copy.

## Console noise that is expected on static hosting

Each of these is a 404 for a URL that only exists when the local gateway runs. They are logged as
"Failed to load resource" and are not bugs in the front end. The smoke test allows exactly these and
nothing else.

- `/api/state` (home, agents, studio, editor, artifacts): the desk probe.
- `/api/local-drafts` (projects).
- `/api/public/letters` (letter).
- `/api/bot-session` (desk).
- `/api/kits/nightcode/sessions` (NightCode).

## Click-through results

Before the changes (`local/audit.json`): home clicked 30 of 30 controls with no dead control. Desk had eight
buttons that looked inert offline because the notice changed by a single word on click.
Agents, village (390) and atlas listed many controls as "could not be clicked". I checked those by hand:
they sit inside the closed drawer or behind the open drawer or bottom sheet, so they are not reachable by a
user either until the drawer changes state. The closed mobile drawer is now `visibility: hidden`, so those
controls are no longer in the tab order.

After the changes (`local-after/audit.json`): no uncaught errors on any route, no failed requests other
than the `/api/*` list above, and no control that does nothing apart from:

- links to the page you are already on (the current-page chip in the header),
- the skip link, which is off screen until focused,
- demonstration buttons on `/preview/style-guide`, which have no actions by design.

Offline Desk buttons now say "`<button name>` did nothing. This host is the static site and has no bot
runtime. Start the local gateway to use the desk."

## Results by route, after the changes

390px column is the phone result. All routes: no horizontal overflow at any width, body font is Geist, no
text under 12px, no contrast failures.

| Route | Status 1440 / 768 / 390 | Controls under 44px at 390 | Notes |
| --- | --- | --- | --- |
| `/` | 200 | 0 | Map centred. One expected 404 (`/api/state`). |
| `/agents` | 200 | 0 | Drawer sits beside the map on desktop. |
| `/village` | 200 | 0 | Closed drawer is hidden from keyboard and screen readers. |
| `/atlas` | 200 | 0 | Filter chips are 44px. |
| `/studio` | 200 | 0 | Dense desktop chrome keeps 22 to 28px icon buttons at 1440 (41 controls); on phones they are 44px. |
| `/editor` | 200 | 0 | Status says no owner desk here, so Save is disabled. |
| `/projects` | 200 | 0 | Empty state. One expected 404. |
| `/artifacts` | 200 | 0 | Poster specimens are art and are excluded from the type and contrast checks. |
| `/letter` | 200 | 0 | No uncaught error. |
| `/credits` | 200 | 4 | The four are inline links inside sentences, which WCAG 2.5.8 exempts. Tables scroll in their own frame. |
| `/desk` | 200 | 0 | |
| `/kits`, `/kits/*` (6) | 200 | 0 | |
| `/preview`, `/preview/*` (5) | 200 | 0 | No more prefetch 404s. |
| `/preview/style-guide` | 200 | 0 | New. |
| `/chats` | 404 | 0 | Branded 404 with the page list. |

Measured on the audited pages, before and after: controls under 44px at 390 went from 225 to 4,
text under 12px from 61 to 0, low-contrast runs from 18 to 0, distinct button looks from 55 to 33, font
sizes in use from 35 to 11 (the before figure includes the poster specimens, the after figure excludes them), pages with sideways scroll from 1 to 0. Controls under 44px at 1440 went up, from
254 to 399, because every page now has the same 10-chip header at the 36px desktop size, and the new style
guide page demonstrates every button state. The 36px desktop chip is deliberate. It grows to 44px under
768px wide and on touch.

## Merged with main: Pantheon Forge (#28)

This branch was brought up to date with `main` after the Pantheon Forge character maker landed
(`/village?section=characters`). Both pieces now live together:

- `/editor` keeps the desk file editor from `main` (page.txt save, drafts, approve) and draws it with the
  shared `PageShell` and `.dw-*` components.
- The Characters panel (`src/components/forge/character-maker.tsx`) no longer has its own `Chip` and
  `Secondary` helpers. Pose, preset, part and avatar chips are `dw-btn dw-btn--chip` (the pressed state is
  `aria-pressed`, styled by the shared CSS), export buttons are `dw-btn`, Save is `dw-btn--primary`, the name
  and epithet inputs are `dw-label` and `dw-field`, section titles are `dw-eyebrow`, and roster rows are
  `dw-card`. The panel's behaviour and the `data-forge-*` hooks are unchanged.
- Both `playwright-core` (route audit and smoke test) and `puppeteer-core` (`npm run check:forge`) stay in
  `devDependencies`.

Results on the merged branch: `npm run build` ok, `npm test` 152 of 152 (includes the route smoke test, 51
checks, and the Forge schema, bones and codec tests), `npm run test:rules` ok, `npm run check:forge` ok at
1440 and 390 (3D view drew, no sideways scroll, no browser errors). Screenshots of the restyled panel:
`docs/process/design/after/characters-1440.png` and `characters-390.png`.

## Forge design pass

PR #29 styled the Forge character maker's buttons and fields. This pass looked at every Forge page and state
and made the whole of it, including the part of the app shell it sits in, follow the same style guide
(`/preview/style-guide`, `src/styles/tokens.css`, `src/styles/dawn-ui.css`). The art is untouched.
Engine code under `src/lib/forge/` is untouched.

### How I audited it

`scripts/forge-audit.mjs` drives headless Chrome through 16 states at 1440x900, 390x844 and 844x390:
empty, editing, posing, name error, saving, saved, exporting (JSON, PNG, glTF), refused import, roster,
menu drawer, You panel, village, agent sheet, no WebGL, storage refused and a full roster. For each one it
records the page measurements from `scripts/lib/measure.mjs` (overflow, tap targets, text size, contrast,
fonts, radii, button looks, broken images, unlabelled controls), where the 3D view is, whether the document
itself scrolls, and console and network errors. The same script ran on `main` and on this branch.

| | Before | After |
| --- | --- | --- |
| Document scrolls under the app shell (1440 / 390 / 844 wide) | 506 / 1546 / 1356 px | 0 / 0 / 0 px |
| 3D view, phone landscape | 128x300 | 408x220 |
| 3D view, phone portrait | 358x460, scrolls away while editing | 358x219, pinned |
| 3D view, desktop | 620x560 | 636x560 |
| Console errors with no WebGL | 1 per viewport | 0 |
| Distinct button looks / corner radii on Forge pages | 9 / 4 | 8 / 3 |
| Horizontal scroll, text under 12px, contrast failures, broken images, 404s | 0 | 0 |
| Controls under 44px on phones | 0 | 0 |

### What I found

1. The whole page scrolled under the fixed shell: the visually hidden JSON import input was positioned
   against the page, outside the scroll area's clip, so the document grew by 506 to 1546px. On a phone that
   was a second scrollbar under the menu bar.
2. At 844x390 the 280px docked menu left Forge a 128x300 3D view. The shell chose between docked and drawer by
   width only.
3. On phones the 3D view scrolled out of sight as soon as you chose a part, so you could not see what the part
   did.
4. Chip rows stretched into two columns on phones. The roster remove button was a full-width bar. "Avatar for"
   was squashed.
5. The Characters page showed the shared footer: an inert Search field, a "New quest" button floating over the
   Save button and a second "Credits & licenses" link. In landscape the footer took 72px of 334.
6. No WebGL: three.js logged a console error, and the message said "Your characters still save", but saving
   needs WebGL for the portrait.
7. A refused storage write reported "in your roster" and "no room left" together.
8. Errors and status messages were bare small text. Nothing told you the portrait was being drawn.
9. Forge and its shell used one-off values: text sizes in px (13, 14, 15, 16, 17, 34), `#a8a199`, `#2a2a27`,
   12px and 16px and 18px corners, raw shadows, `bg-black/55`, and hand made round buttons for Menu, Close,
   Back, You, the village chips, New quest, Add, Join, Sign in, Sign out, and the agent sheet's Close, Ask,
   Approve and No.
10. The drawer did not scroll, so the account row was cut off at 390px tall. The atlas menu button used
    `#2a2a27` and `md:hidden`.
11. The empty roster was one line of grey text.

No off-system fonts (no Times fallback), no stray palettes, no contrast failures, no text under 12px, no
sideways scroll, no 404s and no phone tap targets under 44px were found, apart from the items above.
There is no "Rainfall" text anywhere in the repo, in the built site or on any Forge page.

### What I fixed

- `src/styles/forge-ui.css` (new, imported after `dawn-ui.css`): the Forge layout. A single column on phones
  with the 3D view pinned above the controls, two columns when the Forge area itself is 768px wide (a
  container query, so it follows the area, not the window).
- `src/styles/dawn-ui.css`: shared `dw-slider`, `dw-swatch`, `dw-stage`, `dw-stage-message`, a chip row that
  keeps chip width on phones, and `dw-dock-hide`. All are on the style guide page under "Pickers, sliders and
  stages".
- `src/components/forge/character-maker.tsx`, `forge-viewport.tsx`: rebuilt on the shared classes. Errors are
  `dw-alert`, status is `dw-note`. "Drawing the portrait..." and "Making the glTF file..." show while busy.
  A failed save no longer claims success. No WebGL is detected up front (`webgl.ts`), so there is no console
  error, and saving a portrait says plainly that this browser cannot draw it. JSON import and export still
  work. All `data-forge-*` hooks and engine calls are as before.
- `src/components/dawn/dawn-app.tsx`, `agent-sheet.tsx`, `atlas/vector-campus.tsx`: the menu docks only at
  768px wide and 520px tall (`dock:` variant), so phones in landscape get the drawer. The drawer scrolls.
  Every button is a `dw-btn` variant. Sizes, corners, shadows and the scrim use tokens. The footer is not
  shown on the Characters page.
- Tests: `src/lib/forge/forge-layout.browser.test.ts` (new, in `npm run test:app`). At 1440, 390 and 844x390,
  through every state above, it asserts: no horizontal scroll, no page-level vertical scroll, tap size 44px
  (36px only for desktop chips), no controls off screen or without a name, only Geist and Source Serif 4,
  only token colours, no text under 12px, no contrast failure, no broken images, no "Rainfall" text, no page
  error, console error or non-`/api/` 4xx, and a 3D view that is on screen, at least 280x160 and at most 75%
  of the window height. `smoke-routes.browser.test.ts` now also covers `/village/?section=characters` and
  `/village/?section=village` (`FORGE_ROUTES` in `scripts/lib/routes.mjs`).
- A portrait and a village sprite saved from the old and new build hash identically for Napoleon Bonaparte
  and Sun Tzu, so the render is unchanged.

### Screenshots

Full page, header to footer: `docs/process/design/forge/before/<state>-<desktop|mobile|landscape>.png` and
`docs/process/design/forge/after/...`. Side by side: `docs/process/design/forge/COMPARE_*.png`. The state list
is in `docs/process/design/forge/README.md`. Raw numbers: `docs/process/test/forge-before/audit.json` and
`docs/process/test/forge-after/audit.json`.

### What remains

- Desktop chips are 36px high. That is the PR #29 rule (44px under 768px and on touch). I left it.
- The agent sheet header still shows the pixel sprite, not the Forge portrait. The portrait shows in the
  menu and village chips. That is a feature, not chrome.
- On a phone, the village "New quest" button can sit over the village status text. That is the village, not
  Forge, and I left it.
- The 3D view was only drawn with software WebGL (SwiftShader) in headless Chrome. No real GPU, Safari or
  Firefox. The container query and `dvh` rely on Safari 16 or later.
- Signed-in saving of the roster to Firestore is not covered by a test.
- The older Forge screenshots under `docs/process/forge-integration/` were not regenerated.
- `npm test`: 170 of 172 pass, 2 skipped because OpenVSCode and `editor/dist/gateway.cjs` are not built
  here. Same two on `main`.

## What is still not connected

- Everything behind `/api/*`: the desk, bot tasks, saved threads, kit checks, NightCode sessions, letters,
  local drafts, newsletter sign-up. These need `node server/dawn-agents.mjs` running next to the site.
- Any model call. Studio send works only on a hosted project with a model configured, which I could not test
  because the live site is behind the password gate.
- Recipe likes are not saved.
- Atlas Cardinal note is "coming soon".
- No Chats page exists.
- Sign-in. Google sign-in only appears when the gateway returns 401.
- The password gate on the live site is outside this repo.

## Limits of this test

- The live site was tested only as far as its gate.
- The click-through logs "no visible change" for controls whose result is a tiny text change, and "could not
  be clicked" for controls under an overlay. I reviewed every such case in the tables above by hand, but the
  raw JSON still lists them.
- Full-page screenshots of the town map, village, atlas and studio capture one screen, because those pages
  scroll inside a fixed shell.
- I tested with headless Chrome only. No Safari or Firefox.
- I did not test the authenticated paths (gateway, owner email header, OAuth).

## Smoke tests added

`src/lib/site/smoke-routes.browser.test.ts`, part of `npm test`. It serves `out/` and, for every route at
1440 and 390: expects status 200, no uncaught error, no failed request other than `/api/*`, a `<main>`, an
`<h1>`, a body font that is not the browser default, the design tokens loaded, and no horizontal overflow.
It also checks that an unknown path returns the branded 404 and that the audit's route list matches
`SITE_ROUTES`. The test skips when `out/` or Chrome is missing. CI now runs `npm run build` before `npm test`.

## Re-running

```
npm ci --legacy-peer-deps && npm run build
node scripts/site-audit.mjs --serve out --out docs/process/test/local --label local
node scripts/contact-sheet.mjs --dir docs/process/design/after --suffix desktop --out /tmp/sheet.png
node scripts/style-guide.mjs
node scripts/forge-audit.mjs --serve out --out docs/process/test/forge-after --shots docs/process/design/forge/after --label after
npm test
```

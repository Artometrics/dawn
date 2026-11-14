# Aftercare one-shot study: analysis

Prepared Nov 10, 2026. Sources: the `kylesmcauliffe/aftercare` repo (git history, `docs/PLAN.md`, `docs/RESEARCH.md`, `docs/URL_SHEET.md`, `docs/process/CAPTIONS.md`, `site/README.md`, `site/package.json`), the GitHub record for PR #6 (body and 9 commits), the bot's memory journal, and the overnight log `/workspace/overnight-nov10.md`. All times are Pacific (PT).

## 0. What's missing (read this first)

| Item | Status |
| --- | --- |
| Kyle's exact prompt (message t2660u, about 12:08 AM PT on Nov 10) | **Not retrievable from this subagent.** The main chat transcript can't be read from here, and SearchTranscripts returned nothing for this session. Only the memory journal's paraphrase survives (quoted in §1). The parent can read its own chat history and paste the exact words in. |
| The launch brief for cloud agent `bc-195eea7a-91f4-5872-a74c-3cead5117f2a` | **Not retrievable.** No brief file exists on the box (`/workspace/briefs/` has none for Aftercare), and I have no tool that dumps cloud agent conversations. The constraints the brief must have contained are reconstructed in §2 from the journal and from the agent's own "Rules followed" section. The parent can dump the conversation with its CloudAgent tool to get the verbatim text. |
| The builder's reasoning and tool trace | Not available, for the same reason. §3 is reconstructed from 9 timestamped commits and the docs the agent wrote. |

## 1. Kyle's prompt (paraphrase from memory, not verbatim)

The memory journal entry from about 12:08 AM PT on Nov 10, 2026, logged as "Kyle's idea dump (t2660u)":

> "(1) Aftercare = all-in-one spiritual/identity app: profile with name, DOB, birthplace saved on a map, favorite movies/books/things, a controllable shareable 'second self' showing how everything connects; numerology, tarot, druids, historical figures, bible/spiritual; later a Goop/Depop-style marketplace, journaling, Tumblr-style blog/comics, community; start by building a tarot app with three.js 3D flip cards plus mockups. (2) US elections si[te] ..."

It was one item in a multi-project idea dump. The important features of the prompt:
- **A big vision with an explicit first slice**: "start by building a tarot app with three.js 3D flip cards plus mockups".
- **Concrete nouns**: name, DOB, birthplace on a map, favorite movies, books and things, a "second self".
- **"Later" items** (marketplace, blog, community) that the brief could legally cut.
- **A named signature interaction** (3D flip cards) and a named deliverable (mockups).

Kyle's later verdict (message t2693u, 7:5x AM PT): "Also aftercare is the best one shot you've ever done. How did you do it? Whatever you did from my prompt you need to study"

## 2. The brief (reconstructed)

Launch facts from memory, about 12:15 AM PT: "Launched cloud agents (all claude-sonnet-5-5, PR/no merge/no deploy): Aftercare tarot bc-195eea7a (kylesmcauliffe/aftercare) ..." Three other agents launched in the same batch: United by Data, Cardinal web of people, and the Dawn design pass.

What the brief evidently contained, judging by what the agent says it obeyed (PR #6, "Rules followed"):
> "No deploy, no merge, no secrets, no third-party calls at runtime, no copyrighted deck art. Copy carries a "for reflection and entertainment" note and avoids medical or financial claims."

From PLAN.md and the deliverables, the brief or its standing house rules also asked for:
- a plan and research doc;
- **desktop and mobile mockups** (a house rule: "Mockups are full pages, desktop and mobile");
- process screenshots per milestone (`docs/process/` with CAPTIONS.md);
- tests;
- leaving existing apps alone ("We keep both untouched");
- original content only;
- one PR.

The agent ran on **claude-sonnet-5-5** with the standard cloud-agent setup, and the repo's AGENTS.md gave it Cloud VM instructions. No Grok Bot skill files are referenced in the repo.

## 3. What the builder did (from the commits and docs)

| # | PT time (Nov 10) | Commit | Phase |
| --- | --- | --- | --- |
| 1 | 12:23 AM | cfb9072 Add plan, research, desktop+mobile mockups, and numerology groundwork | **Plan first**: PLAN.md (184 lines), RESEARCH.md (86 lines), 7 mockup pages, each desktop and mobile, built from a tiny static generator (`docs/mockups/build.mjs`) |
| 2 | 12:50 AM | 0aa0efe Add Astro site scaffold with deck, numerology, card art, 3D tarot table | Core engine and the signature feature |
| 3 | 12:52 AM | 80b77fb Fix tarot table fallback visibility and badge placement | Fix 1 (found by its own screenshots) |
| 4 | 12:54 AM | aa523ea Add second-self view model, share link codec, world map helpers and tests | Pure-logic modules plus unit tests |
| 5 | 1:01 AM | f220fa9 Add landing, onboarding, profile, share, numerology, deck browser, readings, journal, privacy and e2e smoke tests | Pages plus Playwright |
| 6 | 1:05 AM | 0f3cb4f Polish constellation, onboarding favorites layout and distance wording; fix e2e typing | Fix 2 (visual polish) |
| 7 | 1:11 AM | 616dde9 Place the deck beside short spreads on wide screens; add milestone screenshot script and site README | Fix 3 (layout) plus docs |
| 8 | 1:11 AM | 97e9723 Add URL sheet, captions for milestones 02-05, update plan status | Docs |
| 9 | 1:11 AM | 7a5373c Add process screenshots for milestones 02-05 (desktop and mobile) | Evidence |
| PR | 1:12 AM | PR #6 opened | 132 files, +14,657 / −0 |
| Merge | 1:19 AM | a76898c (squash) by the overnight routine | Tests passed per PR |
| Host | 6:48 AM | 6ca84af gives site/ its own Firebase Hosting target (aftercare-510519.web.app, noindex) | Done later by a separate deploy task, not the builder |

**About an hour from launch to PR, with 3 small self-found fixes and no human round-trips.** The diff deletes zero lines.

### Planning
PLAN.md has these sections: vision, voice and guardrails, "what exists today (kept)" with a keep/ignore decision table, phases 0–5 with the MVP **in** list and an explicit **out (on purpose)** list, the data model (typed JSON in localStorage, mapped to the future Postgres), architecture, a named art direction, milestones, and risks.

### Stack choices
Astro 7 with static output, TypeScript and **no UI framework**; three.js 0.187 for one feature only, the table; d3-geo, topojson and world-atlas used **only at build time** to bake one SVG world path; Vitest; Playwright; @fontsource fonts. At runtime there are **no accounts, database, AI keys or network calls**. Everything is local-first, and share links carry their data in the URL fragment.

### Design reference
The agent invented a named direction, "the Midnight Almanac". It has hex values for paper, ink and four spot colours, and riso-style overprint with multiply. Fraunces and Outfit carry over from the existing brand. Ornament, motion rules and reduced-motion support are spelled out. Card art is **procedural SVG from code** (`cardArt.ts`), one deterministic image per card, shared by 3D textures and HTML. That removes any need for an image pipeline or licensing.

### Testing
- 50 Vitest unit tests across deck, numerology, second self, share codec and storage.
- `astro check`.
- A full build of 89 pages.
- 40 Playwright smoke tests on desktop and mobile, using system Chrome and software WebGL flags so three.js renders without a GPU.
- Milestone screenshot scripts (`scripts/shoot.mjs`, `scripts/milestones.mjs`) that seed a sample profile and deal real readings. The 3 fix commits came straight after screenshot or test steps.

### Honesty
The PR has a "Known weak spots" list: plainer procedural art, a ~190-city list with no geocoder, guessed theme matching, untested real-device performance, about 500 KB of HTML on the deck page, and a journal that is only a placeholder.

## 4. Kyle's hypotheses

### H1: "It went well because some of it was already built" (web/ or earlier commits)
**Verdict: mostly false for the code, partly true for context.**
- `site/` did not exist before commit cfb9072. `git log -- site` shows only the PR and the hosting commit, and the PR deleted 0 lines.
- No file in `site/src` or `site/scripts` imports from `web/`. All imports are local (`../lib/*`, `./deck`), plus `three` and fonts.
- The decks differ. `web/src/data/tarot.ts` has one-line meanings plus `artPrompt` strings for AI art. `site/src/data/deck.json` (78 cards, ~51 KB) has longer original upright and reversed text, keywords, element and a reflection question, built from `deck-src/*.json`. It is a rewrite, not a copy.
- Numerology was re-implemented. web/ has `lifePathNumber`, while site/ has `digitSum`, `reduceNumber` with master numbers, `personalYear` and name numbers, all with tests. PLAN.md says plainly: "Ideas reused. The new numerology module reduces month, day and year separately ... and handles master numbers with tests."
- **What was inherited**: the name, the Fraunces + Outfit fonts, the dusty-rose colour, the data-model hints (web/'s `profiles` and `tarot_pulls` tables), and an AGENTS.md with VM instructions. The existing app also served as a **reference to read** and a **thing not to break**. That made "build a new, isolated folder" the obvious move.
- In short, prior work gave it orientation and a brand, not code. Roughly 4,700 lines of new TS, Astro and MJS were written from scratch, against about 1,200 lines in web/src.

### H2: "It used newer libraries or tools like three.js"
**Verdict: false as a novelty explanation. three.js and Astro were not new to these projects, though being well-known helped.**
- three.js already appears in earlier work on the box: Pantheon vendors three.js utilities (`pantheon/site/lib/utils/*.js`), and `art3d/` uses it. Dawn's Forge (PR #28) added three.js the same night and was merged at 1:19:56 AM PT, one second before Aftercare. Forge was a weaker first pass that needed the PR #33 rescue for scrolling (up to 1,546 px of overscroll on phones).
- Astro is the stack of the main Artometrics site.
- The libraries are very mature and heavily represented in training data (three.js r187, Astro, Vitest, Playwright). So **familiar, boring tools** helped, not new ones.
- What did matter was **how** three.js was used. It was confined to one module (`scene/TarotTable.ts`), with render-on-demand, DPR capped at 2, an HTML fallback when WebGL is missing, keyboard access, and textures rasterised from the same SVG as the HTML pages. Forge used the same library in the same week, inside a complex existing app, and came out worse. The library is not the variable.

### Other factors (ranked by how strongly the evidence supports them)
1. **A greenfield folder in an existing repo.** It had nothing to integrate with and nothing to regress. Contrast: the Dawn #29 and #27 first passes conflicted and needed a conflict-fix agent (bc-887792f7), Forge needed a scroll repair, and Pantheon #22 conflicted with main.
2. **Static, local-first, no backend.** There was no auth, no DB, no keys and no network, so every feature could be tested on the VM. Contrast: web/'s own AGENTS.md warns that Netlify Identity "cannot be exercised on this headless VM", so anything touching it can't be verified. The same goes for Dawn's Google sign-in and kit APIs.
3. **A big vision with a declared first slice, and an explicit OUT list.** Marketplace, blog, community, AI readings and accounts were all named as out. That kept the hour focused.
4. **Plan, research and mockups committed before any app code** (commit 1, at 12:23 AM). The mockups fixed the look before the code was written.
5. **A named, specific art direction with hex values**, instead of "make it pretty".
6. **Content generated by code** (procedural SVG card art, an offline map baked at build time). There was no asset pipeline, no licensing and no waiting on image generation.
7. **A self-check loop with eyes.** Playwright on desktop and mobile with software WebGL, plus milestone screenshots, produced 3 fix commits before the PR.
8. **Pure-logic modules with unit tests** (numerology, share codec, spreads). The fiddly parts were exactly the testable ones.
9. **Hard guardrails** (no deploy, no merge, no secrets, original art, a disclaimer). They narrowed the choices.
10. **The model** (claude-sonnet-5-5). It was the same model as the other three agents in the batch, so it does not explain the difference on its own.
11. **The domain suits a one-shot.** 78 cards and numerology rules form a closed, well-documented dataset.

## 5. Quick contrasts (same night or same week)
| Project | First pass | What went wrong | Why it differs |
| --- | --- | --- | --- |
| Dawn #28 Forge | three.js character maker in an existing app | Needed PR #33: page overscroll up to 1,546 px, a 3D view that scrolled away, a false "your characters still save" message | Integrated into a large app shell with no screenshot pass at phone sizes |
| Dawn #29 design pass / #27 | Edits across an existing app | Merge conflicts, so a separate fix agent was needed. Live testing stopped at the password gate | Shared files and a gate the agent couldn't pass |
| Pantheon #21 / #22 | Features in an existing game | Flaky tests on main needed simulated-time fixes. #22 conflicted with main | Existing test debt and parallel branches |
| United by Data | New site | A duplicate agent was launched (bc-23b8e2d0, cancelled) | Launch hygiene, not code |
Aftercare avoided all four failure modes: it had no shared files, no gate, no existing test debt, and only one agent.

## 6. Recipe
See `SKILL-draft.md` (the build recipe), `SKILL-brief-writer-draft.md` (how to write the brief) and `templates/`.

# Case study: Aftercare, from an idea dump to a live MVP

*All times are Pacific (PT). Dates are 2026.*

## Before
`kylesmcauliffe/aftercare` was created in July. By Nov 9 it held two apps: a root Expo app (renamed "Aftercare" with a pink theme, SDK 57) and `web/`, a Vite + React app on Netlify with Identity, Postgres, Blobs and an AI gateway. It covered journaling, mood tracking, simple tarot and sun-sign tools. Its last commit was Jul 22. web/'s auth couldn't be run on a cloud VM, and the repo's AGENTS.md said so.

## The prompt (about 12:08 AM, Nov 10)
Shortly after midnight Kyle sent a multi-project idea dump. The Aftercare part, as the assistant's memory records it (paraphrase, not verbatim):

> Aftercare = all-in-one spiritual/identity app: profile with name, DOB, birthplace saved on a map, favorite movies/books/things, a controllable shareable 'second self' showing how everything connects; numerology, tarot, druids, historical figures, bible/spiritual; later a Goop/Depop-style marketplace, journaling, Tumblr-style blog/comics, community; start by building a tarot app with three.js 3D flip cards plus mockups.

The message was a large vision, but it had one clear starting point.

## The launch (about 12:15 AM)
The assistant sorted the dump into projects. It launched one cloud agent per project, four in all, each on claude-sonnet-5-5 with the same rules: open a PR, don't merge, don't deploy. The Aftercare agent was `bc-195eea7a`. The verbatim brief isn't on record (see analysis.md §0).

## The build (12:23–1:12 AM)
- **12:23**: The first commit had no app code. It held a 184-line PLAN with phases and an explicit "MVP: out (on purpose)" list, a research note on deck licensing, and seven mockup pages, each desktop and mobile. The plan set the art direction, "the Midnight Almanac": parchment, night-teal ink, riso spot colours, and Fraunces and Outfit carried over from the brand.
- **12:50**: The Astro site landed with the 78-card deck, numerology, procedural SVG card art and a three.js table that shuffles, deals, flips and tilts.
- **12:52**: Fix: the fallback list's visibility and badge placement.
- **12:54**: The second-self view model, the share-link codec (data in the URL fragment), offline world-map helpers, and tests.
- **1:01**: All pages (landing, onboarding, profile, share, numerology, deck browser, readings, journal placeholder, privacy) plus Playwright smoke tests.
- **1:05**: Polish: constellation layout, favorites layout, distance wording, e2e typing.
- **1:11**: Wide-screen layout fix, a screenshot script that seeds the sample "Mara Ellison" profile, the README, the URL sheet, captions and screenshots for milestones 02–05.
- **1:12**: PR #6 opened: 132 files, +14,657, −0. It reported 50 unit tests, 40 e2e tests and an 89-page build, plus a candid "Known weak spots" list.

## Review and merge (1:19 AM)
The overnight routine merged it (a76898c) because its checks passed. It merged in the same second as Dawn's Forge PR, which used the same library (three.js) but went into an existing app. Forge later needed a repair PR.

## Live (6:48 AM)
After Kyle asked for "all you can", a separate deploy task gave `site/` its own Firebase Hosting site, https://aftercare-510519.web.app. It is noindex via meta, header and robots. Of 11 pages checked, all loaded. Netlify `web/` was unchanged.

## The verdict (about 7:50 AM)
> "Also aftercare is the best one shot you've ever done. How did you do it? Whatever you did from my prompt you need to study"

## Why it worked, in one paragraph
A big vision came with a stated first slice. The build went into a fresh folder, so there was nothing to break. Static, local-first tools meant every feature could run and be tested on the agent's own machine. Plan and mockups were committed first, with a named art direction. Content was drawn by code instead of sourced. And the agent screenshotted its own work on desktop and phone and fixed what it saw before asking for review. The library (three.js) and the model were the same as in weaker passes that night. The isolation and the verification loop were not.

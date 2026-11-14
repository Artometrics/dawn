---
name: oneshot-app-build
description: When the user pitches a new app idea, big or small, and wants a first working version built by a cloud agent in one pass. Use before launching the builder, to shape scope, stack, and the verification loop that made the Aftercare MVP land in one shot.
---

# One-shot app build (the Aftercare recipe)

A pattern that took a sprawling idea dump to a tested 89-page app in about an hour, with no human round-trips. Use `oneshot-brief-writer` to write the brief itself.

## When it fits
- A new product or a new surface, which can live in its **own folder** (a new repo, or `site/` beside existing apps).
- The first slice can run **without accounts, a database, paid APIs or secrets**.
- There is one **signature interaction** worth getting right (a 3D table, a map, a game loop, an editor).

If the work has to edit a large existing app, share files with other open PRs, or sit behind auth or a gate the agent can't pass, this is not a one-shot. Split it, or run the integration work separately.

## Steps
1. **Capture the vision and cut the slice.** Keep the user's full vision in the plan, then pick the first slice the user named, or the smallest one that shows the signature interaction. Write an explicit OUT list: everything said with "later", plus accounts, payments, AI, community and native apps.
2. **Isolate.** Build in a new folder or repo. Name the existing apps and deploys as untouchable. Put "zero deletions outside the new folder" in the brief.
3. **Pick boring, static tools.** A static site generator (Astro static output, or plain Vite), TypeScript, no UI framework unless needed, and one specialist library for the signature feature (three.js, d3, a canvas lib) confined to one module. Do build-time baking instead of runtime calls (maps, data, content). Store data locally (localStorage plus export and import).
4. **Generate content by code** where possible: procedural SVG art, deterministic data files built by a script, seeded sample profiles. Write original copy. Don't use scraped or copyrighted assets.
5. **Plan, research and mockups come first, in their own commit.** That means a PLAN with vision, guardrails, a keep table, phases, in and out lists, a data model, architecture, a **named art direction with hex values and fonts**, milestones and risks. It also means a short RESEARCH note on licensing and domain rules, and desktop plus mobile mockups.
6. **Build in layers.** Pure logic modules with unit tests first, then the signature feature, then pages, then e2e smoke tests.
7. **Look at it.** Write a screenshot script that seeds sample data and captures every milestone at desktop (1440x900) and mobile (390x844). For WebGL, launch Chrome with software GL so the VM can render it. Fix what the screenshots show before opening the PR.
8. **Resilience.** Add fallbacks for the fancy part (no WebGL leads to an HTML list), keyboard access, reduced motion, a DPR cap and render-on-demand.
9. **One PR, with evidence.** Include what's in it, how to run it, test counts, the rules followed and an honest **Known weak spots** list. No merge and no deploy unless the user asked.
10. **Hosting is a separate step.** After review, give it its own static hosting target, set to noindex until the user says otherwise.

## Verification gate (all must pass before the PR)
- [ ] Unit tests are green, covering every pure module.
- [ ] Typecheck plus a full static build, with the page count reported.
- [ ] e2e smoke tests pass on desktop and mobile projects.
- [ ] Screenshots exist for every milestone, desktop and mobile, with captions.
- [ ] No horizontal scroll at 390px, and the signature feature works on the phone viewport.
- [ ] No secrets, no runtime third-party calls, and zero changes outside the new folder.
- [ ] The Known weak spots section is written.

## Anti-patterns seen in weaker first passes
- Dropping a new feature into a big existing app shell. The result was overscroll and a 3D view that scrolled away.
- Several open PRs touching the same files, which led to merge conflicts.
- Features behind auth, a gate or a server the VM can't run. They can't be verified.
- Building on flaky existing tests.
- Launching duplicate agents for one task.
- Status messages that claim success without checking, such as "your data still saves".

# Aftercare One-Shot Study

This study looks at why the Aftercare MVP (an Astro, three.js and local-first tarot, numerology and "second self" app) came out right in one pass, and how to repeat it. It is generic and contains no secrets.

| File | What it is |
| --- | --- |
| `analysis.md` | Evidence-based analysis: the prompt, a reconstructed brief, the builder's commit timeline, stack, design and testing, verdicts on the two hypotheses (prior code reuse, newer libraries), other factors, and contrasts with weaker first passes. **§0 lists what history is missing.** |
| `case-study.md` | A narrative timeline from the idea dump (about 12:08 AM PT) to the live site (6:48 AM PT). |
| `SKILL-draft.md` | The ready-to-save skill `oneshot-app-build`, the build recipe. |
| `SKILL-brief-writer-draft.md` | The ready-to-save skill `oneshot-brief-writer`, for writing the builder brief. |
| `templates/user-prompt-template.md` | How to pitch an idea so it one-shots well, with a synthetic example. |
| `templates/builder-brief-template.md` | A fill-in launch brief for the cloud agent. |
| `templates/verification-checklist.md` | Checks for the builder, the reviewer and the deploy. |
| `synthetic/` | 20 synthetic idea→brief pairs and 5 annotated weak briefs (JSONL), all labelled synthetic. |

## Key findings
1. **Isolation.** The build went into a brand-new `site/` folder, with zero deletions and existing apps untouched.
2. **A declared first slice and an explicit OUT list.**
3. **Static and local-first**, so every feature could be verified on the agent's own machine.
4. **Plan, research and mockups were committed before code**, including a named art direction.
5. **Code-generated content** (procedural SVG art, a map baked at build time).
6. **A self-check loop**: unit tests, desktop and mobile e2e with software WebGL, and milestone screenshots. That loop produced 3 fixes before the PR.

It was not prior code reuse: web/ gave the brand and context only. It was not a new library either: three.js was already used in Pantheon and in Dawn's Forge, which needed a repair pass.

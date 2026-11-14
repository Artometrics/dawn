# Verification checklist (builder self-check, then reviewer re-check)

## Builder, before opening the PR
- [ ] `git diff --stat main` touches only the new folder plus docs. No deletions elsewhere.
- [ ] Unit tests are green, and every pure module (calculations, codecs, storage) has tests.
- [ ] Typecheck is clean (`astro check` or `tsc --noEmit`).
- [ ] The full production build passes, and the page or route count is reported.
- [ ] e2e smoke tests pass on a desktop project and a mobile project. Each core flow runs end to end and saves data.
- [ ] The signature feature renders headless. For WebGL, use software GL flags such as `--use-angle=swiftshader --enable-unsafe-swiftshader`.
- [ ] The fallback works with the fancy feature disabled (no WebGL, reduced motion).
- [ ] Keyboard access works for the main interaction.
- [ ] Screenshots exist for every milestone at 1440x900 and 390x844, with captions.
- [ ] No horizontal scroll at 390px, and no fixed bar covers content.
- [ ] Status and success messages reflect real results. Never claim a save that failed.
- [ ] No secrets in the repo, and no runtime network calls. Check the browser network log on a page load.
- [ ] Content is original or licensed, and provenance is noted in RESEARCH or README.
- [ ] Known weak spots are listed honestly in the PR.

## Reviewer, before merge or deploy
- [ ] Re-run the tests and the build from a clean install.
- [ ] Open 3 or more screenshots and compare them with the mockups.
- [ ] Spot-check the deploy config: the existing deploys are unchanged.

## Deploy (only when asked)
- [ ] Use its own hosting target or site, not a shared one.
- [ ] Set noindex (meta, `X-Robots-Tag`, robots.txt) unless told it's public.
- [ ] Check live: every route in the URL sheet returns 200 and renders. Do one phone-size pass. The console has no app errors.
- [ ] Record the version, the rollback and the URL in the report.

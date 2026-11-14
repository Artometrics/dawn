# `_reference/` — original-app sources (do not ship)

This tree is **reference material only**. It exists so merger work can see the full originals that were folded into Dawn as stripped desks.

- It lives at the repo root, not under `src/` or `public/`.
- `tsconfig.json` excludes it, ESLint ignores it, and Firebase Hosting ignore lists it.
- Dawn is a Next.js static export (`output: "export"`). Next only emits `src/app` / `public` into `out/`, so this folder must never appear on the live site.

Do not open a production PR that copies these files into `public/` or `src/app` without first reducing them to the merger that should actually ship.

## Branch

`reference/originals`, cut from `main` at `2754ca7d` (PR #40, the first fold of these apps into Dawn desks).

## Apps

| Path | Original | Verified backup |
| --- | --- | --- |
| `originals/aftercare/` | Artometrics/aftercare (`site/` Almanac MVP + `web/` Netlify app + Expo shell) | Drive folder [1dSMnzvf6H_tytYjdbTGnNj2m5HQvS_-0](https://drive.google.com/drive/folders/1dSMnzvf6H_tytYjdbTGnNj2m5HQvS_-0) |
| `originals/carrie/` | Artometrics/carrie (PageMatch books, plus PawCert pets and the portal) | Drive folder [1W4tnGH_653YJboRw-yIUf28LRnO2l475](https://drive.google.com/drive/folders/1W4tnGH_653YJboRw-yIUf28LRnO2l475) |
| `originals/dilemma/` | kylesmcauliffe/dawn (Phaser prisoner’s-dilemma village) | Drive remainder [14gKU2icG_Sj9bjaqPloizht771U_qC0T](https://drive.google.com/drive/folders/14gKU2icG_Sj9bjaqPloizht771U_qC0T) (`kylesmcauliffe--dawn.bundle`) |
| `originals/fernbound/` | Fernbound Godot 4.7 web export (no git repo was archived) | Drive folder [1xtMxmPjFzBpJqs45PllaseDVljyPsWFW](https://drive.google.com/drive/folders/1xtMxmPjFzBpJqs45PllaseDVljyPsWFW) |
| `originals/nightlight/` | Artometrics/nightlight (Three.js flashlight walk-around) | Drive folder [1aUzM6Nj6QCX1FbVrtSlqXo2Mylfgxac1](https://drive.google.com/drive/folders/1aUzM6Nj6QCX1FbVrtSlqXo2Mylfgxac1) |

Each app folder has `FEATURES.md` (full inventory) and `NOTES.md` (backup SHA256, git tip, omitted large files, Drive locations).

## Verification (this restore, 13 Nov 2026, evening PT)

Files were re-downloaded from Drive and SHA256-checked against the Archive Index sidecars / previously recorded sums:

| File | SHA256 |
| --- | --- |
| `aftercare.bundle` | `5c2efe6a965fb8f75806312e7e25ded74c5e4f92b3755c8fc4f280b360e33b41` |
| `aftercare-working-tree.zip` | `e6569a69e1fd924655b2eaca677dd06ba18f15e0d40cae14bcd209f6159098a0` |
| `carrie-a734540.bundle` | `49d29e7ac8ddba296d66fa7f1bc944c3753bd2af31018746a0d87cc5e69730b7` |
| `carrie-working-tree-a734540.zip` | `2383bb0088413a8bd7fa83fb81727fd407d3b5d1b75f95709220da5ddced2cfb` |
| `kylesmcauliffe--dawn.bundle` | `81b0377cf8a2f58f677b98f6db380e805d9dfe94b3f052c75e0fb99ca65ec598` |
| `fernbound-working-tree.zip` | `cbda1407e0d5d40ba12320121ca614d731312f1408c9c9305f29ffbde433901b` |
| `nightlight.bundle` / `Artometrics--nightlight.bundle` | `7febbae6e569feabd990e4486c837bfaf2bc7f0375d3f6a74cd72d5b1d272420` |
| `nightlight-working-tree.zip` | `32a744bcf60f2dc1c6b6497bce8e0c623664a5600e68826453bdf77f903015d0` |

Bundle tips: Aftercare `a19c6dc8cbec` on `main`; Carrie `a734540001de` on `main` (includes noindex PR #1); Dilemma `4675a0fa0d2b` on `main`; Nightlight `c5b73e7f26c2` on `main`.

## What was left out of this tree

- `.git`, `node_modules`, and build output.
- Any single file over ~5 MB. The only omission is Fernbound’s `public/index.wasm` (37.7 MB). See `originals/fernbound/NOTES.md` — the same bytes already live on `main` at `public/play/fernbound/index.wasm` (SHA256 `fc74679e3b97f76878947fcd4fbe1268cbfa6188182a2e33bbc3f5dc9bfa57d0`), and in the Drive zip.
- Nightlight’s box-copy extras (dev screenshots, raw 3D kits, `nightlight-source.tgz`). The playable repo is here; extras stay in the Drive working-tree zip. See `originals/nightlight/NOTES.md`.

## Other game backups not copied here

Pantheon (including the original 3D Towers courtyard) is still a live repo, `Artometrics/pantheon`, and was not retired. Questroad, Cardinal Quest, Knightmare, Spidermom, and Voltspire already have Drive packages from earlier today; they were not sources for the PR #40 Dawn desks. Nightlight is included because the merge brief asked for other small-game backups.

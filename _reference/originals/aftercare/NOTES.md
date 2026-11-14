# Aftercare — restore notes

## Drive

- Folder: https://drive.google.com/drive/folders/1dSMnzvf6H_tytYjdbTGnNj2m5HQvS_-0
- Files re-downloaded and SHA256-verified for this branch:
  - `aftercare.bundle` (31,969,991 bytes) `5c2efe6a965fb8f75806312e7e25ded74c5e4f92b3755c8fc4f280b360e33b41`
  - `aftercare-working-tree.zip` (31,941,650 bytes) `e6569a69e1fd924655b2eaca677dd06ba18f15e0d40cae14bcd209f6159098a0`
- Also in the GitHub remainder folder: `Artometrics--aftercare.bundle` (same SHA as `aftercare.bundle`).
- Live-mirror zip (not copied here): `aftercare-live-mirror.zip` `0b6a91342fde0df3df9ebfef1b76aa0d8769e09221b760c7563823146d81e2a8`

## Git

- Tip: `a19c6dc8cbec29c5dbabcc47aefd4052feed68ef` on `main`.
- This folder is the working tree of that commit (no `.git`). To browse history or unmerged branches, clone the Drive bundle:
  `git clone aftercare.bundle aftercare-git`
- Other refs in the bundle (not unpacked here):
  - `origin/cursor/aftercare-mvp-7f2a`
  - `origin/cursor/aritzia-style-nav-f4e6` (Expo Aritzia-style nav, never merged)
  - `origin/cursor/firebase-hosting-site`

## What this folder contains

- Full `site/`, `web/`, and Expo root from `main`.
- `_archive-notes/box-oneshot-study-notes/` — small study notes from the archive working-tree zip (not part of the git repo).

## Omitted (nothing over 5 MB in the git tree)

No files were dropped for size. `node_modules`, `.git`, and build output were excluded.

## Secrets

`.env.example` has empty AI key placeholders only. No `.env` or key files were included. A secret-name scan of the extract was clean.

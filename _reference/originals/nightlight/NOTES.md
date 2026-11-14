# Nightlight — restore notes

## Drive

- Folder: https://drive.google.com/drive/folders/1aUzM6Nj6QCX1FbVrtSlqXo2Mylfgxac1
- Also in the GitHub remainder folder: `Artometrics--nightlight.bundle` (id `1ZmGV8R5-vglYV_-W8sAShuJJBPDev7SP`) with sidecar `Artometrics--nightlight.bundle.SHA256` (id `1TGJ5y3jxiRXh4giBTGDxaZLdHW7cK7EA`).
- Re-downloaded and verified:
  - `nightlight.bundle` (1,688,013 bytes, id `1msK9uujx7V-tw5K5i7ZGkKxb-KrNyXXe`) SHA256 `7febbae6e569feabd990e4486c837bfaf2bc7f0375d3f6a74cd72d5b1d272420` (matches the remainder sidecar, which names the file `Artometrics--nightlight.bundle`)
  - `nightlight-working-tree.zip` (27,287,761 bytes, id `1jxZG05gfenjG3OQFrbrBsr_o5AEV-0pG`) SHA256 `32a744bcf60f2dc1c6b6497bce8e0c623664a5600e68826453bdf77f903015d0`

## Git

- Tip: `c5b73e7f26c2abb32a88b5ad76c49e2131a9a602` on `main`.
- This folder is that working tree (no `.git`). The bundle also has topic branches (`cursor/cabin-interior-244c`, `cursor/distant-valley-moan-8068`, `cursor/flashlight-interact-tuning-edfb`, `cursor/stair-flicker-78fc`, `cursor/window-reveal-c62f`, and others) whose tips were merged or superseded by `main`.

## Omitted from this tree (kept on Drive)

Nothing in the **git** working tree exceeded 5 MB (largest playable assets: `public/characters/ranger.glb` ~1.5 MB, vendored `three.module.js` ~1.3 MB). The **archive working-tree zip** also contains a `box-copy/` that was not copied, to keep the branch pushable:

- `box-copy/shots/` — several ~2.2 MB development screenshots
- `box-copy/3d/` — extra character glbs, Kenney-style kit (`kb.zip` and unpacked FBX/GLB)
- `box-copy/nightlight-source.tgz` (~1.8 MB)
- `box-copy/hana_concept.jpg`, `box-copy/test.py`
- `box-copy/site/` — largely a duplicate of the git `public/` tree

Get those from `nightlight-working-tree.zip` in the Drive folder above.

## Secrets

None found. Licenses for fonts / models are in `LICENSES.md` and `public/fonts/OFL.txt`.

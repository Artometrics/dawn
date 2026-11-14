# Fernbound — restore notes

## Drive

- Folder: https://drive.google.com/drive/folders/1xtMxmPjFzBpJqs45PllaseDVljyPsWFW
- `fernbound-working-tree.zip` (11,981,445 bytes, id `10_4kq9A7wKchoguRvFe8VrXuwFCuhcLz`) SHA256 `cbda1407e0d5d40ba12320121ca614d731312f1408c9c9305f29ffbde433901b`
- `fernbound-live-mirror.zip` (95,381 bytes) SHA256 `3623b78868a43d06d3c5019cf811b60b25f70de0c86b8cca7f404a9324bdd5e6` (not copied here; the live mirror is much smaller than the export because wget does not pull the wasm the same way)

No git bundle exists.

## Omitted (over ~5 MB)

| File | Size | Where to get it |
| --- | --- | --- |
| `public/index.wasm` | 39,514,754 bytes (37.7 MB) | Drive `fernbound-working-tree.zip`, or the copy already on `main` at `public/play/fernbound/index.wasm`. SHA256 of both: `fc74679e3b97f76878947fcd4fbe1268cbfa6188182a2e33bbc3f5dc9bfa57d0` (byte-identical). |

`public/index.pck` (1,939,352 bytes) is included — it holds maps, audio, and compiled scripts.

## Missing even from the Drive package

No Godot project (`.gd` sources, `project.godot`, raw art). Species / moves / battle rules are only inside compiled `scripts/data/database.gd` in the pck. The box archive used `/workspace/fernbound-deploy` as the sole source.

## Secrets

`robots.txt` is noindex only. No keys.

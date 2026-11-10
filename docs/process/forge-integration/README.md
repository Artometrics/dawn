# Forge integration check

Evidence for the Character Maker (`src/lib/forge/`, `src/components/forge/`). Regenerate with:

```
npm run build
npm run check:forge
```

`scripts/forge-check.mjs` serves `out/`, opens real headless Chrome (software WebGL), and runs the same steps at 1440px and 390px.

| Step | Checked |
| --- | --- |
| 3D view | The WebGL canvas has painted pixels; the page does not scroll sideways. |
| Build | Preset swap, Guard pose, face, outfit, accessory, turntable, and height slider keep drawing. |
| Save | Saves to the roster; `localStorage` holds the character, a portrait PNG, and a village sprite PNG. |
| JSON | Pantheon's `sun-tzu.json` imports as it is; a Joan file with an unknown hair is refused and the draft is kept. |
| Export | JSON, portrait PNG, and glTF download. The JSON equals the Pantheon file it came from. The PNG is 900 x 1200. The glb is a real `glTF` binary with the bones, both clips, and no ink-hull meshes. |
| Village | Napoleon Bonaparte is given to Trinity; the village scene draws her from the character and the agent chips use the portrait. Releasing returns the tile sprite. |
| Persistence | The roster survives a reload. |
| Errors | No page errors or console errors (emulator connection noise is ignored when no emulator is running). |

Screenshots are full page, header to footer: the window is grown to the height of the scroll area before the shot.

- `characters-1440.png`, `characters-390.png`: Character Maker with two saved characters, one given to Trinity.
- `village-1440.png`, `village-390.png`: the village with Trinity drawn as that character.
- `compare-original-forge-r170.png`, `compare-dawn-r185.png`: the same Sun Tzu portrait from the original Pantheon Forge build (three r170) and from Dawn (r185).
- `check-log.txt`: the run log.

Not covered here: a signed-in Firestore round trip in the browser (the rules are covered by `npm run test:rules`), and a real phone GPU. Headless Chrome used SwiftShader.

# Forge (Character Maker)

The character-creation tool inside Dawn's village. Open **Characters** in the drawer (`/village/?section=characters`).

## Attribution and source status

Forge is the Pantheon character maker (Artometrics/pantheon, PR #15, `tools/forge/`). Kyle owns it. This module is a copy of that source, adapted to Dawn's TypeScript and React setup. It does not import from the Pantheon repo at runtime and does not need it. The Pantheon repo was not modified.

What is copied, and how it changed:

| Dawn file | Pantheon file | Change |
| --- | --- | --- |
| `schema.ts` | `src/schema.js` | Types added. Checks, messages and file format are unchanged. |
| `engine/bones.ts`, `ik.ts`, `skeleton.ts`, `poses.ts`, `body.ts`, `wardrobe.ts`, `materials.ts`, `character.ts` | the same names in `src/` | Types added, and `repaint` now tracks its replacement textures so they are freed. Geometry, shaders, clips and numbers are unchanged. |
| `engine/stage.ts` | `src/main.js` (scene, camera, lights, turntable, drag, portrait) | Rewritten as a class so React owns the canvas. The scene numbers are Forge's. Adds a transparent village sprite and a detached render for roster images. |
| `presets/*.json` | `src/presets/*.json` | Byte for byte. |
| `schema.test.ts`, `engine/bones.test.ts` | `src/schema.test.js`, `src/bones.test.js` | Ported to TypeScript. The assertions are unchanged. |
| `CREDITS.md`, `PANTHEON-FORGE-README.md` | `CREDITS.md`, `README.md` | Byte for byte. |

Pantheon's own JSON files import and export unchanged: `forge.test.ts` imports each preset file, checks the character equals the file, and checks the export is the same JSON.

Forge targeted three.js r170. Dawn runs r185. The toon shader hooks still compile, and a Sun Tzu portrait drawn by the original Forge build (r170) and by this module (r185) look the same (`docs/process/forge-integration/compare-*.png`).

Not from Pantheon, written for Dawn: `catalog.ts` (limits), `codec.ts`, `presets.ts` (loads the JSON through the validator), `roster.ts`, `engine/outputs.ts`, and everything in `../../components/forge/`.

Rendering uses [three.js](https://threejs.org) (MIT). See `CREDITS.md` for the asset statement that ships with Forge.

## Layout

| Path | What it is |
| --- | --- |
| `schema.ts` | Forge's character schema: `validateCharacter`, `parseCharacter(text)`, `serializeCharacter`, `CATALOG`. Pure data, no three.js. |
| `catalog.ts` | Roster, file and agent limits. |
| `presets.ts` | Joan of Arc, Napoleon Bonaparte, Sun Tzu from `presets/*.json`, plus a blank starting character. |
| `codec.ts` | JSON export and import in Pantheon's format. |
| `roster.ts` | Roster rules, localStorage load and save, one character per agent, Firestore document shape. |
| `engine/` | Forge's three.js engine and the stage. Browser only, except `bones.ts`. |
| `../../components/forge/` | The Characters panel, the 3D viewport, and `use-roster.ts`. |

## Where characters are saved

- Always on this phone: `localStorage` key `dawn.forge.roster.v1` (up to 12 characters, each with a 168 x 224 portrait and a 64px sprite).
- Signed in with Firebase (emulator or the hosted project): mirrored to `users/{uid}/characters/{id}`, the same pattern as quests. Rules are in `firestore.rules` and tested in `tests/rules.mjs`.
- No paid service is called. Nothing leaves the browser except the Firestore mirror Dawn already uses.

## In the village

On a roster entry, tap Trinity, Kali, or Nimbus under "Avatar for". That character's sprite replaces the agent's tile sprite in the village scene, and its portrait replaces the agent's face in the drawer and the village chips. Tap the same agent again to release it. One character holds an agent at a time.

## Checks

- `npm test` runs `forge.test.ts` (Pantheon JSON round trip, roster save and load, agent assignment, Firestore document shape), plus Forge's own `schema.test.ts` and `engine/bones.test.ts`.
- `npm run test:rules` runs the Firestore rules, including `users/{uid}/characters`.
- `npm run build && npm run check:forge` drives the static export in headless Chrome at 1440px and 390px and writes full-page screenshots to `docs/process/forge-integration/`.

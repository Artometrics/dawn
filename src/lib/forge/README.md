# Forge (Character Maker)

The character-creation tool inside Dawn's village. Open **Characters** in the drawer (`/village/?section=characters`).

## Attribution and source status

Forge is the Pantheon character maker (Artometrics/pantheon, PR #15, `tools/forge/`). This module is Dawn's own build of that tool. It does not import from the Pantheon repo at runtime and does not need it.

**Read this before relying on the "vendored" label.** The Pantheon repository was not readable from the environment that built this integration (GitHub returned 404 for the repo, the PR, and the raw files). So the Forge source could not be copied. Everything here was written in Dawn from the tool's feature description: one procedural low-poly body and skeleton, idle and guard clips, swappable head, face, hair, outfit and accessory, height, build and color controls, JSON-defined characters (Joan of Arc, Napoleon, Sun Tzu), JSON export and import, portrait PNG, glTF export, and a toon ramp with rim light and an ink outline.

What that means:

- The JSON schema (`dawn.forge.character/1`), the part catalog, the figure proportions and the clip poses are Dawn's reading of the description. Pantheon's own JSON files will not import as-is until the two are reconciled.
- The 3D engine is isolated in `engine/`. When the real Forge source can be read, replace `engine/build.ts`, `engine/clips.ts` and `engine/materials.ts`, and map its JSON to `schema.ts` in `parseCharacter`. The roster, storage, Village avatar, and UI do not depend on how the body is built.

Credit for the idea and the design of Forge stays with Pantheon. Rendering uses [three.js](https://threejs.org) (MIT).

## Layout

| Path | What it is |
| --- | --- |
| `catalog.ts` | Part lists, ranges, limits. One place to add a part id. |
| `schema.ts` | `ForgeCharacter`, `parseCharacter` (validates and clamps untrusted JSON). |
| `presets.ts` | Joan of Arc, Napoleon, Sun Tzu. |
| `codec.ts` | JSON export and import (a Dawn file or a bare character). |
| `roster.ts` | Roster rules, localStorage load and save, one character per agent, Firestore document shape. |
| `engine/` | three.js: body and skeleton, clips, toon/rim/outline materials, viewport, portrait, sprite, glTF. Browser only. |
| `../../components/forge/` | The Characters panel, the 3D viewport, and `use-roster.ts`. |

## Where characters are saved

- Always on this phone: `localStorage` key `dawn.forge.roster.v1` (up to 12 characters, each with a 192px portrait and a 48px sprite).
- Signed in with Firebase (emulator or the hosted project): mirrored to `users/{uid}/characters/{id}`, the same pattern as quests. Rules are in `firestore.rules` and tested in `tests/rules.mjs`.
- No paid service is called. Nothing leaves the browser except the Firestore mirror Dawn already uses.

## In the village

On a roster entry, tap Trinity, Kali, or Nimbus under "Avatar for". That character's sprite replaces the agent's tile sprite in the village scene, and its portrait replaces the agent's face in the drawer and the village chips. Tap the same agent again to release it. One character holds an agent at a time.

## Checks

- `npm test` runs `forge.test.ts` (schema, JSON codec, roster save and load, agent assignment, Firestore document shape).
- `npm run test:rules` runs the Firestore rules, including `users/{uid}/characters`.
- `npm run build && npm run check:forge` drives the static export in headless Chrome at 1440px and 390px and writes full-page screenshots to `docs/process/forge-integration/`.

# Pantheon Forge

A browser character desk for Pantheon. It builds every legend on one shared skeleton, shades them like painted fighting-game key art, and saves the result as JSON (and a portrait PNG).

Forge is a static prototype. It does not import the game, it does not change fighters under `site/`, and it is not deployed.

## Run

From this folder:

```bash
npm install
npm test
npm run dev
```

`npm run build` writes a static site to `dist/`. `npm run preview` serves that build. No API keys and no paid services.

On a phone, the stage sits on top and the controls scroll underneath. Buttons are at least 44px. Drag the view to turn the figure. Dragging stops the turntable until you switch it back on.

## What you can change

- **Head, face, hair, outfit, accessory.** The catalogs live in `src/schema.js`.
- **Height and build.** Height scales the rig. Build widens shoulders, torso, and limbs. Both stay in 0–1 so the cast reads as adults of one game, not caricatures. Joan and Napoleon use the same height on purpose.
- **Skin, hair, cloth, trim.** Steel, leather, cream, black, and wood stay fixed so armor and boots do not turn into flat plastic when you recolor the cloth.
- **Painted overlay.** The toon ramp, rim light, and outline are always on. The overlay is an extra brush texture in screen space.
- **Idle and Guard.** Both are skeletal clips on the shared rig (`src/poses.js`).
- **Legends.** Joan of Arc, Napoleon Bonaparte, and Sun Tzu load from `src/presets/*.json`.
- **Export JSON / Import JSON.** The file is the schema below.
- **Save PNG.** A 900×1200 portrait with the name plate.
- **Export glTF.** The skinned body, the parts parented to bones, and the idle and guard clips.

## Character JSON

```json
{
  "version": 1,
  "id": "joan",
  "name": "Joan of Arc",
  "epithet": "The Maid of Orléans",
  "body": { "height": 0.5, "build": 0.5 },
  "colors": { "skin": "#d7a37a", "hair": "#2a1a12", "cloth": "#e4dcc8", "trim": "#c6a24a" },
  "parts": { "head": "oval", "face": "determined", "hair": "cropped", "outfit": "plate", "accessory": "banner" },
  "paintOverlay": true
}
```

`src/schema.js` is the checker. `npm test` loads the three presets and rejects bad colors, unknown parts, out-of-range sliders, and the wrong version. Pose is not part of the file. It is view state.

## Add a part

1. Add an id and a label to the right list in `CATALOG` in `src/schema.js` (`head`, `face`, `hair`, `outfit`, or `accessory`).
2. Build it in `src/wardrobe.js`.
   - Head shapes are scales in `SHAPES`.
   - Faces are drawn in `paintFace` in `src/materials.js`.
   - Hair, outfits, and accessories are branches in `addHair`, `addOutfit`, and `addAccessory`. Parent rigid pieces to a bone (`chest`, `handL`, `head`, …). If a piece must bend with two bones, skin it in `src/body.js` and weight it to those bone indexes.
3. Point a preset at the new id, or just pick it in the desk. `npm test` fails a preset that names an id the catalog does not have.

## Add a legend

1. Copy `src/presets/joan.json` to `src/presets/<id>.json`.
2. Set `id`, `name`, `epithet`, colors, and parts. Keep the design period-appropriate and ordinary in proportion. Do not encode a joke (Napoleon is not short here).
3. Import the file in `src/main.js` and append it to `PRESETS`.

The desk copies the JSON when you click the name, so editing sliders does not rewrite the preset file.

## Shared skeleton

Every character is the same 21-bone humanoid. Bone names have no dots, because `AnimationMixer` treats `.` as a path. The bind pose is a T-pose: arms out, palms down the arm axis, feet on the ground. Idle and guard are clips on top of that bind.

| Forge | Mixamo | Game rig (`docs/RIGGING.md`) |
| --- | --- | --- |
| hips | mixamorigHips | hips |
| spine | mixamorigSpine | spine |
| chest | mixamorigSpine2 | chest |
| neck | mixamorigNeck | neck |
| head | mixamorigHead | head |
| shoulderL / shoulderR | mixamorigLeftShoulder / Right | shoulderL / shoulderR |
| upperArmL / upperArmR | mixamorigLeftArm / Right | upperarmL / upperarmR |
| forearmL / forearmR | mixamorigLeftForeArm / Right | forearmL / forearmR |
| handL / handR | mixamorigLeftHand / Right | handL / handR |
| thighL / thighR | mixamorigLeftUpLeg / Right | thighL / thighR |
| shinL / shinR | mixamorigLeftLeg / Right | shinL / shinR |
| footL / footR | mixamorigLeftFoot / Right | footL / footR |

`root` is the armature parent and has no Mixamo name. The maps are `MIXAMO_MAP` and `GAME_RIG_MAP` in `src/bones.js`. Open the desk with `?bones=1` to draw joint axes.

There are no finger bones, no face blendshapes, and no spring bones. Hair and coat tails are parented, so they follow one bone.

## Path to fighting-game animation

The game already wants this shape. `docs/RIGGING.md` asks for a Mixamo- or Unreal-compatible humanoid, shared clips, and glTF under a few megabytes. Forge is the desk in front of that, not the crowd of clips.

1. **Keep this skeleton.** Export glTF from the desk. The file has the skinned body, parts parented to bones, and two clips: `idle` and `guard`.
2. **Retarget a real library onto these bone names.** Mixamo's free clips (or CMU public-domain mocap) are authored on `mixamorig*`. Map them with `MIXAMO_MAP`. Do the same toward the game's 17-bone rig with `GAME_RIG_MAP` when a legend is ready to replace the procedural body in the match. Root motion stays off. The game plays clips with `AnimationMixer`.
3. **Author the fighting set on the shared rig, once.** Idle with breathing, walk in and out, dash, jump (start, apex, land), a three-hit string, kick, sweep, launcher, hit high, hit low, block high, block low, knockdown, get-up, KO, win, intro. Per-legend specials are extra clips or props on `handR` / `handL`, which is how Joan's banner and Napoleon's saber already work.
4. **Then fix what this desk fakes.** Heat weights and a wrist blend are enough here. A shipping fighter needs hand-painted or baked normals, finger bones if weapons demand them, blendshapes for the portrait, and a cloth or spring chain for coat tails, robes, and long hair. Hit and hurt boxes should be a JSON sidecar or glTF extras keyed to the same clip frames. Compress with meshopt or Draco and keep each fighter under the budget in `docs/RIGGING.md`.

`?legend=joan&pose=guard&turn=0&ry=-0.6` opens a still frame for screenshots.

## Shading

`src/materials.js` builds a `MeshToonMaterial` ramp per surface (skin, cloth, hair, metal, gold), then adds three things in the shader: a wobble on the light terminator, a warm rim, and an optional brush overlay. A second mesh, drawn inside-out and pushed out along normals, is the ink outline. The hall and floor are painted canvases, not a modeling grid.

## Credits

See [CREDITS.md](CREDITS.md).

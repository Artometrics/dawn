# Nightlight (working title)

Play: https://nightlight-510519.web.app (turn your phone sideways)

## Controls
- Phone: left thumb = joystick, drag right side = look, 🔦 = flashlight on/off, hold the small button = focus the beam, tap a word to use it, hold the word "open" on the cabin door, 🏃 = run, 👤 = change character
- Computer: WASD/arrows move, Shift run, F flashlight, hold right mouse to focus, click to use, hold click to open the cabin door, click then move the mouse to look

## Swap in your own character (no code)
**Quick test on your phone:** tap 👤 → "Load .glb from device" → pick any .glb file. It loads right away (only on your phone, nothing is uploaded).

**Add it to the game for everyone:**
1. Put the file in `public/characters/` (for example `public/characters/mika.glb`).
2. Add one line to `public/characters/index.json`:
   `{"file":"mika.glb","name":"Mika"}`
3. Redeploy: `firebase deploy --only hosting --project artometrics-510519`

The game sizes any model to about 1.7 m tall and stands it on the ground. It faces forward along +Z (the normal glTF direction).
If the file has animations named something like `Idle`, `Walk` and `Run`, it uses them on its own. If it has no animations, the character slides and bobs.
Models from Quaternius, Mixamo-rigged exports from Blender, Ready-made TRELLIS/Meshy models and others all work. A rig with a bone named like `Hand.R` or `RightHand` holds the flashlight in that hand.

## Files
- `public/game.js` is the whole game: scene, lighting, flashlight, controls, story beats
- `public/characters/` holds the swappable characters plus `index.json`
- `public/tex/` holds the Poly Haven CC0 textures
- `public/vendor/` holds three.js r170 (MIT)

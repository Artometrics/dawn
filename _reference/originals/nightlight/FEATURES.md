# Nightlight — feature inventory

Original repo: `Artometrics/nightlight` (retired earlier on 13 Nov 2026; included here as a small-game backup). Git tip: `c5b73e7f26c2` on `main` (“Cap running on the stairs and inside the station room. (#9)”).

Live site was https://nightlight-510519.web.app (noindex), Firebase Hosting, project `artometrics-510519`.

**Stack:** static `public/` — vanilla JS + **vendored Three.js** (`public/vendor/build/three.module.js`) with GLTFLoader, EffectComposer, UnrealBloom, OutputPass. Web Audio (no audio files: rain, footsteps, moan, and clicks are oscillators / filtered noise). **Client-side only.** No backend, no paid service.

**Run:** serve `public/` over HTTP, e.g. `python3 -m http.server 8080 --directory public`.

The archive decision on this game was: *far-out horror toy; Kyle called out the flashlight game as an example that does not fold into Dawn.* It is here as a complete original, not as a required Dawn desk. If it is ever merged, it should stay a full 3D walk-around, not a stripped 2D mock.

---

## How to play (shipped)

Phone sideways, tap ▶, walk to the radio station. 🔦 toggles the light. Hold the small button (right mouse on desktop) to **focus** the beam. 🏃 runs. 👤 swaps characters, or the player can load their own `.glb`. The station **counts when you reach the radio desk inside the cabin**, not when you touch the door.

## Characters

`public/characters/`: `hana.glb`, `ranger.glb`, `robot.glb`, plus `index.json`. Picker on the start screen.

## World and story beats

A dark valley path up to a ridge, stairs, a cabin with a warm window, a radio mast and red light (non-interactive), then a modeled cabin interior (primitives: walls, wood floor, desk under the window, radio with amber dial, closed log book, kettle on a stove, chair). No readable text in the room.

Decided interactions (`README.md` and the modules under `public/`):

- Flashlight **range 28**. Focus is a **hold** that tightens and brightens the cone but still ends at 28.
- **Rim glow only while the beam covers the object.**
- **Only the cabin door is hold-to-open.** Sign, note, and window are tap/click. Prompts are hand-lettered words (read, look, open), not keycaps.
- Nothing usable fires on proximity except the **radio desk** (within 1.5 m inside the room, or “use” via the beam at 3.2 m). The finish line is “Hello? Is anyone receiving this? …Hello?” Walking up to the door does not finish the level.
- **Battery stays off** (no drain, no meter).
- Footsteps: gravel on the path and ridge, wood on the 12 stairs (z about −62 to −70), the porch, and the interior floor. Cadence follows walk 1.8 m/s / run 4.6 m/s. Silent when still or in the air. Filtered noise, no samples.
- **Stair flicker:** once per run at the top step (z −69.5) if the light is on: three dips over ~1.2 s. Reduced-motion: one smooth dim, no blackout. Silent. Tunable in `TUNING.flashlight.stairFlicker`. Debug key R only if `stairFlicker.debug` is set.
- **Distant moan** before subtitle line 2 (“Keep to the path…”) at z = −30: one 3 s positional metallic moan from up the valley (~x −22, y 9, z −72), ducks the rain 20%, once per play when z first passes −24. `TUNING.distantSound`. Checked by `tools/distant-sound-check.mjs`.
- **Window reveal:** the cabin lamp stays on the whole run; extra pines hide the window until you crest the last ridge (opens by about z −92). Checked by `tools/window-sightline-check.mjs`.
- Run is **capped on the stairs and inside the station room** (the tip commit).
- Modules also present: `dark-valley.js`, `pine-window-reveal.js`, `ridge-pine-gap.js`, `station-room.js`, `move-speed.js`, `distant-sound.js`, `game.js`.

Start screen and character picker are silent (rain and footsteps start after Play).

## Client vs backend

All client-side. Custom character upload is a local `.glb` file in the browser.

## What is not in this git tree (see NOTES)

The Drive working-tree zip also has a `box-copy/` with development screenshots, extra `.glb` / Kenney-style character kits (`3d/kb.zip`), `hana_concept.jpg`, and `nightlight-source.tgz`. Those were omitted here to keep the branch light; they are not required to run the shipped game.

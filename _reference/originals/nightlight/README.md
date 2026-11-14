# Nightlight — flashlight horror walk-around

**Play:** https://nightlight-510519.web.app
**Repo:** https://github.com/Artometrics/nightlight

## How to play
Turn phone sideways, tap ▶, and walk to the radio station. 🔦 toggles the light. Hold the small button to focus the beam. 🏃 runs, 👤 swaps characters (or load your own .glb). The station counts when you reach the radio desk inside the cabin.

Private, pre-launch build (noindex). Hosted on Firebase Hosting (project artometrics-510519).

## Decided

Flashlight and interact, this pass:

- **Range is 28** (it was 40). Alternative: keep 40 so the ridge and the station read in one sweep. 28 makes the last stretch something you search.
- **Focus is a hold.** Right mouse on a computer, a small hold button on a phone. The cone tightens and brightens; it still ends at 28. Alternative: a toggle, or a scroll-wheel zoom.
- **Rim glow only while the beam is on that object.** Wide or focused, the light has to cover it. Alternative: always-on outlines, or a glow just because you are nearby.
- **Only the cabin door is hold-to-open.** The sign, the note, and the window are a tap or a click. Alternative: hold for everything, or instant use with no hold.
- **Prompts are hand-lettered words** (read, look, open), not keycaps or icons. Alternative: "Press E", or a floating button glyph.
- **Nothing you can use fires on proximity, except the radio desk.** Walking up to the door does not finish the objective. Standing inside, within 1.5 m of the desk, does. Story lines still speak as you pass them. Alternative: the old auto-finish inside 9 m.
- **Battery stays off.** The light does not drain, and there is no meter. Alternative: a charge that punishes leaving the beam on.
- **The radio mast and the red light stay non-interactive for now.** No new trail notes until Kyle writes them.

Footsteps:

- **Gravel on the path and the ridge, wood on the stairs and the porch.** Soft crunch on the path and the ridge. A lower hollow knock, with a short resonant body, on the 12 stairs (z about -62 to -70) and the cabin porch. The surface is picked from where the player stands, using the stair and cabin geometry. Alternative: a flashlight flicker at the top step, the distant sound before line 2, or a window sightline reveal.
- **Filtered noise, no audio files.** Short Web Audio bursts, the same approach as the rain. No downloaded or generated audio files. Alternative: free sample packs.
- **One step per stride.** Cadence follows horizontal speed (walk 1.8 m/s, run 4.6 m/s). A slow walk is quieter. Standing still or in the air is silent. Pitch and gain vary a little each step. Alternative: a fixed-tempo loop.
- **After Play, on the rain audio path.** Footsteps start with the rain and stay silent on the start screen and the character picker. Alternative: a separate volume control.

Flashlight flicker:

- **Once per run, at the top step, and only if the light is on.** The first time the player's z passes -69.5 on the stairs (the same wood check as the footsteps), the beam dips. If the light is off at that moment, the beat is skipped for the run. Alternative: the bottom step, again on every climb, or waiting until the light is turned back on.
- **About 1.2 seconds, three dips, then full again.** Down to 25% for 0.18 s, to black for 0.12 s, and to 40% for 0.16 s. Each dip eases in and out over about 0.04 s, and the beam is back to full by 1.2 s. Never more than three dips a second. Alternative: one long fade to dark, or random noise.
- **The spotlight, the beam, and the flare dim together.** One multiplier on the spotlight intensity (on top of the shimmer), the beam cone, and the lens flare. Focus still tightens the beam, and interact still works through the dip. Alternative: dim only the spotlight.
- **Reduced motion is one smooth dim.** With prefers-reduced-motion, one dim to 35% and back over 1.0 s, and no blackout. Alternative: skip the beat.
- **No sound with it.** The flicker stays silent. The moan before line 2 is its own beat, earlier on the path. Alternative: an electrical buzz, or the existing click when the beam recovers.
- **The numbers live in TUNING.flashlight.stairFlicker.** z, duration, the three dips, and the reduced-motion dim. A debug key (R) can replay the dip, and it does nothing unless stairFlicker.debug is set.

Distant sound, before subtitle line 2 ("Keep to the path. Whatever that sound was, it wasn't the wind." at z = −30):

- **One slow, low, metallic moan from up the valley.** About 3 s. Two sines near 54 Hz, the second detuned by 16 cents, a quiet inharmonic triangle, and a band of filtered noise. The pitch glides down. It sits between a straining power line and something alive. Built from Web Audio oscillators and filtered noise, like the rain and the footsteps. No audio files. Alternative: a creature call, a transformer bang, or a radio static burst.
- **Once per play, the first time z passes −24.** A walk at 1.8 m/s covers the 6 m to the line at −30 in about 3.3 s, so the moan finishes a moment before that subtitle. Crossing back, or passing −24 again, does not replay it. If audio never started, that crossing is skipped for the play. Alternative: trigger on the line at −30.
- **Positional, ahead-left, quieter than the rain.** A PannerNode places it up the valley at about x −22, y 9, z −72 (ahead-left of the path at the trigger, roughly 55 m out). It starts under the rain and swells slightly. The rain gain ducks by 20% under it and recovers. Footsteps stay on the bus after that gain, so they do not duck. Alternative: non-positional.
- **After Play, same gate as the rain.** The context is created on the Play control, and the moan is scheduled only from the walk loop. There is no mute control. Reduced motion does not change the moan: it is already one slow swell, and the stair flicker remains the only reduced-motion branch.
- **The numbers live in `TUNING.distantSound`.** z, duration, pitch, detune, gain, duck, plus the valley position, rolloff, swell, and pitch drop. Checked with `node tools/distant-sound-check.mjs`.

Window reveal:

- **The warm window stays lit; pines hide it until you crest the last ridge.** The cabin lamp and glass stay on for the whole run. Four extra instanced pines (same model as the forest, seed 7) block the camera sightline to the window centre while path sample z is above −88, and the line opens by about z −92. Checked with `node tools/window-sightline-check.mjs` (and `window.__game.checkWindowSightline()` in the browser with `DEBUG_WINDOW_SIGHTLINE` off by default). Alternative: dim the window until z = −90; thicker fog toward the cabin; hiding the cabin with terrain; revealing exactly at −96; revealing at the top step.
- **Only existing pine instances move the sightline.** Placement tweaks live in `public/pine-window-reveal.js`; the walkable corridor (~5.5 m from the path centreline) and the stairs (z about −62 to −70) stay clear. Alternative: toggling window mesh visibility (rejected — light must never switch off).

Cabin interior:

- **The door opens onto the room.** Hold-to-open still swings the door. It does not finish the level. You walk through the doorway. Before it opens, the doorway stays shut. Alternative: keep the finish on the latch.
- **The finish is the radio desk.** Inside the room, within 1.5 m of the desk (horizontal), or use the radio (beam, 3.2 m, the word "use"). The line is still "Hello? Is anyone receiving this? …Hello?". The porch side of the window does not count. Alternative: a switch on the mast.
- **The room is primitives only.** Thin walls on the old footprint, a wood floor, a desk under the window, a radio with an amber dial, a closed log book, a kettle on a stove, and a chair. No readable text. No new models or textures.
- **The outside is the same cabin.** Same roof, window glow, bulb, mast, and red light. The sightline check still hides the window until the last ridge.
- **No new sound or story text.** Battery stays off. Wood footsteps carry onto the interior floor. The only new interactable is the radio.

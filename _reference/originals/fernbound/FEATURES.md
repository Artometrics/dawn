# Fernbound — feature inventory

There was **no GitHub repo**. The archived source is the Firebase Hosting export of a **Godot 4.7** HTML5 build (`GL Compatibility`, no threads). Live site was https://fernbound-510519.web.app (noindex).

**Important:** this backup is a compiled web export (`index.js` + `index.pck` + `index.wasm`), not an editable Godot project (no `project.godot`, no `.gd` source). A merger can iframe or re-skin the export, but changing gameplay requires either decompiling the pck or finding a project tree that was never archived here.

Dawn PR #40 already embeds the same export at `public/play/fernbound/` and shows it in an iframe after “Open the field.” A “full merger” is not about missing maps — the game already plays — it is about wrapping it in Dawn’s design language (title, pause, mobile chrome) and about being honest that **editable source is missing**.

The archive blurb said “hunt real monsters and spirits from history near you” (Pokémon-style, near you). **The shipped export is not a GPS / AR / “near you” game.** There is no geolocation string in the pck. It is an original 2D wildkin-binding story set on a made-up map, The Fern Marches. Treat “near you / historical spirits” as product vision, not as a feature present in this build.

**Stack:** Godot 4.7 web export, canvas, Web Audio worklets, Firebase Hosting. **Client-side only.** No backend, no paid service. SharedArrayBuffer / cross-origin isolation is off (`ensureCrossOriginIsolationHeaders: false`). `experimentalVK: true`.

**Run a complete copy:** you need `public/index.wasm` (37.7 MB), which is omitted here for size. Use either:

- the copy already on `main`: `public/play/fernbound/index.wasm` (SHA256 `fc74679e3b97f76878947fcd4fbe1268cbfa6188182a2e33bbc3f5dc9bfa57d0`, byte-identical to this backup), or
- `fernbound-working-tree.zip` in Drive (see NOTES.md).

Then serve the folder over HTTP.

---

## Game structure (from the pck)

Project name **Fernbound**. Description: “An original wildkin-binding story.” Main scene: `scenes/title.tscn`. Autoloads: `Game`, `Audio`, `Touch`.

Scenes / scripts (compiled, names only):

- `scenes/title.tscn` + `scripts/title.gd`
- `scenes/overworld.tscn` + `scripts/overworld.gd`
- `scenes/battle.tscn` + `scripts/battle.gd`
- `scenes/win.tscn` + `scripts/win.gd` / `scripts/credits.gd`
- `scripts/dialog_box.gd`, `scripts/ui_factory.gd`
- `scripts/data/database.gd` — **species, moves, trainers, items live here as compiled GDScript, not as a readable JSON roster.** The species list could not be extracted as text from this backup.
- `data/maps.json` — maps, warps, NPCs, encounter tiles (extracted below).

Audio: catch stingers (`assets/audio/catch.ogg`, `assets/sfx/catch.ogg`), town / gym / cave music tracks referenced from maps. Touch helper implies a mobile-first control scheme. Overworld sign text: “Speak with A. Run with care.”

---

## Maps and NPCs (`data/maps.json`)

Tile size 16 px.

| Id | Name | Size | Music | Role |
| --- | --- | --- | --- | --- |
| `world` | The Fern Marches | 64×30 | town | Overworld. Spawn (8,7). Tall-grass encounter tiles (`enc`). |
| `lab` | Elowen’s Study | 13×10 | town | Starter / partner choice. Warp from world (8,6). |
| `rest` | Rest House | 16×? | town | Heal party. Warp from world (16,6). |
| `gym` | Trial Gym | 15×11 | gym | Gym battle. Warp from world (49,6). |
| `cave` | Echo Hollow | 22×16 | cave | Harder wild encounters. Warp from world (26,8). |

### Warps (world)

- (8,6) → lab (6,7)
- (16,6) → rest (6,7)
- (49,6) → gym (7,8)
- (26,8) → cave (10,13)

Each interior warps back to the tile below its world entrance.

### People and dialogue

- **Nia** (world, 11,18) — gift NPC. “The grass east of town shivers when a wildkin is close.” Gives **5 capture orbs** once (`gift_flag: nia_orbs`).
- **Sign, FERN PATH** — “Tall grass hides wildkin. Speak with A. Run with care.”
- **Scout Mara** (world, 30,16) — **trainer** `mara`. Blocks the path until you beat her. After: “Bram at the east gate is stricter. Heal at the Rest House before you test him.”
- **Sign, BRAMBLEHOLD** — “Trial Gym of Warden Bram. Echo Hollow lies back west, off the path.”
- **Calder** (world, 52,18) — “Bram will not open the gate for a binder with fainted kin. Lumen, back in Mossgate, never charges for a rest.”
- **Elowen** (lab) — kind `professor`. “The marches can wait. Choose a partner first.” (starter selection happens in this room; the actual partner species are inside compiled `database.gd`.)
- **Lumen** (Rest House) — kind `healer`. Fully heals the party. “Your kin look windblown. Sit. I will see to them.” After: “There. Steady steps, binder.”
- **Warden Bram** (Trial Gym) — kind `gym`, trainer `bram`. “If your kin trust you, prove it.” After victory: “The gate is yours. Walk gently. The Fern Marches are listening.”
- **Ivo** (Echo Hollow) — gift. “The hollow echoes. Stronger kin nest in the moss.” Gives **2 super (orbs/items)** once (`gift_flag: ivo_gift`).

### Loop (reconstructed)

1. Title → overworld (Mossgate / The Fern Marches).
2. Enter Elowen’s Study and choose a partner wildkin before the marches “can wait.”
3. Get capture orbs from Nia. Walk tall grass for wild encounters (battle scene: fight / bind-with-orb / run — exact move list is in compiled code).
4. Heal at Lumen’s Rest House (free).
5. Beat Scout Mara to clear the eastern path.
6. Optional: Echo Hollow for stronger kin; Ivo’s super items.
7. Challenge Warden Bram at Bramblehold Trial Gym.
8. Win scene / credits.

Items visible in map data: **capture orbs**, **super** (likely a stronger orb or battle item). Party faint rules are implied by Calder’s line.

---

## Client vs backend

All client-side. No accounts, no map API, no in-app purchases in this export.

## What a full Dawn merger should do

The playable game is already on `/fernbound` via iframe. A fuller merger would:

- Frame it with Dawn chrome (loading, rotate-to-play, touch captions) instead of a blank “Open the field” button.
- Not claim GPS / historical-spirit hunting unless that design is built later (it is not in this backup).
- If gameplay must change, locate or reconstruct the Godot project — it is not in this Drive package.

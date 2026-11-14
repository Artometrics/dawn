# Dilemma (kylesmcauliffe/dawn) — feature inventory

Original repo: `kylesmcauliffe/dawn` (deleted 13 Nov 2026 after a verified Drive backup). This is **not** `Artometrics/dawn`. It is the earlier web-first prisoner’s-dilemma village, later folded into Dawn’s `/games` desk.

Git tip restored here: `4675a0fa0d2b` on `main` (“Fix Netlify build paths”).

**Stack:** React + Vite + TypeScript, **Phaser 3** world (`DawnScene`), Zustand store, Netlify (`netlify.toml` builds `web/` to `web/dist`). **Entirely client-side.** No backend, no paid service.

**Run:** `cd web && npm install && npm run dev`.

---

## What the original does

One screen, three panels plus the Phaser canvas:

1. **Game world (`GameCanvas` / `DawnScene`)** — a 2200×1400 roaming field, camera viewport 980×720. Seven named agents walk, collide, and enter encounters. During an encounter they face each other, show cooperate/defect bubbles, then resume roaming after a cooldown. Seeded RNG (`mulberry32`, default seed 7) so a reset is deterministic for a given seed.
2. **Controls (`ControlsPanel`)** — Pause / Resume sim, Reset world, speed chips **0.5× / 1× / 1.5× / 2× / 3×**. Copy: “Agents roam continuously, resolve prisoner’s dilemma encounters in-browser, and update the standings with no backend.”
3. **Standings (`StandingsPanel`)** — live scores by strategy, colored to match the agents.
4. **Event feed (`EventFeed`)** — a running log of encounter results.

### Strategies (`web/src/simulation/strategies.ts`)

| Key | Color | Rule |
| --- | --- | --- |
| TitForTat | `#72A8F8` | Copy opponent’s last move; start C |
| Grudger | `#B877F4` | C until the opponent has ever defected, then always D |
| Pavlov | `#F0B75E` | Win-stay, lose-shift (payoff ≥ 3 keeps the last move) |
| AlwaysDefect | `#EF7C72` | Always D |
| AlwaysCooperate | `#78D391` | Always C |
| GenerousTitForTat | `#7AD5D0` | Tit-for-tat, but forgive a defection with p = 0.15 |
| Random | `#C8CDD7` | 50 / 50 |

Payoff matrix: CC 3–3, CD 0–5, DC 5–0, DD 1–1.

Agent modes: `roaming` | `interacting` | `cooldown`. One agent per strategy in the default constructor (seven walkers).

Engine file: `web/src/simulation/engine.ts` (`BrowserSimulation`). Store: `web/src/state/useSimulationStore.ts`.

---

## What Dawn’s `/games` desk already has, and what a full merger still owes

Dawn’s Dilemma view (`src/components/desks/games-desk.tsx` + `src/lib/games/dilemma`) reimplements the simulation and paints it on a **2D canvas**, not Phaser. A full merger should restore (or honestly replace) the original presentation:

- Phaser scene: facing, bubbles, encounter staging, camera over a larger world (2200×1400), not a small desk canvas.
- The three-panel layout (controls, standings, event feed) with the original typography and colors.
- Speed control, pause, and deterministic reset (seed 7).
- All seven strategies and the same payoff / Generous-TFT probability.

The `/games` desk also has a **Towers** tab. That rules sketch was ported from Pantheon; the original 3D courtyard still lives in the **live** `Artometrics/pantheon` repo and was deliberately not retired. Do not delete or copy all of Pantheon into this branch. If Towers needs a full 3D merger, use that repo, not this one.

---

## History note

The git history still lists a long series of “Delete sN - …rar” commits from an older desktop prototype (camera, soil, rain, trader, harvest, etc.) that were removed before the web-first rewrite (`d8c5177`). Those `.rar` assets are **not** in this working tree. The playable original is the Phaser web app only.

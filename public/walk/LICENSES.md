# Walk sprite licenses

All sprite art in `public/walk/sprites/` is cut (16×16 or 24×24 tiles, unmodified pixels) from the packs below.
All are released under **Creative Commons Zero (CC0 1.0 Universal)** — public domain dedication,
free for personal, educational and commercial use; attribution not required (credit given anyway).

| Pack | Version | Author | Source | License | Downloaded |
|---|---|---|---|---|---|
| Tiny Dungeon | 1.0 | Kenney (www.kenney.nl) | https://kenney.nl/assets/tiny-dungeon | CC0 1.0 — https://creativecommons.org/publicdomain/zero/1.0/ | 2026-10-25 |
| Pixel Platformer | 1.2 | Kenney (www.kenney.nl) | https://kenney.nl/assets/pixel-platformer | CC0 1.0 — https://creativecommons.org/publicdomain/zero/1.0/ | 2026-10-25 (v0.4) |
| Tiny Town | 1.1 | Kenney (www.kenney.nl) | https://kenney.nl/assets/tiny-town | CC0 1.0 — https://creativecommons.org/publicdomain/zero/1.0/ | 2026-10-25 |

License verification: each source page states "Creative Commons CC0", and the License.txt shipped
inside each zip reads "License: (Creative Commons Zero, CC0)". Copies: `public/walk/kenney/*-License.txt`.

## Sprite → source tile map
- Tiny Dungeon (`tilemap_packed.png`, index = row×12+col): heroes 84–88, 96–100, 111, 112;
  monsters 108–110, 120–123; potions 114–116; shelf 63; tombstone 65; chests 89, 91, 92; shields 102; sword 104; knight 97.
- Tiny Town (`tilemap_packed.png`): tree 4, sign 83, coin 93, beehive 94, bomb 105, log 106, pot 107, key 117.

- Pixel Platformer (`Tilemap/tilemap-characters_packed.png`, 24×24, index = row×9+col), added in v0.4 for real 2-frame walk cycles:
  `hero_stargreen` + `walk_stargreen` = tiles 0–1, `hero_starblue`/`walk_starblue` = 2–3, `hero_starpink`/`walk_starpink` = 4–5,
  `hero_stargold`/`walk_stargold` = 6–7, `hero_startan`/`walk_startan` = 9–10. `walk_*.png` = the two frames side by side (48×24); `hero_*.png` = frame 1.
  License copy: `public/walk/kenney/pixel-platformer-License.txt` ("License: (Creative Commons Zero, CC0)"; source page states "Creative Commons CC0").

## Other (not bundled)
- Map tiles: OpenFreeMap "liberty" style, © OpenStreetMap contributors (ODbL) — attribution shown on the map.
- Quest places and landmark bosses are read in the browser from the same OpenFreeMap vector tiles (OpenMapTiles `poi` layer, © OpenMapTiles, data © OpenStreetMap contributors, ODbL).
- Curated offline landmark seeds (names and approximate coordinates for San Francisco, Stanford, and Palo Alto) are facts typed by hand.
- MapLibre GL JS (BSD-3-Clause) is bundled with Dawn. It loads only on `/walk`.

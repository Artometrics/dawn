# Atlas

A map of real places with Dawn's pixel character on it. Cardinal (Stanford, from Kyle's Cardinal book and podcast) is the first region. Plan, IN and OUT lists, and mockups: `docs/atlas/`.

Routes: `/` is Dawn's home and `/atlas` is the same screen (static, no sign-in). Both render `AtlasHome` (`src/components/home/atlas-home.tsx`), which wraps `AtlasApp` with `framed="home"` and the Dawn sidebar (`dawn-drawer.tsx`). The menu button at the top left opens the sidebar. `/atlas?embed=1` hides it. The village drawer renders the same `AtlasApp` with `framed="shell"`. The old 8-bit home is `/town`.

## Layout

```
data/cardinal/       the region: stops, routes, threads, events, catalog (locations.json), SOURCES.md
lib/                 pure TypeScript, no React, tested with node:test
  types.ts           Stop, CatalogPlace, Route, Thread, AtlasPlace, Region
  basemap-spec.ts    the baked frame and units (shared with the bake script)
  basemap.ts         decode the baked file
  geo.ts             local projection, distances, polyline helpers
  places.ts          join stops with catalog places, search
  progress.ts        XP, ranks, eras, quiz, daily hunt, unlock (Cardinal Quest's rules, unchanged)
  tour.ts            route legs, walking time, spoken lines
  viewport.ts        camera maths: fit, zoom, pan, clamp
  labels.ts          pill or dot for each marker so pills never overlap
components/          React
  atlas-app.tsx      state and layout (side panel on wide, bottom sheet on narrow)
  map-view.tsx       canvas basemap, SVG route overlay, marker buttons, gestures
  place-views.tsx, tour-views.tsx, story-you-views.tsx   the panel
  use-*.ts, speech.ts   storage, basemap fetch, walker, device speech
regions.ts           the region registry
```

## Data

`scripts/atlas-import-cardinal.mjs --src <cardinal-quest checkout>` rebuilds `data/cardinal/` and fails if any value differs from the source. Nothing in the story text is new.

`scripts/atlas-bake-basemap.mjs --cache <dir> [--fetch]` turns one Overpass extract into `public/maps/atlas/cardinal-basemap.json` (OpenStreetMap, ODbL; the file names its source and licence). Run it again to refresh the map.

## Adding a region

Add `data/<region>/` with the same files, bake its basemap, export a `Region` from its `index.ts`, and list it in `regions.ts`. A region carries its own frame, so no other code changes.

## Tests

- `npm run test:app` runs the unit tests (`data/cardinal/cardinal.test.ts`, `lib/*.test.ts`) and `atlas.browser.test.ts` (needs `npm run build` first and Chrome).
- `atlas-home.browser.test.ts` loads `/` at 390x844 and 1280x800, checks the map, and opens and closes the sidebar (button, scrim tap, swipe, Escape).
- `node scripts/atlas-shots.mjs [dir]` writes the screenshots at 1440x900 and 390x844. `node scripts/atlas-home-shots.mjs [dir] [--root out] [--label after]` writes full-page shots of `/` with the sidebar shut and open.

## Rules this module keeps

- No API keys, no third-party requests, no new server path. Everything it fetches is a static file from the same host.
- Progress lives in `localStorage` (`dawn.atlas.cardinal.v2`) and falls back to memory when storage is blocked.
- Location is optional, stays on the device, and only unlocks a stop within 60 m.
- Neon is for the drawing only: the walked path, the live zone, the next leg.

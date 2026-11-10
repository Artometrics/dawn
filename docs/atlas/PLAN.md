# Atlas: the map that lives in Dawn

Status: plan, committed before the build. Mockups are in `docs/atlas/mockups/`.

## Why

Cardinal Quest was a separate site (`Artometrics/cardinal-quest`, commit `ff16ac4`): a Stanford map game with 27 story cards, 24 sourced places, five walking tours, and the story threads from Kyle's Cardinal book and podcast. Kyle wants every map and place feature in Dawn so that site can be retired. Dawn already has an `/atlas`, but it holds a 50-name place list with "Cardinal note coming soon" on every stop. This plan replaces that with the real content and a real map.

## The vision

Atlas is Dawn's map of real places, in the grain of Google Maps or a Japan travel app, with Dawn's 8-bit/16-bit character as the person on it. A region is a folder of data: places with a story, sources for every claim, and tours you can walk. Cardinal (Stanford, the Stanfords, the farm, the founding, the campus) is the first region. Others come later, one folder each.

## Where it belongs

Dawn is a static export (`output: "export"`). `/atlas` already exists, is already in `SITE_NAV`, is already a hotspot ("Atlas") on the town map at `/`, and is already a section in the village drawer. So Atlas stays at `/atlas` and does not get a new door.

- **Opening view.** `/` stays the Town. Atlas becomes the first stop out of it: the first chip on the town sheet, the first link after Town in the site nav, and a clearer Atlas building on the town map.
- **`/atlas` opens on Cardinal.** The first thing you see is the Stanford campus with the Founders' Walk drawn on it and the pixel character standing at the first stop.
- **Same component everywhere.** `/atlas`, `/atlas?embed=1`, and the village drawer's Atlas section all render one `AtlasApp`.
- **Self-contained.** Everything new is in `src/features/atlas/`. The shell gets a route swap, a nav entry, and a chip.

## IN

Content (ported, not rewritten):

- 27 story stops: card text, key facts, years, every source link, the quiz question and answers, the coordinate source, and the release each was added in.
- 24 catalog places from `data/locations.json`, with OpenStreetMap ids, book scenes, podcast segments, notes and flags. HP Garage stays exterior-only and private. The Google garage has no pin. The Memorial Arch site and the Applied Electronics Laboratory have no point yet and say so. The creek is a line, not a pin.
- The 64 m Encina Hall mismatch between the stop marker and the catalog point, flagged in the app and in the data notes.
- 5 routes as walkable tours: The Founders' Walk, Big Game Day, The 1906 Earthquake Walk, The Farm & the Presidents, One Piece of Land. Real foot-routing lines, distances, the six spoken bridge lines and outro of One Piece of Land, its El Palo Alto prologue, and the Hanna House side quest.
- 5 book threads (with facts and sources) and the 10-event timeline.
- Cardinal Quest's research notes, corrections and open questions, kept as `SOURCES.md` beside the data.

Map and place experience:

- A flat night map of the campus drawn from OpenStreetMap data baked into one static file: roads, paths, buildings, lake, creek, rail, green. Charcoal ground, lighter roads, neon only for the walked path, the live zone and the next leg (`DESIGN.md`). "© OpenStreetMap contributors (ODbL)" is on the map and links to the copyright page.
- Pan, pinch, wheel and button zoom, recenter, search, filter chips, labels that fade out when zoomed out.
- A place panel: story, key facts, sources, quiz, "in the Cardinal story" thread links, catalog notes and flags, OpenStreetMap link. No photos, because none are licensed.
- Routes as tours: pick a tour, see its line and stops, press Walk, and the pixel character walks the line to the next stop and opens its card. Prologue, bridges, outro and side quest play in order. "Listen" uses the device's own speech.
- Progress in `localStorage` only: unlocked stops, quiz answers, finished tours and threads, era stamps, XP and rank, and the daily hunt with its streak.
- Unlock by walking the tour, by tapping a stop, or, if you allow location, by standing within 60 m. Location stays on the device.
- The existing "Here" layer (your location on OpenStreetMap tiles) stays as a chip.
- A region registry, so a second region is another data folder, not another code path.

Platform:

- The route is a static page with no sign-in. No new API, no new auth-guarded path. `deploy/Caddyfile` already serves `/atlas`, `/atlas/*` and `/maps/*` as public static files.
- Unit tests for data and logic, browser tests at 1440x900 and 390x844, and a screenshot script.

## OUT

- Live third-party services: Google Maps, Mapbox, routing or geocoding APIs, live tile servers (beyond the existing optional Here layer, unchanged), analytics, fonts from a CDN.
- Accounts beyond what Dawn already has. No sign-in for Atlas, and no sync of progress across devices.
- Paid APIs and AI: no model calls, no generated narration, no generated images.
- Photos. None are licensed. They can be added later with a licence field per image.
- Podcast audio and book text. The app cites episode and scene names and shows only the sourced facts already in the cards.
- Offline install (a service worker), other regions, user-made places, turn-by-turn navigation, live transit, indoor maps, multiplayer.
- Deleting or changing the `cardinal-quest` repo.
- Deploying. Kyle merges and deploys.

## Data

```
src/features/atlas/data/cardinal/
  locations.json   verbatim copy of cardinal-quest data/locations.json
  stops.json       27 stops (from public/data.js plus the coord source from tools/landmarks.py)
  routes.json      5 routes with their walking lines
  threads.json     5 threads and the daily-hunt note
  events.json      10 timeline events
  SOURCES.md       research notes, corrections, open questions (generated by cardinal-quest build.py)
public/maps/atlas/cardinal-basemap.json   baked OSM basemap
scripts/atlas-import-cardinal.mjs         re-runnable port; fails if anything differs from the source
scripts/atlas-bake-basemap.mjs            Overpass to compact JSON, one build-time call
```

Two datasets, one model. A catalog place is a sourced point with flags. A stop is a story card. Twelve stops link to a catalog place, and the app joins them. Stop coordinates are not changed. A place never gets a map pin when the data says no pin.

Licensing: map data is OpenStreetMap, ODbL. The baked file names its source and licence in its own metadata. Story text and quizzes are Cardinal Quest's own, with the source links kept on every card. Wikipedia appears only as a link, marked secondary.

## Screens

Desktop (1440x900): a 420px side panel on the left (search, chips, list, then the place, tour or progress view) and the map filling the rest, with the round controls and attribution on the map. Mobile (390x844): the full-bleed map with a floating search and round controls, and a draggable bottom sheet that snaps to 26%, 46% and 78%. All targets are at least 44px. No horizontal scroll at 390px.

## Tests

- Unit (`node --test`): the data (counts, links, flags, sources, bounds), the join, geometry, progress and XP, ranks, eras, tours, the daily hunt, the basemap file.
- Browser (`playwright-core` against `out/`): `/atlas` opens on Cardinal at both sizes, a place opens, a tour walks, progress survives a reload, no horizontal overflow, no failed requests.
- `scripts/atlas-shots.mjs` writes the screenshots reviewed in the PR.
- Existing `npm test`, lint, and the build stay green.

## Retiring Cardinal Quest

Ported: all data and story content, tours, threads, timeline, quizzes, hunt, ranks, listening, GPS unlock. Not ported: the offline service worker, the MapLibre and OpenFreeMap tiles (replaced by the baked map), and the red intro screen. When Kyle is happy, the Cardinal Quest site can be taken down; its repo can stay as the record.

## Open points

- Atlas as the opening view is a call for Kyle. This plan makes it the first stop from `/`. Changing `/` itself is a one-line route swap.
- Book-part mapping on each thread is still marked "draft mapping", as in the source.
- The Apify/Google-Maps place list in `data/atlas/stanford-places.json` is no longer read. It is left in place for Kyle to decide.

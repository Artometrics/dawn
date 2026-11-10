# Third-party notices

Dawn Agents references are in `THIRD_PARTY.md`. No source from Open WebUI, OpenHands, or Argilla is included.

## a16z AI Town

Conversation prompts, the memory importance question, the reflection prompt, and the
agent loop (wander or do an activity, invite someone nearby, talk, then remember)
are adapted from AI Town.

https://github.com/a16z-infra/ai-town

```
MIT License

Copyright (c) 2023 a16z-infra

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

Dawn does not include Convex, OpenAI, or AI Town's Pixi renderer. Gemini is called
through Firebase AI Logic. Memories are stored in Firestore.

## Stanford Generative Agents

The memory stream, importance score, and reflection step follow the pattern in
Generative Agents (Park et al.). No code from that repository is included.

https://github.com/joonspk-research/generative_agents

## Kenney Tiny Dungeon

Tiles in `public/tiles/` are from Kenney's Tiny Dungeon pack, CC0.

https://kenney.nl/assets/tiny-dungeon

## OpenStreetMap

The Here layer uses Leaflet and OpenStreetMap tiles. © OpenStreetMap contributors.

The Atlas basemap (`public/maps/atlas/cardinal-basemap.json`) is drawn from OpenStreetMap data fetched once at build time with `scripts/atlas-bake-basemap.mjs`. It is a simplified derivative of the Overpass extract, shared under the Open Database License (ODbL 1.0). © OpenStreetMap contributors. https://www.openstreetmap.org/copyright. The file names its source and licence in its own `meta`, and the map shows the credit and an ODbL link.

## Cardinal Quest

The Atlas stories, quizzes, sources, tours and place notes in `src/features/atlas/data/cardinal/` are ported from Kyle's own `Artometrics/cardinal-quest` repository (commit ff16ac4) by `scripts/atlas-import-cardinal.mjs`. Source links stay on every card. Wikipedia links are marked secondary.

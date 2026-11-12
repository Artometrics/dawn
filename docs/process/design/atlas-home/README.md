# Atlas home, before and after

`/` used to open the 8-bit Dawn Town map. It now opens the Atlas map on Cardinal, and the top-left button opens the Dawn sidebar. The town moved to `/town`; the village is still at `/village`.

Regenerate with `npm run build && node scripts/atlas-home-shots.mjs docs/process/design/atlas-home --label after`. The "before" shots came from a build of `main` at 106dafd (`--root <that out> --label before`).

| | 390px phone | 1280px desktop |
|---|---|---|
| Before, shut | `before-390-closed.png` | `before-1280-closed.png` |
| Before, menu open | `before-390-sidebar-open.png` | `before-1280-sidebar-open.png` |
| After, shut | `after-390-closed.png` | `after-1280-closed.png` |
| After, sidebar open | `after-390-sidebar-open.png` | `after-1280-sidebar-open.png` |

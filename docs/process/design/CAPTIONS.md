# Before and after screenshots

Every route in the static export, header to footer, at desktop (1440px wide) and phone (390px wide).
Files are `before/<route>-desktop.png`, `before/<route>-mobile.png` and the same under `after/`.
Route names match `scripts/lib/routes.mjs`. Pages that scroll inside a fixed screen (town map, village,
atlas, studio) can only be captured as one screen, so those shots are the first viewport, not the whole
page. Everything else is full length.

The style guide with the final palette, buttons, cards, headers, type scale and all pages side by side is
`STYLE_GUIDE.png` (and `STYLE_GUIDE.html`). Contact sheets at full resolution:
`CONTACT_SHEET_before_desktop.png`, `CONTACT_SHEET_after_desktop.png`, `CONTACT_SHEET_before_mobile.png`,
`CONTACT_SHEET_after_mobile.png`.

"Before" is `main` at the start of this work. "After" is this branch. Same browser, same machine, same
static server.

## Slide line

Five different looks became one. The pages kept the pixel town and the existing art, and now share one
set of colours, one button shape, one header and one type scale.

## Captions

| Route | Before | After |
| --- | --- | --- |
| `/` Town map | Map pinned to the left at about 630px on flat green. Glassy blue controls. | Map centred. Dark capsule controls, clay for the selected state, forest border. |
| `/agents` Agents drawer | Same left-pinned map; the drawer slid the map half off screen on desktop. | Drawer sits beside the map and the map re-centres in the space left. |
| `/village` Village | Warm night shell. Already close to the target. | Same shell, now from shared tokens. Tap targets 44px. |
| `/atlas` Atlas | Charcoal map with 36px filter chips. | Same map. Chips are 44px on phones. |
| `/studio` Studio | Espresso theme, white text, clay buttons, 9 to 11px labels. | Same layout in the Dawn palette. Primary actions are the warm-white pill. Smallest text is 12px. |
| `/editor` Code editor | Navy and electric blue, default serif body text. | Dawn shell. Honest "not connected" status instead of a host name. |
| `/projects` Projects | Navy and blue form on a blank page. | Dawn shell, empty state with the player sprite. |
| `/artifacts` Style recipes | Navy page, tiny low-contrast labels. | Dawn shell. The poster specimens are untouched art. |
| `/letter` Letter | Navy page. Crashed on a failed fetch. | Dawn shell, empty state with the letter carrier, no crash. |
| `/credits` Credits | Navy tables, page scrolled sideways on phones. | Dawn shell, tables scroll inside their own frame, no sideways page scroll. |
| `/desk` Bot desk | Navy cards and blue buttons. Buttons gave no clear answer offline. | Dawn shell. Buttons say plainly that the static site has no bot runtime. |
| `/kits` and `/kits/*` | Navy, full-width blue buttons. | Dawn shell. Plan is muted, build has a clay border. One primary per page. |
| `/preview` and `/preview/*` | Brown and gold, its own header. | Dawn shell and header, with a "Demo, agents off" badge. |
| `/preview/style-guide` | Did not exist. | New review page that shows the tokens and components. |
| `/chats` (404) | Plain 404 with no way back. | Branded 404 with the page list and a note that there is no Chats page. |

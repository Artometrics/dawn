# Forge, before and after

Full-page screenshots (header to footer) of Forge, the Character Maker at `/village/?section=characters`,
in every state, at desktop (1440x900), phone portrait (390x844) and phone landscape (844x390).

- `before/<state>-<desktop|mobile|landscape>.png` is `main` at commit `e5fc579`, before this pass.
- `after/<state>-<desktop|mobile|landscape>.png` is this branch.
- `COMPARE_roster_desktop.png`, `COMPARE_roster_mobile.png`, `COMPARE_empty_landscape.png` put before and
  after side by side.

The shell of this app is a fixed-height screen with an inner scroll area, so the shots let that screen grow to
the height of its content without changing the window size. Width and height media queries therefore answer
the way they do for a visitor. Pages that cannot grow (the open menu drawer, the You panel, the village
canvas, the agent sheet) are one screen.

Same browser, same machine, same static server, same script: `scripts/forge-audit.mjs`. The 3D view is
drawn with software WebGL (SwiftShader) in headless Chrome, so it looks the same in both folders.

## States

| State | What it shows |
| --- | --- |
| `empty` | First visit. Joan of Arc loaded, roster empty. |
| `editing` | Napoleon preset, new face, outfit and accessory, a very long epithet. |
| `posing` | Guard pose, skeleton on, turntable off, brush texture on. |
| `error-name` | Name field cleared. The reason is shown and Save is disabled. |
| `saving` | The "Saving..." state while the portrait and village sprite are drawn (CPU slowed so it can be photographed). |
| `saved` | Saved to the roster. |
| `exporting` | JSON, PNG and glTF exported. |
| `error-import` | A JSON file with an unknown hair style is refused and the draft is kept. |
| `roster` | Two saved characters, one given to Trinity. |
| `menu-drawer` | The Dawn menu open (phone widths). On desktop the menu is docked and always shown. |
| `you-panel` | The You panel open. |
| `village` | The village, drawing Trinity as the saved character. One screen. |
| `agent-sheet` | Trinity's sheet, opened from the village. One screen. |
| `error-no3d` | A browser without WebGL. |
| `error-storage` | The phone refuses to store the roster. |
| `roster-full` | Twelve characters saved, the limit. |

## What changed, by picture

| State | Before | After |
| --- | --- | --- |
| `empty` desktop | Docked menu, stage left, controls right. Chips 36px. Search field and duplicate "Credits & licenses" at the bottom. | Same layout. No inert Search field, no duplicate credits link. The roster empty state uses the shared empty-state component. |
| `empty` mobile | Stage scrolls away as soon as you start choosing parts. Pose and choice chips stretch into two columns. | Stage is pinned at the top while the controls scroll under it. Chips keep their own width. |
| `empty` landscape | 280px docked menu leaves a 128x300 3D view. | Menu is a drawer, the 3D view is 408x220 next to the controls. |
| `roster` mobile | The remove button is a full-width bar, "Avatar for" is squashed. | Remove is a 44px icon button at the end of the row. |
| `error-*` | Small clay text with no container. A failed save said both "in your roster" and "no room left". | Alerts are the shared alert box. A failed save only reports the failure. |
| `error-no3d` | Console error from three.js. "Your characters still save", which was not true. | A plain message that says what still works. No console error. |
| `menu-drawer` landscape | Not reachable. | Scrolls inside the window, so the account row is not cut off. |

The character render is unchanged. A portrait and a village sprite saved from the `before` build and from
the `after` build for Napoleon Bonaparte and Sun Tzu have identical bytes (SHA-1 compared).

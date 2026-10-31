---
name: Dawn
description: A calm night list for quests, the village, and the campus walk.
colors:
  clay: "#d97746"
  night: "#0e0e0c"
  raised: "#171715"
  field: "#1c1c1a"
  chip: "#2a2a27"
  sheet: "#121211"
  warm-paper: "#f3f1ec"
  warm-grey: "#c4bdb3"
  muted: "#8f887f"
  placeholder: "#a8a199"
  pill: "#f7f4ef"
  ink: "#141210"
  marker: "#1a3358"
  map: "#161816"
  road: "#3a413c"
  path: "#ff7a2f"
  zone: "#3ee08a"
  next: "#4cb7ff"
  grip: "#3a3834"
  place-dot: "#5c6560"
typography:
  display:
    fontFamily: "\"Source Serif 4\", \"Iowan Old Style\", Palatino, serif"
    fontSize: "34px"
    fontWeight: 560
    lineHeight: 1
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Geist, \"Geist Fallback\", sans-serif"
    fontSize: "17px"
    fontWeight: 600
    letterSpacing: "normal"
  body:
    fontFamily: "Geist, \"Geist Fallback\", sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.25
    letterSpacing: "normal"
  label:
    fontFamily: "Geist, \"Geist Fallback\", sans-serif"
    fontSize: "13px"
    fontWeight: 400
    letterSpacing: "normal"
rounded:
  full: "999px"
  sheet: "22px"
  panel: "18px"
  row: "14px"
  tile: "10px"
  marker: "8px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  section: "24px"
components:
  wordmark:
    textColor: "{colors.warm-paper}"
    typography: "{typography.display}"
  button-primary:
    backgroundColor: "{colors.pill}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "0 16px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.chip}"
    textColor: "{colors.warm-paper}"
    rounded: "{rounded.full}"
    padding: "0 16px"
    height: "44px"
  button-icon:
    backgroundColor: "{colors.chip}"
    textColor: "{colors.warm-paper}"
    rounded: "{rounded.full}"
    size: "44px"
  input-field:
    backgroundColor: "{colors.field}"
    textColor: "{colors.warm-paper}"
    rounded: "{rounded.full}"
    padding: "0 16px"
    height: "44px"
  input-search:
    backgroundColor: "{colors.field}"
    textColor: "{colors.warm-paper}"
    rounded: "{rounded.full}"
    padding: "0 16px"
    height: "48px"
  chip:
    backgroundColor: "{colors.chip}"
    textColor: "{colors.warm-paper}"
    rounded: "{rounded.full}"
    padding: "0 12px"
    height: "36px"
  chip-selected:
    backgroundColor: "{colors.clay}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "0 12px"
    height: "36px"
  nav-item:
    textColor: "{colors.warm-paper}"
    typography: "{typography.body}"
    rounded: "{rounded.row}"
    padding: "0 12px"
    height: "44px"
  nav-item-active:
    textColor: "{colors.clay}"
    typography: "{typography.body}"
    rounded: "{rounded.row}"
    padding: "0 12px"
    height: "44px"
  quest-row:
    backgroundColor: "{colors.night}"
    textColor: "{colors.warm-paper}"
    typography: "{typography.body}"
    rounded: "{rounded.row}"
    padding: "8px"
    height: "56px"
  quest-row-hover:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.warm-paper}"
    typography: "{typography.body}"
    rounded: "{rounded.row}"
    padding: "8px"
    height: "56px"
  message:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.warm-paper}"
    rounded: "{rounded.panel}"
    padding: "8px 12px"
  message-user:
    backgroundColor: "{colors.chip}"
    textColor: "{colors.warm-paper}"
    rounded: "{rounded.panel}"
    padding: "8px 12px"
  marker:
    backgroundColor: "{colors.marker}"
    textColor: "#ffffff"
    rounded: "{rounded.tile}"
    padding: "0 10px 0 4px"
    height: "44px"
---

# Design System: Dawn

## Overview

**Creative North Star: "The Calm Night List"**

Dawn on a phone is a calm night list. The ground is near-black, reading text steps through three warm greys, and clay is the only chromatic mark in the shell. The first screen shows the work: a quest title and a muted date, a round menu, a round You button, and one white pill. The espresso pixel dashboard and a marketing hero are the rejected first screen.

The word Dawn is set in Source Serif 4. Every other line in this shell is the grotesque. Actions, fields, and icon buttons are capsules. A message, a menu, or the team card sits on a slightly lifted grey with a gentle corner, still flat. A shadow appears only when something floats over the night: the white pill, the You menu, the map controls, the campus sheet, and the place markers.

Atlas is its own night. The ground goes charcoal, the roads a step lighter, and neon is reserved for the walked path, the live zone, and the next leg. Stops are dark-blue pills. The person on the map is a pixel sprite. Minor names fade as the map zooms out. Studio keeps its own tokens and is outside this shell.

**Key Characteristics:**

- Near-black ground with three warm text tiers: paper, grey, and muted taupe
- Clay as a mark: the open section, a waiting count, a checked circle, a selected chip, focus, and a short alert
- One warm-white pill for the primary action
- Serif wordmark, grotesque for interface text
- Capsules for actions and fields; flat grey steps for depth
- A separate charcoal map with neon only on the path, the zone, and the next leg

## Colors

The shell is a warm near-black with one clay accent. The map adds a charcoal ground and three neon signals that stay on the campus.

### Primary

- **Clay** (`#d97746`, `--dawn-accent`): the open section’s icon and label, the waiting count, the checked milestone, a selected filter or role chip, the 2px focus ring, text selection, the caret, and short alerts (a finished quest, an error, who spoke in the room). Selection inverts to pill ink on clay.

### Tertiary

- **Path Neon** (`#ff7a2f`, `--dawn-neon-orange`): the walked campus path, a 4px round stroke. Also the 2px ring on a stop that is already done.
- **Zone Neon** (`#3ee08a`, `--dawn-neon-green`): the live zone, a circle at 16% fill with a 2px stroke.
- **Next Neon** (`#4cb7ff`, `--dawn-neon-blue`): the dashed next leg, and the 2px ring on the stop you are walking toward.
- **Marker Navy** (`#1a3358`, `--dawn-marker`): the place-stop pills on the map. Label is white.

### Neutral

- **Night Ground** (`#0e0e0c`, `--dawn-bg`): the shell, the drawer, and the document theme color. Text on it is warm paper.
- **Raised Night** (`#171715`, `--dawn-elev`): the You menu, agent bubbles, room messages, the team card, quest-row hover, and alert banners.
- **Field** (`#1c1c1a`, `--dawn-field`): text fields and the bottom search.
- **Chip Stone** (`#2a2a27`, `--dawn-chip`): round icon buttons, unselected chips, secondary pills, your own chat bubble, and the waiting-approval row.
- **Sheet** (`#121211`): the draggable campus sheet. It is a step off the shell ground.
- **Warm Paper** (`#f3f1ec`, `--dawn-text`): primary reading text.
- **Warm Grey** (`#c4bdb3`, `--dawn-secondary`): supporting sentences and map place names.
- **Muted Taupe** (`#8f887f`, `--dawn-muted`): section labels, relative dates, reasons, the hollow milestone stroke, and the search icon.
- **Placeholder** (`#a8a199`): field and search placeholders.
- **Pill White** (`#f7f4ef`, `--dawn-pill`): the filled primary action.
- **Pill Ink** (`#141210`, `--dawn-ink`): text on the white pill and on a selected clay chip.
- **Map Charcoal** (`#161816`, `--dawn-map`): the campus ground, including the flat SVG fill.
- **Road** (`#3a413c`, `--dawn-road`): campus roads, a 3.5px round stroke.
- **Place Dot** (`#5c6560`): the 8px dot for a minor place.
- **Grip** (`#3a3834`): the sheet handle and the shell scrollbar.

Lake Lagunita is a single ellipse (`#152028`). It is not a reusable surface.

### Named Rules

**The Clay Mark Rule.** Clay colors a mark or a selected chip. It does not fill the ground, a card, or the primary action.

**The One Pill Rule.** The warm-white pill is the filled action that moves the work forward. Decline, Talk, Join, and the waiting row sit on chip stone or as plain text.

**The Neon Stays on the Map Rule.** Path orange, zone green, and next blue appear on the campus drawing and on stop rings. The list shell does not use them.

## Typography

**Display Font:** Source Serif 4, then Iowan Old Style, Palatino, and serif (`--font-serif` on the wordmark).
**Body Font:** Geist, loaded as `"Geist", "Geist Fallback"` (`--font-geist-sans`).
**Label/Mono Font:** none. The same grotesque carries labels. Geist Mono and Press Start 2P are loaded on the document and this shell does not set text in them.

**Character:** The word Dawn is a quiet serif. Everything you scan or tap is a plain grotesque at phone sizes, with weight doing the ranking: regular rows, medium actions, semibold screen titles.

`html` sets `font-sans`. The theme token `--font-sans` references itself, so the shell CSS does not assign `--font-geist-sans`. The sizes below are the ones the night shell actually sets. Geist is the grotesque the layout loads.

### Hierarchy

- **Display** (560, 34px, line-height 1, tracking -0.03em): the drawer wordmark. The team card uses the same face and tracking at 22px.
- **Title** (600, 17px): the centered screen title in the 56px header.
- **Body** (400, 16px, line-height 1.25): nav rows, quest titles, catalog names, and field text. Supporting sentences are 15px with a 24px line-height in warm grey. The empty-quest line is a one-off 20px medium with tracking -0.02em, held to about 28ch.
- **Label** (400, 13px): section names (Pinned, Recents, Agents), relative dates, blurbs, and map meta. Sentence case, no tracking. Action pills are 14px medium; the floating New quest pill is 15px medium.

### Named Rules

**The Wordmark Rule.** Source Serif 4 is for the word Dawn. Screen titles, rows, and buttons stay in the grotesque.

**The Three Tiers Rule.** Ordinary reading text is warm paper, then warm grey, then muted taupe. Clay on a sentence is an alert, a finished quest, or the name of who spoke.

## Layout

The shell is a phone column that becomes a fixed drawer beside the work. Below the `md` breakpoint (768px) the drawer is an overlay, `min(84vw, 300px)`, over a 55% black scrim, and it slides in over 200ms with `ease-out`. From 768px up the drawer is a static 280px column and the menu button hides. The header is 56px: a 44px round button, a centered title, a 44px You button. Atlas drops that header and floats the same corners over the map.

The bottom search sits in the safe area (`padding-bottom` at least 12px, plus `env(safe-area-inset-bottom)`). Lists pad about 96px at the bottom so the floating pill and the search do not cover the last row. The drawer’s top inset is at least 20px, plus the safe-area top. Horizontal rhythm is 12px on the phone column, 16px on reading blocks, and 20px in the drawer. Stacked sections in the drawer open with 24px. Related controls use 8px gaps; catalog rows use 12px.

Atlas is full bleed. A translucent search (44px, black at 70%) sits in the top safe area. Layers and recenter are a vertical pair of 44px rounds, 8px apart, inset 12px from the right. The sheet snaps to 26%, 46%, and 78% of the height. Minor labels fade with zoom: opacity runs from 0 at scale 1.15 to 1 at scale 1.85.

### Named Rules

**The Phone Column Rule.** Build the first viewport as a single column with a bottom search. The drawer is an overlay until 768px, then a 280px column.

**The Clearance Rule.** Lists keep clearance for the floating pill and the bottom search, and both edges honor the safe-area insets.

## Elevation & Depth

Depth in the shell is tonal. Night, raised, field, and chip stone are flat steps, lightening slightly as they come forward. Nothing resting on the list has a shadow or a border. The You menu, room messages, and the team card separate by their raised fill and an 18px corner.

Shadows are reserved for objects that float over the night or the map.

### Shadow Vocabulary

- **Pill** (`box-shadow: 0 8px 20px rgba(0,0,0,0.35)`): the floating New quest pill.
- **Menu** (`box-shadow: 0 12px 32px rgba(0,0,0,0.4)`): the You menu.
- **Map control** (`box-shadow: 0 8px 18px rgba(0,0,0,0.35)`): the layers and recenter buttons.
- **Sheet** (`box-shadow: 0 -10px 28px rgba(0,0,0,0.4)`): the campus sheet, cast upward.
- **Marker** (`box-shadow: 0 6px 16px rgba(0,0,0,0.35)`): every stop pill. The next stop adds `0 0 0 2px #4cb7ff`. A finished stop adds `0 0 0 2px #ff7a2f`.

The open drawer scrim is black at 55%. It is a veil, not a shadow.

### Named Rules

**The Flat Night Rule.** A resting surface is a flat grey step. A soft black shadow appears only under a floating pill, menu, map control, sheet, or marker.

## Shapes

The shell’s controls are capsules. Fields and the milestone mark set a 999px radius; pill buttons, chips, and icon buttons use a full corner. Text that sits in a container uses a measured corner: 18px on messages, the You menu, alerts, and the team card; 14px on nav rows, quest rows, and catalog tiles; 10px on agent portraits in a thread and on map stop pills; 8px on the small icon well inside a stop pill. The campus sheet rounds only the top, at 22px. The sheet handle is a 4×36px capsule in the grip color.

Milestone state is a circle, not a check glyph: 22px, 1.5px muted stroke when open, clay fill when done. Minor places are an 8px dot. The walker and the agent portraits are pixel sprites with `image-rendering: pixelated`.

### Named Rules

**The Capsule Rule.** Actions, fields, chips, and icon buttons are capsules. Containers that hold a sentence use 18px. The sheet rounds the top only.

**The Fixed Mark Rule.** A milestone is a 22px circle in a fixed cell. Open is a hollow muted stroke. Done is a clay fill. The words stay in the row.

## Components

### Buttons

Primary actions are quiet because the fill is warm white on a near-black ground.

- **Shape:** capsule (full corner).
- **Primary:** pill white on pill ink, 44px tall, 16px horizontal padding, 14px medium. The floating New quest pill is the same fill at 15px medium, with the pill shadow, and it hangs above the search. Approve, Add, Send, Join, Share, and Walk use this fill.
- **Hover / Focus:** the pills do not change fill on hover. Focus is the shell ring: 2px clay, 2px offset. Disabled primary actions drop to 40% opacity.
- **Secondary:** chip stone, warm-paper label, 44px, 14px. Decline, the name Join, and Google sign-in use it. Some of these are medium weight and some are regular.
- **Icon:** a 44px chip-stone disc with a 20px mark. Menu, close, back, layers, and recenter. The You button is the same disc holding a 28px pixel portrait.

### Chips

- **Style:** capsule, 36px tall, 12px horizontal padding, 14px. Unselected is chip stone and warm paper. Selected is clay and pill ink. This is the campus filter row (All, Quest, Gardens, Halls, Here) and the Student / Researcher pair. Catalog row actions (Talk, Open) are the same 36px chip-stone pill.
- **State:** `aria-pressed` swaps the fill to clay. There is no separate hover fill.

### Cards / Containers

- **Corner Style:** 18px.
- **Background:** raised night for the other person’s bubble, a room message, the team card, the You menu, and an alert. Chip stone for your own bubble in an agent thread.
- **Shadow Strategy:** flat, except the You menu, which uses the menu shadow.
- **Border:** none on these containers. The cardinal note under the sheet uses a top hairline of white at 10%.
- **Internal Padding:** 12px on the menu and the team card; 8px vertical and 12px horizontal on bubbles. Agent bubbles inset 32px from the far side.

### Inputs / Fields

- **Style:** capsule, field fill, warm-paper text, 16px type, placeholder in the placeholder tone. The shared field is 44px with 16px of side padding. The bottom search is 48px, the same fill, with a muted 20px search mark. Atlas search is 44px and black at 70%, so the map shows through.
- **Focus:** the search wrapper and any focused control use a 2px clay outline, 2px outside the shape.
- **Error / Disabled:** errors are 13px clay sentences. Empty disabled actions use 40% opacity. There is no red error fill in this shell.

### Navigation

The drawer wordmark is the display face. Under it, four rows (Quests, Village, Atlas, Library) are 16px, 44px tall, 12px of horizontal padding, a 12px gap, and a 14px corner. The open section colors its 20px icon and its label clay, and leaves the row unfilled. A waiting count sits at the row’s end in 13px clay. Pinned and Recents are 13px muted labels. Pinned rows are a 22px pixel portrait and a 16px name. The header title is the 17px semibold title style, centered.

On a phone the menu button opens the drawer. From 768px the drawer stays open and the menu button is gone. Atlas, when it is the whole screen, keeps a round home or menu button and moves search up onto the map.

### Quest rows

A quest is a title and a muted line, not a card. The row is 56px minimum, 14px corners, 8px padding. The title is 16px with a 20px line-height. The meta line is 13px muted: status, then a relative date. Hover fills the row with raised night. The empty list centers a 72px pixel sprite, a 20px medium line, and a warm-grey sentence.

### Campus map

The campus is a flat drawing on map charcoal: roads in the road tone, the lake as one dark ellipse, minor places as place dots with warm-grey names that fade on zoom-out. The walked path, the live zone, and the next leg carry the three neons. Stop pills are marker navy, 44px tall, 10px corners, 13px medium white type, a 24px icon well at 8px radius in white at 10%, and the marker shadow. Locked stops are at 50% opacity. The walker is a 36px pixel sprite standing on the path. The “here” layer swaps the drawing for a dimmed map: tiles at 35% grayscale, 42% brightness, and 1.15 contrast.

The sheet is sheet-colored, top radius 22px, with the sheet shadow. Its title is 16px medium, its count is 13px muted, and Walk is the white pill.

### Named Rules

**The Open Section Rule.** The current section is clay on the icon and the label. The row behind them stays unfilled.

## Do's and Don'ts

### Do:

- **Do** keep Night Ground for the shell and Map Charcoal for Atlas.
- **Do** use one warm-white pill for the action that moves the work forward.
- **Do** color the open section’s icon and label clay, and leave that row unfilled.
- **Do** keep a quest row to a title and a muted relative date.
- **Do** keep icon buttons, nav rows, text fields, and primary pills at 44px.
- **Do** draw the campus flat, with neon only on the path, the live zone, the next leg, and stop rings.
- **Do** fade minor place labels as the scale falls from 1.85 toward 1.15.
- **Do** focus with a 2px clay outline, 2px outside the control.
- **Do** drop the drawer transition under reduced motion, and jump the walker to the stop instead of playing the 1600–4800ms smoothstep.

### Don't:

- **Don't** restyle this shell with the Studio espresso ground. Studio keeps its own tokens.
- **Don't** open the first screen with a marketing hero.
- **Don't** wrap a quest row in a card, a border, or a shadow.
- **Don't** fill the ground, a panel, or the primary action with clay.
- **Don't** use path, zone, or next neon in the list shell.
- **Don't** set the word Dawn in the grotesque, or set interface sentences in the serif.
- **Don't** put a second filled primary pill on the same screen.
- **Don't** shrink icon buttons, nav rows, fields, or primary pills below 44px.
- **Don't** set interface text in Press Start 2P. The pixel person is a sprite.

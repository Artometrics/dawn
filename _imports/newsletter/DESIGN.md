---
name: Artometrics
description: A studio letter set in type, with one house-blue sheet.
colors:
  blue: "#0047FF"
  blue-deep: "#0033CC"
  paper: "#f4f5f7"
  ink: "#10141c"
  ink-soft: "#243044"
  line: "#d5dbe6"
  white: "#ffffff"
  wash: "#e7eeff"
  mist: "#d6e0ff"
typography:
  display:
    fontFamily: "Bodoni Moda, Iowan Old Style, Palatino, serif"
    fontSize: "clamp(2.75rem, 7vw, 6rem)"
    fontWeight: 400
    lineHeight: 0.9
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Bodoni Moda, Iowan Old Style, Palatino, serif"
    fontSize: "clamp(2.2rem, 4vw, 3.4rem)"
    fontWeight: 400
    lineHeight: 1.02
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Bodoni Moda, Iowan Old Style, Palatino, serif"
    fontSize: "2rem"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "-0.03em"
  body:
    fontFamily: "Literata, Iowan Old Style, Palatino, serif"
    fontSize: "1.25rem"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "normal"
  label:
    fontFamily: "Familjen Grotesk, Avenir Next, Segoe UI, sans-serif"
    fontSize: "0.95rem"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "-0.01em"
rounded:
  none: "0px"
spacing:
  page: "20px"
  page-wide: "48px"
  control: "44px"
  stack: "16px"
components:
  button-primary:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.white}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0 16px"
    height: "{spacing.control}"
  button-primary-hover:
    backgroundColor: "{colors.blue-deep}"
    textColor: "{colors.white}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0 16px"
    height: "{spacing.control}"
  button-inverse:
    backgroundColor: "{colors.white}"
    textColor: "{colors.blue}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0 20px"
    height: "{spacing.control}"
  button-inverse-hover:
    backgroundColor: "{colors.wash}"
    textColor: "{colors.blue}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0 20px"
    height: "{spacing.control}"
  button-line:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0 16px"
    height: "{spacing.control}"
  input:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0 12px"
    height: "{spacing.control}"
    width: "100%"
---

# Design System: Artometrics

## Overview

**Creative North Star: "The Studio Letter"**

The page is a printed sheet. Paper is the ground. One band of house blue carries the latest letter and the way to join it. The name and the titles are a display face; the letter itself is a text face; the desk is a plain grotesque. Nothing is rounded, nothing floats, and the only motion is a rule drawing itself under the masthead.

The public pages are for reading and for a single decision: confirm that you want the letter. The desk is for operating the list. Counts stay in tables. The archive is the letter, set again, not a campaign recap.

The metaphor and the color names below were taken from the shipped magazine UI. The brief fixed house blue and a clean magazine, and it asked for no questions.

**Key Characteristics:**

- Square corners on every control and sheet
- House blue as one full-bleed band, plus the primary action
- Display type capped at 6rem, with the date under the title
- The desk is a list and a composer, not a hero metric
- One motion: the mast rule, and it is still when motion is reduced

## Colors

The palette is press paper, ink, and one blue.

### Primary

- **House Blue** (`colors.blue`): The mast rule, the full-bleed sheet behind the latest letter and the signup, the primary button, selection, focus, and the caret.
- **Press Blue** (`colors.blue-deep`): Primary button hover, and links inside a letter.

### Neutral

- **Press Paper** (`colors.paper`): Page ground, the desk, and the mobile tab bar.
- **Ink** (`colors.ink`): Titles, body, and the wordmark.
- **Soft Ink** (`colors.ink-soft`): Dates, secondary sentences, the postal address, and placeholders.
- **Rule** (`colors.line`): Input borders, the desk divider, and rules inside a letter.
- **Sheet White** (`colors.white`): The inverse button on the blue sheet, and field fill.
- **Blue Wash** (`colors.wash`): Inverse-button hover, and italic lines set on the blue sheet.
- **Blue Mist** (`colors.mist`): The date line on the blue sheet.

**The Sheet Rule.** House blue is a full-bleed band or a primary action. It is not a tint behind cards, and it is not a second color for charts.

## Typography

**Display Font:** Bodoni Moda (with Iowan Old Style, Palatino)
**Body Font:** Literata (with Iowan Old Style, Palatino)
**Label/UI Font:** Familjen Grotesk (with Avenir Next, Segoe UI)

**Character:** The display face names the studio and the issue. Literata carries the letter at a size you can read on a phone. The grotesque runs the form, the nav, and the desk, so the operating chrome does not pretend to be the letter.

### Hierarchy

- **Display** (400, `clamp(2.75rem, 7vw, 6rem)`, line-height 0.9): The home title and the locked-desk title. Cap is 6rem.
- **Headline** (400, `clamp(2.2rem, 4vw, 3.4rem)`, line-height 1.02): The issue title on the blue sheet and on an archive page.
- **Title** (400, 2rem, line-height 1): Section titles such as “Get the letter,” and headings inside the letter at 2rem / 1.5rem.
- **Body** (400, 1.25rem): The dek, the colophon, and the letter. The letter column stays near 65 characters.
- **Label** (400, 0.95rem, tracking -0.01em): Navigation, buttons, fields, and desk rows. Field text is 16px so iOS does not zoom.

**The Underline Rule.** The date sits under the title. No small label sits above a display heading.

## Layout

Public pages are one column on a phone (20px side padding, safe-area insets on the mast and the desk tab bar) and a 12-column sheet from the `md` breakpoint (48px side padding). The blue band splits 7/5: letter, then signup. The archive is a vertical list of titles. The desk is a 13.5rem rail on a wide screen and a four-item tab bar fixed to the bottom on a phone. Controls are at least 44px tall. The letter measure is the reading column, not the viewport.

## Elevation & Depth

The system is flat. Depth is the blue sheet laid on paper, a 3px house-blue rule under the mast, and a 1px rule as a divider. There is no shadow vocabulary.

**The Flat Sheet Rule.** Surfaces do not lift on hover. Hover changes color: press blue, blue wash, or ink at 5% on a ghost control.

## Shapes

Corners are square (`rounded.none`). Borders are 1px Rule on fields and 1px ink at 20% on the line button. The mast rule is 3px tall and full width. A letter quotation takes a 1px house-blue bar on its left edge.

**The Square Rule.** Do not round buttons, fields, sheets, or the wordmark.

## Components

### Buttons

- **Shape:** Square (0px). Minimum height 44px. Familjen Grotesk at 0.95rem.
- **Primary:** House blue fill, sheet-white text, 16px horizontal padding. Hover shifts to Press Blue.
- **Inverse:** Sheet-white fill and house-blue text, used on the blue sheet. Hover shifts to Blue Wash.
- **Line:** Transparent, 1px ink border at 20%. Hover turns the border and the label house blue.
- **Ghost:** Transparent. Hover is ink at 5%.
- **Focus:** 2px house-blue outline, 3px offset, on every control.

### Cards / Containers

There are no cards. The blue sheet is the only container: full bleed, house-blue ground, sheet-white type, 40px vertical padding on a phone and 56px on a wide screen.

### Inputs / Fields

- **Style:** Square, 1px Rule border, sheet-white fill, 12px horizontal padding, 16px type, Soft Ink placeholder, house-blue caret.
- **Focus:** The global 2px house-blue outline.
- **Checkbox:** Square, 44px on the signup form. On the blue sheet the box is white and the check is house blue. The consent sentence is the label. The form does not submit until the box is checked.

### Navigation

The public mast is the wordmark at left and Archive / Desk at right, Familjen Grotesk, ink, house blue on hover. A 3px rule draws from the left in 700ms (`cubic-bezier(0.16, 1, 0.3, 1)`) and does not run when `prefers-reduced-motion` is set. The desk rail lists List, Write, Letters, Counts. The active item is house blue with no pill. On a phone those four sit in a fixed paper bar with a Rule top border.

### The letter

Body copy is Literata. Links inside it are Press Blue with an underline offset. Block quotes are italic Soft Ink with the house-blue bar. Horizontal rules are Rule. This is the same letter the archive and the mail share.

## Do's and Don'ts

### Do

- **Do** keep field type at 16px and hit targets at 44px, including the phone tab bar.
- **Do** put the postal address in the colophon in the same lines the mail footer uses.
- **Do** set white type on house blue and ink on press paper. Selection is house blue with white type.
- **Do** leave the archive empty until a letter has actually been sent. Say so in a sentence, not a illustration.

### Don't

- **Don't** place an eyebrow or kicker above a display heading.
- **Don't** round a control, add a drop shadow, or introduce a second accent.
- **Don't** publish subscriber counts, open rates, or a specimen issue as if they were a public mailing.
- **Don't** shrink display type past the 6rem cap, or set the letter in the UI grotesque.

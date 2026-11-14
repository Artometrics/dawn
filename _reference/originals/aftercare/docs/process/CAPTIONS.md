# Process screenshots - captions

Desktop is 1440x900, mobile is 390x844 at 2x. One slide per project: pick the pair you like per milestone.
Milestone 01 comes from `site/scripts/shoot.mjs`; milestones 02-05 are captured from the running app by `cd site && npm run dev` then `node scripts/milestones.mjs` (it seeds a sample profile, "Mara Ellison", and deals real readings).

## 01 - Mockups (design direction)

| File | Caption |
| --- | --- |
| `01-mockups-landing-desktop.png` / `-mobile.png` | Landing page in the "Midnight Almanac" direction: parchment paper, night-teal ink, marigold and oxblood spot colour, Fraunces display type. Three fanned cards over a dial, annotated like a field guide. |
| `01-mockups-tarot-desktop.png` / `-mobile.png` | The tarot table: spread picker, question box, dark felt table with a three-card spread, phone version swaps the nav for a bottom tab bar. |
| `01-mockups-second-self-desktop.png` / `-mobile.png` | The "second self" profile: identity plate with sigil, life path / sun sign / birth card chips, share and edit actions. |
| `01-mockups-gallery-desktop.png` / `-mobile.png` | The mockup gallery (`docs/mockups/index.html`): seven pages, each shown desktop and mobile. |

## 02 - Tarot table (three.js)

| File | Caption |
| --- | --- |
| `02-tarot-table-idle-desktop.png` / `-mobile.png` | The table before anything is dealt: dashed slots for a three-card spread, a face-down deck, and a spread picker. Rendered live in three.js; the back and faces are procedural SVG. |
| `02-tarot-three-card-desktop.png` / `-mobile.png` | A three-card reading dealt and turned over, with a question typed in. Cards tilt toward the pointer on desktop and flip on tap. On a wide screen the deck sits beside the spread. |
| `02-tarot-celtic-cross-desktop.png` / `-mobile.png` | The ten-card Celtic Cross (cross plus staff) with numbered badges. The camera re-fits per spread and per screen, so it works on a phone. |
| `02-tarot-reading-notes-desktop.png` / `-mobile.png` | Below the table: each card's position, upright or reversed meaning, keywords and a reflection question, then a note field and "Save reading" (kept in local storage). |

## 03 - The deck and numerology

| File | Caption |
| --- | --- |
| `03-card-detail-desktop.png` / `-mobile.png` | Card detail for The Star: original art, upright and reversed meanings in our own words, a question to sit with, and pairings (element, number, sun sign, theme). 78 of these pages exist. |
| `03-deck-browser-desktop.png` / `-mobile.png` | The whole deck: 22 major arcana and four suits, drawn by code in one consistent print-like style. |
| `03-numerology-desktop.png` / `-mobile.png` | The numerology page for 14 March 1992: life path 11 (a master number, kept, not reduced), the working shown, matching tarot cards, and name numbers. |

## 04 - The second self

| File | Caption |
| --- | --- |
| `04-onboarding-desktop.png` / `-mobile.png` | Onboarding: name, birth date, birthplace (offline city list or tap the map), and favorites with a theme each. A live preview card on the right updates as you type. |
| `04-second-self-desktop.png` / `-mobile.png` | The "second self" page: identity plate, fun facts, five numbers, the cards they map to. |
| `04-second-self-connections-desktop.png` / `-mobile.png` | Connections: you in the middle, your own cards on the inner ring, favorites on the outer ring, each tied to the card that carries its theme, with plain-language links underneath. |
| `04-share-controls-desktop.png` / `-mobile.png` | Share controls: per-section switches, a copyable link that carries the chosen parts inside the URL itself (nothing uploaded), plus backup and delete. |

## 05 - Landing

| File | Caption |
| --- | --- |
| `05-landing-desktop.png` / `-mobile.png` | The landing page, now live code instead of a mockup: fanned procedural cards, the three-step pitch, and a real sample profile link. |

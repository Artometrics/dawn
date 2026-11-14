# Aftercare MVP - URL sheet

Every route of the `site/` app (Astro, static). Local base URL: `http://localhost:4321` (`npm run dev` or `npm run preview`). Nothing is deployed anywhere public.

All pages are plain static HTML. The interactive ones hydrate in the browser and keep their data in
`localStorage` (`aftercare.profile`, `aftercare.readings`). There are no API routes.

| Route | Page | Data it uses | Notes |
| --- | --- | --- | --- |
| `/` | Landing | none (sample profile is built at build time) | "See a sample profile" links to a real `/share/#d=...` link |
| `/onboarding/` | Onboarding profile form | reads and writes `aftercare.profile` | Name, birth date, birthplace (city list or tap-to-pin map), favorites with themes, live preview. Saves, then goes to `/profile/` |
| `/profile/` | Your second self | reads `aftercare.profile` | Numbers, birth cards, map, connection constellation, favorites, share toggles and link, backup export/import, delete. Shows an empty state with no profile |
| `/share/#d=...` | Shared second self | the URL fragment only | Read-only view of what the sender switched on. Bad or truncated links show a friendly message |
| `/numerology/` | Numerology calculator | optionally prefilled from `aftercare.profile` | Life path (with the working shown), birthday, name numbers, personal year, birth/soul cards, all numbers explained |
| `/tarot/` | Tarot table (three.js) | writes `aftercare.readings` | One card, three card, Celtic Cross. Shuffle, deal, flip, hover tilt. Reading text below, save with a note. Falls back to a no-3D reading if WebGL is missing |
| `/tarot/readings/` | My readings | reads and writes `aftercare.readings` | Saved readings with notes, delete, most-drawn cards |
| `/tarot/cards/` | The deck | static | All 78 cards, grouped: major arcana plus four suits |
| `/tarot/cards/<slug>/` | Card detail | static | 78 pages, e.g. `/tarot/cards/the-fool/`, `/tarot/cards/ten-of-cups/`. Upright and reversed meanings, keywords, reflection question, element, numerology and sun-sign pairings, previous/next |
| `/journal/` | Journal (placeholder) | none | Honest "coming next" page that points to reading notes |
| `/privacy/` | Privacy and your data | none | What is stored, how sharing works |
| `/404` | Not found page | none | Served for unknown paths |

## The 78 card slugs

Major arcana: `the-fool`, `the-magician`, `the-high-priestess`, `the-empress`, `the-emperor`, `the-hierophant`,
`the-lovers`, `the-chariot`, `strength`, `the-hermit`, `wheel-of-fortune`, `justice`, `the-hanged-one`, `death`,
`temperance`, `the-devil`, `the-tower`, `the-star`, `the-moon`, `the-sun`, `judgement`, `the-world`.

Minor arcana, ranks `ace`, `two` to `ten`, `page`, `knight`, `queen`, `king`, for each suit:
`<rank>-of-wands`, `<rank>-of-cups`, `<rank>-of-swords`, `<rank>-of-pentacles`, e.g. `queen-of-cups`.

The authoritative list is `site/src/data/deck.json`; `site/tests/deck.test.ts` checks that all 78 slugs are unique.

## Mockups (design reference, not the app)

`docs/mockups/index.html` links the static mockups: `landing`, `onboarding`, `tarot-reading`, `card-detail`,
`profile`, `journal`, `numerology` (desktop and mobile images under `docs/mockups/img/`).

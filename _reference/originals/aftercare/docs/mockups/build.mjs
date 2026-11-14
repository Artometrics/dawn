// Regenerates the static mockup HTML. Usage: node docs/mockups/build.mjs
import { writeFileSync } from 'node:fs'
import { layout } from './_src/lib.mjs'
import * as p from './_src/pages.mjs'

const pages = [
  ['landing', p.landing, 'Landing', 'Hero, how it works, second-self preview, features, coming later.'],
  ['onboarding', p.onboarding, 'Onboarding profile form', 'Name, birth date, birthplace with map, favorites, privacy, live preview.'],
  ['tarot-reading', p.tarotReading, 'Tarot reading', 'Spread picker, 3D table, per-card reading, save.'],
  ['card-detail', p.cardDetail, 'Card detail', 'One card: art, keywords, upright / reversed, connections.'],
  ['profile', p.profile, 'Second self', 'Identity plate, numbers, map, constellation, favorites, share.'],
  ['journal', p.journal, 'Journal', 'Entries, editor, mood, linked reading (Phase 2 mockup).'],
  ['numerology', p.numerology, 'Numerology', 'Life path hero, calculator, method, meanings.'],
]
for (const [file, page] of pages) {
  writeFileSync(new URL(`./${file}.html`, import.meta.url), layout(page))
}

const cards = pages
  .map(
    ([file, , title, blurb]) => `
  <article class="item">
    <header><h2>${title}</h2><p>${blurb}</p><p class="links"><a href="${file}.html">Open live HTML</a> · <a href="img/${file}-desktop.jpg">desktop image</a> · <a href="img/${file}-mobile.jpg">mobile image</a></p></header>
    <div class="shots">
      <a class="desk" href="${file}.html"><img loading="lazy" src="img/${file}-desktop.jpg" alt="${title}, desktop"></a>
      <a class="mob" href="${file}.html"><img loading="lazy" src="img/${file}-mobile.jpg" alt="${title}, mobile"></a>
    </div>
  </article>`,
  )
  .join('\n')

writeFileSync(
  new URL('./index.html', import.meta.url),
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Aftercare mockups</title><link rel="stylesheet" href="assets/almanac.css">
<style>
.gal{padding-block:48px 90px}.gal h1{font-size:clamp(2.4rem,6vw,4.2rem);margin:14px 0}
.item{margin-top:64px;border-top:3px double var(--ink);padding-top:28px}.item h2{font-size:2rem}.item header p{margin:6px 0;color:var(--muted)}
.shots{display:grid;grid-template-columns:minmax(0,1fr) 260px;gap:28px;align-items:start;margin-top:18px}
.shots a{display:block;border:1.5px solid var(--ink);border-radius:10px;overflow:hidden;background:#fff;max-height:620px;overflow-y:auto}
.shots img{display:block;width:100%;height:auto}
@media(max-width:800px){.shots{grid-template-columns:1fr}.shots .mob{max-width:300px}}
</style></head><body><main class="wrap gal">
<span class="eyebrow">Design reference</span><h1>Aftercare <em>mockups</em></h1>
<p class="lede">Static HTML/CSS pages for the "Midnight Almanac" direction. Every page is responsive: the left image is desktop (1440px), the right is mobile (390px). Open the live HTML and resize to see the layout switch. Card art here is a stand-in; the app generates all 78 cards from code.</p>
<p><a class="btn sm" href="../PLAN.md">Plan</a> <a class="btn ghost sm" href="../RESEARCH.md">Research</a></p>
${cards}
</main></body></html>`,
)
console.log('built', pages.length, 'pages')

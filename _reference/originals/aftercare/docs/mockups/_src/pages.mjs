import { ic, tcard, worldMap, samplePins } from './lib.mjs'

const ring = (cls = 'ring') => `<svg class="${cls}" viewBox="0 0 400 400" aria-hidden="true"><g fill="none" stroke="#0f2321" stroke-width="1.4"><circle cx="200" cy="200" r="190"/><circle cx="200" cy="200" r="168" stroke-dasharray="2 6"/><circle cx="200" cy="200" r="130" stroke="#7b2d3a"/>
${Array.from({ length: 48 }, (_, i) => { const a = (i * 7.5 * Math.PI) / 180, r1 = i % 4 ? 176 : 170; return `<path d="M${200 + r1 * Math.cos(a)} ${200 + r1 * Math.sin(a)}L${200 + 190 * Math.cos(a)} ${200 + 190 * Math.sin(a)}"/>` }).join('')}</g>
<circle cx="200" cy="30" r="16" fill="#d99a2b" stroke="#0f2321" stroke-width="1.4"/><path d="M356 232a40 40 0 1 1 6-66 32 32 0 0 0-6 66z" transform="translate(-10 40)" fill="#f3ead9" stroke="#0f2321" stroke-width="1.4"/></svg>`

export function constellation(dark = false) {
  const ink = dark ? '#f3ead9' : '#0f2321'
  const nodes = [
    { x: 400, y: 250, r: 34, label: 'Mara', k: 'you' },
    { x: 400, y: 70, r: 22, label: 'Life path 11', k: 'num' },
    { x: 214, y: 150, r: 20, label: 'Pisces', k: 'sign' },
    { x: 586, y: 150, r: 20, label: 'Justice', k: 'card' },
    { x: 150, y: 330, r: 18, label: 'The Moon', k: 'card' },
    { x: 650, y: 330, r: 18, label: 'Lisbon', k: 'place' },
    { x: 290, y: 420, r: 16, label: 'Wonder', k: 'theme' },
    { x: 520, y: 430, r: 16, label: 'Mystery', k: 'theme' },
    { x: 60, y: 200, r: 12, label: 'Spirited Away', k: 'fav' },
    { x: 130, y: 440, r: 12, label: 'Piranesi', k: 'fav' },
    { x: 400, y: 485, r: 12, label: 'Salt lakes', k: 'fav' },
    { x: 740, y: 440, r: 12, label: 'Amélie', k: 'fav' },
    { x: 740, y: 200, r: 12, label: 'Master & Margarita', k: 'fav' },
  ]
  const edges = [[0, 1], [0, 2], [0, 3], [0, 5], [2, 4], [1, 3], [2, 6], [4, 9], [6, 8], [6, 9], [6, 10], [7, 10], [7, 12], [7, 11], [3, 7], [5, 11], [0, 6], [0, 7]]
  const col = { you: '#d99a2b', num: '#7b2d3a', sign: '#3f7f73', card: '#d9a7a0', place: '#d99a2b', theme: '#3f7f73', fav: dark ? '#f3ead9' : '#0f2321' }
  const e = edges.map(([a, b]) => `<line x1="${nodes[a].x}" y1="${nodes[a].y}" x2="${nodes[b].x}" y2="${nodes[b].y}" stroke="${ink}" stroke-opacity=".38" stroke-width="1.2"/>`).join('')
  const n = nodes
    .map((d) => `<g><circle cx="${d.x}" cy="${d.y}" r="${d.r}" fill="${col[d.k]}" stroke="${ink}" stroke-width="1.4"/><text x="${d.x}" y="${d.y + d.r + 18}" text-anchor="middle" font-family="Outfit, sans-serif" font-size="${d.k === 'fav' ? 13 : 15}" fill="${ink}">${d.label}</text></g>`)
    .join('')
  return `<svg class="constel" viewBox="0 0 800 520" role="img" aria-label="Connection constellation">${e}${n}</svg>`
}

const rule = `<p class="rule">${ic('flourish')}</p>`

/* ------------------------------------------------------------------ landing */
export const landing = {
  title: 'Landing', active: 'landing',
  body: `
<section class="hero"><div class="wrap split">
  <div>
    <span class="eyebrow">Tarot · Numbers · Maps · You</span>
    <h1>Meet your <em>second self.</em></h1>
    <p class="lede">Tell Aftercare your name, your birthday, where you began and the movies, books and odd little things you love. It draws the map, pulls the cards, counts the numbers, and shows how it all connects.</p>
    <div class="hero-actions"><a class="btn" href="onboarding.html">Start your profile ${ic('flourish')}</a><a class="btn ghost" href="tarot-reading.html">Try a free reading</a></div>
    <div class="chips"><span class="chip fill">No account needed</span><span class="chip fill">Stays on your device</span><span class="chip fill">Free to explore</span></div>
  </div>
  <div class="hero-stage">${ring()}
    <div class="fan">${tcard('star', 'c1')}${tcard('moon', 'c2')}${tcard('sun', 'c3')}</div>
    <span class="tag t1">Life path 11</span><span class="tag t2">born in Lisbon</span><span class="tag t3">The Star, reversed?</span><span class="tag t4">Pisces sun</span>
  </div>
</div></section>

<div class="strip"><div class="wrap"><span>Tarot</span><i>✦</i><span>Numerology</span><i>✦</i><span>Druids &amp; trees</span><i>✦</i><span>Historical figures</span><i>✦</i><span>Fun facts</span><i>✦</i><span>Symbols &amp; scripture</span></div></div>

<section><div class="wrap">
  <div class="section-head"><span class="eyebrow">How it works</span><h2>Three small steps, <em>one big picture.</em></h2><p class="lede">No quiz marathon. Give us a few details and we do the weaving.</p></div>
  <div class="grid g3">
    <article class="plate step"><span class="num">1</span><h3>Tell us who you are</h3><p>Name, date of birth, birthplace. Add favorite movies, books and things, and drop them on the map if they belong somewhere.</p></article>
    <article class="plate step"><span class="num">2</span><h3>Pull a few cards</h3><p>A real-feeling table: shuffle, deal, flip. One card, three cards, or the full Celtic Cross. Save the ones you want to remember.</p></article>
    <article class="plate step"><span class="num">3</span><h3>See what connects</h3><p>Your life path number, birth card and sun sign link up with your places and favorites in a little constellation you can share.</p></article>
  </div>
</div></section>

<section class="dark"><div class="wrap split">
  <div>
    <span class="eyebrow">Your second self</span>
    <h2>Everything you love, <em>on one page.</em></h2>
    <p class="lede">A profile that is part passport, part tarot card, part scrapbook. You choose what is visible and what stays yours.</p>
    <div class="chips" style="margin-top:20px"><span class="chip on-dark">${ic('lock')} Private by default</span><span class="chip on-dark">${ic('share')} Share only what you pick</span></div>
    <p style="margin-top:26px"><a class="btn" href="profile.html">See a sample profile</a></p>
  </div>
  <div class="plate preview">
    <div class="stat-row"><div class="stat"><b>11</b><span>Life path</span></div><div class="stat"><b>XI</b><span>Birth card</span></div><div class="stat"><b>♓</b><span>Pisces sun</span></div></div>
    ${worldMap({ pins: samplePins.slice(0, 5), links: [], className: 'map' })}
    ${constellation(true).replace('class="constel"', 'class="constel" style="max-height:260px"')}
  </div>
</div></section>

<section><div class="wrap">
  <div class="section-head"><span class="eyebrow">Inside</span><h2>A little almanac <em>for everything.</em></h2></div>
  <div class="grid g2">
    <article class="plate feature"><div class="art">${ic('cards')}</div><div><h3>The tarot table</h3><p>78 cards with original art, 3D shuffle and flip, reversed cards, and readings saved on your device.</p></div></article>
    <article class="plate feature"><div class="art">${ic('num')}</div><div><h3>Numbers that mean something</h3><p>Life path, birthday, name numbers and your personal year, each paired with a tarot card.</p></div></article>
    <article class="plate feature"><div class="art">${ic('pin')}</div><div><h3>A map of you</h3><p>Where you were born, where your favorite stories happen, and the places you want to remember.</p></div></article>
    <article class="plate feature"><div class="art">${ic('share')}</div><div><h3>Share on your terms</h3><p>Flip a switch per section. Your share link carries only what you chose to show.</p></div></article>
  </div>
</div></section>

<section style="background:var(--paper-2)"><div class="wrap">
  <div class="section-head"><span class="eyebrow">Coming later</span><h2>The almanac <em>keeps growing.</em></h2><p class="lede">The first release is about you, your cards and your numbers. These are on the shelf for later.</p></div>
  <div class="grid g4">
    <div class="later">${ic('pin')}<h3>Marketplace</h3><p>Handmade, vintage and well-loved spiritual goods from people you can follow.</p><span class="chip">Later</span></div>
    <div class="later">${ic('book')}<h3>Journal</h3><p>Write beside your readings, with prompts that fit the card you drew.</p><span class="chip">Next up</span></div>
    <div class="later">${ic('eye')}<h3>Stories &amp; comics</h3><p>A Tumblr-style blog for the strange and tender things you make.</p><span class="chip">Later</span></div>
    <div class="later">${ic('me')}<h3>Community</h3><p>Circles, trades and shared spreads. Gentle, moderated, no pile-ons.</p><span class="chip">Later</span></div>
  </div>
</div></section>

<section class="dark cta-band"><div class="wrap"><h2>Ready to meet <em>yourself, again?</em></h2><a class="btn" href="onboarding.html">Start your profile</a><p class="note">For reflection and entertainment. Readings do not predict the future or replace medical, legal or financial advice.</p></div></section>`,
}

/* --------------------------------------------------------------- onboarding */
export const onboarding = {
  title: 'Onboarding', active: 'onboarding',
  body: `
<div class="wrap page-head"><span class="eyebrow">Step 1 of 4</span><h1>Let's meet <em>you.</em></h1><p class="lede">Nothing here is uploaded. It all lives on this device until you decide to share it.</p>
  <ol class="stepper"><li class="done"><b>1</b>You</li><li><b>2</b>Where</li><li><b>3</b>Loves</li><li><b>4</b>Privacy</li></ol></div>
<div class="wrap form-layout">
  <form onsubmit="return false">
    <fieldset class="plate fieldset" style="border:1.5px solid var(--ink)"><h2><span>01</span>The basics</h2>
      <div class="field"><label for="n">Name</label><input id="n" value="Mara Ellison"><small>Used for your name numbers. A nickname is fine too.</small></div>
      <div class="row3"><div class="field"><label>Month</label><input value="March"></div><div class="field"><label>Day</label><input value="14"></div><div class="field"><label>Year</label><input value="1992"></div></div>
      <div class="field"><label>Birth time <span class="muted" style="text-transform:none;letter-spacing:0">(optional)</span></label><input value="06:40"></div>
    </fieldset>
    <fieldset class="plate fieldset" style="border:1.5px solid var(--ink)"><h2><span>02</span>Where you began</h2>
      <div class="field"><label>Birth location</label><input value="Lis"><div class="suggest"><div><span>Lisbon, Portugal</span><small>38.72, -9.14</small></div><div><span>Lisieux, France</span><small>49.15, 0.23</small></div></div><small>Pick a city, or tap the map to drop a pin anywhere.</small></div>
      <div class="mini-map">${worldMap({ pins: [samplePins[0]], className: 'map' })}</div>
    </fieldset>
    <fieldset class="plate fieldset" style="border:1.5px solid var(--ink)"><h2><span>03</span>Things you love</h2>
      <div class="fav-cols">
        <div class="fav-col"><h3>${ic('eye')}Movies</h3><div class="chips"><span class="chip gold">Spirited Away</span><span class="chip gold">Amélie</span><span class="chip fill">Arrival</span></div><div class="field"><input placeholder="Add a movie"></div></div>
        <div class="fav-col"><h3>${ic('book')}Books</h3><div class="chips"><span class="chip green">Piranesi</span><span class="chip green">The Master and Margarita</span></div><div class="field"><input placeholder="Add a book"></div></div>
        <div class="fav-col"><h3>${ic('star')}Things</h3><div class="chips"><span class="chip ox">Night trains</span><span class="chip ox">Salt lakes</span><span class="chip fill">Cast iron pans</span></div><div class="field"><input placeholder="Add a thing"></div></div>
      </div>
      <p class="note">Optional: give each favorite a feeling (wonder, home, mystery...) and a place. Those become connections on your map.</p>
    </fieldset>
    <fieldset class="plate fieldset" style="border:1.5px solid var(--ink)"><h2><span>04</span>Who sees what</h2>
      <div class="toggle"><div><b>Numbers &amp; birth card</b><small>Life path, birth card, sun sign</small></div><span class="sw on"></span></div>
      <div class="toggle"><div><b>Map</b><small>Your birthplace and favorite places</small></div><span class="sw on"></span></div>
      <div class="toggle"><div><b>Favorites</b><small>Movies, books and things</small></div><span class="sw"></span></div>
      <div class="toggle"><div><b>Exact birth date</b><small>Off shows only the year-free numbers</small></div><span class="sw"></span></div>
    </fieldset>
    <div style="display:flex;gap:14px;flex-wrap:wrap"><a class="btn" href="profile.html">Build my second self ${ic('flourish')}</a><a class="btn ghost" href="landing.html">Back</a></div>
  </form>
  <aside class="sticky"><div class="plate id-card"><span class="eyebrow">Live preview</span><div class="sigil">M</div><h3>Mara Ellison</h3><p class="muted" style="margin:0">Born 14 March 1992 · Lisbon</p>
    <div class="stat-row light" style="width:100%"><div class="stat"><b>11</b><span>Life path</span></div><div class="stat"><b>XI</b><span>Birth card</span></div><div class="stat"><b>♓</b><span>Sun</span></div></div>
    <div class="chips" style="justify-content:center"><span class="chip gold">Spirited Away</span><span class="chip green">Piranesi</span><span class="chip ox">Night trains</span></div>
    <p class="note" style="text-align:left">Your life path is a <b>master number</b>. Tradition links 11 with intuition and the tarot card Justice.</p></div></aside>
</div>`,
}

/* ------------------------------------------------------------ tarot reading */
export const tarotReading = {
  title: 'Tarot reading', active: 'tarot-reading',
  body: `
<section class="table-sec dark" style="padding-block:36px 56px"><div class="wrap">
  <div class="section-head" style="margin-bottom:22px"><span class="eyebrow">The table</span><h1 style="font-size:clamp(2.2rem,5vw,3.6rem)">Pull a few <em>cards.</em></h1></div>
  <div class="toolbar">
    <div class="seg" role="group" aria-label="Spread"><button aria-pressed="false">One card</button><button aria-pressed="true">Three card</button><button aria-pressed="false">Celtic Cross</button></div>
    <label class="question"><span class="sr">Your question</span><input placeholder="What are you wondering about? (optional)" value="What should I carry into this new season?"></label>
    <div style="display:flex;gap:10px"><a class="btn ghost sm" href="#">Shuffle</a><a class="btn sm" href="#">Deal</a></div>
  </div>
  <div class="table">
    <div class="spread3">
      <figure>${tcard('threeCups')}<figcaption>Where you've been<b>Three of Cups</b></figcaption></figure>
      <figure>${tcard('star')}<figcaption>Where you are<b>The Star</b></figcaption></figure>
      <figure>${tcard('back')}<figcaption>What's opening<b>Tap to flip</b></figcaption></figure>
    </div>
    <p class="hint">Tap a card to flip it · drag to tilt · reduced motion is respected</p>
  </div>
</div></section>
<section class="reading"><div class="wrap">
  <div class="section-head"><span class="eyebrow">Your reading</span><h2>A story in <em>three beats.</em></h2></div>
  <div class="reading-grid">
    <article class="plate rcard"><span class="pos">Where you've been</span><h3>Three of Cups <small>Upright</small></h3><p>Good company shaped this chapter. A shared table, a toast, people who made the hard parts lighter. Notice who you want to keep close.</p><div class="chips"><span class="chip fill">friendship</span><span class="chip fill">celebration</span></div></article>
    <article class="plate rcard"><span class="pos">Where you are</span><h3>The Star <small>Upright</small></h3><p>A quiet, steady kind of hope. You do not need a big plan right now. Pour a little at a time and let the water find its level.</p><div class="chips"><span class="chip fill">hope</span><span class="chip fill">renewal</span></div></article>
    <article class="plate rcard" style="opacity:.6"><span class="pos">What's opening</span><h3>Waiting <small>Face down</small></h3><p>Flip the last card to read it. We'll weave all three together once it's turned.</p></article>
  </div>
  <div class="save-bar"><span>Readings are saved on this device only.</span><div style="display:flex;gap:10px"><a class="btn ghost sm" href="#">New reading</a><a class="btn sm" href="#">Save reading</a></div></div>
  <p class="note" style="margin-top:22px">For reflection and entertainment. A reading is a mirror, not a forecast, and is not medical, legal or financial advice.</p>
</div></section>`,
}

/* -------------------------------------------------------------- card detail */
export const cardDetail = {
  title: 'Card detail: The Star', active: 'card-detail',
  body: `
<section class="detail"><div class="wrap split">
  <div class="big-card">${tcard('star')}<div class="chips" style="justify-content:center;margin-top:26px"><span class="chip ox">Upright</span><span class="chip">Reversed</span></div></div>
  <div>
    <p class="crumbs"><a href="tarot-reading.html">The deck</a> / Major arcana / XVII</p>
    <span class="eyebrow">Major arcana · XVII</span>
    <h1 style="margin:14px 0 16px">The <em>Star</em></h1>
    <div class="chips"><span class="chip gold">hope</span><span class="chip gold">renewal</span><span class="chip gold">calm</span><span class="chip gold">trust</span><span class="chip gold">healing</span></div>
    <div class="meaning">
      <div class="plate"><h3>${ic('sun')}Upright</h3><p>After the storm comes a clear night. This card points to gentle recovery, honest hope and the courage to be seen as you are. Small, steady offerings add up.</p></div>
      <div class="plate"><h3>${ic('moon')}Reversed</h3><p>Hope feels thin and you may be running on fumes. Rest first. Look for one small thing that still glimmers and start there.</p></div>
      <div class="plate"><h3>${ic('eye')}Ask yourself</h3><p>Where could I pour a little patience, and what would help me believe it will fill back up?</p></div>
    </div>
    <div class="connect"><div><small>Number</small><b>17 → 8</b></div><div><small>Element</small><b>Air</b></div><div><small>Sign</small><b>Aquarius</b></div><div><small>Life path link</small><b>8</b></div></div>
    <div class="pager"><a class="btn ghost sm" href="#">← Strength</a><a class="btn ghost sm" href="#">The Moon →</a></div>
  </div>
</div></section>
<section style="background:var(--paper-2)"><div class="wrap"><div class="section-head"><span class="eyebrow">Keep exploring</span><h2>Cards that <em>sit nearby.</em></h2></div>
  <div class="related"><a href="#">${tcard('moon')}The Moon</a><a href="#">${tcard('sun')}The Sun</a><a href="#">${tcard('threeCups')}Three of Cups</a><a href="#">${tcard('queenSwords')}Queen of Swords</a><a href="#">${tcard('back')}Random card</a></div></div></section>`,
}

/* ------------------------------------------------------------------ profile */
export const profile = {
  title: 'Second self', active: 'profile',
  body: `
<section class="me-hero"><div class="wrap"><div class="plate">
  <div class="sigil">M</div>
  <div><span class="eyebrow">Your second self</span><h1 style="margin:10px 0 8px">Mara <em>Ellison</em></h1><p class="muted" style="margin:0 0 14px">Born 14 March 1992 · Lisbon, Portugal</p><div class="chips"><span class="chip gold">Life path 11</span><span class="chip green">Pisces sun</span><span class="chip ox">Birth card: Justice</span></div></div>
  <div class="me-actions"><a class="btn sm" href="#">${ic('share')} Share</a><a class="btn ghost sm" href="onboarding.html">Edit profile</a></div>
</div></div></section>

<section style="padding-top:0"><div class="wrap"><div class="section-head"><span class="eyebrow">Numbers</span><h2>Your <em>numbers.</em></h2></div>
  <div class="nums">
    <div class="plate numcard"><b>11</b><small>Life path</small><span>Justice</span></div>
    <div class="plate numcard"><b>5</b><small>Birthday</small><span>The Hierophant</span></div>
    <div class="plate numcard"><b>11</b><small>Expression</small><span>Justice</span></div>
    <div class="plate numcard"><b>22</b><small>Soul urge</small><span>The Fool</span></div>
    <div class="plate numcard"><b>9</b><small>Personal year</small><span>The Hermit</span></div>
  </div></div></section>

<section class="map-sec dark"><div class="wrap">
  <div class="section-head"><span class="eyebrow">Map</span><h2>Where it <em>all happens.</em></h2><p class="lede">Your birthplace and the places your favorite stories live. Tap a pin to see what it connects to.</p></div>
  ${worldMap({ pins: samplePins, links: [[samplePins[0], samplePins[4]], [samplePins[0], samplePins[2]], [samplePins[0], samplePins[1]]], className: 'map' })}
  <div class="legend"><span><i style="background:#7b2d3a"></i>Birthplace</span><span><i style="background:#3f7f73"></i>Movies &amp; books</span><span><i style="background:#d99a2b"></i>Things</span></div>
</div></section>

<section><div class="wrap"><div class="section-head"><span class="eyebrow">Connections</span><h2>How it <em>connects.</em></h2><p class="lede">Life path 11 and a Pisces sun both point toward intuition. Your favorites cluster around wonder and mystery.</p></div>
  <div class="plate" style="padding:18px">${constellation(false)}</div></div></section>

<section style="background:var(--paper-2)"><div class="wrap"><div class="grid g2" style="align-items:start">
  <div><div class="section-head" style="margin-bottom:20px"><span class="eyebrow">Favorites</span><h2 style="font-size:2rem">The things you <em>love.</em></h2></div>
    <div class="fav-lists" style="grid-template-columns:1fr 1fr 1fr">
      <div><h3>Movies</h3><ul><li>Spirited Away <small>Tokyo</small></li><li>Amélie <small>Paris</small></li><li>Arrival</li></ul></div>
      <div><h3>Books</h3><ul><li>Piranesi <small>Rome</small></li><li>Master &amp; Margarita <small>Moscow</small></li></ul></div>
      <div><h3>Things</h3><ul><li>Night trains</li><li>Salt lakes <small>Uyuni</small></li></ul></div>
    </div></div>
  <div class="plate share-box"><span class="eyebrow">Share</span><h3>Your share link</h3><p class="muted" style="margin:0">Only the sections you switch on are included. The link itself carries the data, nothing is uploaded.</p>
    <div class="toggle"><span>Numbers &amp; birth card</span><span class="sw on"></span></div><div class="toggle"><span>Map</span><span class="sw on"></span></div><div class="toggle"><span>Favorites</span><span class="sw"></span></div>
    <code>aftercare.local/share#eyJuIjoiTWFyYSIsImxwIjoxMSwi…</code><div style="display:flex;gap:10px"><a class="btn sm" href="#">Copy link</a><a class="btn ghost sm" href="#">Save as image</a></div></div>
</div></div></section>`,
}

/* ------------------------------------------------------------------ journal */
export const journal = {
  title: 'Journal', active: 'journal',
  body: `
<div class="wrap page-head"><span class="badge-later">Mockup only · Phase 2</span><h1 style="margin-top:16px">Your <em>journal.</em></h1><p class="lede">Write next to your readings. Prompts follow the card you drew, and entries stay private.</p></div>
<div class="wrap journal-layout">
  <div class="entries"><a class="btn sm" href="#" style="justify-self:start">+ New entry</a>
    <article class="plate entry sel"><time>Tue 10 Nov</time><h3>Small, steady water</h3>${tcard('star')}<p>The Star asked me to be patient. I think I've been waiting for permission...</p></article>
    <article class="plate entry"><time>Sun 8 Nov</time><h3>The table at Ana's</h3>${tcard('threeCups')}<p>Everyone brought something. Nobody left early.</p></article>
    <article class="plate entry"><time>Wed 4 Nov</time><h3>Night train notes</h3>${tcard('moon')}<p>Window seat, a thermos, a city I don't know yet.</p></article>
  </div>
  <div class="plate editor">
    <div class="field"><label>Title</label><input value="Small, steady water"></div>
    <div class="prompt">${ic('star')}<span>Where could I pour a little patience this week?</span></div>
    <div class="field"><label>Entry</label><textarea>The Star asked me to be patient. I think I've been waiting for permission to rest. Today I made tea, answered one email and went for a walk instead of fixing everything.</textarea></div>
    <div class="field"><label>Mood</label><div class="chips"><span class="chip gold">hopeful</span><span class="chip">tired</span><span class="chip">curious</span><span class="chip">tender</span><span class="chip">restless</span></div></div>
    <div class="linked"><div class="tcard" style="width:46px">${tcard('star').replace(/^<div[^>]*>|<\/div>$/g, '')}</div><div><b>Linked reading</b><br><span class="muted">Three card · Three of Cups, The Star, Justice</span></div></div>
    <div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn sm" href="#">Save entry</a><a class="btn ghost sm" href="#">Attach a card</a></div>
  </div>
</div>`,
}

/* ---------------------------------------------------------------- numerology */
export const numerology = {
  title: 'Numerology', active: 'numerology',
  body: `
<section class="dark" style="padding-block:clamp(40px,7vw,90px)"><div class="wrap split">
  <div><span class="eyebrow">Life path</span><h1 style="margin:16px 0 18px">Your path is <em>eleven.</em></h1><p class="lede">A master number, which tradition links with intuition, ideals and a sensitive antenna. It is paired here with the tarot card Justice. Treat it as a prompt for reflection, not a verdict.</p>
    <div class="chips"><span class="chip on-dark">Month 3</span><span class="chip on-dark">Day 14 → 5</span><span class="chip on-dark">Year 1992 → 3</span><span class="chip on-dark">3 + 5 + 3 = 11</span></div></div>
  <div class="dial"><svg viewBox="0 0 400 400" aria-hidden="true"><g fill="none" stroke="#d99a2b" stroke-width="1.3"><circle cx="200" cy="200" r="190"/><circle cx="200" cy="200" r="150" stroke-dasharray="3 7"/><circle cx="200" cy="200" r="110" stroke="#f3ead9" stroke-opacity=".4"/>${Array.from({ length: 11 }, (_, i) => { const a = ((i * 360) / 11 - 90) * Math.PI / 180; return `<circle cx="${200 + 190 * Math.cos(a)}" cy="${200 + 190 * Math.sin(a)}" r="${i === 10 ? 8 : 4}" fill="#d99a2b"/>` }).join('')}</g></svg><b>11</b><small>Life path</small></div>
</div></section>
<section><div class="wrap split rev">
  <div class="plate calc"><h3>Try another date or name</h3><div class="field"><label>Full name</label><input value="Mara Ellison"></div><div class="field"><label>Date of birth</label><input value="1992-03-14"></div><a class="btn sm" href="#" style="justify-self:start">Calculate</a>
    <div class="stat-row light"><div class="stat"><b>11</b><span>Life path</span></div><div class="stat"><b>5</b><span>Birthday</span></div><div class="stat"><b>11</b><span>Expression</span></div></div></div>
  <div><div class="section-head" style="margin-bottom:18px"><span class="eyebrow">The method</span><h2 style="font-size:2.2rem">Plain arithmetic, <em>shown.</em></h2></div><p class="muted">Reduce the month, day and year separately, add them, reduce again. Keep 11, 22 and 33 as master numbers. Name numbers use the Pythagorean letter table (A=1 ... I=9, J=1 ...).</p><p class="note">Numerology is a reflective tradition, not a science. Use it as a conversation starter with yourself.</p></div>
</div></section>
<section style="background:var(--paper-2)"><div class="wrap"><div class="section-head"><span class="eyebrow">Meanings</span><h2>Nine numbers, <em>three masters.</em></h2></div>
  <table class="table-nums"><thead><tr><th></th><th>Theme</th><th>Tarot pairing</th></tr></thead><tbody>
    <tr><td>1</td><td>Beginnings, independence, the first spark</td><td>The Magician</td></tr><tr><td>2</td><td>Partnership, patience, listening</td><td>The High Priestess</td></tr><tr><td>3</td><td>Expression, play, making things</td><td>The Empress</td></tr>
    <tr><td>7</td><td>Study, solitude, the inner question</td><td>The Chariot</td></tr><tr><td>11</td><td>Intuition and ideals (master)</td><td>Justice</td></tr><tr><td>22</td><td>Big builder energy (master)</td><td>The Fool</td></tr>
  </tbody></table></div></section>`,
}

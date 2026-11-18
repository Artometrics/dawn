/**
 * Recipes Studio: every card is a small self-contained HTML document.
 * Sizes are written in rem, and 1rem is 1/40 of the canvas width, so a recipe
 * scales cleanly from a board thumbnail to a full editor canvas.
 *
 * Editable slots:
 *   data-e="text"  inline text (font, size, color, weight, case, align)
 *   data-e="img"   swappable image (replace, fit, black and white)
 *   data-e="box"   colored block (fill)
 * The canvas palette lives on :root as --bg, --fg and --ac.
 */

export type StudioKind = 'Tickets' | 'Cards' | 'Magazines' | 'Posters' | 'Books' | 'Spreads' | 'Archive' | 'Ours' | 'Motion' | 'Game';

export type StudioSource = {
  /** Who made it, as credited on the source page. */
  by: string;
  date: string;
  license: string;
  /** Link to the page the scan came from, or the repo for our own assets. */
  url: string;
  note?: string;
};

export type StudioRecipe = {
  id: string;
  title: string;
  kind: StudioKind;
  /** width / height, as CSS aspect-ratio. */
  ratio: string;
  /** One line under the card: what the recipe is good for. */
  blurb: string;
  /** Badge on the card. */
  origin: 'Original' | 'Inspired' | 'Public domain' | 'Ours';
  inspiredBy?: string;
  source?: StudioSource;
  palette: [string, string, string];
  css: string;
  html: string;
  js?: string;
};

export const STUDIO_FONTS = [
  { name: 'Bodoni Moda', family: "'Bodoni Moda', serif", tag: 'Didone' },
  { name: 'Playfair Display', family: "'Playfair Display', serif", tag: 'Serif' },
  { name: 'Instrument Serif', family: "'Instrument Serif', serif", tag: 'Serif' },
  { name: 'Fraunces', family: "'Fraunces', serif", tag: 'Serif' },
  { name: 'Inter', family: "'Inter', sans-serif", tag: 'Sans' },
  { name: 'Space Grotesk', family: "'Space Grotesk', sans-serif", tag: 'Sans' },
  { name: 'Archivo Black', family: "'Archivo Black', sans-serif", tag: 'Heavy' },
  { name: 'Anton', family: "'Anton', sans-serif", tag: 'Condensed' },
  { name: 'Bebas Neue', family: "'Bebas Neue', sans-serif", tag: 'Condensed' },
  { name: 'Rubik Mono One', family: "'Rubik Mono One', sans-serif", tag: 'Display' },
  { name: 'IBM Plex Mono', family: "'IBM Plex Mono', monospace", tag: 'Mono' },
  { name: 'Press Start 2P', family: "'Press Start 2P', monospace", tag: 'Pixel' },
  { name: 'Caveat', family: "'Caveat', cursive", tag: 'Hand' },
  { name: 'Permanent Marker', family: "'Permanent Marker', cursive", tag: 'Marker' },
] as const;

export const STUDIO_FONT_CSS =
  'https://fonts.googleapis.com/css2?' +
  [
    'Bodoni+Moda:ital,opsz,wght@0,6..96,400..900;1,6..96,400..900',
    'Playfair+Display:ital,wght@0,400..900;1,400..900',
    'Instrument+Serif:ital@0;1',
    'Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900',
    'Inter:wght@400..900',
    'Space+Grotesk:wght@400..700',
    'Archivo+Black',
    'Anton',
    'Bebas+Neue',
    'Rubik+Mono+One',
    'IBM+Plex+Mono:wght@400;600',
    'Press+Start+2P',
    'Caveat:wght@500;700',
    'Permanent+Marker',
  ]
    .map((f) => `family=${f}`)
    .join('&') +
  '&display=swap';

export const STUDIO_SWATCHES = ['#111111', '#ffffff', '#f4efe6', '#e8322b', '#ff5fa2', '#ffcc00', '#c6ff3d', '#2f6bff', '#00b3a4', '#7a3cff', '#ff7a1a', '#8a8a8a'];

export const STUDIO_PALETTES: Array<[string, string, string]> = [
  ['#f4efe6', '#111111', '#e8322b'],
  ['#111111', '#ffffff', '#c6ff3d'],
  ['#ffffff', '#111111', '#2f6bff'],
  ['#ff5fa2', '#111111', '#ffffff'],
  ['#ffcc00', '#111111', '#e8322b'],
  ['#0f1b3d', '#f4efe6', '#ff7a1a'],
  ['#e8f5ef', '#0b3d2e', '#ff5fa2'],
];

const A = '/recipes/studio';

/** CSS every recipe document starts with. */
export const STUDIO_BASE_CSS = `*{box-sizing:border-box;margin:0;padding:0}
:root{font-size:calc(100vw / 40);--bg:#fff;--fg:#111;--ac:#e8322b}
html,body{width:100%;height:100%;overflow:hidden}
body{position:relative;background:var(--bg);color:var(--fg);font-family:'Inter',system-ui,sans-serif;-webkit-font-smoothing:antialiased;line-height:1.1}
img{display:block;max-width:100%}
.fill{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
[data-e]{outline-offset:.15rem}`;

function commons(page: string, by: string, date: string, note?: string): StudioSource {
  return { by, date, license: 'Public domain (Wikimedia Commons)', url: `https://commons.wikimedia.org/wiki/${page}`, note };
}

/** Three ways to turn a scan into an editable HTML page. */
function archive(
  id: string,
  title: string,
  img: string,
  source: StudioSource,
  layout: 'mat' | 'bleed' | 'remix',
  opts: { ratio?: string; palette?: [string, string, string]; kicker?: string; head?: string; dek?: string },
): StudioRecipe {
  const palette = opts.palette ?? ['#f4efe6', '#111111', '#e8322b'];
  const head = opts.head ?? title;
  const kicker = opts.kicker ?? source.date;
  if (layout === 'mat') {
    return {
      id, title, kind: 'Archive', ratio: opts.ratio ?? '3/4', origin: 'Public domain', source, palette,
      blurb: 'Museum mat: the scan, a caption and a credit line.',
      css: `.mat{position:absolute;inset:2.4rem 2.4rem 9rem;box-shadow:0 .6rem 1.6rem rgba(0,0,0,.18);background:#fff;padding:1rem}
.mat img{width:100%;height:100%;object-fit:cover}
.cap{position:absolute;left:2.4rem;right:2.4rem;bottom:2.2rem}
.k{font:600 .9rem/1 'IBM Plex Mono',monospace;letter-spacing:.08em;text-transform:uppercase;color:var(--ac)}
.h{font:400 2.6rem/1 'Instrument Serif',serif;margin-top:.6rem}
.c{font:400 .8rem/1.3 'IBM Plex Mono',monospace;opacity:.6;margin-top:.6rem}`,
      html: `<div class="mat" data-e="box"><img data-e="img" src="${A}/${img}" alt="${title}"></div>
<div class="cap"><p class="k" data-e="text">${kicker}</p><h1 class="h" data-e="text">${head}</h1><p class="c" data-e="text">${source.by} · ${source.license}</p></div>`,
    };
  }
  if (layout === 'bleed') {
    return {
      id, title, kind: 'Archive', ratio: opts.ratio ?? '3/4', origin: 'Public domain', source, palette,
      blurb: 'Full-bleed scan with a modern credit strip.',
      css: `.strip{position:absolute;left:0;right:0;bottom:0;padding:1.4rem 1.8rem;background:var(--fg);color:var(--bg);display:flex;justify-content:space-between;align-items:end;gap:1rem}
.h{font:400 2.2rem/1 'Instrument Serif',serif}
.c{font:500 .75rem/1.3 'IBM Plex Mono',monospace;text-align:right;opacity:.75;max-width:14rem}`,
      html: `<img class="fill" data-e="img" src="${A}/${img}" alt="${title}">
<div class="strip" data-e="box"><h1 class="h" data-e="text">${head}</h1><p class="c" data-e="text">${kicker}<br>${source.by}<br>Public domain</p></div>`,
    };
  }
  return {
    id, title, kind: 'Archive', ratio: opts.ratio ?? '3/4', origin: 'Public domain', source, palette,
    blurb: 'Remix: the scan under a new masthead and cover lines.',
    css: `.m{position:absolute;top:1.2rem;left:0;right:0;text-align:center;font:900 7.4rem/.8 'Bodoni Moda',serif;letter-spacing:-.04em;color:var(--bg);mix-blend-mode:difference}
.lines{position:absolute;left:1.6rem;bottom:2rem;display:grid;gap:.5rem;max-width:22rem}
.lines p{font:800 1.5rem/1 'Inter',sans-serif;color:#fff;text-shadow:0 .1rem .6rem rgba(0,0,0,.45)}
.lines p:first-child{display:inline-block;justify-self:start;background:var(--ac);padding:.3rem .5rem;font-size:.9rem;letter-spacing:.1em;text-transform:uppercase;text-shadow:none}
.c{position:absolute;right:1.2rem;bottom:1rem;font:500 .6rem 'IBM Plex Mono',monospace;color:#fff;opacity:.8}`,
    html: `<img class="fill" data-e="img" src="${A}/${img}" alt="${title}">
<h1 class="m" data-e="text">${head}</h1>
<div class="lines"><p data-e="text">${kicker}</p><p data-e="text">${opts.dek ?? 'The archive issue'}</p></div>
<p class="c" data-e="text">Art: ${source.by} (PD)</p>`,
  };
}

function pixelBall(): string {
  const rows = [
    '....oooo....',
    '..oOOOOOOo..',
    '.oOOkOOkOOo.',
    '.OOOkOOkOOO.',
    'oOkkkkkkkkOo',
    'oOOOkOOkOOOo',
    'oOOOkOOkOOOo',
    'oOkkkkkkkkOo',
    '.OOOkOOkOOO.',
    '.oOOkOOkOOo.',
    '..oOOOOOOo..',
    '....oooo....',
  ];
  const col: Record<string, string> = { o: '#b4471c', O: '#ff7a1a', k: '#2a1408' };
  const out: string[] = [];
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (col[ch]) out.push(`${x}em ${y}em 0 ${col[ch]}`); }));
  return out.join(',');
}

const STUDIO_CORE: StudioRecipe[] = [
  {
    id: 'didone-fashion',
    title: 'Didone fashion cover',
    kind: 'Magazines',
    ratio: '3/4',
    origin: 'Inspired',
    inspiredBy: 'Vogue-style fashion covers: hairline Didone masthead, stacked cover lines',
    blurb: 'Giant hairline masthead over a full-bleed portrait.',
    palette: ['#f4efe6', '#111111', '#e8322b'],
    source: commons('File:Vogue_cover_April_1st,_1918,_by_George_Wolfe_Plank.jpg', 'George Wolfe Plank', '1918', 'Cover art only. Masthead and cover lines are original.'),
    css: `.m{position:absolute;top:.6rem;left:0;right:0;text-align:center;font:400 9.6rem/1 'Bodoni Moda',serif;letter-spacing:.06em;color:var(--fg);z-index:2}
.d{position:absolute;top:10.6rem;left:0;right:0;text-align:center;font:500 .75rem 'Inter';letter-spacing:.3em;text-transform:uppercase;z-index:2}
.pic{position:absolute;left:0;top:-9rem;width:100%;height:calc(100% + 11rem);object-fit:cover}
.l{position:absolute;left:1.6rem;top:16rem;width:13rem;display:grid;gap:1.4rem;z-index:2}
.l h2{font:italic 400 2rem/1 'Bodoni Moda',serif}
.l p{font:600 .8rem/1.3 'Inter';letter-spacing:.12em;text-transform:uppercase}
.big{position:absolute;right:1.6rem;bottom:2rem;text-align:right;font:900 4.4rem/.85 'Bodoni Moda',serif;color:var(--ac);z-index:2}`,
    html: `<img class="pic" data-e="img" src="${A}/pd-vogue-1918-plank.jpg" alt="Cover art">
<h1 class="m" data-e="text">DAWN</h1><p class="d" data-e="text">The Spring Issue · No. 01</p>
<div class="l"><h2 data-e="text">The new romantics</h2><p data-e="text">Forty looks that feel like a daydream</p><h2 data-e="text">Studio notes</h2><p data-e="text">How we build covers in HTML</p></div>
<p class="big" data-e="text">Pure<br>Bloom</p>`,
  },
  {
    id: 'wink-cover',
    title: 'Wink cover',
    kind: 'Magazines',
    ratio: '3/4',
    origin: 'Inspired',
    inspiredBy: 'i-D style: lowercase masthead, the cover-star wink, sticker cover lines',
    blurb: 'Lowercase masthead, a wink, neon stickers.',
    palette: ['#c6ff3d', '#111111', '#ff5fa2'],
    css: `.m{position:absolute;top:1rem;left:1.4rem;font:900 8.4rem/.8 'Archivo Black';letter-spacing:-.06em;color:var(--fg)}
.face{position:absolute;left:50%;top:56%;width:26rem;height:26rem;transform:translate(-50%,-50%);border-radius:50%;background:var(--ac);box-shadow:inset -1.4rem -1.4rem 0 rgba(0,0,0,.12)}
.eye{position:absolute;top:9rem;width:3rem;height:3.6rem;border-radius:50%;background:var(--fg)}
.eye.l{left:7rem}.eye.r{right:7rem;height:.9rem;top:10.6rem;border-radius:1rem;transform:rotate(-8deg)}
.mouth{position:absolute;left:7rem;right:7rem;top:15rem;height:5.4rem;border-bottom:1.2rem solid var(--fg);border-radius:0 0 50% 50%}
.st{position:absolute;padding:.5rem .8rem;background:var(--fg);color:var(--bg);font:800 1.1rem/1 'Inter';border-radius:3rem;transform:rotate(-6deg)}
.s1{right:1.4rem;top:3rem}.s2{left:1.4rem;bottom:2.4rem;transform:rotate(4deg);background:#fff;color:#111}
.n{position:absolute;right:1.4rem;bottom:2rem;font:700 .8rem 'IBM Plex Mono'}`,
    html: `<h1 class="m" data-e="text">ok-d</h1>
<div class="face" data-e="box"><span class="eye l"></span><span class="eye r"></span><span class="mouth"></span></div>
<p class="st s1" data-e="text">the joy issue!</p><p class="st s2" data-e="text">Who made the internet fun again?</p>
<p class="n" data-e="text">No. 404 · $12</p>`,
  },
  {
    id: 'noise-bw',
    title: 'Noise: black and white',
    kind: 'Magazines',
    ratio: '3/4',
    origin: 'Inspired',
    inspiredBy: 'Vice-style: stark black and white, condensed caps, halftone grain',
    blurb: 'Stark condensed caps on halftone grain.',
    palette: ['#111111', '#ffffff', '#ffffff'],
    css: `body{background-image:radial-gradient(rgba(255,255,255,.18) 18%,transparent 19%);background-size:.7rem .7rem}
.m{position:absolute;top:1rem;left:1.2rem;right:1.2rem;font:400 11rem/.8 'Anton';letter-spacing:-.01em;color:var(--fg)}
.bar{position:absolute;left:0;right:0;top:15rem;height:.4rem;background:var(--fg)}
.h{position:absolute;left:1.2rem;right:1.2rem;bottom:5rem;font:400 6rem/.86 'Anton';text-transform:uppercase}
.k{position:absolute;left:1.2rem;bottom:2rem;font:600 .9rem 'IBM Plex Mono';letter-spacing:.06em;text-transform:uppercase}
.v{position:absolute;right:1.2rem;top:16rem;writing-mode:vertical-rl;font:600 .9rem 'IBM Plex Mono';letter-spacing:.2em}`,
    html: `<h1 class="m" data-e="text">NOISE</h1><span class="bar" data-e="box"></span>
<p class="v" data-e="text">VOL. 23 · ISSUE 07 · FREE</p>
<h2 class="h" data-e="text">The fever dream issue</h2><p class="k" data-e="text">Twelve stories nobody asked for</p>`,
  },
  {
    id: 'static-grunge',
    title: 'Static: grunge type',
    kind: 'Magazines',
    ratio: '3/4',
    origin: 'Inspired',
    inspiredBy: 'Ray Gun / David Carson: colliding type, rotated layers, broken grid',
    blurb: 'Colliding type layers and a broken grid.',
    palette: ['#e9e2d0', '#1a1a1a', '#e8322b'],
    css: `.t{position:absolute;white-space:nowrap}
.a{left:-1rem;top:2rem;font:900 12rem/.8 'Archivo Black';color:var(--ac);transform:rotate(-8deg);opacity:.9}
.b{left:3rem;top:10rem;font:italic 400 7rem/.8 'Playfair Display';transform:rotate(4deg);mix-blend-mode:multiply}
.c{right:-2rem;top:20rem;font:400 9rem/.8 'Bebas Neue';writing-mode:vertical-rl;letter-spacing:-.02em}
.d{left:2rem;bottom:8rem;font:400 2.2rem/1 'IBM Plex Mono';transform:rotate(-3deg);background:var(--fg);color:var(--bg);padding:.2rem .6rem}
.e{left:2rem;bottom:3rem;width:22rem;white-space:normal;font:400 .9rem/1.25 'IBM Plex Mono';opacity:.75}
.x{position:absolute;left:0;right:0;top:30rem;height:.25rem;background:var(--fg);transform:rotate(-12deg)}`,
    html: `<span class="x"></span><h1 class="t a" data-e="text">STATIC</h1><p class="t b" data-e="text">loud/quiet</p><p class="t c" data-e="text">DISTORT</p>
<p class="t d" data-e="text">the end of print?</p><p class="t e" data-e="text">Type is image. Read it sideways, upside down, all at once. Legibility is optional, feeling is not.</p>`,
  },
  {
    id: 'signal-neon',
    title: 'Signal: neon tech',
    kind: 'Magazines',
    ratio: '3/4',
    origin: 'Inspired',
    inspiredBy: '90s tech magazines (Wired era): fluorescent ink, mono specs',
    blurb: 'Fluorescent gradient, mono specs, a big number.',
    palette: ['#0b0b12', '#f4f4f4', '#ff2bd6'],
    css: `body{background:linear-gradient(160deg,var(--ac),#ffcc00 55%,#00e0c6)}
.m{position:absolute;top:1.2rem;left:1.4rem;font:400 6.2rem/1 'Rubik Mono One';color:var(--bg);letter-spacing:-.05em}
.n{position:absolute;right:1.2rem;top:12rem;font:900 20rem/.8 'Archivo Black';color:transparent;-webkit-text-stroke:.25rem var(--bg)}
.box{position:absolute;left:1.4rem;bottom:2rem;width:24rem;padding:1.2rem;background:var(--bg);color:var(--fg)}
.box h2{font:700 2.2rem/1 'Space Grotesk'}
.box p{font:400 .85rem/1.35 'IBM Plex Mono';margin-top:.6rem;color:#c6ff3d}`,
    html: `<h1 class="m" data-e="text">SIGNAL</h1><p class="n" data-e="text">01</p>
<div class="box" data-e="box"><h2 data-e="text">The agents are shipping</h2><p data-e="text">&gt; 30 recipes, zero build steps, one HTML file each_</p></div>`,
  },
  {
    id: 'still-minimal',
    title: 'Still: quiet minimal',
    kind: 'Magazines',
    ratio: '3/4',
    origin: 'Inspired',
    inspiredBy: 'Slow-living quarterlies (Kinfolk-style): air, small serif, one image',
    blurb: 'Lots of air, small serif, one quiet image.',
    palette: ['#f6f3ee', '#2b2b2b', '#a38b6d'],
    css: `.m{position:absolute;top:2.6rem;left:0;right:0;text-align:center;font:400 1.6rem 'Fraunces';letter-spacing:.6em}
.img{position:absolute;left:8rem;right:8rem;top:8rem;height:28rem;overflow:hidden}
.img img{width:100%;height:100%;object-fit:cover;filter:saturate(.6)}
.h{position:absolute;left:0;right:0;top:39rem;text-align:center;font:italic 300 2.4rem 'Fraunces'}
.f{position:absolute;left:0;right:0;bottom:2.4rem;text-align:center;font:400 .7rem 'Inter';letter-spacing:.3em;text-transform:uppercase;color:var(--ac)}`,
    source: commons('File:Zion_National_Park_poster_1938.jpg', 'National Park Service (WPA)', '1938'),
    html: `<h1 class="m" data-e="text">STILL</h1><div class="img"><img data-e="img" src="${A}/pd-wpa-zion.jpg" alt=""></div>
<h2 class="h" data-e="text">On slowness</h2><p class="f" data-e="text">Issue nine · Autumn</p>`,
  },
  {
    id: 'feature-spread',
    title: 'Feature spread',
    kind: 'Spreads',
    ratio: '16/10',
    origin: 'Original',
    blurb: 'Two-page editorial: image left, drop cap and pull quote right.',
    palette: ['#ffffff', '#111111', '#e8322b'],
    source: commons('File:Mucha-job.jpg', 'Alphonse Mucha', '1896'),
    css: `.l{position:absolute;left:0;top:0;bottom:0;width:50%}
.l img{width:100%;height:100%;object-fit:cover}
.r{position:absolute;left:52%;right:2rem;top:2rem;bottom:2rem}
.k{font:600 .6rem 'IBM Plex Mono';letter-spacing:.12em;color:var(--ac);text-transform:uppercase}
.h{font:400 2.6rem/1 'Instrument Serif';margin:.6rem 0 1rem}
.b{columns:2;column-gap:1rem;font:400 .55rem/1.5 'Fraunces'}
.b::first-letter{float:left;font:700 2.6rem/.8 'Playfair Display';margin:.1rem .25rem 0 0;color:var(--ac)}
.q{margin-top:1rem;font:italic 400 1.2rem/1.15 'Instrument Serif';border-top:.12rem solid var(--fg);padding-top:.6rem}`,
    html: `<div class="l"><img data-e="img" src="${A}/pd-mucha-job.jpg" alt=""></div>
<div class="r"><p class="k" data-e="text">Feature · Art Nouveau</p><h1 class="h" data-e="text">The whiplash line</h1>
<p class="b" data-e="text">Mucha drew hair like weather. Every curve on the poster bends back toward the word at the top, so your eye keeps circling the brand without noticing it is being sold to. That trick still works in HTML: one oversized word, one figure, and lines that point home. Edit this paragraph, change the drop cap color, and swap the image for anything in the archive.</p>
<p class="q" data-e="text">“Every curve points back to the name.”</p></div>`,
  },
  {
    id: 'data-spread',
    title: 'Artometrics data spread',
    kind: 'Spreads',
    ratio: '16/10',
    origin: 'Ours',
    blurb: 'Artometrics-style chart page with coded title.',
    palette: ['#ffffff', '#111111', '#2f6bff'],
    css: `.k{position:absolute;left:2rem;top:2rem;font:600 .7rem 'IBM Plex Mono';letter-spacing:.08em}
.h{position:absolute;left:2rem;top:3.6rem;width:15rem;font:400 2.6rem/1 'Instrument Serif'}
.p{position:absolute;left:2rem;top:13rem;width:14rem;font:400 .65rem/1.5 'Inter';opacity:.75}
.ch{position:absolute;left:19rem;right:2rem;top:3rem;bottom:3rem;display:flex;align-items:end;gap:.6rem;border-bottom:.1rem solid var(--fg)}
.ch i{flex:1;background:var(--fg);position:relative;animation:g 1.2s cubic-bezier(.34,1.56,.64,1) both}
.ch i.hi{background:var(--ac)}
.ch i::after{content:attr(data-v);position:absolute;top:-1.1rem;left:0;right:0;text-align:center;font:600 .55rem 'IBM Plex Mono';color:var(--fg)}
@keyframes g{from{transform:scaleY(0);transform-origin:bottom}}
.s{position:absolute;right:2rem;bottom:1.4rem;font:400 .5rem 'IBM Plex Mono';opacity:.6}`,
    html: `<p class="k" data-e="text">[ARTOMETRICS / 07]</p><h1 class="h" data-e="text">Who wins the judges?</h1>
<p class="p" data-e="text">Average first-week score by season. Swap the title, recolor the highlight bar, or download the page as one HTML file.</p>
<div class="ch"><i style="height:40%" data-v="18"></i><i style="height:55%" data-v="21"></i><i style="height:48%" data-v="19"></i><i class="hi" style="height:86%" data-v="27" data-e="box"></i><i style="height:62%" data-v="22"></i><i style="height:70%" data-v="24"></i></div>
<p class="s" data-e="text">Source: sample data for the layout</p>`,
  },
  {
    id: 'swiss-poster',
    title: 'Swiss circles poster',
    kind: 'Posters',
    ratio: '2/3',
    origin: 'Inspired',
    inspiredBy: 'International Typographic Style (Müller-Brockmann concert posters)',
    blurb: 'Grid, circles and flush-left Helvetica-style type.',
    palette: ['#f2f0ea', '#111111', '#e8322b'],
    css: `.c{position:absolute;border-radius:50%}
.c1{width:34rem;height:34rem;left:-6rem;top:-4rem;background:var(--fg)}
.c2{width:20rem;height:20rem;left:14rem;top:12rem;background:var(--ac);mix-blend-mode:multiply}
.c3{width:10rem;height:10rem;left:4rem;top:30rem;border:.6rem solid var(--fg)}
.t{position:absolute;left:2rem;bottom:2rem;right:2rem;display:grid;grid-template-columns:1fr 1fr;gap:1rem;font:700 1rem/1.2 'Inter'}
.t h1{grid-column:1/-1;font:800 5rem/.9 'Inter';letter-spacing:-.05em}`,
    html: `<span class="c c1" data-e="box"></span><span class="c c2" data-e="box"></span><span class="c c3"></span>
<div class="t"><h1 data-e="text">musica viva</h1><p data-e="text">Tonhalle<br>Freitag 20 Uhr</p><p data-e="text">Dawn Studio<br>Recipes no. 3</p></div>`,
  },
  {
    id: 'bauhaus-poster',
    title: 'Bauhaus shapes poster',
    kind: 'Posters',
    ratio: '2/3',
    origin: 'Inspired',
    inspiredBy: 'Bauhaus 1923 exhibition graphics: primary shapes, bold sans',
    blurb: 'Primary circle, square, triangle and a heavy word.',
    palette: ['#efe6d2', '#111111', '#2f6bff'],
    css: `.sq{position:absolute;left:2rem;top:2rem;width:16rem;height:16rem;background:#e8322b}
.ci{position:absolute;right:2rem;top:10rem;width:18rem;height:18rem;border-radius:50%;background:var(--ac)}
.tr{position:absolute;left:6rem;top:24rem;width:0;height:0;border-left:10rem solid transparent;border-right:10rem solid transparent;border-bottom:17rem solid #ffcc00}
.h{position:absolute;left:2rem;bottom:4rem;font:900 6.4rem/.85 'Archivo Black';letter-spacing:-.04em}
.s{position:absolute;left:2rem;bottom:2rem;font:600 1rem 'Space Grotesk';letter-spacing:.2em}`,
    html: `<span class="sq" data-e="box"></span><span class="ci" data-e="box"></span><span class="tr"></span>
<h1 class="h" data-e="text">BUILD</h1><p class="s" data-e="text">DAWN · WERKSTATT · 2026</p>`,
  },
  {
    id: 'riso-gig',
    title: 'Riso gig poster',
    kind: 'Posters',
    ratio: '2/3',
    origin: 'Original',
    blurb: 'Two-ink risograph overprint with a halftone sun.',
    palette: ['#fbf6ec', '#ff5fa2', '#2f6bff'],
    css: `.sun{position:absolute;left:5rem;top:6rem;width:30rem;height:30rem;border-radius:50%;background:radial-gradient(var(--fg) 30%,transparent 31%) 0 0/1.1rem 1.1rem}
.h{position:absolute;left:1.6rem;top:2rem;font:400 11rem/.8 'Bebas Neue';color:var(--ac);mix-blend-mode:multiply}
.h2{position:absolute;left:1.6rem;top:30rem;font:400 8rem/.8 'Bebas Neue';color:var(--fg);mix-blend-mode:multiply}
.i{position:absolute;left:1.6rem;bottom:2rem;font:700 1.2rem/1.3 'Space Grotesk';color:var(--ac)}`,
    html: `<span class="sun" data-e="box"></span><h1 class="h" data-e="text">LATE</h1><h2 class="h2" data-e="text">SUN SET</h2>
<p class="i" data-e="text">Fri 11.20 · Doors 8pm<br>The Garage, Oakland</p>`,
  },
  {
    id: 'park-poster',
    title: 'National park screenprint',
    kind: 'Posters',
    ratio: '2/3',
    origin: 'Inspired',
    inspiredBy: '1930s WPA national park screenprints (see the real ones in Archive)',
    blurb: 'Layered CSS mountains in flat screenprint color.',
    palette: ['#f6d7a7', '#2b2b2b', '#c4472d'],
    css: `.sky{position:absolute;inset:0;background:linear-gradient(#f6d7a7,#f2b880)}
.sunc{position:absolute;left:24rem;top:8rem;width:8rem;height:8rem;border-radius:50%;background:#fff3d6}
.m1{position:absolute;left:0;right:0;bottom:14rem;height:24rem;background:var(--ac);clip-path:polygon(0 70%,18% 30%,30% 52%,48% 6%,66% 46%,80% 24%,100% 60%,100% 100%,0 100%)}
.m2{position:absolute;left:0;right:0;bottom:8rem;height:18rem;background:#7a3b2e;clip-path:polygon(0 50%,22% 20%,40% 60%,62% 30%,84% 64%,100% 40%,100% 100%,0 100%)}
.m3{position:absolute;left:0;right:0;bottom:0;height:12rem;background:#2b2b2b}
.t{position:absolute;left:0;right:0;bottom:2rem;text-align:center;color:#f6d7a7}
.t h1{font:400 4.6rem/.9 'Bebas Neue';letter-spacing:.06em}
.t p{font:600 1rem 'Space Grotesk';letter-spacing:.3em}
.top{position:absolute;left:0;right:0;top:2rem;text-align:center;font:600 1rem 'Space Grotesk';letter-spacing:.3em}`,
    html: `<span class="sky" data-e="box"></span><span class="sunc"></span><span class="m1" data-e="box"></span><span class="m2"></span><span class="m3" data-e="box"></span>
<p class="top" data-e="text">RANGER NATURALIST SERVICE</p><div class="t"><h1 data-e="text">DAWN PEAK</h1><p data-e="text">NATIONAL PARK</p></div>`,
  },
  {
    id: 'triband-book',
    title: 'Tri-band paperback',
    kind: 'Books',
    ratio: '2/3',
    origin: 'Inspired',
    inspiredBy: 'Classic 1930s paperback tri-band layout (Penguin-style horizontal grid)',
    blurb: 'Color band, title band, color band.',
    palette: ['#ff7a1a', '#111111', '#ffffff'],
    css: `.b{position:absolute;left:0;right:0;background:var(--bg)}
.b1{top:0;height:18rem}.b3{bottom:0;height:18rem}
.mid{position:absolute;left:0;right:0;top:18rem;bottom:18rem;background:var(--ac);display:grid;place-content:center;text-align:center;gap:1rem;padding:0 3rem}
.mid h1{font:700 3rem/1 'Fraunces'}.mid p{font:400 1.4rem 'Fraunces'}
.mid hr{border:0;height:.12rem;background:var(--fg);width:8rem;margin:0 auto}
.pub{position:absolute;left:0;right:0;top:6rem;text-align:center;font:700 1.3rem 'Inter';letter-spacing:.3em;color:#fff}
.oval{position:absolute;left:50%;bottom:6rem;transform:translateX(-50%);width:6rem;height:4rem;border-radius:50%;background:#fff;display:grid;place-items:center;font:800 .9rem 'Inter';color:var(--bg)}`,
    html: `<span class="b b1" data-e="box"></span><p class="pub" data-e="text">DAWN BOOKS</p><div class="mid" data-e="box"><h1 data-e="text">The Recipe Studio</h1><hr><p data-e="text">Kyle McAuliffe</p></div>
<span class="b b3" data-e="box"></span><span class="oval" data-e="text">6d</span>`,
  },
  {
    id: 'pulp-book',
    title: 'Pulp paperback',
    kind: 'Books',
    ratio: '2/3',
    origin: 'Original',
    blurb: 'Mid-century pulp: slanted title, price corner, drama.',
    palette: ['#ffcc00', '#111111', '#e8322b'],
    source: commons('File:The_Masses,_Volume_5,_Issue_6.pdf', 'The Masses (various artists)', '1914'),
    css: `.img{position:absolute;inset:9rem 0 0 0}.img img{width:100%;height:100%;object-fit:cover;filter:contrast(1.1) saturate(1.2)}
.h{position:absolute;left:1.4rem;right:1.4rem;top:1.4rem;font:400 6rem/.82 'Anton';text-transform:uppercase;color:var(--fg);transform:skew(-8deg)}
.p{position:absolute;right:0;top:0;background:var(--ac);color:#fff;padding:.6rem 1rem;font:800 1.2rem 'Inter'}
.tag{position:absolute;left:1.4rem;bottom:2rem;background:var(--fg);color:var(--bg);padding:.6rem .8rem;font:italic 700 1.3rem 'Playfair Display';max-width:24rem}`,
    html: `<p class="h" data-e="text">She knew<br>the code</p><span class="p" data-e="text">25¢</span><div class="img"><img data-e="img" src="${A}/pd-masses-1914.jpg" alt=""></div>
<p class="tag" data-e="text">A thriller of agents, deadlines and one last deploy.</p>`,
  },
  archive('pd-vogue-1924', 'Vogue, April 1924', 'pd-vogue-1924.jpg', commons('File:VogueMagazine1Apr1924.jpg', 'Vogue (Condé Nast)', '1 Apr 1924', 'US publication before 1931, now public domain in the US.'), 'mat', { head: 'Vogue, April 1924', kicker: 'Archive · Fashion' }),
  archive('pd-bazar-erte', 'Harper’s Bazar, Feb 1921 (Erté)', 'pd-bazar-1921-erte.jpg', commons('File:Harpers_Bazar_-_cover_-_February_1921_-_Erté.jpg', 'Erté', 'Feb 1921'), 'bleed', { head: 'Erté for Harper’s Bazar', kicker: 'February 1921', palette: ['#ffffff', '#111111', '#e8322b'] }),
  archive('pd-bazar-barbier', 'Harper’s Bazar, Feb 1916 (Barbier)', 'pd-bazar-1916-barbier.jpg', commons('File:Harper%27s_Bazar_-_cover_-_February_1916_George_Barbier.jpg', 'George Barbier', 'Feb 1916'), 'remix', { head: 'BAZAAR', kicker: 'Winter edit', dek: 'Snow, silk and greyhounds', palette: ['#ffffff', '#111111', '#2f6bff'] }),
  archive('pd-gatsby', 'The Great Gatsby, 1925 cover', 'pd-gatsby-1925.jpg', commons('File:The_Great_Gatsby_Cover_1925_Retouched.jpg', 'Francis Cugat', '1925'), 'mat', { head: 'Celestial Eyes', kicker: 'Book cover · 1925', palette: ['#0f1b3d', '#f4efe6', '#ffcc00'], ratio: '2/3' }),
  archive('pd-newyorker', 'The New Yorker, 14 Mar 1925', 'pd-newyorker-1925.jpg', commons('File:The_New_Yorker_0004,_1925-03-14.pdf', 'The New Yorker (various)', '14 Mar 1925', 'Cover page rendered from the public-domain PDF.'), 'bleed', { head: 'Issue four', kicker: 'March 14, 1925' }),
  archive('pd-masses', 'The Masses, 1914', 'pd-masses-1914.jpg', commons('File:The_Masses,_Volume_5,_Issue_6.pdf', 'The Masses (various)', '1914', 'Cover page rendered from the public-domain PDF.'), 'remix', { head: 'MASSES', kicker: 'Reissue', dek: 'Art for everybody', palette: ['#ffffff', '#111111', '#e8322b'] }),
  archive('pd-puck', 'Puck, 12 May 1917', 'pd-puck-1917.jpg', commons('File:Spring_buds_Puck_magazine_cover_1917-05-12_cph.3b49312.jpg', 'Ralph Barton', '12 May 1917', 'Library of Congress scan.'), 'mat', { head: 'Spring Buds', kicker: 'Puck · 1917', palette: ['#e8f5ef', '#0b3d2e', '#ff5fa2'] }),
  archive('pd-mucha', 'Mucha, JOB poster', 'pd-mucha-job.jpg', commons('File:Mucha-job.jpg', 'Alphonse Mucha', '1896'), 'bleed', { head: 'JOB', kicker: 'Poster · 1896' }),
  archive('pd-hohlwein', 'Hohlwein, Munich Zoo 1912', 'pd-hohlwein-zoo.jpg', commons('File:Ludwig_Hohlwein_-_Zoologischer_Garten_München,_1912.jpg', 'Ludwig Hohlwein', '1912'), 'remix', { head: 'ZOO', kicker: 'Poster remix', dek: 'Night shift at the zoo', palette: ['#ffffff', '#111111', '#ff7a1a'] }),
  archive('pd-grand-canyon', 'WPA Grand Canyon, 1938', 'pd-wpa-grand-canyon.jpg', commons('File:Grand_Canyon_poster_1938.jpg', 'National Park Service (WPA)', '1938', 'US federal work, Library of Congress.'), 'mat', { head: 'Grand Canyon', kicker: 'WPA · 1938', ratio: '2/3' }),
  {
    id: 'artometrics-banner',
    title: 'Artometrics banner',
    kind: 'Ours',
    ratio: '3/1',
    origin: 'Ours',
    blurb: 'Brand wordmark banner with an editable tagline.',
    palette: ['#ff5fa2', '#111111', '#2f6bff'],
    source: { by: 'Artometrics', date: '2026', license: 'Ours', url: 'https://artometrics.com' },
    css: `body{background:var(--bg);background-image:radial-gradient(rgba(0,0,0,.12) 20%,transparent 21%);background-size:.8rem .8rem}
.w{position:absolute;left:2rem;top:50%;transform:translateY(-62%);width:24rem}
.t{position:absolute;right:2rem;top:50%;transform:translateY(-50%);width:11rem;font:400 1.6rem/1 'Instrument Serif';text-align:right}
.k{position:absolute;left:2rem;bottom:1rem;font:600 .55rem 'IBM Plex Mono';letter-spacing:.1em}`,
    html: `<img class="w" data-e="img" src="${A}/wordmark-06-blue-on-pink.webp" alt="Artometrics"><p class="t" data-e="text">Data you can feel.</p><p class="k" data-e="text">[ARTOMETRICS.COM]</p>`,
  },
  {
    id: 'artometrics-a',
    title: 'Artometrics “A” sticker',
    kind: 'Ours',
    ratio: '1/1',
    origin: 'Ours',
    blurb: 'The A mark on a spinning badge ring.',
    palette: ['#111111', '#ffffff', '#ff5fa2'],
    source: { by: 'Artometrics', date: '2026', license: 'Ours', url: 'https://artometrics.com' },
    css: `.a{position:absolute;left:50%;top:50%;width:22rem;transform:translate(-50%,-50%);border-radius:50%;background:var(--ac);padding:2rem}
.ring{position:absolute;inset:3rem;animation:s 18s linear infinite}
.ring text{font:700 2.1px 'IBM Plex Mono';letter-spacing:.6px;fill:var(--fg)}
@keyframes s{to{transform:rotate(360deg)}}`,
    html: `<svg class="ring" viewBox="0 0 40 40"><defs><path id="c" d="M20,20 m-17,0 a17,17 0 1,1 34,0 a17,17 0 1,1 -34,0"/></defs><text><textPath href="#c" data-e="text">ARTOMETRICS · DATA YOU CAN FEEL · ARTOMETRICS · DATA YOU CAN FEEL ·</textPath></text></svg>
<img class="a" data-e="img" src="${A}/artometrics-a.png" alt="A">`,
  },
  {
    id: 'hoops-poster',
    title: 'Hoops launch poster',
    kind: 'Game',
    ratio: '9/16',
    origin: 'Ours',
    blurb: 'Hoops sunset court, big title, play button.',
    palette: ['#1b1036', '#ffffff', '#ffcc00'],
    source: { by: 'Artometrics (Hoops / storm-toss)', date: '2026', license: 'Ours', url: 'https://github.com/Artometrics/storm-toss' },
    css: `.h{position:absolute;left:0;right:0;top:3rem;text-align:center;font:400 9rem/.85 'Rubik Mono One';color:var(--ac);text-shadow:.4rem .4rem 0 #e8322b,.8rem .8rem 0 #111;animation:b 1.6s cubic-bezier(.34,1.56,.64,1) infinite alternate}
@keyframes b{to{transform:translateY(-.8rem) rotate(-2deg)}}
.p{position:absolute;left:50%;bottom:5rem;transform:translateX(-50%);padding:1rem 2.4rem;border-radius:4rem;background:var(--ac);color:#111;font:800 2rem 'Inter';box-shadow:0 .5rem 0 #b38f00}
.s{position:absolute;left:0;right:0;bottom:2rem;text-align:center;font:600 .9rem 'IBM Plex Mono';color:#fff}`,
    html: `<img class="fill" data-e="img" src="${A}/hoops-sunset.jpg" alt="Hoops"><h1 class="h" data-e="text">HOOPS</h1>
<p class="p" data-e="text">▶ PLAY</p><p class="s" data-e="text">20 seconds. Infinite chaos.</p>`,
  },
  {
    id: 'hoops-card',
    title: 'Hoops scene trading card',
    kind: 'Game',
    ratio: '5/7',
    origin: 'Ours',
    blurb: 'Holo trading card for a Hoops scene.',
    palette: ['#111111', '#ffffff', '#7a3cff'],
    source: { by: 'Artometrics (Hoops / storm-toss)', date: '2026', license: 'Ours', url: 'https://github.com/Artometrics/storm-toss' },
    css: `.card{position:absolute;inset:1.6rem;border-radius:1.6rem;padding:1.2rem;background:linear-gradient(135deg,var(--ac),#00e0c6,#ffcc00,var(--ac));background-size:300% 300%;animation:h 6s ease infinite}
@keyframes h{50%{background-position:100% 100%}}
.in{position:absolute;inset:1.2rem;border-radius:1rem;overflow:hidden;background:#000}
.in img{width:100%;height:70%;object-fit:cover;object-position:top}
.n{position:absolute;left:1.2rem;right:1.2rem;bottom:5.6rem;font:400 2.6rem 'Press Start 2P';font-size:1.8rem;color:#fff}
.st{position:absolute;left:1.2rem;right:1.2rem;bottom:1.4rem;display:flex;justify-content:space-between;font:400 .8rem 'Press Start 2P';color:#c6ff3d}`,
    html: `<div class="card" data-e="box"><div class="in"><img data-e="img" src="${A}/hoops-aurora.jpg" alt=""><p class="n" data-e="text">AURORA</p><div class="st"><span data-e="text">SPD 07</span><span data-e="text">LUCK 99</span></div></div></div>`,
  },
  {
    id: 'pixel-ball',
    title: 'Pixel basketball sprite',
    kind: 'Game',
    ratio: '1/1',
    origin: 'Original',
    blurb: 'A 12×12 sprite in pure CSS, bouncing with squash and stretch.',
    palette: ['#2b1b4a', '#ffffff', '#ffcc00'],
    css: `body{background:var(--bg);background-image:linear-gradient(rgba(255,255,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.06) 1px,transparent 1px);background-size:2rem 2rem}
.w{position:absolute;left:50%;top:18%;width:0;height:0;animation:j .9s cubic-bezier(.5,0,.5,1) infinite alternate}
.p{width:1em;height:1em;font-size:1.8rem;box-shadow:${pixelBall()};transform:translateX(-6em);animation:q .9s cubic-bezier(.5,0,.5,1) infinite alternate}
@keyframes j{to{top:62%}}@keyframes q{90%{transform:translateX(-6em) scale(1,1)}to{transform:translateX(-6em) scale(1.2,.8) translateY(1.5em)}}
.sh{position:absolute;left:50%;bottom:12%;width:12rem;height:1.6rem;margin-left:-6rem;border-radius:50%;background:rgba(0,0,0,.4)}
.t{position:absolute;left:0;right:0;bottom:1.4rem;text-align:center;font:400 1rem 'Press Start 2P';color:var(--ac)}`,
    html: `<span class="sh"></span><div class="w"><div class="p"></div></div><p class="t" data-e="text">SPRITE_BALL.css</p>`,
  },
  {
    id: 'motion-marquee',
    title: 'Ticker marquee',
    kind: 'Motion',
    ratio: '4/5',
    origin: 'Original',
    blurb: 'Endless bands of type sliding in opposite directions.',
    palette: ['#111111', '#ffffff', '#c6ff3d'],
    css: `.row{position:absolute;left:0;white-space:nowrap;font:400 6rem/1 'Anton';text-transform:uppercase}
.row span{display:inline-block;padding-right:2rem}
.r1{top:4rem;animation:m 9s linear infinite}.r2{top:16rem;color:var(--ac);animation:m 7s linear infinite reverse}
.r3{top:28rem;-webkit-text-stroke:.12rem var(--fg);color:transparent;animation:m 11s linear infinite}
.r4{top:40rem;background:var(--ac);color:var(--bg);animation:m 6s linear infinite reverse}
@keyframes m{to{transform:translateX(-50%)}}`,
    html: `<div class="row r1"><span data-e="text">New drop ✶ New drop ✶ New drop ✶</span><span>New drop ✶ New drop ✶ New drop ✶</span></div>
<div class="row r2"><span data-e="text">Ship it ✶ Ship it ✶ Ship it ✶</span><span>Ship it ✶ Ship it ✶ Ship it ✶</span></div>
<div class="row r3"><span data-e="text">Recipes ✶ Recipes ✶ Recipes ✶</span><span>Recipes ✶ Recipes ✶ Recipes ✶</span></div>
<div class="row r4"><span data-e="text">Fever dream ✶ Fever dream ✶</span><span>Fever dream ✶ Fever dream ✶</span></div>`,
  },
  {
    id: 'motion-confetti',
    title: 'Confetti burst',
    kind: 'Motion',
    ratio: '1/1',
    origin: 'Original',
    blurb: 'Canvas confetti that fires every few seconds, or on tap.',
    palette: ['#fff7e8', '#111111', '#ff5fa2'],
    css: `canvas{position:absolute;inset:0;width:100%;height:100%}
.h{position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);text-align:center;font:900 8rem/.9 'Archivo Black';color:var(--fg);animation:p 3s cubic-bezier(.34,1.56,.64,1) infinite}
@keyframes p{0%,100%{transform:translateY(-50%) scale(1)}8%{transform:translateY(-50%) scale(1.15) rotate(-3deg)}}
.s{position:absolute;left:0;right:0;bottom:3rem;text-align:center;font:700 1.4rem 'Space Grotesk';color:var(--ac)}`,
    html: `<canvas id="cf"></canvas><h1 class="h" data-e="text">69!</h1><p class="s" data-e="text">NICE. Tap to celebrate again.</p>`,
    js: `(function(){var c=document.getElementById('cf'),x=c.getContext('2d'),P=[],C=['#ff5fa2','#ffcc00','#2f6bff','#c6ff3d','#e8322b','#7a3cff'];
function z(){c.width=innerWidth*devicePixelRatio;c.height=innerHeight*devicePixelRatio}z();addEventListener('resize',z);
function b(){for(var i=0;i<120;i++)P.push({x:c.width/2,y:c.height*.55,vx:(Math.random()-.5)*c.width*.03,vy:-Math.random()*c.height*.035-c.height*.01,r:Math.random()*6.28,s:(4+Math.random()*6)*devicePixelRatio,c:C[i%6],l:1})}
function f(){x.clearRect(0,0,c.width,c.height);P=P.filter(function(p){return p.l>0});P.forEach(function(p){p.vy+=c.height*.0012;p.x+=p.vx;p.y+=p.vy;p.r+=.2;p.l-=.008;x.save();x.translate(p.x,p.y);x.rotate(p.r);x.fillStyle=p.c;x.globalAlpha=Math.max(p.l,0);x.fillRect(-p.s,-p.s/2,p.s*2,p.s);x.restore()});requestAnimationFrame(f)}
b();f();setInterval(b,3000);addEventListener('pointerdown',function(e){if(!document.body.classList.contains('dawn-editing'))b()})})();`,
  },
  {
    id: 'motion-glitch',
    title: 'Glitch headline',
    kind: 'Motion',
    ratio: '4/3',
    origin: 'Original',
    blurb: 'RGB-split glitch with scanlines.',
    palette: ['#0a0a0a', '#ffffff', '#00e0c6'],
    css: `body::after{content:'';position:absolute;inset:0;background:repeating-linear-gradient(transparent 0 .2rem,rgba(255,255,255,.05) .2rem .4rem);pointer-events:none}
.g{position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);text-align:center;font:400 9rem/1 'Rubik Mono One';color:var(--fg);text-shadow:.3rem 0 #ff2bd6,-.3rem 0 var(--ac);animation:gl 2.4s steps(1) infinite}
@keyframes gl{0%,100%{clip-path:inset(0);transform:translateY(-50%)}10%{clip-path:inset(20% 0 50% 0);transform:translateY(-50%) translateX(-.8rem)}12%{clip-path:inset(60% 0 10% 0);transform:translateY(-50%) translateX(.8rem)}14%{clip-path:inset(0)}60%{text-shadow:-.4rem 0 #ff2bd6,.4rem 0 var(--ac)}62%{text-shadow:.3rem 0 #ff2bd6,-.3rem 0 var(--ac)}}
.s{position:absolute;left:0;right:0;bottom:2.4rem;text-align:center;font:600 1.1rem 'IBM Plex Mono';color:var(--ac);letter-spacing:.3em}`,
    html: `<h1 class="g" data-e="text">ERROR</h1><p class="s" data-e="text">SIGNAL LOST · RETRY?</p>`,
  },
  {
    id: 'motion-kinetic',
    title: 'Kinetic word swap',
    kind: 'Motion',
    ratio: '4/5',
    origin: 'Original',
    blurb: 'One sentence, the last word springs through options.',
    palette: ['#f4efe6', '#111111', '#2f6bff'],
    css: `.w{position:absolute;left:2.4rem;right:2.4rem;top:50%;transform:translateY(-50%);font:400 5rem/1 'Instrument Serif'}
.sw{display:block;height:5.4rem;overflow:hidden;color:var(--ac);font-style:italic}
.sw span{display:block;animation:k 8s cubic-bezier(.34,1.56,.64,1) infinite}
@keyframes k{0%,20%{transform:translateY(0)}25%,45%{transform:translateY(-100%)}50%,70%{transform:translateY(-200%)}75%,95%{transform:translateY(-300%)}100%{transform:translateY(0)}}
.k{position:absolute;left:2.4rem;bottom:2.4rem;font:600 .9rem 'IBM Plex Mono'}`,
    html: `<div class="w"><p data-e="text">We make things that feel</p><span class="sw"><span data-e="text">alive.</span><span data-e="text">loud.</span><span data-e="text">true.</span><span data-e="text">yours.</span></span></div><p class="k" data-e="text">[DAWN / MOTION 04]</p>`,
  },
];

/* ---------- Tickets, art cards, design deck, movement poster (from Kyle's Pinterest refs) ---------- */

function bars(seed: number, n = 46): string {
  let x = seed;
  const stops: string[] = [];
  let pos = 0;
  for (let i = 0; i < n; i++) {
    x = (x * 9301 + 49297) % 233280;
    const w = 1 + (x % 4);
    const dark = i % 2 === 0;
    stops.push(`${dark ? 'var(--fg)' : 'transparent'} ${pos}% ${pos + w * 0.55}%`);
    pos += w * 0.55;
  }
  return `linear-gradient(90deg,${stops.join(',')},transparent ${pos}%)`;
}

const BARCODE = (seed: number) => `.bc{height:3.4rem;background:${bars(seed)};background-size:100% 100%}`;

function artTicket(id: string, title: string, img: string, source: StudioSource, o: {
  first: string; last: string; left: string; right: string; palette: [string, string, string]; tall?: boolean; seed: number;
}): StudioRecipe {
  return {
    id, title, kind: 'Tickets', ratio: o.tall ? '9/20' : '5/8', origin: 'Public domain', source, palette: o.palette,
    blurb: 'Museum ticket: painting window, punched hole, serif name, tear line and barcode.',
    inspiredBy: 'Pinterest museum-ticket references Kyle saved (art tickets with punched circles and barcodes)',
    css: `body{background:#0d0d0d}
.t{position:absolute;inset:1.4rem;border-radius:2.2rem;background:var(--bg);overflow:hidden}
.win{position:absolute;left:1.6rem;right:1.6rem;top:1.6rem;height:${o.tall ? '52%' : '58%'};border-radius:1.4rem;overflow:hidden;box-shadow:inset 0 0 0 .2rem rgba(0,0,0,.08)}
.win img{width:100%;height:100%;object-fit:cover}
.hole{position:absolute;left:3rem;top:3rem;width:2.4rem;height:2.4rem;border-radius:50%;background:#0d0d0d;z-index:2}
.nums{position:absolute;left:1.8rem;right:1.8rem;top:${o.tall ? '56%' : '62%'};display:flex;justify-content:space-between;font:500 1.1rem 'IBM Plex Mono';color:var(--fg)}
.nm{position:absolute;left:1rem;right:1rem;top:${o.tall ? '60%' : '66.5%'};text-align:center;color:var(--fg)}
.nm h1{font:400 ${o.tall ? '4.2rem' : '5.6rem'}/.9 'Playfair Display';letter-spacing:-.02em;text-transform:uppercase}
.nm p{font:400 ${o.tall ? '1.5rem' : '2rem'}/1 'Playfair Display';text-transform:uppercase;margin-top:.3rem}
.tear{position:absolute;left:0;right:0;bottom:7.6rem;border-top:.25rem dotted var(--fg);opacity:.5}
.tear::before,.tear::after{content:'';position:absolute;top:-1.4rem;width:2.6rem;height:2.6rem;border-radius:50%;background:#0d0d0d}
.tear::before{left:-1.3rem}.tear::after{right:-1.3rem}
.ft{position:absolute;left:1.8rem;right:1.8rem;bottom:1.8rem;display:flex;align-items:end;justify-content:space-between;color:var(--fg)}
.ft span{font:700 1.1rem 'Inter';letter-spacing:.08em}
.ft span::before{content:'';display:inline-block;width:.9rem;height:.9rem;border-radius:50%;background:var(--ac);margin-right:.5rem;vertical-align:-.05rem}
.bc{width:14rem}${BARCODE(o.seed)}`,
    html: `<div class="t" data-e="box"><span class="hole"></span><div class="win"><img data-e="img" src="${A}/${img}" alt="${title}"></div>
<div class="nums"><span data-e="text">${o.left}</span><span data-e="text">${o.right}</span></div>
<div class="nm"><h1 data-e="text">${o.first}</h1><p data-e="text">${o.last}</p></div>
<span class="tear"></span><div class="ft"><span data-e="text">TICKET</span><i class="bc"></i></div></div>`,
  };
}

function artCard(id: string, title: string, img: string, source: StudioSource, o: { name: string; year: string; palette: [string, string, string]; seed: number }): StudioRecipe {
  return {
    id, title, kind: 'Cards', ratio: '5/8', origin: 'Public domain', source, palette: o.palette,
    blurb: 'Soft art card: print on top, title and artist, barcode and signature.',
    inspiredBy: 'Kyle’s Hiroshi Yoshida art-card reference',
    css: `body{background:#0d0d0d}
.c{position:absolute;inset:1.2rem;border-radius:2.4rem;background:var(--bg);overflow:hidden;box-shadow:inset 0 0 0 .15rem rgba(0,0,0,.06)}
.im{position:absolute;left:1.6rem;right:1.6rem;top:1.6rem;height:56%;border-radius:1.6rem;overflow:hidden}
.im img{width:100%;height:100%;object-fit:cover}
.l{position:absolute;left:2rem;top:63%;font:400 1.5rem/1.25 'Instrument Serif';color:var(--fg)}
.r{position:absolute;right:2rem;top:63%;text-align:right;font:600 1.5rem/1.15 'Inter';letter-spacing:.04em;color:var(--ac);text-transform:uppercase}
.bc{position:absolute;left:2rem;bottom:2.4rem;width:12rem}${BARCODE(o.seed)}
.sig{position:absolute;right:2rem;bottom:2.2rem;font:500 2rem 'Caveat';color:var(--ac);transform:rotate(-6deg)}`,
    html: `<div class="c" data-e="box"><div class="im"><img data-e="img" src="${A}/${img}" alt="${title}"></div>
<p class="l" data-e="text">${o.name}<br>${o.year}</p><p class="r" data-e="text">Hiroshi<br>Yoshida</p><i class="bc"></i><p class="sig" data-e="text">吉田 博</p></div>`,
  };
}

function deckCard(id: string, title: string, rank: string, suit: string, center: string, css: string, palette: [string, string, string] = ['#ffffff', '#111111', '#e8322b']): StudioRecipe {
  const red = suit === '♥' || suit === '♦';
  return {
    id, title, kind: 'Cards', ratio: '5/7', origin: 'Inspired', palette,
    inspiredBy: 'Design-history playing cards (Old Style, Swiss, CMYK, Bauhaus, Bezier) from Kyle’s Pinterest refs',
    blurb: 'Playing card with corner indices and a design-history lesson in the middle.',
    css: `body{background:#0d0d0d}
.card{position:absolute;inset:1.2rem;border-radius:2rem;background:var(--bg);box-shadow:inset 0 0 0 .15rem rgba(0,0,0,.08);overflow:hidden}
.ix{position:absolute;display:grid;justify-items:center;font:700 2.4rem/1 'Playfair Display';color:${red ? 'var(--ac)' : 'var(--fg)'}}
.ix small{font-size:2rem}
.ix.tl{left:1.6rem;top:1.4rem}.ix.br{right:1.6rem;bottom:1.4rem;transform:rotate(180deg)}
.mid{position:absolute;inset:6rem 4.4rem}
${css}`,
    html: `<div class="card" data-e="box"><div class="ix tl"><span data-e="text">${rank}</span><small>${suit}</small></div><div class="mid">${center}</div><div class="ix br"><span>${rank}</span><small>${suit}</small></div></div>`,
  };
}

function quoteCard(id: string, title: string, rank: string, lines: string, palette: [string, string, string]): StudioRecipe {
  const hearts = Array.from({ length: 7 }, (_, i) => `<i style="left:${8 + ((i * 37) % 80)}%;top:${10 + ((i * 53) % 78)}%;transform:rotate(${(i * 47) % 60 - 30}deg)">♥</i>`).join('');
  return {
    id, title, kind: 'Cards', ratio: '5/7', origin: 'Inspired', palette,
    inspiredBy: 'Hand-lettered quote playing cards from Kyle’s Pinterest refs',
    blurb: 'Hand-lettered quote card with scattered hearts.',
    css: `body{background:#0d0d0d}
.card{position:absolute;inset:1.2rem;border-radius:2rem;background:var(--bg);overflow:hidden}
.h i{position:absolute;font-style:normal;font-size:3.4rem;color:var(--ac);opacity:.9}
.q{position:absolute;inset:5rem 3rem;display:grid;place-content:center;text-align:center;font:400 5rem/.95 'Permanent Marker';color:var(--fg);transform:rotate(-4deg)}
.ix{position:absolute;left:1.6rem;top:1.4rem;font:400 2.6rem/1 'Permanent Marker';color:var(--ac)}
.ix.br{left:auto;top:auto;right:1.6rem;bottom:1.4rem;transform:rotate(180deg)}`,
    html: `<div class="card" data-e="box"><div class="h">${hearts}</div><p class="ix" data-e="text">${rank}♥</p><p class="q" data-e="text">${lines}</p><p class="ix br">${rank}♥</p></div>`,
  };
}

function bwTicket(id: string, title: string, head: string, pattern: string, seed: number, palette: [string, string, string]): StudioRecipe {
  return {
    id, title, kind: 'Tickets', ratio: '9/20', origin: 'Inspired', palette,
    inspiredBy: 'Black and white minimal event tickets with bold geometric patterns (Kyle’s refs)',
    blurb: 'Minimal event ticket: geometric pattern, bold title, perforated stub.',
    css: `body{background:#0d0d0d}
.t{position:absolute;inset:1rem;background:var(--bg);color:var(--fg);border:.15rem solid var(--fg);overflow:hidden}
.pat{position:absolute;left:1.6rem;right:1.6rem;top:1.6rem;height:44%;${pattern}}
.h{position:absolute;left:1.6rem;right:1.6rem;top:50%;font:400 4.4rem/.9 'Anton';text-transform:uppercase}
.row{position:absolute;left:1.6rem;right:1.6rem;top:69%;display:grid;grid-template-columns:repeat(4,1fr);gap:.4rem;font:600 .95rem/1.3 'IBM Plex Mono'}
.row b{display:block;font-size:.75rem;opacity:.6}
.perf{position:absolute;left:0;right:0;top:78%;border-top:.25rem dashed var(--fg)}
.stub{position:absolute;left:1.6rem;right:1.6rem;bottom:1.6rem;display:flex;justify-content:space-between;align-items:end;font:600 .9rem 'IBM Plex Mono'}
.bc{width:15rem}${BARCODE(seed)}`,
    html: `<div class="t" data-e="box"><div class="pat" data-e="box"></div><h1 class="h" data-e="text">${head}</h1>
<div class="row"><p><b>SEC</b><span data-e="text">17</span></p><p><b>ROW</b><span data-e="text">C</span></p><p><b>DATE</b><span data-e="text">11.21</span></p><p><b>TIME</b><span data-e="text">21:00</span></p></div>
<span class="perf"></span><div class="stub"><span data-e="text">ADMIT ONE</span><i class="bc"></i></div></div>`,
  };
}

const C = commons;

export const STUDIO_TICKETS_AND_CARDS: StudioRecipe[] = [
  artTicket('ticket-sunflowers', 'Van Gogh ticket: Sunflowers', 'pd-vg-sunflowers.jpg', C('File:Vincent_van_Gogh_-_Sunflowers_(1888,_National_Gallery_London).jpg', 'Vincent van Gogh', '1888'), { first: 'Vincent', last: 'Willem van Gogh', left: '08', right: '11', palette: ['#d9a72b', '#1c1406', '#1c1406'], seed: 3 }),
  artTicket('ticket-starry', 'Van Gogh ticket: Starry Night', 'pd-vg-starry.jpg', C('File:Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg', 'Vincent van Gogh', '1889'), { first: 'Vincent', last: 'Willem van Gogh', left: '06', right: '11', palette: ['#ffffff', '#111111', '#2f6bff'], seed: 7 }),
  artTicket('ticket-menzel-flute', 'Menzel ticket: Flute Concert', 'pd-menzel-flute.jpg', C('File:Adolph_Menzel_-_Flötenkonzert_Friedrichs_des_Großen_in_Sanssouci_-_Google_Art_Project.jpg', 'Adolph Menzel', '1850–52'), { first: 'Menzel', last: 'Adolph Friedrich Erdmann von', left: '14', right: '12', palette: ['#b9a27a', '#1d1a14', '#6b2b1f'], tall: true, seed: 11 }),
  artTicket('ticket-menzel-ball', 'Menzel ticket: Ball Supper', 'pd-menzel-ball.jpg', C('File:Adolph_Menzel_-_Das_Ballsouper_-_Google_Art_Project.jpg', 'Adolph Menzel', '1878'), { first: 'Menzel', last: 'Adolph Friedrich Erdmann von', left: '15', right: '12', palette: ['#c4746a', '#1d1412', '#f4efe6'], tall: true, seed: 19 }),
  {
    id: 'ticket-louvre-strip',
    title: 'Louvre excursion strip ticket',
    kind: 'Tickets',
    ratio: '3/1',
    origin: 'Public domain',
    inspiredBy: 'Kyle’s Louvre excursion ticket references (painting strip plus stub)',
    blurb: 'Landscape ticket: painting strip, perforation, numbered stub with barcode.',
    palette: ['#ffffff', '#111111', '#a3262a'],
    source: C('File:The_Embarktion_for_Cythera.jpg', 'Jean-Antoine Watteau', '1717'),
    css: `body{background:#0d0d0d}
.t{position:absolute;inset:.8rem;background:var(--bg);border-radius:.8rem;overflow:hidden}
.p{position:absolute;left:.8rem;top:.8rem;bottom:.8rem;width:66%;border-radius:.4rem;overflow:hidden}
.p img{width:100%;height:100%;object-fit:cover}
.pf{position:absolute;left:69%;top:0;bottom:0;border-left:.18rem dashed rgba(0,0,0,.35)}
.pf::before,.pf::after{content:'';position:absolute;left:-1rem;width:1.8rem;height:1.8rem;border-radius:50%;background:#0d0d0d}
.pf::before{top:-1rem}.pf::after{bottom:-1rem}
.s{position:absolute;left:71%;right:1rem;top:1rem;bottom:1rem;display:grid;grid-template-columns:auto 1fr;gap:.2rem .8rem;align-content:center;color:var(--fg)}
.n{grid-row:span 2;font:400 3.4rem/1 'Playfair Display'}
.k{font:700 .6rem 'IBM Plex Mono';letter-spacing:.1em;color:var(--ac)}
.h{font:600 .9rem/1.1 'Playfair Display';text-transform:uppercase}
.bc{grid-column:1/-1;height:2.2rem;margin-top:.4rem;background:${bars(23)}}`,
    html: `<div class="t" data-e="box"><div class="p"><img data-e="img" src="${A}/pd-watteau-cythera.jpg" alt="Embarkation for Cythera"></div><span class="pf"></span>
<div class="s"><p class="n" data-e="text">04</p><p class="k" data-e="text">MUSÉE DU LOUVRE</p><p class="h" data-e="text">Voyage à Cythère</p><i class="bc"></i></div></div>`,
  },
  bwTicket('ticket-bw-stripes', 'Minimal ticket: stripes', 'Minimal<br>Violence', 'background:repeating-linear-gradient(90deg,var(--fg) 0 .9rem,transparent .9rem 1.8rem)', 29, ['#111111', '#ffffff', '#ffffff']),
  bwTicket('ticket-bw-blobs', 'Minimal ticket: ornament', 'Ornament<br>Spring', 'background:radial-gradient(circle at 50% 0,var(--fg) 34%,transparent 35%) 0 0/4rem 4rem,radial-gradient(circle at 50% 100%,var(--fg) 34%,transparent 35%) 2rem 2rem/4rem 4rem', 31, ['#ffffff', '#111111', '#111111']),
  bwTicket('ticket-bw-checks', 'Minimal ticket: stranger times', 'Stranger<br>Times', 'background:conic-gradient(var(--fg) 25%,transparent 0 50%,var(--fg) 0 75%,transparent 0) 0 0/5rem 5rem;border-radius:2.5rem', 37, ['#111111', '#ffffff', '#ffffff']),
  {
    id: 'ticket-jazz',
    title: 'Jazz club ticket',
    kind: 'Tickets',
    ratio: '1/2',
    origin: 'Inspired',
    inspiredBy: 'Kyle’s jazz-club ticket reference: vinyl, details grid, QR code, WELCOME stamp',
    blurb: 'Night-club ticket with a spinning record, details grid and QR block.',
    palette: ['#ffffff', '#111111', '#111111'],
    css: `body{background:#0d0d0d}
.t{position:absolute;inset:1rem;background:var(--bg);color:var(--fg);-webkit-mask:radial-gradient(circle at 0 50%,transparent 1.4rem,#000 1.45rem) left/51% 100% no-repeat,radial-gradient(circle at 100% 50%,transparent 1.4rem,#000 1.45rem) right/51% 100% no-repeat}
.m{position:absolute;left:0;right:0;top:1.6rem;text-align:center;font:400 4.4rem/1 'Rubik Mono One';letter-spacing:-.04em}
.sub{position:absolute;left:0;right:0;top:6.6rem;text-align:center;font:600 .9rem 'IBM Plex Mono';letter-spacing:.12em}
.rec{position:absolute;left:50%;top:9.5rem;width:20rem;height:20rem;margin-left:-10rem;border-radius:50%;background:repeating-radial-gradient(circle,#111 0 .25rem,#2a2a2a .25rem .4rem);animation:spin 6s linear infinite}
.rec::after{content:'';position:absolute;inset:7rem;border-radius:50%;background:var(--bg);box-shadow:0 0 0 1.4rem #111}
@keyframes spin{to{transform:rotate(360deg)}}
.g{position:absolute;left:2rem;right:2rem;top:33rem;display:grid;grid-template-columns:repeat(3,1fr);gap:.8rem;font:600 1rem/1.25 'IBM Plex Mono'}
.g b{display:block;font-size:.75rem;opacity:.55}
.qr{position:absolute;right:2.4rem;bottom:13rem;width:7rem;height:7rem;background:conic-gradient(var(--fg) 25%,transparent 0 50%,var(--fg) 0 75%,transparent 0) 0 0/1.4rem 1.4rem;box-shadow:0 0 0 .5rem var(--bg),0 0 0 .7rem var(--fg)}
.pf{position:absolute;left:2rem;right:2rem;bottom:10rem;border-top:.2rem dashed var(--fg)}
.w{position:absolute;left:50%;bottom:3rem;transform:translateX(-50%);padding:.6rem 2rem;border:.3rem solid var(--fg);border-radius:4rem;font:400 3rem/1 'Rubik Mono One';letter-spacing:-.04em}`,
    html: `<div class="t" data-e="box"><h1 class="m" data-e="text">NIGHTSHADE</h1><p class="sub" data-e="text">VELVET ROOM JAZZ CLUB PRESENTS</p><span class="rec"></span>
<div class="g"><p><b>DATE</b><span data-e="text">Fri 11.21</span></p><p><b>DOORS</b><span data-e="text">8:00 PM</span></p><p><b>SEAT</b><span data-e="text">Bar 04</span></p><p><b>DRESS</b><span data-e="text">Velvet</span></p><p><b>SET</b><span data-e="text">Trio</span></p><p><b>NO.</b><span data-e="text">0098</span></p></div>
<span class="qr"></span><span class="pf"></span><p class="w" data-e="text">WELCOME</p></div>`,
  },
  {
    id: 'ticket-woodcut',
    title: 'Woodcut film ticket',
    kind: 'Tickets',
    ratio: '3/4',
    origin: 'Public domain',
    inspiredBy: 'Kyle’s black-and-white woodcut movie ticket with a perforated film strip',
    blurb: 'Black and white woodblock print with a perforated film-strip stub.',
    palette: ['#ffffff', '#111111', '#111111'],
    source: C('File:The_Sumida_River_in_the_Mist_by_Yoshida_Hiroshi,_1926,_woodblock_print,_Honolulu_Museum_of_Art.jpg', 'Yoshida Hiroshi', '1926', 'Published 1926, public domain in the US.'),
    css: `body{background:#0d0d0d}
.t{position:absolute;inset:1rem;background:var(--bg);color:var(--fg);border-radius:1rem;overflow:hidden}
.strip{position:absolute;left:1rem;top:1rem;bottom:1rem;width:9rem;background:var(--fg);display:grid;gap:1rem;padding:2.4rem .9rem}
.strip::before,.strip::after{content:'';position:absolute;top:0;bottom:0;width:.8rem;background:repeating-linear-gradient(var(--bg) 0 .8rem,transparent .8rem 1.8rem)}
.strip::before{left:.1rem}.strip::after{right:.1rem}
.strip img{width:100%;height:100%;object-fit:cover;filter:grayscale(1) contrast(1.6)}
.main{position:absolute;left:11.4rem;right:1.4rem;top:1.4rem;height:58%;overflow:hidden;border-radius:.6rem}
.main img{width:100%;height:100%;object-fit:cover;filter:grayscale(1) contrast(1.7) brightness(1.05)}
.h{position:absolute;left:11.4rem;right:1.4rem;top:63%;font:700 2.6rem/1 'Playfair Display'}
.d{position:absolute;left:11.4rem;right:1.4rem;top:72%;display:grid;grid-template-columns:1fr 1fr;gap:.4rem 1rem;font:600 .85rem/1.3 'IBM Plex Mono'}
.d b{opacity:.55;margin-right:.4rem}
.f{position:absolute;left:11.4rem;right:1.4rem;bottom:1.4rem;font:600 .8rem 'IBM Plex Mono';letter-spacing:.1em}`,
    html: `<div class="t" data-e="box"><div class="strip"><img src="${A}/pd-yoshida-sumida.jpg" alt=""><img src="${A}/pd-yoshida-sumida.jpg" alt="" style="object-position:30%"><img src="${A}/pd-yoshida-sumida.jpg" alt="" style="object-position:70%"></div>
<div class="main"><img data-e="img" src="${A}/pd-yoshida-sumida.jpg" alt="Sumida River in the Mist"></div>
<h1 class="h" data-e="text">River in the Mist</h1>
<div class="d"><p><b>SCREEN</b><span data-e="text">02</span></p><p><b>SEAT</b><span data-e="text">H 11</span></p><p><b>DATE</b><span data-e="text">11.21.26</span></p><p><b>TIME</b><span data-e="text">19:30</span></p></div>
<p class="f" data-e="text">ADMIT ONE · NON-TRANSFERABLE</p></div>`,
  },
  artCard('card-yoshida-kawaguchi', 'Yoshida art card: Lake Kawaguchi', 'pd-yoshida-kawaguchi.jpg', C('File:Lake_Kawaguchi_by_Yoshida_Hiroshi,_1926,_woodblock_print,_Honolulu_Museum_of_Art.jpg', 'Yoshida Hiroshi', '1926', 'Published 1926, public domain in the US.'), { name: 'Lake Kawaguchi', year: '1926', palette: ['#f6dcc6', '#3b2a20', '#a8452f'], seed: 41 }),
  artCard('card-yoshida-lantern', 'Yoshida art card: Lantern Maker', 'pd-yoshida-lantern.jpg', C('File:A_Lantern_Maker_by_Yoshida_Hiroshi,_1926,_woodblock_print,_Honolulu_Museum_of_Art.jpg', 'Yoshida Hiroshi', '1926', 'Published 1926, public domain in the US.'), { name: 'A Lantern Maker', year: '1926', palette: ['#e4e8d6', '#26301f', '#8b3a2b'], seed: 43 }),
  deckCard('deck-old-style', 'Design deck: Old Style', 'K', '♠',
    `<h2 data-e="text">old<br>style</h2><p data-e="text">Old-style serifs come from the pen: angled stress, bracketed serifs, warm and bookish. Garamond, Bembo, Caslon.</p>`,
    `.mid h2{font:400 6.4rem/.85 'Playfair Display';letter-spacing:-.03em}.mid p{margin-top:1.4rem;font:400 1.1rem/1.4 'Fraunces';opacity:.8}`),
  deckCard('deck-cmyk', 'Design deck: CMYK', 'J', '♠',
    `<div class="dots"><i style="background:#00b7eb;left:0;top:0"></i><i style="background:#ff2bd6;right:0;top:0"></i><i style="background:#ffe600;left:0;bottom:0"></i><i style="background:#111;right:0;bottom:0"></i></div><h2 data-e="text">CMYK</h2><p data-e="text">Cyan, magenta, yellow and key. Four inks, every color in print.</p>`,
    `.dots{position:relative;width:100%;aspect-ratio:1}.dots i{position:absolute;width:62%;height:62%;border-radius:50%;mix-blend-mode:multiply}.mid h2{margin-top:1.2rem;font:800 3.2rem/1 'Inter';letter-spacing:-.04em}.mid p{margin-top:.6rem;font:400 1rem/1.4 'Inter';opacity:.75}`),
  deckCard('deck-swiss', 'Design deck: Swiss Style', 'A', '♦',
    `<div class="flag" data-e="box"><i></i><i></i></div><h2 data-e="text">SWISS</h2><p data-e="text">Grids, flush-left sans, objective photography. Clarity over decoration.</p>`,
    `.flag{position:relative;width:12rem;height:12rem;background:#e8322b}.flag i{position:absolute;background:#fff;left:50%;top:50%;transform:translate(-50%,-50%)}.flag i:first-child{width:7rem;height:2.2rem}.flag i:last-child{width:2.2rem;height:7rem}.mid h2{margin-top:2rem;font:800 4.6rem/.9 'Inter';letter-spacing:-.05em}.mid p{margin-top:.8rem;font:500 1.1rem/1.35 'Inter'}`, ['#ffffff', '#111111', '#e8322b']),
  deckCard('deck-bauhaus', 'Design deck: Bauhaus', '7', '♥',
    `<div class="sh"><i class="s"></i><i class="c"></i><i class="tri"></i></div><h2 data-e="text">Bauhaus</h2><p data-e="text">Form follows function. Square, circle, triangle; red, blue, yellow.</p>`,
    `.sh{position:relative;height:16rem}.sh .s{position:absolute;left:0;top:0;width:9rem;height:9rem;background:#e8322b}.sh .c{position:absolute;right:0;top:3rem;width:10rem;height:10rem;border-radius:50%;background:#2f6bff;mix-blend-mode:multiply}.sh .tri{position:absolute;left:5rem;bottom:0;border-left:5.5rem solid transparent;border-right:5.5rem solid transparent;border-bottom:9rem solid #ffcc00;mix-blend-mode:multiply}.mid h2{margin-top:1.4rem;font:400 4rem/1 'Archivo Black';letter-spacing:-.04em}.mid p{margin-top:.6rem;font:500 1.05rem/1.35 'Space Grotesk'}`, ['#f2ead8', '#111111', '#e8322b']),
  deckCard('deck-minimal', 'Design deck: Minimalism', '9', '♠',
    `<i class="dot" data-e="box"></i><h2 data-e="text">balance</h2><p data-e="text">Design can have many types of soul. The key is to have one.</p>`,
    `.dot{display:block;width:13rem;height:13rem;margin:2rem auto 0;border-radius:50%;background:var(--fg)}.mid h2{margin-top:4rem;font:400 2.6rem/1 'Instrument Serif'}.mid p{margin-top:.6rem;font:400 1.1rem/1.4 'Inter';opacity:.7}`),
  deckCard('deck-bezier', 'Design deck: Bezier', '5', '♣',
    `<svg viewBox="0 0 100 80" class="bz"><path d="M8 70 C 20 0, 80 0, 92 70" fill="none" stroke="currentColor" stroke-width="2.5"/><line x1="8" y1="70" x2="20" y2="0" stroke="#2f6bff" stroke-width="1"/><line x1="92" y1="70" x2="80" y2="0" stroke="#2f6bff" stroke-width="1"/><circle cx="20" cy="2" r="3" fill="#2f6bff"/><circle cx="80" cy="2" r="3" fill="#2f6bff"/><rect x="5" y="67" width="6" height="6" fill="currentColor"/><rect x="89" y="67" width="6" height="6" fill="currentColor"/></svg><h2 data-e="text">Bézier</h2><p data-e="text">Two anchors, two handles. Every smooth curve in every font.</p>`,
    `.bz{width:100%;color:var(--fg)}.mid h2{margin-top:1.4rem;font:600 3.6rem/1 'Space Grotesk';letter-spacing:-.04em}.mid p{margin-top:.6rem;font:400 1.05rem/1.4 'IBM Plex Mono'}`),
  quoteCard('quote-small-minds', 'Quote card: small minds', '3', 'Small minds, discuss people', ['#f6f1e7', '#111111', '#e8322b']),
  quoteCard('quote-great-minds', 'Quote card: great minds', 'K', 'Great minds discuss ideas', ['#e8f5ef', '#0b3d2e', '#e8322b']),
  {
    id: 'poster-abstract-art',
    title: 'Art movement poster: Abstract Art',
    kind: 'Posters',
    ratio: '3/4',
    origin: 'Public domain',
    inspiredBy: 'Kyle’s “Abstract Art” museum poster reference (3×3 artwork grid)',
    blurb: 'Art-history explainer poster with a 3×3 grid of public-domain works.',
    palette: ['#f3efe4', '#161616', '#a3262a'],
    source: { by: 'Kandinsky, Malevich, Mondrian, af Klint (works 1907–1924)', date: '1907–1924', license: 'Public domain (Wikimedia Commons)', url: 'https://commons.wikimedia.org/wiki/Category:Abstract_art', note: 'Each tile is a separate public-domain Commons file; list in the Studio sources notes.' },
    css: `.top{position:absolute;left:2rem;right:2rem;top:1.4rem;display:flex;justify-content:space-between;font:500 .6rem 'IBM Plex Mono';letter-spacing:.06em;opacity:.7}
.h{position:absolute;left:0;right:0;top:3rem;text-align:center;font:400 5.4rem/1 'Playfair Display';letter-spacing:-.02em}
.y{position:absolute;left:0;right:0;top:9.4rem;text-align:center;font:500 1rem 'IBM Plex Mono';letter-spacing:.2em}
.tag{position:absolute;left:0;right:0;top:11.4rem;text-align:center;font:italic 400 1.5rem 'Instrument Serif';color:var(--ac)}
.g{position:absolute;left:6.4rem;right:6.4rem;top:14.4rem;display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem}
.g img{width:100%;aspect-ratio:1;object-fit:cover}
.b{position:absolute;left:4rem;right:4rem;top:43.6rem;text-align:center;font:400 .85rem/1.5 'Fraunces';opacity:.85}`,
    html: `<div class="top"><span data-e="text">Art Movement</span><span data-e="text">Visual Analysis</span><span data-e="text">Visual History</span></div>
<h1 class="h" data-e="text">Abstract Art</h1><p class="y" data-e="text">( c. 1907 — 1924 )</p><p class="tag" data-e="text">Not what is seen, but what is felt.</p>
<div class="g">${['kandinsky-vii', 'malevich-square', 'mondrian-1921', 'klint-3', 'kandinsky-study', 'mondrian-a', 'klint-1', 'mondrian-lozenge', 'klint-8'].map((k) => `<img data-e="img" src="${A}/pd-${k}.jpg" alt="${k}">`).join('')}</div>
<p class="b" data-e="text">Abstraction stopped describing the world and started building one. Kandinsky chased music in color, Malevich reduced painting to a black square, Mondrian to a grid, and Hilma af Klint painted the stages of a life years before any of them.</p>`,
  },
];

export const STUDIO_RECIPES: StudioRecipe[] = [...STUDIO_TICKETS_AND_CARDS, ...STUDIO_CORE];

export const STUDIO_KINDS: Array<'All' | StudioKind> = ['All', 'Tickets', 'Cards', 'Magazines', 'Posters', 'Books', 'Spreads', 'Archive', 'Motion', 'Game', 'Ours'];

export function studioRecipe(id: string): StudioRecipe | undefined {
  return STUDIO_RECIPES.find((recipe) => recipe.id === id);
}

function esc(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Full HTML document for a recipe. `body` lets a saved draft replace the stock markup. */
export function studioDoc(recipe: StudioRecipe, opts: { body?: string; rootStyle?: string; thumb?: boolean } = {}): string {
  const [bg, fg, ac] = recipe.palette;
  const root = opts.rootStyle ?? `--bg:${bg};--fg:${fg};--ac:${ac}`;
  const thumbCss = opts.thumb ? '<style>[data-e]{cursor:inherit}</style>' : '';
  return `<!doctype html><html lang="en" style="${esc(root)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>${esc(recipe.title)}</title><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="${STUDIO_FONT_CSS}">
<style id="dawn-base">${STUDIO_BASE_CSS}</style><style id="dawn-recipe">${recipe.css}</style>${thumbCss}</head><body>${opts.body ?? recipe.html}${recipe.js ? `<script id="dawn-js">${recipe.js}</script>` : ''}</body></html>`;
}

/** Header comment written into a downloaded file so an agent knows what it is holding. */
export function studioExportHeader(recipe: StudioRecipe): string {
  const lines = [
    `Dawn Recipe: ${recipe.title} (${recipe.id})`,
    `Kind: ${recipe.kind}. Origin: ${recipe.origin}.`,
    recipe.inspiredBy ? `Inspired by: ${recipe.inspiredBy}. Original recreation, no copied logos or photos.` : '',
    recipe.source ? `Source: ${recipe.source.by}, ${recipe.source.date}. ${recipe.source.license}. ${recipe.source.url}` : '',
    'For agents: elements with data-e="text" are editable copy, data-e="img" are swappable images, data-e="box" are color fills.',
    'Palette lives on <html style> as --bg, --fg and --ac. Sizes are rem, and 1rem = 1/40 of the viewport width.',
    'Exported from https://dawn.artometrics.com/recipes',
  ].filter(Boolean);
  return `<!--\n  ${lines.join('\n  ')}\n-->\n`;
}

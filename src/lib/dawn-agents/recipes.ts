import type { EngagementAttributes } from './engage';

export type Palette = { id: string; name: string; colors: [string, string, string, string, string] };
export type FontSet = { id: string; name: string; heading: string; headingWeight: number; body: string; label: string };
export type Texture = { id: string; name: string; background: (colors: string[]) => string };
export type Layout = { id: string; name: string; css: string; html: (text: RecipeText) => string };
export type RecipeText = { kicker: string; headline: string; mark: string; number: string; prose: string };
export type Recipe = {
  id: string;
  name: string;
  tags: string[];
  layout: string;
  texture: string;
  palette: string;
  font: string;
  text: RecipeText;
  note: string;
};

const enc = (svg: string) => `url('data:image/svg+xml,${encodeURIComponent(svg).replace(/'/g, '%27')}')`;

export const PALETTES: Palette[] = [
  { id: 'ultraviolet', name: 'Ultraviolet', colors: ['#14101f', '#ffffff', '#9b5de5', '#ffffff', '#111111'] },
  { id: 'swiss', name: 'Swiss', colors: ['#f2f0eb', '#111111', '#e3120b', '#f2f0eb', '#111111'] },
  { id: 'riso', name: 'Riso', colors: ['#f6efe2', '#1d3fbb', '#ff48b0', '#f6efe2', '#1d3fbb'] },
  { id: 'concrete', name: 'Concrete', colors: ['#d9d9d4', '#000000', '#ff3b00', '#ffffff', '#000000'] },
  { id: 'chrome', name: 'Chrome', colors: ['#0b0d2a', '#e9f1ff', '#7af7ff', '#c0c8d8', '#ff5ce1'] },
  { id: 'ink', name: 'Ink & Paper', colors: ['#f5f0e6', '#1b1b1b', '#9a2b1e', '#fbf8f1', '#1b1b1b'] },
  { id: 'newsprint', name: 'Newsprint', colors: ['#efe9dc', '#121212', '#121212', '#efe9dc', '#2a2a2a'] },
  { id: 'frost', name: 'Frost', colors: ['#1a2a6c', '#ffffff', '#ff7eb3', 'rgba(255,255,255,.18)', '#ffffff'] },
  { id: 'cel', name: 'Cel Sky', colors: ['#4fb3ff', '#1a1030', '#ffd23f', '#ffffff', '#ff4f6d'] },
  { id: 'sepia', name: 'Sepia Kindle', colors: ['#f4ecd8', '#3b2f22', '#8c5a2b', '#f4ecd8', '#3b2f22'] },
  { id: 'house', name: 'KSM House', colors: ['#ffffff', '#111111', '#E0242B', '#ffffff', '#0047FF'] },
  { id: 'acid', name: 'Acid', colors: ['#d7ff3a', '#111111', '#7a00ff', '#ffffff', '#111111'] },
  { id: 'sunset', name: 'Sunset', colors: ['#ff6b35', '#2b0f3a', '#ffd166', '#fff4e6', '#2b0f3a'] },
  { id: 'forest', name: 'Forest', colors: ['#1f3d2b', '#f1ead8', '#c9a227', '#2a5138', '#f1ead8'] },
  { id: 'terminal', name: 'Terminal', colors: ['#0a0f0a', '#33ff66', '#33ff66', '#0a0f0a', '#33ff66'] },
];

export const FONTS: FontSet[] = [
  { id: 'plex', name: 'Plex Mono + Inter Tight', heading: 'Inter Tight', headingWeight: 600, body: 'IBM Plex Mono', label: 'IBM Plex Mono' },
  { id: 'helv', name: 'Inter (Swiss)', heading: 'Inter', headingWeight: 900, body: 'Inter', label: 'Inter' },
  { id: 'archivo', name: 'Archivo Black', heading: 'Archivo Black', headingWeight: 400, body: 'Space Mono', label: 'Space Mono' },
  { id: 'playfair', name: 'Playfair + Literata', heading: 'Playfair Display', headingWeight: 700, body: 'Literata', label: 'Inter' },
  { id: 'syne', name: 'Syne', heading: 'Syne', headingWeight: 800, body: 'Space Grotesk', label: 'Space Grotesk' },
  { id: 'unbounded', name: 'Unbounded', heading: 'Unbounded', headingWeight: 800, body: 'Inter', label: 'Space Mono' },
  { id: 'dmserif', name: 'DM Serif', heading: 'DM Serif Display', headingWeight: 400, body: 'Inter', label: 'Inter' },
  { id: 'bungee', name: 'Bungee', heading: 'Bungee', headingWeight: 400, body: 'Space Grotesk', label: 'Space Mono' },
  { id: 'rubik', name: 'Rubik Mono', heading: 'Rubik Mono One', headingWeight: 400, body: 'Space Mono', label: 'Space Mono' },
  { id: 'fraunces', name: 'Fraunces', heading: 'Fraunces', headingWeight: 900, body: 'Fraunces', label: 'Inter' },
  { id: 'literata', name: 'Literata (book)', heading: 'Literata', headingWeight: 700, body: 'Literata', label: 'Inter' },
  { id: 'rounded', name: 'M PLUS Rounded', heading: 'M PLUS Rounded 1c', headingWeight: 800, body: 'M PLUS Rounded 1c', label: 'M PLUS Rounded 1c' },
  { id: 'spacemono', name: 'Space Mono', heading: 'Space Mono', headingWeight: 700, body: 'Space Mono', label: 'Space Mono' },
];

export const TEXTURES: Texture[] = [
  { id: 'pixel', name: 'Pixel Mosaic', background: (c) => `${enc(`<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80' shape-rendering='crispEdges'><rect width='100%' height='100%' fill='${c[0]}'/><rect x='10' y='8' width='8' height='8' fill='${c[2]}'/><rect x='28' y='16' width='8' height='8' fill='${c[2]}'/><rect x='48' y='8' width='8' height='8' fill='${c[2]}' opacity='.7'/><rect x='16' y='40' width='8' height='8' fill='${c[2]}'/><rect x='40' y='48' width='8' height='8' fill='${c[2]}'/><rect x='60' y='36' width='8' height='8' fill='${c[2]}' opacity='.6'/></svg>`)} 0 0/160px 160px` },
  { id: 'grain', name: 'Riso Grain', background: (c) => `${enc(`<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(#n)' opacity='.35'/></svg>`)}, ${c[0]}` },
  { id: 'halftone', name: 'Halftone', background: (c) => `radial-gradient(circle at center, ${c[2]} 32%, transparent 34%) 0 0/10px 10px, radial-gradient(circle at center, ${c[2]} 22%, transparent 24%) 5px 5px/10px 10px, ${c[0]}` },
  { id: 'grid', name: 'Swiss Grid', background: (c) => `linear-gradient(${c[1]}22 1px, transparent 1px) 0 0/24px 24px, linear-gradient(90deg, ${c[1]}22 1px, transparent 1px) 0 0/24px 24px, ${c[0]}` },
  { id: 'chrome', name: 'Chrome', background: (c) => `linear-gradient(160deg, ${c[0]} 0%, ${c[2]}55 30%, #ffffff22 45%, ${c[4]}66 60%, ${c[0]} 100%)` },
  { id: 'paper', name: 'Paper Noise', background: (c) => `${enc(`<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='p'><feTurbulence type='turbulence' baseFrequency='.04 .5' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(#p)' opacity='.18'/></svg>`)}, ${c[0]}` },
  { id: 'glass', name: 'Glass Blobs', background: (c) => `radial-gradient(circle at 20% 20%, ${c[2]} 0 18%, transparent 40%), radial-gradient(circle at 85% 70%, ${c[4]} 0 15%, transparent 38%), ${c[0]}` },
  { id: 'speed', name: 'Speed Lines', background: (c) => `repeating-conic-gradient(from 0deg at 50% 60%, ${c[0]} 0 8deg, ${c[3]} 8deg 10deg)` },
  { id: 'stripes', name: 'Stripes', background: (c) => `repeating-linear-gradient(-45deg, ${c[0]} 0 12px, ${c[2]} 12px 15px)` },
  { id: 'scan', name: 'Scanlines', background: (c) => `repeating-linear-gradient(0deg, ${c[1]}22 0 1px, transparent 1px 3px), ${c[0]}` },
  { id: 'checker', name: 'Checker', background: (c) => `conic-gradient(${c[2]} 25%, ${c[0]} 0 50%, ${c[2]} 0 75%, ${c[0]} 0) 0 0/28px 28px` },
  { id: 'flat', name: 'Flat', background: (c) => c[0] },
  { id: 'mesh', name: 'Gradient Mesh', background: (c) => `radial-gradient(at 0% 0%, ${c[2]} 0, transparent 55%), radial-gradient(at 100% 100%, ${c[4]} 0, transparent 50%), ${c[0]}` },
];

const textOf = (kicker: string, headline: string, mark: string, number = '01', prose = 'The page is the interface. Type, colour, and texture say something before the first sentence.'): RecipeText => ({
  kicker,
  headline,
  mark,
  number,
  prose,
});

export const LAYOUTS: Layout[] = [
  { id: 'billboard', name: 'Billboard Panel', css: `.L-billboard{display:flex;align-items:flex-start;padding:10% 8%;aspect-ratio:3/4}.L-billboard .pn{background:var(--panel);color:#111;padding:8% 7%;width:72%;min-height:78%;display:flex;flex-direction:column}.L-billboard .k{font:400 .62em var(--fk);letter-spacing:.06em;text-transform:uppercase;margin-bottom:1em}.L-billboard h1{font:var(--hw) 1.15em/1.05 var(--fh);margin:0}.L-billboard .mk{margin-top:auto;font:800 .8em var(--fh)}`, html: (t) => `<div class="pn"><div class="k">${esc(t.kicker)}</div><h1>${esc(t.headline)}</h1><div class="mk">${esc(t.mark)}</div></div>` },
  { id: 'swiss', name: 'Swiss Poster', css: `.L-swiss{aspect-ratio:3/4;padding:8%;display:grid;grid-template-rows:auto 1fr auto;color:var(--ink)}.L-swiss .num{font:var(--hw) 3.4em/.8 var(--fh);color:var(--acc)}.L-swiss h1{font:var(--hw) 1.5em/1 var(--fh);margin:0;align-self:end}.L-swiss .ft{display:grid;grid-template-columns:1fr 1fr;gap:.6em;font:.55em/1.3 var(--fb);border-top:2px solid var(--ink);padding-top:.6em;margin-top:.8em}`, html: (t) => `<div class="num">${esc(t.number)}</div><h1>${esc(t.headline)}</h1><div class="ft"><span>${esc(t.kicker)}</span><span>${esc(t.mark)}</span></div>` },
  { id: 'brutal', name: 'Brutalist', css: `.L-brutal{aspect-ratio:4/5;padding:6%;color:var(--ink)}.L-brutal .bx{border:4px solid var(--ink);background:var(--panel);height:100%;display:flex;flex-direction:column;box-shadow:8px 8px 0 var(--ink)}.L-brutal .k{background:var(--acc);color:#111;font:700 .6em var(--fk);padding:.45em .6em;text-transform:uppercase}.L-brutal h1{font:var(--hw) 1.6em/.95 var(--fh);margin:0;padding:.35em;text-transform:uppercase}.L-brutal .m{margin-top:auto;font:.65em var(--fb);padding:.7em;border-top:4px solid var(--ink)}`, html: (t) => `<div class="bx"><div class="k">${esc(t.kicker)}</div><h1>${esc(t.headline)}</h1><div class="m">${esc(t.mark)}</div></div>` },
  { id: 'editorial', name: 'Editorial', css: `.L-editorial{aspect-ratio:3/4;padding:9% 8%;color:var(--ink)}.L-editorial .k{font:600 .55em var(--fk);letter-spacing:.16em;text-transform:uppercase;border-bottom:1px solid var(--ink);padding-bottom:.45em;display:flex;justify-content:space-between}.L-editorial h1{font:var(--hw) 1.55em/1.05 var(--fh);margin:.45em 0}.L-editorial p{font:.62em/1.45 var(--fb);margin:0}`, html: (t) => `<div class="k"><span>${esc(t.kicker)}</span><span>No ${esc(t.number)}</span></div><h1>${esc(t.headline)}</h1><p>${esc(t.prose)}</p>` },
  { id: 'chrome', name: 'Y2K Chrome', css: `.L-chrome{aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:8%}.L-chrome h1{font:var(--hw) 1.7em/1 var(--fh);margin:0;color:var(--panel)}.L-chrome .k{font:.6em var(--fk);color:var(--acc);letter-spacing:.22em;margin-top:.8em}`, html: (t) => `<h1>${esc(t.headline)}</h1><div class="k">${esc(t.kicker)}</div>` },
  { id: 'glass', name: 'Glass Card', css: `.L-glass{aspect-ratio:4/5;display:flex;align-items:center;justify-content:center;padding:8%}.L-glass .gc{width:100%;padding:10%;border-radius:18px;background:var(--panel);border:1px solid rgba(255,255,255,.45);color:var(--ink)}.L-glass h1{font:var(--hw) 1.35em/1.1 var(--fh);margin:.3em 0}.L-glass .k{font:.58em var(--fk);letter-spacing:.12em;text-transform:uppercase}`, html: (t) => `<div class="gc"><div class="k">${esc(t.kicker)}</div><h1>${esc(t.headline)}</h1><p>${esc(t.mark)}</p></div>` },
  { id: 'cel', name: 'Anime Title Card', css: `.L-cel{aspect-ratio:16/10;display:flex;flex-direction:column;justify-content:flex-end;padding:7%}.L-cel h1{font:var(--hw) 1.7em/1 var(--fh);margin:0;color:var(--panel)}.L-cel .k{align-self:flex-start;background:var(--acc);color:var(--ink);font:800 .62em var(--fk);padding:.25em .6em;margin-bottom:.35em}`, html: (t) => `<div class="k">${esc(t.kicker)}</div><h1>${esc(t.headline)}</h1>` },
  { id: 'kindle', name: 'Kindle Page', css: `.L-kindle{aspect-ratio:3/4;padding:10% 11%;display:flex;flex-direction:column;color:var(--ink)}.L-kindle .k{font:.52em var(--fk);text-align:center;letter-spacing:.14em;text-transform:uppercase}.L-kindle h1{font:var(--hw) 1.25em/1.15 var(--fh);text-align:center}.L-kindle p{font:.66em/1.55 var(--fb);margin:0}`, html: (t) => `<div class="k">${esc(t.kicker)}</div><h1>${esc(t.headline)}</h1><p>${esc(t.prose)}</p>` },
  { id: 'riso', name: 'Riso Zine', css: `.L-riso{aspect-ratio:3/4;padding:8%;position:relative;overflow:hidden;color:var(--ink)}.L-riso h1{font:var(--hw) 1.8em/.95 var(--fh);margin:0;text-transform:uppercase}.L-riso .k{position:absolute;bottom:8%;right:8%;font:700 .65em var(--fk)}`, html: (t) => `<h1>${esc(t.headline)}</h1><div class="k">${esc(t.kicker)}</div>` },
  { id: 'terminal', name: 'Terminal', css: `.L-terminal{aspect-ratio:4/3;padding:7%;color:var(--ink);font:.72em/1.5 var(--fb)}.L-terminal h1{font:var(--hw) 1.4em/1.1 var(--fh);margin:.3em 0}`, html: (t) => `<div>$ ${esc(t.kicker.toLowerCase())}</div><h1>${esc(t.headline)}</h1><div>&gt; ${esc(t.mark)}</div>` },
];

export const RECIPES: Recipe[] = [
  { id: 'pixel-billboard', name: 'Pixel Mosaic Billboard', tags: ['Styles', 'Textures'], layout: 'billboard', texture: 'pixel', palette: 'ultraviolet', font: 'plex', text: textOf('Specialized tools from the studio', 'We make the tools you bring the vision', 'studio'), note: 'Started from a street billboard: a dithered pixel mosaic, a tall panel left of center, a monospace kicker, and a tight headline. Keep the panel about two thirds wide.' },
  { id: 'swiss-grid', name: 'Swiss Grid', tags: ['Styles', 'Type'], layout: 'swiss', texture: 'grid', palette: 'swiss', font: 'helv', text: textOf('Grid systems', 'Form follows function', 'Zürich 1959', '07'), note: 'One oversized numeral, flush-left heavy sans, two columns under a rule.' },
  { id: 'riso-zine', name: 'Risograph Zine', tags: ['Textures', 'Palettes'], layout: 'riso', texture: 'grain', palette: 'riso', font: 'archivo', text: textOf('Issue 03', 'Print it loud', 'zine'), note: 'Two spot inks and grain that fakes a risograph drum.' },
  { id: 'brutalist', name: 'Brutalist Block', tags: ['Styles'], layout: 'brutal', texture: 'flat', palette: 'concrete', font: 'archivo', text: textOf('Manifesto', 'No decoration, only structure', 'read more'), note: 'Thick borders, hard offset shadow, one hot accent bar.' },
  { id: 'y2k-chrome', name: 'Y2K Chrome', tags: ['Styles', 'Textures'], layout: 'chrome', texture: 'chrome', palette: 'chrome', font: 'unbounded', text: textOf('Millennium mixtape', 'CYBER 2000', 'disc'), note: 'Metallic type on a dark navy ground.' },
  { id: 'editorial-serif', name: 'Editorial Serif', tags: ['Type', 'Styles'], layout: 'editorial', texture: 'paper', palette: 'ink', font: 'playfair', text: textOf('The Review', 'Quiet power of a good serif', '', '12'), note: 'High-contrast serif, tracked caps, a short body.' },
  { id: 'paper-noise', name: 'Paper & Noise', tags: ['Textures'], layout: 'kindle', texture: 'paper', palette: 'ink', font: 'literata', text: textOf('Chapter One', 'Notes from the margin', '', '3'), note: 'Warm paper with a little fiber.' },
  { id: 'halftone-pop', name: 'Halftone Pop', tags: ['Textures', 'Palettes'], layout: 'brutal', texture: 'halftone', palette: 'sunset', font: 'bungee', text: textOf('Pow!', 'Comic book energy', 'next panel'), note: 'Dot screen plus bold display type.' },
  { id: 'glassmorphism', name: 'Glassmorphism', tags: ['Styles', 'Textures'], layout: 'glass', texture: 'glass', palette: 'frost', font: 'syne', text: textOf('Now playing', 'Soft light, sharp type', 'open'), note: 'A translucent card over saturated blobs.' },
  { id: 'anime-cel', name: 'Anime Cel Title', tags: ['Styles', 'Palettes'], layout: 'cel', texture: 'speed', palette: 'cel', font: 'rounded', text: textOf('Episode 1', 'The sky remembers', ''), note: 'Speed lines, a tilted tag, flat cel colour.' },
  { id: 'kindle-magazine', name: 'Kindle Magazine', tags: ['Type', 'Styles'], layout: 'kindle', texture: 'flat', palette: 'sepia', font: 'literata', text: textOf('Artometrics · Issue 1', 'How franchises eat the box office', '', '3'), note: 'A page, not a feed. Book serif, running head.' },
  { id: 'terminal-green', name: 'Terminal Green', tags: ['Styles', 'Palettes'], layout: 'terminal', texture: 'scan', palette: 'terminal', font: 'spacemono', text: textOf('RUN EXPERIMENT', 'log_042: it works', 'ok'), note: 'Phosphor on near-black with scanlines.' },
  { id: 'acid-checker', name: 'Acid Checker', tags: ['Textures', 'Palettes'], layout: 'brutal', texture: 'checker', palette: 'acid', font: 'rubik', text: textOf('Rave flyer', 'Loud on purpose', 'tickets'), note: 'Acid checkerboard, mono caps on a white box.' },
  { id: 'house-swiss', name: 'KSM House', tags: ['Palettes', 'Styles'], layout: 'swiss', texture: 'flat', palette: 'house', font: 'helv', text: textOf('Kyle S. McAuliffe', 'Make. Share.', 'artometrics', 'KSM'), note: 'White ground, red mark, blue for the action.' },
  { id: 'forest-editorial', name: 'Forest Almanac', tags: ['Palettes', 'Type'], layout: 'editorial', texture: 'paper', palette: 'forest', font: 'fraunces', text: textOf('Field notes', 'Slow growth wins', '', '04'), note: 'Deep green, cream type, brass accent.' },
  { id: 'sunset-mesh', name: 'Sunset Mesh', tags: ['Textures', 'Palettes'], layout: 'glass', texture: 'mesh', palette: 'sunset', font: 'dmserif', text: textOf('Golden hour', 'Warm light, long shadows', 'watch'), note: 'Two corner gradients.' },
  { id: 'stripe-warning', name: 'Hazard Stripes', tags: ['Textures'], layout: 'brutal', texture: 'stripes', palette: 'concrete', font: 'rubik', text: textOf('Under construction', 'Work in progress', 'soon'), note: 'Hazard tape at a four-to-one ratio.' },
  { id: 'pixel-terminal', name: '8-bit Arcade', tags: ['Textures', 'Type'], layout: 'chrome', texture: 'pixel', palette: 'terminal', font: 'spacemono', text: textOf('Press start', 'GAME ON', ''), note: 'Pixel mosaic recoloured in phosphor green.' },
  { id: 'riso-editorial', name: 'Riso Editorial', tags: ['Type', 'Textures'], layout: 'editorial', texture: 'grain', palette: 'riso', font: 'dmserif', text: textOf('Culture desk', 'Ink that misbehaves', '', '09'), note: 'Editorial type over two-colour grain.' },
  { id: 'halftone-cel', name: 'Manga Halftone', tags: ['Textures', 'Styles'], layout: 'cel', texture: 'halftone', palette: 'newsprint', font: 'archivo', text: textOf('Chapter 7', "Don't look back", ''), note: 'Screentone dots and a cover title.' },
  { id: 'chrome-glass', name: 'Frosted Chrome', tags: ['Styles'], layout: 'glass', texture: 'chrome', palette: 'chrome', font: 'unbounded', text: textOf('Beta', 'Future interface', 'join'), note: 'A glass card on the chrome sweep.' },
];

export const FONT_STYLESHEET =
  'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=Inter+Tight:wght@400;600;800&family=Inter:wght@400;700;900&family=Archivo+Black&family=Playfair+Display:ital,wght@0,700;1,400&family=Space+Grotesk:wght@400;700&family=Syne:wght@700;800&family=DM+Serif+Display&family=Bungee&family=Rubik+Mono+One&family=Fraunces:opsz,wght@9..144,700;9..144,900&family=Literata:ital,wght@0,400;0,700;1,400&family=M+PLUS+Rounded+1c:wght@400;800&family=Space+Mono:wght@400;700&family=Unbounded:wght@400;800&display=swap';

const byId = <T extends { id: string }>(rows: T[], id: string) => rows.find((row) => row.id === id);

export function recipeById(id: string): Recipe | undefined {
  return RECIPES.find((recipe) => recipe.id === id);
}

export function recipeVars(recipe: Pick<Recipe, 'palette' | 'font' | 'texture'>): string {
  const palette = byId(PALETTES, recipe.palette) ?? PALETTES[0];
  const font = byId(FONTS, recipe.font) ?? FONTS[0];
  const texture = byId(TEXTURES, recipe.texture) ?? TEXTURES[0];
  const [bg, ink, acc, panel, alt] = palette.colors;
  return `--bg:${bg};--ink:${ink};--acc:${acc};--panel:${panel};--alt:${alt};--fh:'${font.heading}';--fb:'${font.body}';--fk:'${font.label}';--hw:${font.headingWeight};background:${texture.background(palette.colors)};color:${ink}`;
}

export const RECIPE_BASE_CSS = `.sr{font-size:clamp(14px,4.2vw,28px);overflow:hidden;position:relative;min-height:100%}${LAYOUTS.map((layout) => layout.css).join('')}`;

export function recipeCardHtml(recipe: Recipe): string {
  const layout = byId(LAYOUTS, recipe.layout) ?? LAYOUTS[0];
  return `<div class="sr L-${layout.id}" style="${recipeVars(recipe)}">${layout.html(recipe.text)}</div>`;
}

export function recipeSnippet(recipe: Recipe): string {
  const font = byId(FONTS, recipe.font) ?? FONTS[0];
  const families = [...new Set([font.heading, font.body, font.label])]
    .map((name) => `family=${name.replace(/ /g, '+')}:wght@400;700;800;900`)
    .join('&');
  const layout = byId(LAYOUTS, recipe.layout) ?? LAYOUTS[0];
  return `<!-- ${recipe.name} — Style Recipe -->
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${families}&display=swap">
<style>
.sr{font-size:clamp(14px,4.2vw,28px);overflow:hidden}
${layout.css}
</style>
<div style="container-type:inline-size;max-width:480px">
${recipeCardHtml(recipe)}
</div>`;
}

export function recipeAttributes(recipe: Recipe): EngagementAttributes {
  const palette = byId(PALETTES, recipe.palette);
  return {
    name: recipe.name,
    tags: recipe.tags,
    colors: palette ? [...palette.colors] : [],
    topic: recipe.tags[0],
    layout: recipe.layout,
    texture: recipe.texture,
    palette: recipe.palette,
    fonts: recipe.font,
  };
}

export function mixRecipe(base: Recipe, patch: Partial<Pick<Recipe, 'layout' | 'texture' | 'palette' | 'font'>>): Recipe {
  return {
    ...base,
    ...patch,
    id: 'mix',
    name: 'Mix',
    tags: ['Mix'],
    note: `Mixed from ${base.name}.`,
  };
}

function esc(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

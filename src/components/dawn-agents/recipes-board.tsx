'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { FONT_STYLESHEET, FONTS, LAYOUTS, PALETTES, RECIPES, RECIPE_BASE_CSS, TEXTURES, mixRecipe, recipeAttributes, recipeById, recipeCardHtml, recipeSnippet, youtubeThumb, type Recipe } from '@/lib/dawn-agents/recipes';

const CATS = ['All', 'References', 'Styles', 'Textures', 'Palettes', 'Type'];
const WIDE = '(min-width: 900px)';
const SAVED_KEY = 'dawn-recipes-saved';
const SAVED_EVENT = 'dawn-recipes-saved';

function subscribeWide(notify: () => void) {
  const query = window.matchMedia(WIDE);
  query.addEventListener('change', notify);
  return () => query.removeEventListener('change', notify);
}

let savedCacheRaw: string | null = null;
let savedCache: string[] = [];

function readSaved(): string[] {
  try {
    const raw = window.localStorage.getItem(SAVED_KEY) ?? '';
    if (raw === savedCacheRaw) return savedCache;
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    savedCacheRaw = raw;
    savedCache = Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
    return savedCache;
  } catch {
    return savedCache;
  }
}

function subscribeSaved(notify: () => void) {
  window.addEventListener('storage', notify);
  window.addEventListener(SAVED_EVENT, notify);
  return () => {
    window.removeEventListener('storage', notify);
    window.removeEventListener(SAVED_EVENT, notify);
  };
}

export function RecipesBoard({ onEvent }: { onEvent: (action: string, recipe: Recipe) => Promise<void> }) {
  const [cat, setCat] = useState('All');
  const [query, setQuery] = useState('');
  const [savedOnly, setSavedOnly] = useState(false);
  const saved = useSyncExternalStore(subscribeSaved, readSaved, (): string[] => []);
  const [open, setOpen] = useState<Recipe | null>(null);
  const [mixing, setMixing] = useState<Recipe | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const wide = useSyncExternalStore(subscribeWide, () => window.matchMedia(WIDE).matches, () => false);

  useEffect(() => {
    const apply = () => {
      const id = window.location.hash.replace(/^#/, '');
      if (!id) return;
      const found = recipeById(id);
      if (found) setOpen(found);
    };
    apply();
    window.addEventListener('hashchange', apply);
    return () => window.removeEventListener('hashchange', apply);
  }, []);

  function openRecipe(recipe: Recipe) {
    setOpen(recipe);
    const next = `${window.location.pathname}${window.location.search}#${recipe.id}`;
    window.history.replaceState(null, '', next);
  }

  function closeSheet() {
    setOpen(null);
    setMixing(null);
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
  }

  const min = 2;
  const max = wide ? 10 : 6;
  const cols = Math.min(max, Math.max(min, picked ?? (wide ? 4 : 2)));
  function persistSaved(next: string[]) {
    try {
      window.localStorage.setItem(SAVED_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    savedCacheRaw = null;
    window.dispatchEvent(new Event(SAVED_EVENT));
  }
  const needle = query.trim().toLowerCase();
  const list = RECIPES.filter((recipe) => cat === 'All' || recipe.tags.includes(cat)).filter((recipe) => {
    if (savedOnly && !saved.includes(recipe.id)) return false;
    if (!needle) return true;
    const hay = [recipe.name, recipe.note, recipe.video?.url, recipe.video?.id, ...recipe.tags].join(' ').toLowerCase();
    return hay.includes(needle);
  });

  useEffect(() => {
    if (!open && !mixing) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (mixing) setMixing(null);
      else closeSheet();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, mixing]);

  return (
    <div className="rb">
      <link rel="stylesheet" href={FONT_STYLESHEET} />
      <style>{RECIPE_BASE_CSS}</style>
      {!open && !mixing && (
        <>
          <div className="rb-tools">
            <div className="rb-seg" role="group" aria-label="Filter recipes">
              {CATS.map((item) => (
                <button key={item} type="button" aria-pressed={item === cat} onClick={() => setCat(item)}>
                  {item}
                </button>
              ))}
            </div>
            <label className="rb-search">
              <span className="sr-only">Search recipes</span>
              <input
                type="search"
                placeholder="Search layouts, palettes, references…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <button type="button" className="dw-btn" aria-pressed={savedOnly} onClick={() => setSavedOnly((v) => !v)}>
              Saved{saved.length ? ` (${saved.length})` : ''}
            </button>
            <div className="rb-size" role="group" aria-label="Grid size">
              <button type="button" aria-label="Fewer columns, larger cards" disabled={cols <= min} onClick={() => setPicked(cols - 1)}>−</button>
              <input
                type="range"
                aria-label="Columns"
                min={min}
                max={max}
                value={cols}
                onChange={(event) => setPicked(Number(event.target.value))}
              />
              <button type="button" aria-label="More columns, smaller cards" disabled={cols >= max} onClick={() => setPicked(cols + 1)}>+</button>
            </div>
          </div>
          {list.length === 0 ? <p className="dw-lead">No recipes match that search.</p> : null}
          <div className="board" style={{ ['--cols' as string]: cols }}>
            {list.map((recipe, index) => (
              <button key={recipe.id} type="button" className="pin" style={{ ['--i' as string]: Math.min(index, 12) }} aria-label={`Open ${recipe.name}`} onClick={() => openRecipe(recipe)}>
                {recipe.video ? (
                  <div className={`cv cv-video${recipe.video.aspect === 'portrait' ? ' is-portrait' : ''}`}>
                    <img src={youtubeThumb(recipe.video.id)} alt="" />
                    <span className="rb-play" aria-hidden />
                  </div>
                ) : (
                  <div className="cv" dangerouslySetInnerHTML={{ __html: recipeCardHtml(recipe) }} />
                )}
                <div className="nm">
                  <span>{recipe.name}</span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
      {open && !mixing && (
        <RecipeSheet
          recipe={open}
          onClose={closeSheet}
          onMix={() => setMixing(open)}
          onEvent={async (action) => {
            if (action === 'save') {
              persistSaved(saved.includes(open.id) ? saved.filter((id) => id !== open.id) : [...saved, open.id]);
            }
            await onEvent(action, open);
          }}
        />
      )}
      {mixing && (
        <Mixer
          seed={mixing}
          onClose={() => setMixing(null)}
          onKeep={async (recipe) => {
            await onEvent('remix', recipe);
            setMixing(null);
          }}
        />
      )}
    </div>
  );
}

function RecipeSheet({
  recipe,
  onClose,
  onMix,
  onEvent,
}: {
  recipe: Recipe;
  onClose: () => void;
  onMix: () => void;
  onEvent: (action: 'like' | 'save' | 'skip') => Promise<void>;
}) {
  const palette = PALETTES.find((item) => item.id === recipe.palette);
  const html = useMemo(() => recipeSnippet(recipe), [recipe]);
  const video = recipe.video;
  return (
    <div className={`rb-sheet${video?.aspect === 'portrait' ? ' is-portrait' : ''}`}>
      <div className="rb-top">
        <button type="button" className="dw-btn" onClick={onClose}>Back</button>
        <h2 className="dw-h2" style={{ flex: 1, margin: 0 }}>{recipe.name}</h2>
      </div>
      {video ? (
        <div className={`rb-embed${video.aspect === 'portrait' ? ' is-portrait' : ''}`}>
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video.id}`}
            title={recipe.name}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      ) : (
        <div className="cv" dangerouslySetInnerHTML={{ __html: recipeCardHtml(recipe) }} />
      )}
      <div className="rb-tags">
        {recipe.tags.map((tag) => <span key={tag} className="dw-badge">{tag}</span>)}
      </div>
      <p className="dw-lead">{recipe.note}</p>
      {video ? (
        <p className="dw-lead">
          <a href={video.url} target="_blank" rel="noreferrer">Open on YouTube</a>
        </p>
      ) : null}
      <div className="dw-actions">
        <button type="button" className="dw-btn dw-btn--primary" onClick={() => onEvent('like')}>Like</button>
        <button type="button" className="dw-btn" onClick={() => onEvent('save')}>Save</button>
        <button type="button" className="dw-btn" onClick={() => onEvent('skip')}>Skip</button>
        {video ? null : <button type="button" className="dw-btn" onClick={onMix}>Mix</button>}
      </div>
      {video ? null : (
        <>
          <div className="dw-actions">
            {palette?.colors.map((color) => (
              <button key={color} type="button" className="dw-btn dw-btn--chip" onClick={() => navigator.clipboard.writeText(color)}>
                <span className="rb-dot" style={{ background: color }} aria-hidden />
                {color}
              </button>
            ))}
          </div>
          <details className="rb-code">
            <summary>HTML</summary>
            <button type="button" className="dw-btn" onClick={() => navigator.clipboard.writeText(html)}>Copy HTML</button>
            <pre>{html}</pre>
          </details>
        </>
      )}
    </div>
  );
}

function Mixer({ seed, onClose, onKeep }: { seed: Recipe; onClose: () => void; onKeep: (recipe: Recipe) => Promise<void> }) {
  const [layout, setLayout] = useState(seed.layout);
  const [texture, setTexture] = useState(seed.texture);
  const [palette, setPalette] = useState(seed.palette);
  const [font, setFont] = useState(seed.font);
  const mixed = mixRecipe(seed, { layout, texture, palette, font });
  return (
    <div className="rb-sheet">
      <div className="rb-top">
        <button type="button" className="dw-btn" onClick={onClose}>Back</button>
        <h2 className="dw-h2" style={{ margin: 0 }}>Mix</h2>
      </div>
      <div className="cv" dangerouslySetInnerHTML={{ __html: recipeCardHtml(mixed) }} />
      <Select label="Style" value={layout} options={LAYOUTS.map((item) => [item.id, item.name])} onChange={setLayout} />
      <Select label="Texture" value={texture} options={TEXTURES.map((item) => [item.id, item.name])} onChange={setTexture} />
      <Select label="Palette" value={palette} options={PALETTES.map((item) => [item.id, item.name])} onChange={setPalette} />
      <Select label="Type" value={font} options={FONTS.map((item) => [item.id, item.name])} onChange={setFont} />
      <button type="button" className="dw-btn dw-btn--primary" onClick={() => onKeep(mixed)}>Keep this mix</button>
    </div>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: [string, string][]; onChange: (value: string) => void }) {
  return (
    <label className="dw-label">
      {label}
      <select className="dw-field" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map(([id, name]) => (
          <option key={id} value={id}>{name}</option>
        ))}
      </select>
    </label>
  );
}

export function recipeFromId(id: string) {
  return recipeById(id);
}

export { recipeAttributes };

'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { FONT_STYLESHEET, FONTS, LAYOUTS, PALETTES, RECIPES, RECIPE_BASE_CSS, TEXTURES, mixRecipe, recipeAttributes, recipeById, recipeCardHtml, recipeSnippet, type Recipe } from '@/lib/dawn-agents/recipes';

const CATS = ['All', 'Styles', 'Textures', 'Palettes', 'Type'];
const WIDE = '(min-width: 900px)';

function subscribeWide(notify: () => void) {
  const query = window.matchMedia(WIDE);
  query.addEventListener('change', notify);
  return () => query.removeEventListener('change', notify);
}

export function RecipesBoard({ onEvent }: { onEvent: (action: string, recipe: Recipe) => Promise<void> }) {
  const [cat, setCat] = useState('All');
  const [query, setQuery] = useState('');
  const [savedOnly, setSavedOnly] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);
  const [open, setOpen] = useState<Recipe | null>(null);
  const [mixing, setMixing] = useState<Recipe | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const wide = useSyncExternalStore(subscribeWide, () => window.matchMedia(WIDE).matches, () => false);
  const min = 2;
  const max = wide ? 10 : 6;
  const cols = Math.min(max, Math.max(min, picked ?? (wide ? 4 : 2)));
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('dawn-recipes-saved');
      if (raw) setSaved(JSON.parse(raw) as string[]);
    } catch {
      /* ignore */
    }
  }, []);
  function persistSaved(next: string[]) {
    setSaved(next);
    try {
      window.localStorage.setItem('dawn-recipes-saved', JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }
  const needle = query.trim().toLowerCase();
  const list = RECIPES.filter((recipe) => cat === 'All' || recipe.tags.includes(cat)).filter((recipe) => {
    if (savedOnly && !saved.includes(recipe.id)) return false;
    if (!needle) return true;
    const hay = [recipe.name, recipe.note, ...recipe.tags].join(' ').toLowerCase();
    return hay.includes(needle);
  });

  useEffect(() => {
    if (!open && !mixing) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (mixing) setMixing(null);
      else setOpen(null);
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
                placeholder="Search layouts, palettes, type…"
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
              <button key={recipe.id} type="button" className="pin" style={{ ['--i' as string]: Math.min(index, 12) }} aria-label={`Open ${recipe.name}`} onClick={() => setOpen(recipe)}>
                <div className="cv" dangerouslySetInnerHTML={{ __html: recipeCardHtml(recipe) }} />
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
          onClose={() => setOpen(null)}
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
  return (
    <div className="rb-sheet">
      <div className="rb-top">
        <button type="button" className="dw-btn" onClick={onClose}>Back</button>
        <h2 className="dw-h2" style={{ flex: 1, margin: 0 }}>{recipe.name}</h2>
      </div>
      <div className="cv" dangerouslySetInnerHTML={{ __html: recipeCardHtml(recipe) }} />
      <div className="rb-tags">
        {recipe.tags.map((tag) => <span key={tag} className="dw-badge">{tag}</span>)}
      </div>
      <p className="dw-lead">{recipe.note}</p>
      <div className="dw-actions">
        <button type="button" className="dw-btn dw-btn--primary" onClick={() => onEvent('like')}>Like</button>
        <button type="button" className="dw-btn" onClick={() => onEvent('save')}>Save</button>
        <button type="button" className="dw-btn" onClick={() => onEvent('skip')}>Skip</button>
        <button type="button" className="dw-btn" onClick={onMix}>Mix</button>
      </div>
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

'use client';

import { useMemo, useState } from 'react';
import { FONT_STYLESHEET, FONTS, LAYOUTS, PALETTES, RECIPES, RECIPE_BASE_CSS, TEXTURES, mixRecipe, recipeAttributes, recipeById, recipeCardHtml, recipeSnippet, type Recipe } from '@/lib/dawn-agents/recipes';

const CATS = ['All', 'Styles', 'Textures', 'Palettes', 'Type'];

export function RecipesBoard({ onEvent }: { onEvent: (action: string, recipe: Recipe) => Promise<void> }) {
  const [cat, setCat] = useState('All');
  const [open, setOpen] = useState<Recipe | null>(null);
  const [mixing, setMixing] = useState<Recipe | null>(null);
  const list = RECIPES.filter((recipe) => cat === 'All' || recipe.tags.includes(cat));
  return (
    <div className="rb">
      <link rel="stylesheet" href={FONT_STYLESHEET} />
      <style>{RECIPE_BASE_CSS}</style>
      <div className="dw-actions">
        {CATS.map((item) => (
          <button key={item} type="button" className="dw-btn dw-btn--chip" aria-pressed={item === cat} onClick={() => setCat(item)}>
            {item}
          </button>
        ))}
      </div>
      <div className="board">
        {list.map((recipe) => (
          <button key={recipe.id} type="button" className="pin" onClick={() => setOpen(recipe)}>
            <div className="cv" dangerouslySetInnerHTML={{ __html: recipeCardHtml(recipe) }} />
            <div className="nm">
              <span>{recipe.name}</span>
            </div>
          </button>
        ))}
      </div>
      {open && !mixing && (
        <RecipeSheet
          recipe={open}
          onClose={() => setOpen(null)}
          onMix={() => setMixing(open)}
          onEvent={async (action) => {
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
      <div className="dw-actions">
        <button type="button" className="dw-btn dw-btn--ghost" onClick={onClose}>Back</button>
        <h2 className="dw-h2" style={{ flex: 1, margin: 0 }}>{recipe.name}</h2>
      </div>
      <div className="cv" dangerouslySetInnerHTML={{ __html: recipeCardHtml(recipe) }} />
      <p className="dw-lead">{recipe.note}</p>
      <div className="dw-actions">
        {palette?.colors.map((color) => (
          <button key={color} type="button" className="dw-btn dw-btn--ghost" onClick={() => navigator.clipboard.writeText(color)}>
            {color}
          </button>
        ))}
      </div>
      <div className="dw-actions">
        <button type="button" className="dw-btn dw-btn--primary" onClick={() => onEvent('like')}>Like</button>
        <button type="button" className="dw-btn dw-btn--ghost" onClick={() => onEvent('save')}>Save</button>
        <button type="button" className="dw-btn dw-btn--ghost" onClick={() => onEvent('skip')}>Skip</button>
        <button type="button" className="dw-btn dw-btn--ghost" onClick={onMix}>Mix</button>
        <button type="button" className="dw-btn dw-btn--ghost" onClick={() => navigator.clipboard.writeText(html)}>Copy HTML</button>
      </div>
      <pre>{html}</pre>
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
      <div className="dw-actions">
        <button type="button" className="dw-btn dw-btn--ghost" onClick={onClose}>Back</button>
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

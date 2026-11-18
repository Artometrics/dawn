'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { createPortal, flushSync } from 'react-dom';
import {
  AlignCenter, AlignLeft, AlignRight, ArrowLeft, Bold, Bot, CaseUpper, Check, Contrast, Copy, Download, Eye, FileImage,
  Heart, ImageUp, Italic, Link, Maximize2, Minimize2, MousePointerClick, Palette, Redo2, Rocket, RotateCcw, Search, Share2,
  Shuffle, Sparkles, Type, Undo2, X,
} from 'lucide-react';
import {
  STUDIO_FONTS, STUDIO_FONT_CSS, STUDIO_KINDS, STUDIO_PALETTES, STUDIO_RECIPES, STUDIO_SWATCHES, studioDoc, studioExportHeader,
  studioRecipe, type StudioKind, type StudioRecipe,
} from '@/lib/studio/recipes';

/* ---------- local stores (saved hearts + edited drafts) ---------- */

type Draft = { body: string; root: string; at: number };

function localStore<T>(key: string, fallback: T) {
  let raw: string | null = null;
  let cache = fallback;
  const event = `${key}:change`;
  return {
    read(): T {
      try {
        const next = window.localStorage.getItem(key) ?? '';
        if (next === raw) return cache;
        raw = next;
        cache = next ? (JSON.parse(next) as T) : fallback;
      } catch {
        /* keep cache */
      }
      return cache;
    },
    write(value: T) {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch {
        /* storage full or blocked */
      }
      window.dispatchEvent(new Event(event));
    },
    subscribe(notify: () => void) {
      window.addEventListener('storage', notify);
      window.addEventListener(event, notify);
      return () => {
        window.removeEventListener('storage', notify);
        window.removeEventListener(event, notify);
      };
    },
    server: () => fallback,
  };
}

const savedStore = localStore<string[]>('dawn-studio-saved', []);
const draftStore = localStore<Record<string, Draft>>('dawn-studio-drafts', {});

function useStore<T>(store: ReturnType<typeof localStore<T>>): T {
  return useSyncExternalStore(store.subscribe, store.read, store.server);
}

/* ---------- export helpers ---------- */

const EDIT_CSS = `body.dawn-editing [data-e]{cursor:pointer}
body.dawn-editing [data-e]:hover{outline:.12rem dashed rgba(47,107,255,.7)}
body.dawn-editing [data-sel]{outline:.16rem solid #2f6bff !important;outline-offset:.15rem}
body.dawn-editing [contenteditable]{cursor:text}`;

function cleanClone(doc: Document): HTMLElement {
  const root = doc.documentElement.cloneNode(true) as HTMLElement;
  root.querySelector('#dawn-edit')?.remove();
  root.querySelectorAll('[data-sel]').forEach((el) => el.removeAttribute('data-sel'));
  root.querySelectorAll('[contenteditable]').forEach((el) => el.removeAttribute('contenteditable'));
  root.querySelector('body')?.classList.remove('dawn-editing');
  if (root.querySelector('body')?.getAttribute('class') === '') root.querySelector('body')?.removeAttribute('class');
  return root;
}

function snapshot(doc: Document): Omit<Draft, 'at'> {
  const root = cleanClone(doc);
  root.querySelector('#dawn-js')?.remove();
  return { body: root.querySelector('body')?.innerHTML ?? '', root: doc.documentElement.getAttribute('style') ?? '' };
}

async function toDataUrl(src: string): Promise<string> {
  const res = await fetch(new URL(src, window.location.href).toString());
  const blob = await res.blob();
  return await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}

/** One self-contained file: images inlined as data URLs, edit chrome stripped. */
async function exportHtml(recipe: StudioRecipe, doc: Document): Promise<string> {
  const root = cleanClone(doc);
  await Promise.all(
    [...root.querySelectorAll('img')].map(async (img) => {
      const src = img.getAttribute('src');
      if (!src || src.startsWith('data:')) return;
      try {
        img.setAttribute('src', await toDataUrl(src));
      } catch {
        img.setAttribute('src', new URL(src, window.location.href).toString());
      }
    }),
  );
  return `<!doctype html>\n${studioExportHeader(recipe)}${root.outerHTML}\n`;
}

function exportFromRecipe(recipe: StudioRecipe, draft?: Draft): Promise<string> {
  const doc = new DOMParser().parseFromString(studioDoc(recipe, { body: draft?.body, rootStyle: draft?.root }), 'text/html');
  return exportHtml(recipe, doc);
}

function downloadText(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/html' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function recipeLink(recipe: StudioRecipe) {
  return `${window.location.origin}${window.location.pathname}?r=${recipe.id}`;
}

async function shareRecipe(recipe: StudioRecipe, html: string): Promise<string> {
  const file = new File([html], `${recipe.id}.html`, { type: 'text/html' });
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  try {
    if (nav.canShare?.({ files: [file] })) {
      await nav.share({ files: [file], title: recipe.title, text: `${recipe.title} from Dawn Recipes` });
      return 'Shared';
    }
    if (nav.share) {
      await nav.share({ title: recipe.title, text: `${recipe.title} from Dawn Recipes`, url: recipeLink(recipe) });
      return 'Shared';
    }
  } catch (error) {
    if ((error as Error).name === 'AbortError') return '';
  }
  await navigator.clipboard.writeText(recipeLink(recipe)).catch(() => undefined);
  return 'Link copied';
}

function withTransition(update: () => void) {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!doc.startViewTransition || reduce) {
    update();
    return;
  }
  doc.startViewTransition(() => flushSync(update));
}

/* ---------- small pieces ---------- */

function Toast({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div className="st-toast" role="status">
      <Check size={16} aria-hidden /> {text}
    </div>
  );
}

function ToolButton({ icon, label, onClick, active, disabled, primary }: { icon: ReactNode; label: string; onClick: () => void; active?: boolean; disabled?: boolean; primary?: boolean }) {
  return (
    <button type="button" className={`st-tool${primary ? ' st-tool--primary' : ''}`} aria-pressed={active} disabled={disabled} onClick={onClick}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

function Badge({ recipe }: { recipe: StudioRecipe }) {
  return <span className={`st-badge st-badge--${recipe.origin.replace(/\s+/g, '-').toLowerCase()}`}>{recipe.origin}</span>;
}

/* ---------- board ---------- */

const noopSubscribe = () => () => {};

const MAST_FONT_CSS =
  'https://fonts.googleapis.com/css2?family=Anton&family=DM+Mono:wght@400;500&family=DM+Sans:ital,opsz,wght@0,9..40,400..700;1,9..40,400&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;1,8..60,400&display=swap';
const pdCount = STUDIO_RECIPES.filter((recipe) => recipe.origin === 'Public domain').length;
const DATELINE = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
const noSubscribe = () => () => undefined;
const todayLine = () => DATELINE.format(new Date());
const noDate = () => 'Dawn edition';

export function RecipesStudio({ classic }: { classic?: ReactNode }) {
  const [kind, setKind] = useState<'All' | StudioKind | 'Videos & swatches'>('All');
  const [query, setQuery] = useState('');
  const [savedOnly, setSavedOnly] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const dateline = useSyncExternalStore(noSubscribe, todayLine, noDate);
  const [toast, setToast] = useState('');
  const saved = useStore(savedStore);
  const drafts = useStore(draftStore);
  const boardRef = useRef<HTMLDivElement>(null);
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);

  const flash = useCallback((text: string) => {
    if (!text) return;
    setToast(text);
    window.setTimeout(() => setToast((t) => (t === text ? '' : t)), 2200);
  }, []);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('r');
    if (id && studioRecipe(id)) {
      const t = window.setTimeout(() => setOpenId(id), 0);
      return () => window.clearTimeout(t);
    }
  }, []);

  const needle = query.trim().toLowerCase();
  const list = useMemo(
    () =>
      STUDIO_RECIPES.filter((r) => kind === 'All' || r.kind === kind)
        .filter((r) => !savedOnly || saved.includes(r.id))
        .filter((r) => !needle || [r.title, r.blurb, r.kind, r.origin, r.inspiredBy ?? '', r.source?.by ?? ''].join(' ').toLowerCase().includes(needle)),
    [kind, savedOnly, saved, needle],
  );

  function toggleSave(id: string) {
    savedStore.write(saved.includes(id) ? saved.filter((x) => x !== id) : [...saved, id]);
  }

  function open(id: string, el: HTMLElement | null) {
    if (el) el.style.viewTransitionName = 'st-canvas';
    withTransition(() => {
      if (el) el.style.viewTransitionName = '';
      setOpenId(id);
    });
    const url = new URL(window.location.href);
    url.searchParams.set('r', id);
    window.history.replaceState(null, '', url);
  }

  function close() {
    const id = openId;
    withTransition(() => {
      setOpenId(null);
      const el = boardRef.current?.querySelector<HTMLElement>(`[data-frame="${id}"]`);
      if (el) {
        el.style.viewTransitionName = 'st-canvas';
        window.setTimeout(() => (el.style.viewTransitionName = ''), 600);
      }
    });
    const url = new URL(window.location.href);
    url.searchParams.delete('r');
    window.history.replaceState(null, '', url);
  }

  const openRecipe = openId ? studioRecipe(openId) : undefined;

  return (
    <div className="st">
      <link rel="stylesheet" href={STUDIO_FONT_CSS} />
      <link rel="stylesheet" href={MAST_FONT_CSS} />
      <header className="st-head st-mast">
        <p className="st-dateline">{dateline}</p>
        <div className="st-word" aria-label="Artometrics">
          <span>Artometrics</span>
        </div>
        <p className="st-tag">
          culture, quantified <b>Dawn</b>
        </p>
        <p className="st-kicker">Recipes · The studio</p>
        <h2 className="st-title">
          {STUDIO_RECIPES.length} recipes for <em>covers, cards &amp; moving</em> things
        </h2>
        <p className="st-sub">
          Tickets, art cards, design-deck cards, magazine covers, posters, archive scans, motion and game assets. Tap one to edit any text, image or
          colour live, then ship it as a single HTML file or save it as an image.
        </p>
        <p className="st-stats">
          <span>
            <b>{STUDIO_RECIPES.length}</b> recipes
          </span>
          <span>
            <b>{pdCount}</b> public-domain scans
          </span>
          <span>
            <b>{STUDIO_FONTS.length}</b> fonts
          </span>
          <span>
            <b>1</b> file each
          </span>
        </p>
      </header>

      <div className="st-bar">
        <div className="st-chips" role="group" aria-label="Filter recipes">
          {[...STUDIO_KINDS, ...(classic ? (['Videos & swatches'] as const) : [])].map((item) => (
            <button key={item} type="button" className="st-chip" aria-pressed={item === kind} onClick={() => setKind(item)}>
              {item}
            </button>
          ))}
        </div>
        <div className="st-bar-right">
          <label className="st-search">
            <Search size={16} aria-hidden />
            <span className="dw-sr-only">Search recipes</span>
            <input type="search" placeholder="Search Vogue, poster, pixel…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <button type="button" className="st-chip st-chip--icon" aria-pressed={savedOnly} onClick={() => setSavedOnly((v) => !v)}>
            <Heart size={15} aria-hidden fill={savedOnly ? 'currentColor' : 'none'} /> Saved{saved.length ? ` ${saved.length}` : ''}
          </button>
        </div>
      </div>

      {kind === 'Videos & swatches' ? (
        classic
      ) : (
        <>
          {list.length === 0 && <p className="st-empty">Nothing matches. Try “poster” or clear Saved.</p>}
          <div className="st-board" ref={boardRef}>
            {list.map((recipe, index) => (
              <Pin
                key={recipe.id}
                recipe={recipe}
                index={index}
                draft={drafts[recipe.id]}
                saved={saved.includes(recipe.id)}
                onOpen={(el) => open(recipe.id, el)}
                onSave={() => toggleSave(recipe.id)}
                onDownload={async () => {
                  downloadText(`${recipe.id}.html`, await exportFromRecipe(recipe, drafts[recipe.id]));
                  flash('Downloaded .html');
                }}
                onShare={async () => flash(await shareRecipe(recipe, await exportFromRecipe(recipe, drafts[recipe.id])))}
              />
            ))}
          </div>
        </>
      )}

      {openRecipe && createPortal(
        <div className="st-portal">
        <Editor
          recipe={openRecipe}
          draft={drafts[openRecipe.id]}
          saved={saved.includes(openRecipe.id)}
          onSave={() => toggleSave(openRecipe.id)}
          onClose={close}
          onDraft={(draft) => draftStore.write({ ...draftStore.read(), [openRecipe.id]: draft })}
          onReset={() => {
            const next = { ...draftStore.read() };
            delete next[openRecipe.id];
            draftStore.write(next);
          }}
          flash={flash}
        />
        </div>,
        document.body,
      )}
      {mounted && createPortal(
        <div className="st-portal st-float">
          <label className="st-search">
            <Search size={16} aria-hidden />
            <span className="dw-sr-only">Search recipes</span>
            <input type="search" placeholder="Search tickets, Vogue, pixel…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <button type="button" className="st-chip st-chip--icon" aria-label="Saved only" aria-pressed={savedOnly} onClick={() => setSavedOnly((v) => !v)}>
            <Heart size={15} aria-hidden fill={savedOnly ? 'currentColor' : 'none'} />{saved.length ? ` ${saved.length}` : ''}
          </button>
        </div>,
        document.body,
      )}
      {toast && createPortal(<div className="st-portal"><Toast text={toast} /></div>, document.body)}
    </div>
  );
}

function Pin({ recipe, index, draft, saved, onOpen, onSave, onDownload, onShare }: {
  recipe: StudioRecipe; index: number; draft?: Draft; saved: boolean;
  onOpen: (el: HTMLElement | null) => void; onSave: () => void; onDownload: () => void; onShare: () => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const doc = useMemo(() => studioDoc(recipe, { body: draft?.body, rootStyle: draft?.root, thumb: true }), [recipe, draft]);
  return (
    <article className="st-pin" style={{ ['--i' as string]: Math.min(index, 14) }}>
      <button type="button" className="st-pin-open" aria-label={`Open ${recipe.title}`} onClick={() => onOpen(frameRef.current)}>
        <div className="st-pin-frame" data-frame={recipe.id} ref={frameRef} style={{ aspectRatio: recipe.ratio }}>
          <iframe title={recipe.title} srcDoc={doc} loading="lazy" tabIndex={-1} aria-hidden />
        </div>
        <span className="st-pin-hint"><MousePointerClick size={14} aria-hidden /> Edit</span>
      </button>
      <div className="st-pin-meta">
        <div className="st-pin-text">
          <p className="st-pin-title">{recipe.title}</p>
          <p className="st-pin-sub">
            <Badge recipe={recipe} />
            {draft ? <span className="st-badge st-badge--edited">Edited</span> : null}
            <span>{recipe.kind}</span>
          </p>
        </div>
        <div className="st-pin-acts">
          <button type="button" className="st-icon" aria-label={saved ? 'Unsave' : 'Save'} aria-pressed={saved} onClick={onSave}>
            <Heart size={17} fill={saved ? 'currentColor' : 'none'} aria-hidden />
          </button>
          <button type="button" className="st-icon st-icon--hover" aria-label="Download HTML" onClick={onDownload}>
            <Download size={17} aria-hidden />
          </button>
          <button type="button" className="st-icon st-icon--hover" aria-label="Share" onClick={onShare}>
            <Share2 size={17} aria-hidden />
          </button>
        </div>
      </div>
    </article>
  );
}

/* ---------- editor ---------- */

const stamp = () => Date.now();

type Info = {
  canUndo: boolean; canRedo: boolean; vars: { bg: string; fg: string; ac: string };
  font: string; size: number; bold: boolean; italic: boolean; upper: boolean; align: string;
  color: string; fill: string; contain: boolean; gray: boolean; text: string;
};

const EMPTY_INFO: Info = { canUndo: false, canRedo: false, vars: { bg: '#ffffff', fg: '#111111', ac: '#e8322b' }, font: '', size: 1, bold: false, italic: false, upper: false, align: 'left', color: '#111111', fill: '#ffffff', contain: false, gray: false, text: '' };


type Sel = { kind: 'text' | 'img' | 'box'; el: Element } | null;

function rgbToHex(value: string): string {
  const m = value.match(/\d+(\.\d+)?/g);
  if (!m || m.length < 3) return '#111111';
  return `#${m.slice(0, 3).map((n) => Math.round(Number(n)).toString(16).padStart(2, '0')).join('')}`;
}

function Editor({ recipe, draft, saved, onSave, onClose, onDraft, onReset, flash }: {
  recipe: StudioRecipe; draft?: Draft; saved: boolean; onSave: () => void; onClose: () => void;
  onDraft: (draft: Draft) => void; onReset: () => void; flash: (text: string) => void;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [editing, setEditing] = useState(true);
  const [sel, setSel] = useState<Sel>(null);
  const [info, setInfo] = useState<Info>({ ...EMPTY_INFO, vars: { bg: recipe.palette[0], fg: recipe.palette[1], ac: recipe.palette[2] } });
  const selRef = useRef<Sel>(null);
  const widthRef = useRef(0);
  const [ship, setShip] = useState(false);
  const [png, setPng] = useState<{ file: File; url: string; canShare: boolean } | null>(null);
  const [pngBusy, setPngBusy] = useState(false);
  const [full, setFull] = useState(false);
  const [initial] = useState(() => studioDoc(recipe, { body: draft?.body, rootStyle: draft?.root }));
  const history = useRef<{ stack: Array<Omit<Draft, 'at'>>; at: number }>({ stack: [], at: -1 });
  const timer = useRef<number | undefined>(undefined);
  const editingRef = useRef(editing);

  const refresh = useCallback(() => {
    const d = frameRef.current?.contentDocument;
    const view = d?.defaultView;
    const h = history.current;
    if (!d || !view) return;
    const root = view.getComputedStyle(d.documentElement);
    const hex = (v: string) => (v.startsWith('#') ? v.slice(0, 7) : rgbToHex(v));
    const next: Info = {
      ...EMPTY_INFO,
      canUndo: h.at > 0,
      canRedo: h.at < h.stack.length - 1,
      vars: { bg: hex(root.getPropertyValue('--bg').trim() || '#ffffff'), fg: hex(root.getPropertyValue('--fg').trim() || '#111111'), ac: hex(root.getPropertyValue('--ac').trim() || '#e8322b') },
    };
    const cur = selRef.current;
    if (cur) {
      const cs = view.getComputedStyle(cur.el);
      const remPx = (widthRef.current || d.documentElement.clientWidth) / 40 || 1;
      Object.assign(next, {
        font: cs.fontFamily.split(',')[0].replace(/['"]/g, '').trim(),
        size: parseFloat(cs.fontSize) / remPx,
        bold: Number(cs.fontWeight) >= 700,
        italic: cs.fontStyle === 'italic',
        upper: cs.textTransform === 'uppercase',
        align: cs.textAlign,
        color: rgbToHex(cs.color),
        fill: rgbToHex(cs.backgroundColor),
        contain: cs.objectFit === 'contain',
        gray: cs.filter.includes('grayscale'),
        text: cur.el.textContent ?? '',
      });
    }
    setInfo(next);
  }, []);

  const [rw, rh] = recipe.ratio.split('/').map(Number);
  const ratio = rw / rh;

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const w = Math.min(width, height * ratio);
      widthRef.current = Math.floor(w);
      setSize({ w: Math.floor(w), h: Math.floor(w / ratio) });
    });
    ro.observe(stage);
    return () => ro.disconnect();
  }, [ratio, full]);


  const doc = () => frameRef.current?.contentDocument ?? null;

  const commit = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const d = frameRef.current?.contentDocument;
      if (!d) return;
      const snap = snapshot(d);
      const h = history.current;
      const last = h.stack[h.at];
      if (last && last.body === snap.body && last.root === snap.root) return;
      h.stack = [...h.stack.slice(0, h.at + 1), snap].slice(-60);
      h.at = h.stack.length - 1;
      onDraft({ ...snap, at: stamp() });
      refresh();
    }, 250);
  }, [onDraft, refresh]);

  const select = useCallback((next: Sel) => {
    const d = frameRef.current?.contentDocument;
    if (!d) return;
    d.querySelectorAll('[data-sel]').forEach((el) => el.removeAttribute('data-sel'));
    d.querySelectorAll('[contenteditable]').forEach((el) => el.removeAttribute('contenteditable'));
    if (next) {
      next.el.setAttribute('data-sel', '');
      if (next.kind === 'text' && next.el.namespaceURI === 'http://www.w3.org/1999/xhtml') {
        next.el.setAttribute('contenteditable', 'true');
      }
    }
    selRef.current = next;
    setSel(next);
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (ship) setShip(false);
        else if (selRef.current) select(null);
        else onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, ship, select]);

  function onFrameLoad() {
    const d = doc();
    if (!d) return;
    const style = d.createElement('style');
    style.id = 'dawn-edit';
    style.textContent = EDIT_CSS;
    d.head.appendChild(style);
    d.body.classList.toggle('dawn-editing', editingRef.current);
    d.addEventListener('click', (event) => {
      if (!editingRef.current) return;
      const target = (event.target as Element).closest('[data-e]');
      if (!target) {
        select(null);
        return;
      }
      event.preventDefault();
      const kind = target.getAttribute('data-e') as 'text' | 'img' | 'box';
      if (target.hasAttribute('data-sel')) return;
      select({ kind, el: target });
      if (kind === 'text' && target.namespaceURI === 'http://www.w3.org/1999/xhtml') (target as HTMLElement).focus();
    });
    d.addEventListener('input', () => {
      refresh();
      commit();
    });
    d.addEventListener('keydown', (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      }
      if (event.key === 'Escape') select(null);
    });
    const h = history.current;
    h.stack = [snapshot(d)];
    h.at = 0;
    refresh();
  }

  useEffect(() => {
    editingRef.current = editing;
    const d = frameRef.current?.contentDocument;
    if (!d?.body) return;
    d.body.classList.toggle('dawn-editing', editing);
    if (!editing) select(null);
  }, [editing, select]);

  function applySnap(snap: Omit<Draft, 'at'>) {
    const d = doc();
    if (!d) return;
    const script = d.getElementById('dawn-js');
    d.body.innerHTML = snap.body;
    if (script) d.body.appendChild(script);
    if (snap.root) d.documentElement.setAttribute('style', snap.root);
    selRef.current = null;
    setSel(null);
    onDraft({ ...snap, at: stamp() });
    refresh();
  }

  function undo() {
    const h = history.current;
    if (h.at <= 0) return;
    h.at -= 1;
    applySnap(h.stack[h.at]);
  }

  function redo() {
    const h = history.current;
    if (h.at >= h.stack.length - 1) return;
    h.at += 1;
    applySnap(h.stack[h.at]);
  }

  function reset() {
    const d = doc();
    if (!d) return;
    const fresh = new DOMParser().parseFromString(studioDoc(recipe), 'text/html');
    const snap = snapshot(fresh);
    applySnap(snap);
    const h = history.current;
    h.stack = [...h.stack.slice(0, h.at + 1), snap];
    h.at = h.stack.length - 1;
    onReset();
    flash('Back to the original');
  }

  const setStyle = (prop: string, value: string) => {
    const cur = selRef.current;
    if (!cur) return;
    (cur.el as HTMLElement).style.setProperty(prop, value);
    refresh();
    commit();
  };

  const setRootVar = (name: string, value: string) => {
    const d = doc();
    if (!d) return;
    d.documentElement.style.setProperty(name, value);
    refresh();
    commit();
  };

  async function htmlNow() {
    const d = doc();
    return d ? exportHtml(recipe, d) : exportFromRecipe(recipe, draft);
  }

  async function download(forAgent = false) {
    const html = await htmlNow();
    downloadText(`${recipe.id}${forAgent ? '.agent' : ''}.html`, html);
    if (forAgent) {
      await navigator.clipboard
        .writeText(`Here is a Dawn recipe file (${recipe.id}.agent.html). Keep the data-e slots and the --bg/--fg/--ac palette. Change: `)
        .catch(() => undefined);
      flash('Downloaded, agent prompt copied');
    } else flash('Downloaded .html');
  }

  async function copyHtml() {
    await navigator.clipboard.writeText(await htmlNow()).then(
      () => flash('HTML copied'),
      () => flash('Copy blocked by the browser'),
    );
  }

  async function share() {
    flash(await shareRecipe(recipe, await htmlNow()));
  }

  /** Render the live canvas to a PNG (html-to-image), then offer Save to Photos / Download from a fresh tap. */
  async function makePng() {
    const d = doc();
    if (!d || pngBusy) return;
    setPngBusy(true);
    const marked = [...d.querySelectorAll('[data-sel]')];
    const wasEditing = d.body.classList.contains('dawn-editing');
    marked.forEach((el) => el.removeAttribute('data-sel'));
    d.body.classList.remove('dawn-editing');
    try {
      const { toBlob } = await import('html-to-image');
      const w = d.documentElement.clientWidth;
      const h = d.documentElement.clientHeight;
      const bg = d.defaultView?.getComputedStyle(d.body).backgroundColor || '#ffffff';
      await d.fonts?.ready;
      const blob = await toBlob(d.body, { width: w, height: h, pixelRatio: Math.min(4, Math.max(2, 1440 / w)), backgroundColor: bg, cacheBust: false });
      if (!blob) throw new Error('empty image');
      const file = new File([blob], `${recipe.id}.png`, { type: 'image/png' });
      const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
      setPng((prev) => {
        if (prev) URL.revokeObjectURL(prev.url);
        return { file, url: URL.createObjectURL(blob), canShare: Boolean(nav.canShare?.({ files: [file] })) };
      });
    } catch (error) {
      flash(`Image failed: ${(error as Error).message || 'try again'}`);
    } finally {
      marked.forEach((el) => el.setAttribute('data-sel', ''));
      d.body.classList.toggle('dawn-editing', wasEditing);
      setPngBusy(false);
    }
  }

  async function sharePng() {
    if (!png) return;
    try {
      await navigator.share({ files: [png.file], title: recipe.title });
      flash('Shared image');
    } catch (error) {
      if ((error as Error).name !== 'AbortError') downloadPng();
    }
  }

  function downloadPng() {
    if (!png) return;
    const a = document.createElement('a');
    a.href = png.url;
    a.download = png.file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    flash('Downloaded .png');
  }

  return (
    <div className={`st-ed${full ? ' st-ed--full' : ''}`} role="dialog" aria-modal="true" aria-label={`Edit ${recipe.title}`}>
      <div className="st-ed-top">
        <button type="button" className="st-round" aria-label="Back to board" onClick={onClose}>
          <ArrowLeft size={20} aria-hidden />
        </button>
        <div className="st-ed-name">
          <p className="st-code">[{recipe.kind.toUpperCase()} / {recipe.id}]</p>
          <h2>{recipe.title}</h2>
        </div>
        <button type="button" className="st-round st-hide-mobile" aria-label={full ? 'Exit focus' : 'Focus canvas'} onClick={() => setFull((v) => !v)}>
          {full ? <Minimize2 size={18} aria-hidden /> : <Maximize2 size={18} aria-hidden />}
        </button>
        <button type="button" className={`st-round${saved ? ' is-on' : ''}`} aria-label={saved ? 'Unsave' : 'Save'} aria-pressed={saved} onClick={onSave}>
          <Heart size={18} fill={saved ? 'currentColor' : 'none'} aria-hidden />
        </button>
        <button type="button" className="st-ship" onClick={() => setShip(true)}>
          <Rocket size={16} aria-hidden /> Ship
        </button>
      </div>

      <div className="st-ed-body">
        <div className="st-stage" ref={stageRef} onClick={(e) => e.target === e.currentTarget && select(null)}>
          <div className="st-canvas" style={{ width: size.w, height: size.h, viewTransitionName: 'st-canvas' }}>
            {size.w > 0 && <iframe ref={frameRef} title={`${recipe.title} canvas`} srcDoc={initial} onLoad={onFrameLoad} />}
          </div>
          {editing && !sel && <p className="st-hint"><MousePointerClick size={14} aria-hidden /> Tap any text, image or color block</p>}
        </div>

        <aside className="st-panel" aria-label="Inspector">
          {!sel && (
            <>
              <section className="st-sec">
                <h3><Palette size={15} aria-hidden /> Canvas palette</h3>
                <div className="st-pals">
                  {[recipe.palette, ...STUDIO_PALETTES].map((p, i) => (
                    <button key={i} type="button" className="st-pal" aria-label={`Palette ${i + 1}`} onClick={() => { setRootVar('--bg', p[0]); setRootVar('--fg', p[1]); setRootVar('--ac', p[2]); }}>
                      {p.map((c) => <i key={c} style={{ background: c }} />)}
                    </button>
                  ))}
                  <button type="button" className="st-pal st-pal--shuffle" aria-label="Shuffle palette" onClick={() => {
                    const pick = () => STUDIO_SWATCHES[Math.floor(Math.random() * STUDIO_SWATCHES.length)];
                    setRootVar('--bg', pick()); setRootVar('--fg', pick()); setRootVar('--ac', pick());
                  }}>
                    <Shuffle size={16} aria-hidden />
                  </button>
                </div>
                <div className="st-vars">
                  {(['bg', 'fg', 'ac'] as const).map((k) => (
                    <label key={k} className="st-var">
                      <input type="color" value={info.vars[k]} onChange={(e) => setRootVar(`--${k}`, e.target.value)} />
                      <span>{k === 'bg' ? 'Background' : k === 'fg' ? 'Ink' : 'Accent'}</span>
                    </label>
                  ))}
                </div>
              </section>
              <section className="st-sec st-about">
                <h3><Sparkles size={15} aria-hidden /> About this recipe</h3>
                <p>{recipe.blurb}</p>
                {recipe.inspiredBy && <p className="st-muted">Inspired by {recipe.inspiredBy}. Original recreation: no copied logos or photos.</p>}
                {recipe.source && (
                  <p className="st-muted">
                    {recipe.origin === 'Ours' ? 'Asset: ' : 'Art: '}{recipe.source.by}, {recipe.source.date}. {recipe.source.license}.{' '}
                    <a href={recipe.source.url} target="_blank" rel="noreferrer">Source</a>
                    {recipe.source.note ? ` ${recipe.source.note}` : ''}
                  </p>
                )}
              </section>
            </>
          )}

          {sel?.kind === 'text' && (
            <>
              <section className="st-sec">
                <h3><Type size={15} aria-hidden /> Text</h3>
                <textarea
                  className="st-text"
                  rows={2}
                  value={info.text}
                  onChange={(e) => { const cur = selRef.current; if (cur) cur.el.textContent = e.target.value; refresh(); commit(); }}
                />
              </section>
              <section className="st-sec">
                <h3>Font</h3>
                <div className="st-fonts">
                  {STUDIO_FONTS.map((f) => (
                    <button key={f.name} type="button" className="st-font" aria-pressed={info.font === f.name} style={{ fontFamily: f.family }} onClick={() => setStyle('font-family', f.family)}>
                      Aa<small>{f.name}</small>
                    </button>
                  ))}
                </div>
              </section>
              <section className="st-sec">
                <h3>Size <output>{info.size.toFixed(1)}</output></h3>
                <input className="st-range" type="range" min={0.4} max={14} step={0.1} value={info.size} onChange={(e) => setStyle('font-size', `${e.target.value}rem`)} />
                <div className="st-row">
                  <button type="button" className="st-sq" aria-label="Bold" aria-pressed={info.bold} onClick={() => setStyle('font-weight', info.bold ? '400' : '800')}><Bold size={16} aria-hidden /></button>
                  <button type="button" className="st-sq" aria-label="Italic" aria-pressed={info.italic} onClick={() => setStyle('font-style', info.italic ? 'normal' : 'italic')}><Italic size={16} aria-hidden /></button>
                  <button type="button" className="st-sq" aria-label="Uppercase" aria-pressed={info.upper} onClick={() => setStyle('text-transform', info.upper ? 'none' : 'uppercase')}><CaseUpper size={16} aria-hidden /></button>
                  <span className="st-gap" />
                  <button type="button" className="st-sq" aria-label="Align left" aria-pressed={info.align === 'left' || info.align === 'start'} onClick={() => setStyle('text-align', 'left')}><AlignLeft size={16} aria-hidden /></button>
                  <button type="button" className="st-sq" aria-label="Align center" aria-pressed={info.align === 'center'} onClick={() => setStyle('text-align', 'center')}><AlignCenter size={16} aria-hidden /></button>
                  <button type="button" className="st-sq" aria-label="Align right" aria-pressed={info.align === 'right'} onClick={() => setStyle('text-align', 'right')}><AlignRight size={16} aria-hidden /></button>
                </div>
              </section>
              <Swatches label="Color" value={info.color} onPick={(c) => setStyle('color', c)} />
            </>
          )}

          {sel?.kind === 'box' && <Swatches label="Fill" value={info.fill} onPick={(c) => { setStyle('background', c); }} />}

          {sel?.kind === 'img' && (
            <section className="st-sec">
              <h3><FileImage size={15} aria-hidden /> Image</h3>
              <label className="st-btn st-btn--wide">
                <ImageUp size={16} aria-hidden /> Replace image
                <input type="file" accept="image/*" hidden onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => { selRef.current?.el.setAttribute('src', String(reader.result)); commit(); refresh(); flash('Image swapped'); };
                  reader.readAsDataURL(file);
                }} />
              </label>
              <div className="st-row">
                <button type="button" className="st-btn" aria-pressed={info.contain} onClick={() => setStyle('object-fit', info.contain ? 'cover' : 'contain')}>
                  {info.contain ? 'Fit: whole' : 'Fit: fill'}
                </button>
                <button type="button" className="st-btn" aria-pressed={info.gray} onClick={() => setStyle('filter', info.gray ? 'none' : 'grayscale(1) contrast(1.15)')}>
                  <Contrast size={15} aria-hidden /> B&amp;W
                </button>
              </div>
            </section>
          )}

          {sel && (
            <button type="button" className="st-btn st-btn--ghost" onClick={() => select(null)}>
              <X size={15} aria-hidden /> Done
            </button>
          )}
        </aside>
      </div>

      <nav className="st-dock" aria-label="Editor tools">
        <ToolButton icon={editing ? <MousePointerClick size={19} aria-hidden /> : <Eye size={19} aria-hidden />} label={editing ? 'Edit' : 'Preview'} active={editing} onClick={() => setEditing((v) => !v)} />
        <ToolButton icon={<Undo2 size={19} aria-hidden />} label="Undo" disabled={!info.canUndo} onClick={undo} />
        <ToolButton icon={<Redo2 size={19} aria-hidden />} label="Redo" disabled={!info.canRedo} onClick={redo} />
        <ToolButton icon={<RotateCcw size={19} aria-hidden />} label="Reset" onClick={reset} />
        <span className="st-dock-sep" />
        <ToolButton icon={<Copy size={19} aria-hidden />} label="Copy" onClick={copyHtml} />
        <ToolButton icon={<Download size={19} aria-hidden />} label="Download" onClick={() => download()} />
        <ToolButton icon={<Share2 size={19} aria-hidden />} label="Share" primary onClick={share} />
      </nav>

      {ship && (
        <div className="st-sheet-wrap" onClick={(e) => e.target === e.currentTarget && setShip(false)}>
          <div className="st-sheet" role="dialog" aria-label="Ship this recipe">
            <div className="st-sheet-head">
              <h3><Rocket size={17} aria-hidden /> Ship this recipe</h3>
              <button type="button" className="st-round" aria-label="Close" onClick={() => setShip(false)}><X size={18} aria-hidden /></button>
            </div>
            {png && (
              <div className="st-png">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={png.url} alt={`${recipe.title} as an image`} />
                <div className="st-png-acts">
                  {png.canShare && (
                    <button type="button" className="st-btn st-btn--wide" onClick={() => void sharePng()}>
                      <Share2 size={16} aria-hidden /> Save to Photos or share
                    </button>
                  )}
                  <button type="button" className="st-btn" onClick={downloadPng}>
                    <Download size={16} aria-hidden /> Download PNG
                  </button>
                  <button type="button" className="st-btn st-btn--ghost" onClick={() => { URL.revokeObjectURL(png.url); setPng(null); }}>
                    <X size={15} aria-hidden /> Close
                  </button>
                </div>
              </div>
            )}
            <ul className="st-ship-list">
              <ShipRow icon={<Download size={18} />} title="Download .html" note="One self-contained file, images inlined." onClick={() => { void download(); setShip(false); }} />
              <ShipRow icon={<Bot size={18} />} title="Send to agent" note="Downloads an agent-ready file and copies a starter prompt." onClick={() => { void download(true); setShip(false); }} />
              <ShipRow icon={<Copy size={18} />} title="Copy HTML" note="Paste straight into a chat or a repo." onClick={() => { void copyHtml(); setShip(false); }} />
              <ShipRow icon={<Share2 size={18} />} title="Share" note="Phone share sheet with the file, or a link on desktop." onClick={() => { void share(); setShip(false); }} />
              <ShipRow icon={<Link size={18} />} title="Copy link" note="Opens this recipe straight in the editor." onClick={() => { void navigator.clipboard.writeText(recipeLink(recipe)).then(() => flash('Link copied')); setShip(false); }} />
              <ShipRow icon={<FileImage size={18} />} title={pngBusy ? 'Rendering image…' : 'Save as image'} note="High-res PNG for Photos, Pinterest and texts." onClick={() => void makePng()} />
              <ShipRow icon={<Rocket size={18} />} title="Publish as a site update" note="Opens a pull request with this HTML in a project." mock />
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function ShipRow({ icon, title, note, onClick, mock }: { icon: ReactNode; title: string; note: string; onClick?: () => void; mock?: boolean }) {
  return (
    <li>
      <button type="button" className="st-ship-row" disabled={mock} onClick={onClick}>
        <span className="st-ship-ic">{icon}</span>
        <span className="st-ship-tx"><strong>{title}{mock ? <em>Mockup</em> : null}</strong><small>{note}</small></span>
      </button>
    </li>
  );
}

function Swatches({ label, value, onPick }: { label: string; value: string; onPick: (c: string) => void }) {
  return (
    <section className="st-sec">
      <h3><Palette size={15} aria-hidden /> {label}</h3>
      <div className="st-swatches">
        {STUDIO_SWATCHES.map((c) => (
          <button key={c} type="button" className="st-swatch" aria-label={c} aria-pressed={value.toLowerCase() === c} style={{ background: c }} onClick={() => onPick(c)} />
        ))}
        <label className="st-swatch st-swatch--custom" aria-label="Custom color">
          <input type="color" value={value} onChange={(e) => onPick(e.target.value)} />
        </label>
      </div>
    </section>
  );
}

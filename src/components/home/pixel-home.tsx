'use client';

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Box, Cloud, Code, Compass, Folder, Layers, Map, MessageCircle, Plus, User } from 'lucide-react';
import { TOWN_CAST, TOWN_RECENTS } from '@/lib/credits/town';
import { api, gatewayBase, googleSignInHref, type Thread } from '@/components/dawn-agents/api';
import { activeMapLayer, hotspotAt, type MapHotspot, type MapLayer } from '@/lib/home/map-layer';
import { PLAYER_SRC } from '@/lib/home/overworld';
import './pixel-home.css';

type Tab = 'explore' | 'you' | 'contribute';

const CHIPS: { label: string; href?: string; panel?: boolean }[] = [
  { label: 'Ask Dawn', href: '/agents' },
  { label: 'Agents', panel: true },
  { label: 'Editor', href: '/editor' },
  { label: 'Recipes', href: '/agents?section=recipes' },
  { label: 'Letter', href: '/letter' },
  { label: 'Studio', href: '/studio' },
];

export function PixelHome() {
  const layer = useMemo(() => activeMapLayer(), []);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapRef = useRef<HTMLImageElement | null>(null);
  const viewRef = useRef({ w: 0, h: 0 });
  const frameRef = useRef({ fit: 1, ox: 0, oy: 0 });
  const camRef = useRef({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; camX: number; camY: number; moved: boolean } | null>(null);

  const [cam, setCam] = useState({ x: 0, y: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('explore');
  const [panel, setPanel] = useState(false);
  const [query, setQuery] = useState('');
  const [labels, setLabels] = useState(false);
  const [sheetH, setSheetH] = useState(228);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [ready, setReady] = useState(false);
  const panelRef = useRef(false);
  panelRef.current = panel;

  const selected = layer.hotspots.find((spot) => spot.id === selectedId) ?? null;
  const matches = query.trim()
    ? layer.hotspots.filter((spot) => `${spot.name} ${spot.kind} ${spot.blurb}`.toLowerCase().includes(query.trim().toLowerCase()))
    : [];

  useEffect(() => {
    const map = new Image();
    map.onload = () => setReady(true);
    map.src = layer.src;
    mapRef.current = map;
  }, [layer.src]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const fit = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      viewRef.current = { w, h };
      canvas.width = w;
      canvas.height = h;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const frame = frameFor(layer, w, h);
      frameRef.current = frame;
      const next = clampCam(layer, (layer.view.w * frame.fit - w) / 2, 0, w, h, frame.fit);
      camRef.current = next;
      setCam(next);
      paint(canvas, layer, mapRef.current, next, frame);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(canvas.parentElement || canvas);
    return () => observer.disconnect();
  }, [layer]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !ready) return;
    const frame = frameFor(layer, viewRef.current.w, viewRef.current.h);
    frameRef.current = frame;
    paint(canvas, layer, mapRef.current, cam, frame);
  }, [ready, cam, layer]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (panelRef.current) {
        if (event.key === 'Escape') setPanel(false);
        return;
      }
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const dirs: Record<string, [number, number]> = {
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
      };
      const dir = dirs[event.key];
      if (!dir) return;
      event.preventDefault();
      const frame = frameRef.current;
      const next = clampCam(layer, camRef.current.x + dir[0] * 48, camRef.current.y + dir[1] * 48, viewRef.current.w, viewRef.current.h, frame.fit);
      camRef.current = next;
      setCam(next);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [layer]);

  useEffect(() => {
    if (!panel) return;
    let cancel = false;
    void (async () => {
      try {
        const base = await gatewayBase();
        const state = await api<{ threads: Thread[] }>(base, '/api/state');
        if (!cancel) setThreads(state.threads);
      } catch {
        if (!cancel) setThreads([]);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [panel]);

  function focusLandmark(spot: MapHotspot) {
    setSelectedId(spot.id);
    setTab('explore');
    setQuery('');
    setPanel(false);
    const frame = frameRef.current;
    const localX = (spot.x - layer.view.x + spot.w / 2) * frame.fit - viewRef.current.w / 2;
    const localY = (spot.y - layer.view.y + spot.h / 2) * frame.fit - viewRef.current.h / 2;
    const next = clampCam(layer, localX, localY, viewRef.current.w, viewRef.current.h, frame.fit);
    camRef.current = next;
    setCam(next);
  }

  function onPointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { x: event.clientX, y: event.clientY, camX: camRef.current.x, camY: camRef.current.y, moved: false };
  }

  function onPointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.hypot(dx, dy) > 6) drag.moved = true;
    if (!drag.moved) return;
    const next = clampCam(layer, drag.camX - dx, drag.camY - dy, viewRef.current.w, viewRef.current.h, frameRef.current.fit);
    camRef.current = next;
    setCam(next);
  }

  function onPointerUp(event: ReactPointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag || drag.moved) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const frame = frameRef.current;
    const ix = layer.view.x + (camRef.current.x + event.clientX - rect.left - frame.ox) / frame.fit;
    const iy = layer.view.y + (camRef.current.y + event.clientY - rect.top - frame.oy) / frame.fit;
    const spot = hotspotAt(layer, ix, iy);
    if (spot) focusLandmark(spot);
    else setSelectedId(null);
  }

  function onSheetPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    const startY = event.clientY;
    const startH = sheetH;
    const move = (ev: PointerEvent) => {
      const next = Math.min(window.innerHeight * 0.72, Math.max(150, startH + (startY - ev.clientY)));
      setSheetH(next);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      setSheetH((current) => (current < 190 ? 168 : current > 360 ? Math.min(520, window.innerHeight * 0.62) : 250));
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  const frame = frameRef.current;
  const recents = threads
    .filter((thread) => (thread.kind === 'direct' || thread.kind === 'group') && !thread.leftAt)
    .slice()
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 8);
  const shownRecents = recents.length
    ? recents.map((thread) => ({ id: thread.id, title: thread.title || 'Chat', href: `/agents?thread=${encodeURIComponent(thread.id)}` }))
    : TOWN_RECENTS.map((item) => ({ id: item.id, title: item.title, href: item.href }));
  const place = selected ?? {
    name: 'Dawn Town',
    kind: 'Home',
    blurb: '',
    href: '/agents',
    suggestion: 'What should I build today?',
  };

  return (
    <div className={panel ? 'ph menu-open' : 'ph'}>
      <div className="ph-stage">
      <canvas
        ref={canvasRef}
        className="ph-canvas"
        aria-label="Dawn Town. Drag to pan. Tap a building."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />
      {labels &&
        layer.hotspots.map((spot) => {
          const left = frame.ox + (spot.x - layer.view.x + spot.w / 2) * frame.fit - cam.x;
          const top = frame.oy + (spot.y - layer.view.y) * frame.fit - cam.y;
          return (
            <button
              key={spot.id}
              type="button"
              className="ph-label"
              style={{ left, top }}
              onClick={() => focusLandmark(spot)}
            >
              {spot.name}
            </button>
          );
        })}
      <header className="ph-top">
        <button
          type="button"
          className="ph-glass ph-dotbtn"
          aria-label="Menu"
          aria-expanded={panel}
          aria-controls="dawn-menu"
          onClick={() => setPanel((open) => !open)}
        >
          <span className="ph-dots" aria-hidden><i /><i /><i /></span>
        </button>
        <form
          className="ph-glass ph-search"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            if (matches[0]) focusLandmark(matches[0]);
          }}
        >
          <input
            aria-label="Search Dawn"
            placeholder="Search Dawn"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </form>
        <button type="button" className="ph-avatar" aria-label="You" onClick={() => { setTab('you'); setPanel(false); }}>
          <User aria-hidden />
        </button>
      </header>
      {query.trim() && (
        <ul className="ph-results">
          {matches.length === 0 && <li className="ph-note">Nothing on the map matches.</li>}
          {matches.map((spot) => (
            <li key={spot.id}>
              <button type="button" onClick={() => focusLandmark(spot)}>
                {spot.name}
                <small>{spot.kind}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="ph-chips">
        {CHIPS.map((chip) =>
          chip.panel ? (
            <button key={chip.label} type="button" className="ph-chip" onClick={() => setPanel(true)}>{chip.label}</button>
          ) : (
            <a key={chip.label} className="ph-chip" href={chip.href}>{chip.label}</a>
          ),
        )}
      </div>
      <div className="ph-fabs" style={{ bottom: `calc(${sheetH}px + 70px + env(safe-area-inset-bottom))` }}>
        <button type="button" className={labels ? 'ph-fab on' : 'ph-fab'} aria-pressed={labels} aria-label="Map labels" onClick={() => setLabels((on) => !on)}>
          <Layers />
        </button>
        <button
          type="button"
          className="ph-fab locate"
          aria-label="Recenter"
          onClick={() => {
            const next = clampCam(layer, 0, 0, viewRef.current.w, viewRef.current.h, frameRef.current.fit);
            camRef.current = next;
            setCam(next);
          }}
        >
          <Compass />
        </button>
      </div>
      <section className="ph-sheet" style={{ height: sheetH }} aria-label="Place">
        <button type="button" className="ph-handle" aria-label="Drag the sheet" onPointerDown={onSheetPointerDown}>
          <span />
        </button>
        {tab === 'explore' && (
          <>
            <div className="ph-placehead">
              <div>
                <h1>{selected ? selected.name : 'Dawn Town'}</h1>
                {selected && <p className="ph-blurb">{selected.blurb}</p>}
              </div>
              <div className="ph-weather">
                <Cloud aria-hidden />
                <span>68°F</span>
              </div>
            </div>
            <a className="ph-plan" href="/agents">
              <span className="ph-plan-title">Make plans with Ask Dawn</span>
              <span className="ph-suggest">{place.suggestion}</span>
            </a>
            {selected && <a className="ph-open" href={selected.href}>Open {selected.name}</a>}
          </>
        )}
        {tab === 'you' && (
          <div className="ph-you">
            <div className="ph-you-row">
              <img src={PLAYER_SRC} alt="" width={48} height={48} />
              <div>
                <h1>You</h1>
                <p className="ph-blurb">One owner. The sprite on the map is you.</p>
              </div>
            </div>
            <div className="ph-links">
              <a href={googleSignInHref()}>Sign in with Google</a>
              <a href="/agents">Agents</a>
              <a href="/credits">Credits</a>
              <a href="/village">Village</a>
              <a href="/oauth2/sign_out?rd=/">Sign out</a>
            </div>
          </div>
        )}
        {tab === 'contribute' && (
          <div className="ph-contribute">
            <h1>Contribute</h1>
            <p className="ph-blurb">Likes, saves, and skips on recipes, and opens on the letter, become taste signals. Nothing sends until you click send.</p>
            <div className="ph-links">
              <a href="/agents?section=recipes">Recipes</a>
              <a href="/letter">Letter</a>
              <a href="/agents?section=data">Data studio</a>
            </div>
          </div>
        )}
      </section>
      {panel && <button type="button" className="ph-peek" aria-label="Close menu" onClick={() => setPanel(false)} />}
      <nav className="ph-tabs" aria-label="Primary">
        <button type="button" className={tab === 'explore' ? 'ph-tab on' : 'ph-tab'} onClick={() => setTab('explore')}>
          <span className="ph-tab-bubble"><Map /></span>
          Explore
        </button>
        <button type="button" className={tab === 'you' ? 'ph-tab on' : 'ph-tab'} onClick={() => setTab('you')}>
          <span className="ph-tab-bubble"><User /></span>
          You
        </button>
        <button type="button" className={tab === 'contribute' ? 'ph-tab on' : 'ph-tab'} onClick={() => setTab('contribute')}>
          <span className="ph-tab-bubble"><Plus /></span>
          Contribute
        </button>
      </nav>
      </div>
      <aside id="dawn-menu" className={panel ? 'ph-drawer open' : 'ph-drawer'} aria-label="Dawn" aria-hidden={!panel} inert={!panel}>
        <p className="ph-drawer-mark">Dawn</p>
        <nav className="ph-drawer-nav" aria-label="Dawn">
          <a href="/agents"><MessageCircle aria-hidden /> Chats</a>
          <a href="/studio"><Folder aria-hidden /> Projects</a>
          <a href="/editor"><Code aria-hidden /> Code</a>
          <a href="/letter"><Box aria-hidden /> Artifacts</a>
        </nav>
        <div className="ph-drawer-scroll">
          <p className="ph-drawer-label">Pinned</p>
          {TOWN_CAST.map((agent) => (
            <a key={agent.id} className="ph-drawer-row" href={agent.href}>
              <img src={agent.src} alt="" width={28} height={28} />
              <span>{agent.name}</span>
            </a>
          ))}
          <p className="ph-drawer-label">Recents</p>
          {shownRecents.map((thread) => (
            <a key={thread.id} className="ph-drawer-row" href={thread.href}>
              <MessageCircle aria-hidden />
              <span>{thread.title}</span>
            </a>
          ))}
        </div>
        <div className="ph-drawer-foot">
          <button type="button" className="ph-drawer-avatar" aria-label="You" onClick={() => { setPanel(false); setTab('you'); }}>
            <User aria-hidden />
          </button>
          <a className="ph-newchat" href="/agents?section=edit"><Plus aria-hidden /> New chat</a>
        </div>
      </aside>
    </div>
  );
}

function paint(
  canvas: HTMLCanvasElement,
  mapLayer: MapLayer,
  map: HTMLImageElement | null,
  cam: { x: number; y: number },
  frame: { fit: number; ox: number; oy: number },
) {
  const ctx = canvas.getContext('2d');
  if (!ctx || !map || !map.complete || !map.naturalWidth) return;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#3f8f34';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const { view } = mapLayer;
  ctx.drawImage(
    map,
    view.x,
    view.y,
    view.w,
    view.h,
    Math.round(frame.ox - cam.x),
    Math.round(frame.oy - cam.y),
    Math.round(view.w * frame.fit),
    Math.round(view.h * frame.fit),
  );
}

function frameFor(mapLayer: MapLayer, viewW: number, viewH: number) {
  if (viewW <= 0 || viewH <= 0) return { fit: 1, ox: 0, oy: 0 };
  const top = Math.min(96, viewH * 0.12);
  const bottom = Math.min(270, viewH * 0.34);
  const band = Math.max(180, viewH - top - bottom);
  const fit = band / mapLayer.view.h;
  return { fit, ox: 0, oy: top };
}

function clampCam(mapLayer: MapLayer, x: number, y: number, viewW: number, viewH: number, fit: number) {
  const maxX = Math.max(0, mapLayer.view.w * fit - viewW);
  const maxY = Math.max(0, mapLayer.view.h * fit - viewH);
  return { x: Math.min(maxX, Math.max(0, x)), y: Math.min(maxY, Math.max(0, y)) };
}

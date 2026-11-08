'use client';

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Box, Code, Folder, Map, MessageCircle, Plus, User } from 'lucide-react';
import { BotTalk, type TownBot } from '@/components/home/bot-talk';
import { TOWN_CAST } from '@/lib/credits/town';
import { api, gatewayBase, googleSignInHref, type Thread } from '@/components/dawn-agents/api';
import type { SavedLine } from '@/components/home/bot-talk';
import { searchTown, type SearchHit } from '@/lib/home/town-search';
import { stepHero } from '@/lib/home/town-walk';
import { activeMapLayer, hotspotAt, type MapHotspot, type MapLayer } from '@/lib/home/map-layer';
import { probeDesk, townAction, type DeskStatus } from '@/lib/home/town-action';
import { PLAYER_SRC } from '@/lib/home/overworld';
import './pixel-home.css';

type Tab = 'explore' | 'you' | 'contribute';

const CHIPS: { label: string; href?: string; panel?: boolean }[] = [
  { label: 'Village', href: '/village' },
  { label: 'Ask Dawn', href: '/agents' },
  { label: 'Agents', panel: true },
  { label: 'Editor', href: '/editor' },
  { label: 'Recipes', href: '/artifacts' },
  { label: 'Letter', href: '/letter' },
  { label: 'Studio', href: '/studio' },
];

const ART_CONTROLS = [
  { id: 'labels', x: 693, y: 393, label: 'Map labels' },
  { id: 'recenter-a', x: 692, y: 500, label: 'Recenter' },
  { id: 'recenter-b', x: 680, y: 913, label: 'Recenter map' },
] as const;

export function PixelHome({ initialPanel = false }: { initialPanel?: boolean }) {
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
  const [panel, setPanel] = useState(initialPanel);
  const [query, setQuery] = useState('');
  const [labels, setLabels] = useState(false);
  const [sheetH, setSheetH] = useState(228);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [savedMessages, setSavedMessages] = useState<SavedLine[]>([]);
  const [previews, setPreviews] = useState<Record<string, string[]>>({});
  const heroStart = { x: layer.view.x + Math.round(layer.view.w / 2), y: layer.view.y + Math.round(layer.view.h / 2) };
  const heroRef = useRef(heroStart);
  const [hero, setHero] = useState(heroStart);
  const playerRef = useRef<HTMLImageElement | null>(null);
  const [ready, setReady] = useState(false);
  const [desk, setDesk] = useState<DeskStatus>('offline');
  const [notice, setNotice] = useState('');
  const [talkId, setTalkId] = useState<string | null>(null);
  const panelRef = useRef(false);
  const talkRef = useRef(false);
  panelRef.current = panel;
  talkRef.current = Boolean(talkId);

  const selected = layer.hotspots.find((spot) => spot.id === selectedId) ?? null;

  useEffect(() => {
    const map = new Image();
    map.onload = () => setReady(true);
    map.src = layer.src;
    mapRef.current = map;
    const player = new Image();
    player.onload = () => {
      playerRef.current = player;
      setHero((current) => ({ ...current }));
    };
    player.src = PLAYER_SRC;
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
      paint(canvas, layer, mapRef.current, next, frame, heroRef.current, playerRef.current);
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
    paint(canvas, layer, mapRef.current, cam, frame, hero, playerRef.current);
  }, [ready, cam, layer, hero]);

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
      walk(dir[0], dir[1]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [layer]);

  useEffect(() => {
    let cancel = false;
    void (async () => {
      const base = await gatewayBase();
      const status = await probeDesk(fetch, `${base}/api/state`);
      if (!cancel) setDesk(status);
    })();
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    const read = () => {
      const params = new URLSearchParams(window.location.search);
      const id = params.get('bot');
      setTalkId(TOWN_CAST.some((agent) => agent.id === id) ? id : null);
      const asked = params.get('q');
      if (asked) setQuery(asked);
    };
    read();
    window.addEventListener('popstate', read);
    return () => window.removeEventListener('popstate', read);
  }, []);

  useEffect(() => {
    if (desk !== 'ready') {
      setThreads([]);
      setSavedMessages([]);
      return;
    }
    let cancel = false;
    void (async () => {
      try {
        const base = await gatewayBase();
        const state = await api<{ threads?: Thread[]; messages?: SavedLine[] }>(base, '/api/state');
        if (cancel) return;
        setThreads(state.threads ?? []);
        setSavedMessages(state.messages ?? []);
      } catch {
        if (!cancel) {
          setThreads([]);
          setSavedMessages([]);
        }
      }
    })();
    return () => {
      cancel = true;
    };
  }, [desk]);

  function focusLandmark(spot: MapHotspot) {
    setSelectedId(spot.id);
    setTab('explore');
    setQuery('');
    if (spot.id === 'agents') {
      setPanel(true);
      setNotice('');
      return;
    }
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
  const shownRecents = desk === 'ready'
    ? threads
      .filter((thread) => (thread.kind === 'direct' || thread.kind === 'group') && !thread.leftAt)
      .slice()
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 8)
      .map((thread) => ({ id: thread.id, title: thread.title || 'Chat', href: `/agents?thread=${encodeURIComponent(thread.id)}` }))
    : [];

  function explain(href: string) {
    const action = townAction(href, desk);
    if (action.kind === 'blocked') {
      setNotice(action.reason);
      setTab('explore');
      setPanel(false);
    }
  }

  function openBot(id: string) {
    const url = new URL(window.location.href);
    url.searchParams.set('bot', id);
    window.history.pushState({ bot: id }, '', `${url.pathname}?${url.searchParams.toString()}`);
    setTalkId(id);
    setPanel(false);
  }

  function closeBot() {
    const url = new URL(window.location.href);
    url.searchParams.delete('bot');
    const search = url.searchParams.toString();
    window.history.pushState({}, '', search ? `${url.pathname}?${search}` : url.pathname);
    setTalkId(null);
  }

  function walk(dx: number, dy: number) {
    if (panelRef.current || talkRef.current) return;
    const bounds = {
      minX: layer.view.x + 24,
      minY: layer.view.y + 24,
      maxX: layer.view.x + layer.view.w - 24,
      maxY: layer.view.y + layer.view.h - 24,
    };
    const next = stepHero(heroRef.current, { x: dx, y: dy }, bounds, 28);
    heroRef.current = next;
    setHero(next);
    const frame = frameRef.current;
    const camNext = clampCam(
      layer,
      (next.x - layer.view.x) * frame.fit - viewRef.current.w / 2,
      (next.y - layer.view.y) * frame.fit - viewRef.current.h / 2,
      viewRef.current.w,
      viewRef.current.h,
      frame.fit,
    );
    camRef.current = camNext;
    setCam(camNext);
    const spot = hotspotAt(layer, next.x, next.y);
    if (spot) setSelectedId(spot.id);
  }

  function holdWalk(dx: number, dy: number) {
    walk(dx, dy);
    const timer = window.setInterval(() => walk(dx, dy), 140);
    const stop = () => {
      window.clearInterval(timer);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
    };
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
  }

  const hits = searchTown(
    query,
    layer.hotspots.map((spot) => ({ id: spot.id, name: spot.name, kind: spot.kind, href: spot.href })),
    TOWN_CAST.map((person) => ({ id: person.id, name: person.name })),
  );

  function chooseHit(hit: SearchHit) {
    setQuery('');
    if (hit.kind === 'person') {
      openBot(hit.id);
      return;
    }
    const spot = layer.hotspots.find((item) => item.id === hit.id);
    if (spot) focusLandmark(spot);
    if (!hit.href) return;
    const action = townAction(hit.href, desk);
    if (action.kind === 'navigate' && hit.id !== 'agents') window.location.assign(action.href);
  }

  const talking = TOWN_CAST.find((agent) => agent.id === talkId) ?? null;
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
        aria-label="Dawn Town. Arrow keys or the pad walk. Tap a building."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />
      {layer.hotspots.map((spot) => {
        const left = frame.ox + (spot.x - layer.view.x) * frame.fit - cam.x;
        const top = frame.oy + (spot.y - layer.view.y) * frame.fit - cam.y;
        return (
          <button
            key={spot.id}
            type="button"
            className="ph-hit"
            aria-label={spot.name}
            style={{ left, top, width: spot.w * frame.fit, height: spot.h * frame.fit }}
            onClick={() => focusLandmark(spot)}
          />
        );
      })}
      {ART_CONTROLS.map((control) => {
        const size = 52 * frame.fit;
        const left = frame.ox + (control.x - layer.view.x) * frame.fit - cam.x - size / 2;
        const top = frame.oy + (control.y - layer.view.y) * frame.fit - cam.y - size / 2;
        return (
          <button
            key={control.id}
            type="button"
            className="ph-hit"
            aria-label={control.label}
            style={{ left, top, width: size, height: size }}
            onClick={() => {
              if (control.id === 'labels') setLabels((on) => !on);
              else {
                const next = clampCam(layer, 0, 0, viewRef.current.w, viewRef.current.h, frameRef.current.fit);
                camRef.current = next;
                setCam(next);
              }
            }}
          />
        );
      })}
      {labels &&
        layer.hotspots.map((spot) => {
          const left = frame.ox + (spot.x - layer.view.x + spot.w / 2) * frame.fit - cam.x;
          const top = frame.oy + (spot.y - layer.view.y) * frame.fit - cam.y;
          return (
            <button
              key={`${spot.id}-label`}
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
            if (hits[0]) chooseHit(hits[0]);
          }}
        >
          <input
            aria-label="Search Dawn"
            placeholder="Search Dawn"
            value={query}
            enterKeyHint="search"
            onChange={(event) => setQuery(event.target.value)}
          />
          {query && <button type="button" className="ph-clear" aria-label="Clear search" onClick={() => setQuery('')}>×</button>}
        </form>
        <button type="button" className="ph-avatar" aria-label="You" onClick={() => { setTab('you'); setPanel(false); }}>
          <User aria-hidden />
        </button>
      </header>
      {query.trim() && (
        <ul className="ph-results">
          <li className="ph-note">Town, people, and places. Not the desk or the web.</li>
          {hits.length === 0 && <li className="ph-note">Nothing matches.</li>}
          {hits.map((hit) => (
            <li key={`${hit.kind}-${hit.id}`}>
              <button type="button" onClick={() => chooseHit(hit)}>
                {hit.title}
                <small>{hit.detail}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="ph-pad" aria-label="Walk" style={{ bottom: sheetH + 78 }}>
        <button type="button" aria-label="Walk up" onPointerDown={() => holdWalk(0, -1)}>↑</button>
        <button type="button" aria-label="Walk left" onPointerDown={() => holdWalk(-1, 0)}>←</button>
        <button type="button" aria-label="Walk down" onPointerDown={() => holdWalk(0, 1)}>↓</button>
        <button type="button" aria-label="Walk right" onPointerDown={() => holdWalk(1, 0)}>→</button>
      </div>
      <p className="sr-only" aria-live="polite" data-hero={`${hero.x},${hero.y}`}>Walker {hero.x}, {hero.y}</p>
      <div className="ph-chips">
        {CHIPS.map((chip) =>
          chip.panel ? (
            <button key={chip.label} type="button" className="ph-chip" onClick={() => setPanel(true)}>{chip.label}</button>
          ) : townAction(chip.href || '/', desk).kind === 'navigate' ? (
            <a key={chip.label} className="ph-chip" href={chip.href}>{chip.label}</a>
          ) : (
            <button key={chip.label} type="button" className="ph-chip" onClick={() => explain(chip.href || '/')}>{chip.label}</button>
          ),
        )}
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
            </div>
            {notice && <p className="ph-blurb" role="status">{notice}</p>}
            {selected?.id === 'agents' ? (
              <button type="button" className="ph-plan" onClick={() => { setPanel(true); setNotice(''); }}>
                <span className="ph-plan-title">Open the agent list</span>
                <span className="ph-blurb">Same menu as the dots button. The live desk is separate and is not running on this host.</span>
              </button>
            ) : selected ? (
              townAction(selected.href, desk).kind === 'navigate' ? (
                <a className="ph-plan" href={selected.href}>
                  <span className="ph-plan-title">Open {selected.name}</span>
                  <span className="ph-blurb">{selected.blurb}</span>
                </a>
              ) : (
                <button type="button" className="ph-plan" onClick={() => explain(selected.href)}>
                  <span className="ph-plan-title">Open {selected.name}</span>
                  <span className="ph-blurb">Not available on this host.</span>
                </button>
              )
            ) : (
              townAction('/agents', desk).kind === 'navigate' ? (
                <a className="ph-plan" href="/agents">
                  <span className="ph-plan-title">Make plans with Ask Dawn</span>
                  <span className="ph-blurb">{place.suggestion}</span>
                </a>
              ) : (
                <button type="button" className="ph-plan" onClick={() => explain('/agents')}>
                  <span className="ph-plan-title">Make plans with Ask Dawn</span>
                  <span className="ph-blurb">Not running on this host.</span>
                </button>
              )
            )}
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
              {desk === 'signin' && <a href={googleSignInHref()}>Sign in with Google</a>}
              {desk === 'offline' && <p className="ph-blurb">Sign-in is not set up on this host.</p>}
              <a href="/village">Village</a>
              <a href="/atlas">Atlas</a>
              <a href="/studio">Studio</a>
              <a href="/letter">Letter</a>
              <a href="/credits">Credits</a>
              {desk !== 'offline' && <a href="/oauth2/sign_out?rd=/">Sign out</a>}
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
          <a href="/studio"><Folder aria-hidden /> Projects</a>
          {townAction('/editor', desk).kind === 'navigate'
            ? <a href="/editor"><Code aria-hidden /> Code</a>
            : <button type="button" onClick={() => explain('/editor')}><Code aria-hidden /> Code</button>}
          <a href="/artifacts"><Box aria-hidden /> Artifacts</a>
        </nav>
        <div className="ph-drawer-scroll">
          <p className="ph-drawer-label">Pinned</p>
          {TOWN_CAST.map((agent) => (
            <button key={agent.id} type="button" className="ph-drawer-row" onClick={() => openBot(agent.id)}>
              <img src={agent.src} alt="" width={28} height={28} />
              <span>{agent.name}</span>
            </button>
          ))}
          <p className="ph-drawer-label">Recents</p>
          {desk === 'signin' && <a className="ph-drawer-row" href={googleSignInHref()}>Sign in to see saved threads</a>}
          {desk === 'offline' && shownRecents.length === 0 && <p className="ph-blurb">No saved threads on this host.</p>}
          {desk === 'ready' && shownRecents.length === 0 && <p className="ph-blurb">No saved threads on this desk.</p>}
          {shownRecents.map((thread) => (
            <a key={thread.id} className="ph-drawer-row" href={thread.href}>
              <MessageCircle aria-hidden />
              <span>{thread.title}</span>
            </a>
          ))}
          <a className="ph-drawer-row" href="/village?section=library">Village history</a>
        </div>
        <div className="ph-drawer-foot">
          <button type="button" className="ph-drawer-avatar" aria-label="You" onClick={() => { setPanel(false); setTab('you'); }}>
            <User aria-hidden />
          </button>
        </div>
      </aside>
      {talking && (
        <BotTalk
          bot={talking}
          people={TOWN_CAST as readonly TownBot[] as TownBot[]}
          preview={previews[talking.id] ?? []}
          saved={savedFor(talking.name, threads, savedMessages)}
          onOpen={openBot}
          onPreview={(text) => setPreviews((current) => ({ ...current, [talking.id]: [...(current[talking.id] ?? []), text].slice(-40) }))}
          onBack={closeBot}
        />
      )}
    </div>
  );
}

function savedFor(name: string, threads: Thread[], messages: SavedLine[]): SavedLine[] {
  const ids = new Set(threads.filter((thread) => thread.title.trim().toLowerCase() === name.trim().toLowerCase()).map((thread) => thread.id));
  return messages.filter((message) => ids.has(message.threadId) && message.content.trim()).slice().sort((a, b) => a.createdAt - b.createdAt);
}

function paint(
  canvas: HTMLCanvasElement,
  mapLayer: MapLayer,
  map: HTMLImageElement | null,
  cam: { x: number; y: number },
  frame: { fit: number; ox: number; oy: number },
  hero: { x: number; y: number },
  player: HTMLImageElement | null,
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
  if (player && player.complete && player.naturalWidth) {
    const size = 32 * frame.fit;
    const left = frame.ox + (hero.x - view.x) * frame.fit - cam.x - size / 2;
    const top = frame.oy + (hero.y - view.y) * frame.fit - cam.y - size;
    ctx.drawImage(player, Math.round(left), Math.round(top), Math.round(size), Math.round(size));
  }
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

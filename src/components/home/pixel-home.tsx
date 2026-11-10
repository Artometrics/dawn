'use client';

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Box, Code, Folder, Map, MessageCircle, Plus, User } from 'lucide-react';
import { BotTalk, type TownBot } from '@/components/home/bot-talk';
import { TOWN_CAST } from '@/lib/credits/town';
import { api, gatewayBase, googleSignInHref, type Thread } from '@/components/dawn-agents/api';
import type { SavedLine } from '@/components/home/bot-talk';
import { searchTown, type SearchHit } from '@/lib/home/town-search';
import { stepHero } from '@/lib/home/town-walk';
import { isPaintedPlayerPixel, isTownWalkable, PAINTED_PLAYER, pathCell, TOWN_DOORS } from '@/lib/home/town-ground';
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
  { label: 'Studio', href: '/projects' },
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
  const [sheetOpen, setSheetOpen] = useState(true);
  const sheetRef = useRef(true);
  sheetRef.current = sheetOpen;
  const [threads, setThreads] = useState<Thread[]>([]);
  const [savedMessages, setSavedMessages] = useState<SavedLine[]>([]);
  const [previews, setPreviews] = useState<Record<string, string[]>>({});
  const heroStart = { x: 540, y: 715 };
  const heroRef = useRef(heroStart);
  const [hero, setHero] = useState(heroStart);
  const playerRef = useRef<HTMLImageElement | null>(null);
  const peopleRef = useRef(new globalThis.Map<string, HTMLImageElement>());
  const gridRef = useRef<Uint8Array | null>(null);
  const colsRef = useRef(0);
  const plateRef = useRef<HTMLCanvasElement | null>(null);
  const [stored, setStored] = useState<Record<string, string[]>>({});
  const [jobNote, setJobNote] = useState('');
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
    map.onload = () => {
      const built = buildWalkGrid(map, layer.view);
      if (built) {
        gridRef.current = built.grid;
        colsRef.current = built.cols;
        plateRef.current = built.plate;
      }
      setReady(true);
    };
    map.src = layer.src;
    mapRef.current = map;
    const player = new Image();
    player.onload = () => {
      playerRef.current = player;
      setHero((current) => ({ ...current }));
    };
    player.src = PLAYER_SRC;
    for (const person of TOWN_CAST) {
      const face = new Image();
      face.onload = () => {
        peopleRef.current.set(person.id, face);
        setHero((current) => ({ ...current }));
      };
      face.src = person.src;
    }
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
      paint(canvas, layer, plateRef.current ?? mapRef.current, next, frame, heroRef.current, playerRef.current);
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
    paint(canvas, layer, plateRef.current ?? mapRef.current, cam, frame, hero, playerRef.current);
  }, [ready, cam, layer, hero]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (panelRef.current) {
        if (event.key === 'Escape') setPanel(false);
        return;
      }
      if (event.key === 'Escape') {
        if (sheetRef.current) setSheetOpen(false);
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
    if (desk !== 'ready' || !talkId) return;
    let cancel = false;
    void (async () => {
      try {
        const response = await fetch(`/api/local-drafts?person=${encodeURIComponent(talkId)}`, { credentials: 'include', redirect: 'manual' });
        if (response.type === 'opaqueredirect' || !response.ok) return;
        const data = await response.json() as { chat?: { text: string }[] };
        if (!cancel) setStored((current) => ({ ...current, [talkId]: (data.chat ?? []).map((line) => line.text) }));
      } catch {
        /* the visit preview still works */
      }
    })();
    return () => { cancel = true; };
  }, [desk, talkId]);

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
    if (sheetRef.current) setSheetOpen(false);
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
    let moved = false;
    let latest = startH;
    const move = (ev: PointerEvent) => {
      if (Math.abs(ev.clientY - startY) > 8) moved = true;
      latest = Math.min(window.innerHeight * 0.72, Math.max(0, startH + (startY - ev.clientY)));
      setSheetH(latest);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      if (!moved || latest < 120) {
        setSheetOpen(false);
        setSheetH(228);
        return;
      }
      setSheetH(latest > 360 ? Math.min(520, window.innerHeight * 0.62) : 228);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
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
    const next = stepHero(heroRef.current, { x: dx, y: dy }, bounds, 16);
    const grid = gridRef.current;
    if (grid && !pathCell(grid, colsRef.current, next.x, next.y, layer.view.y, 8)) return;
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
    [
      ...layer.hotspots.map((spot) => ({ id: spot.id, name: spot.name, kind: spot.kind, href: spot.id === 'studio' ? '/projects' : spot.href })),
      { id: 'projects', name: 'Projects', kind: 'Files', href: '/projects' },
    ],
    TOWN_CAST.map((person) => ({ id: person.id, name: person.name })),
  );

  async function deskPost(body: Record<string, string>): Promise<Response | null> {
    try {
      const response = await fetch('/api/local-drafts', {
        method: 'POST',
        credentials: 'include',
        redirect: 'manual',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (response.type === 'opaqueredirect' || response.status === 401) return null;
      return response;
    } catch {
      return null;
    }
  }

  async function keepLine(personId: string, text: string) {
    if (desk === 'ready') {
      const response = await deskPost({ kind: 'chat', personId, text });
      if (response?.ok) {
        setStored((current) => ({ ...current, [personId]: [...(current[personId] ?? []), text].slice(-40) }));
        setJobNote('Saved on this desk.');
        return;
      }
    }
    setPreviews((current) => ({ ...current, [personId]: [...(current[personId] ?? []), text].slice(-40) }));
    setJobNote(desk === 'ready' ? 'The desk refused that line.' : '');
  }

  async function keepFile() {
    const response = await deskPost({ kind: 'file', name: 'note.txt', text: 'A project note kept on this desk.' });
    setJobNote(response?.ok ? 'note.txt is on this desk.' : 'The file was not saved.');
  }

  async function keepDraft(name: string) {
    const response = await deskPost({ kind: 'send', to: 'review@localhost', body: `Note for ${name}. Held for review.` });
    setJobNote(response?.ok ? 'Draft held for review. Nothing was sent.' : 'The draft was not saved.');
  }

  function openDoor(href: string, id: string) {
    const spot = layer.hotspots.find((item) => item.id === id);
    if (spot) focusLandmark(spot);
    const action = townAction(href, desk);
    if (id === 'agents') {
      if (action.kind === 'navigate') window.location.assign(action.href);
      else { setPanel(true); setNotice(''); }
      return;
    }
    if (action.kind === 'navigate') window.location.assign(action.href);
  }

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
      {TOWN_DOORS.map((door) => {
        const person = TOWN_CAST.find((item) => item.id === door.person);
        const left = frame.ox + (door.x - layer.view.x) * frame.fit - cam.x;
        const top = frame.oy + (door.y - layer.view.y) * frame.fit - cam.y;
        return (
          <span key={door.id} className="ph-door" style={{ left, top }}>
            {person && <img src={person.src} alt="" width={28} height={28} />}
            <button type="button" aria-label={`Talk to ${person?.name ?? door.name}`} onClick={() => openBot(door.person)} />
            <button type="button" aria-label={`Enter ${door.name}`} onClick={() => openDoor(door.href, door.id)} />
          </span>
        );
      })}
      {ART_CONTROLS.map((control) => {
        const size = Math.max(44, 52 * frame.fit);
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
      {!sheetOpen && (
      <div className="ph-pad" aria-label="Walk" style={{ bottom: 86 }}>
        <button type="button" aria-label="Walk up" onPointerDown={() => holdWalk(0, -1)}>↑</button>
        <button type="button" aria-label="Walk left" onPointerDown={() => holdWalk(-1, 0)}>←</button>
        <button type="button" aria-label="Walk down" onPointerDown={() => holdWalk(0, 1)}>↓</button>
        <button type="button" aria-label="Walk right" onPointerDown={() => holdWalk(1, 0)}>→</button>
      </div>
      )}
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
      {sheetOpen ? (
      <section className="ph-sheet" style={{ height: sheetH }} aria-label="Place">
        <div className="ph-sheetbar">
          <button type="button" className="ph-handle" aria-label="Drag the sheet" onPointerDown={onSheetPointerDown}>
            <span />
          </button>
          <button type="button" className="ph-sheet-close" onClick={() => setSheetOpen(false)}>Close</button>
        </div>
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
              <a href="/projects">Projects</a>
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
      ) : (
        <button type="button" className="ph-reopen" onClick={() => { setSheetOpen(true); setSheetH(228); }}>Open Dawn Town</button>
      )}
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
          <a href="/projects"><Folder aria-hidden /> Projects</a>
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
          onPreview={(text) => { void keepLine(talking.id, text); }}
          stored={stored[talking.id] ?? []}
          jobNote={jobNote}
          onFile={() => { void keepFile(); }}
          onDraft={() => { void keepDraft(talking.name); }}
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
  map: CanvasImageSource | null,
  cam: { x: number; y: number },
  frame: { fit: number; ox: number; oy: number },
  hero: { x: number; y: number },
  player: HTMLImageElement | null,
) {
  const ctx = canvas.getContext('2d');
  const sourceWidth = map instanceof HTMLImageElement ? map.naturalWidth : map instanceof HTMLCanvasElement ? map.width : 0;
  if (!ctx || !map || !sourceWidth) return;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#143018'; // --dawn-forest; canvas cannot read CSS variables
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

function buildWalkGrid(map: HTMLImageElement, layerView = { x: 0, y: 330, w: 768, h: 650 }) {
  const canvas = document.createElement('canvas');
  canvas.width = map.naturalWidth;
  canvas.height = map.naturalHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(map, 0, 0);
  const cell = 8;
  const cols = Math.ceil(layerView.w / cell);
  const rows = Math.ceil(layerView.h / cell);
  const image = ctx.getImageData(layerView.x, layerView.y, layerView.w, layerView.h);
  const grid = new Uint8Array(cols * rows);
  for (let cy = 0; cy < rows; cy += 1) {
    for (let cx = 0; cx < cols; cx += 1) {
      let ok = 0;
      let seen = 0;
      for (let dy = 1; dy < cell; dy += 3) {
        for (let dx = 1; dx < cell; dx += 3) {
          const x = cx * cell + dx;
          const y = cy * cell + dy;
          if (x >= layerView.w || y >= layerView.h) continue;
          const index = (y * layerView.w + x) * 4;
          seen += 1;
          if (isTownWalkable(image.data[index], image.data[index + 1], image.data[index + 2])) ok += 1;
        }
      }
      if (seen && ok * 2 >= seen) grid[cy * cols + cx] = 1;
    }
  }
  const { x, y, w, h } = PAINTED_PLAYER;
  const pad = 2;
  const block = ctx.getImageData(x - pad, y - pad, w + pad * 2, h + pad * 2);
  const width = w + pad * 2;
  const height = h + pad * 2;
  const painted = new Uint8Array(width * height);
  for (let i = 0; i < painted.length; i += 1) {
    const offset = i * 4;
    if (isPaintedPlayerPixel(block.data[offset], block.data[offset + 1], block.data[offset + 2])) painted[i] = 1;
  }
  for (let pass = 0; pass < width + height; pass += 1) {
    let changed = false;
    const next = painted.slice();
    const copy = block.data.slice();
    for (let i = 0; i < painted.length; i += 1) {
      if (!painted[i]) continue;
      const px = i % width;
      const py = Math.floor(i / width);
      const neighbors = [i - 1, i + 1, i - width, i + width];
      for (const neighbor of neighbors) {
        const nx = neighbor % width;
        const ny = Math.floor(neighbor / width);
        if (neighbor < 0 || neighbor >= painted.length || Math.abs(nx - px) > 1 || ny < 0 || ny >= height || painted[neighbor]) continue;
        const to = i * 4;
        const from = neighbor * 4;
        copy[to] = block.data[from];
        copy[to + 1] = block.data[from + 1];
        copy[to + 2] = block.data[from + 2];
        copy[to + 3] = 255;
        next[i] = 0;
        changed = true;
        break;
      }
    }
    block.data.set(copy);
    painted.set(next);
    if (!changed) break;
  }
  ctx.putImageData(block, x - pad, y - pad);
  return { grid, cols, plate: canvas };
}

function frameFor(mapLayer: MapLayer, viewW: number, viewH: number) {
  if (viewW <= 0 || viewH <= 0) return { fit: 1, ox: 0, oy: 0 };
  const top = Math.min(96, viewH * 0.12);
  const bottom = Math.min(270, viewH * 0.34);
  const band = Math.max(180, viewH - top - bottom);
  const fit = band / mapLayer.view.h;
  const ox = Math.max(0, (viewW - mapLayer.view.w * fit) / 2);
  return { fit, ox, oy: top };
}

function clampCam(mapLayer: MapLayer, x: number, y: number, viewW: number, viewH: number, fit: number) {
  const maxX = Math.max(0, mapLayer.view.w * fit - viewW);
  const maxY = Math.max(0, mapLayer.view.h * fit - viewH);
  return { x: Math.min(maxX, Math.max(0, x)), y: Math.min(maxY, Math.max(0, y)) };
}

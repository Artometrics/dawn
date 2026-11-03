'use client';

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Bookmark, Box, Code, Compass, Folder, Layers, LocateFixed, Mail, Map, MessageCircle, Palette, Plus, Sparkles, Users } from 'lucide-react';
import { spriteById, defaultSpriteId } from '@/lib/credits/sprites';
import { api, gatewayBase, googleSignInHref, type Agent, type Thread } from '@/components/dawn-agents/api';
import {
  PLAYER_SRC,
  SHEET_COLS,
  SHEET_SRC,
  TILE,
  buildOverworld,
  canWalk,
  landmarkAt,
  stepToward,
  type Landmark,
  type Overworld,
} from '@/lib/home/overworld';
import './pixel-home.css';

type Tab = 'explore' | 'you' | 'contribute';

const CHIPS: { label: string; href?: string; ask?: boolean; panel?: boolean; icon: typeof Sparkles }[] = [
  { label: 'Ask Dawn', href: '/agents', ask: true, icon: Sparkles },
  { label: 'Agents', panel: true, icon: Users },
  { label: 'Editor', href: '/editor', icon: Code },
  { label: 'Recipes', href: '/agents?section=recipes', icon: Palette },
  { label: 'Letter', href: '/letter', icon: Mail },
  { label: 'Studio', href: '/studio', icon: Map },
];

export function PixelHome() {
  const world = useMemo(() => buildOverworld(), []);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sheetRef = useRef<HTMLImageElement | null>(null);
  const playerRef = useRef<HTMLImageElement | null>(null);
  const viewRef = useRef({ w: 0, h: 0, scale: 3 });
  const camRef = useRef({ x: 0, y: 0 });
  const followRef = useRef(true);
  const goalRef = useRef<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ x: number; y: number; camX: number; camY: number; moved: boolean } | null>(null);

  const [player, setPlayer] = useState(world.spawn);
  const [cam, setCam] = useState({ x: 0, y: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('explore');
  const [panel, setPanel] = useState(false);
  const [query, setQuery] = useState('');
  const [labels, setLabels] = useState(true);
  const [sheetH, setSheetH] = useState(228);
  const [agents, setAgents] = useState<Agent[] | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [agentsNote, setAgentsNote] = useState('');
  const [ready, setReady] = useState(false);
  const panelRef = useRef(false);
  panelRef.current = panel;

  const selected = world.landmarks.find((spot) => spot.id === selectedId) ?? null;
  const matches = query.trim()
    ? world.landmarks.filter((spot) => `${spot.name} ${spot.kind} ${spot.blurb}`.toLowerCase().includes(query.trim().toLowerCase()))
    : [];

  useEffect(() => {
    const sheet = new Image();
    const face = new Image();
    let pending = 2;
    const done = () => {
      pending -= 1;
      if (pending === 0) setReady(true);
    };
    sheet.onload = done;
    face.onload = done;
    sheet.src = SHEET_SRC;
    face.src = PLAYER_SRC;
    sheetRef.current = sheet;
    playerRef.current = face;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const fit = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const scale = parent.clientWidth >= 900 ? 4 : 3;
      const w = Math.floor(parent.clientWidth / scale);
      const h = Math.floor(parent.clientHeight / scale);
      viewRef.current = { w, h, scale };
      canvas.width = w;
      canvas.height = h;
      canvas.style.width = `${w * scale}px`;
      canvas.style.height = `${h * scale}px`;
      if (followRef.current) {
        const next = centerOf(world, player, w, h);
        camRef.current = next;
        setCam(next);
      }
      paint(canvas, world, sheetRef.current, playerRef.current, player, camRef.current);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(canvas.parentElement || canvas);
    return () => observer.disconnect();
  }, [player, world]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !ready) return;
    paint(canvas, world, sheetRef.current, playerRef.current, player, cam);
  }, [ready, player, cam, world]);

  useEffect(() => {
    if (!followRef.current) return;
    const next = centerOf(world, player, viewRef.current.w, viewRef.current.h);
    camRef.current = next;
    setCam(next);
  }, [player, world]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const goal = goalRef.current;
      if (!goal) return;
      setPlayer((current) => {
        const next = stepToward(world, current, goal);
        if (next.x === current.x && next.y === current.y) {
          goalRef.current = null;
          return current;
        }
        if (next.x === goal.x && next.y === goal.y) {
          goalRef.current = null;
          followRef.current = true;
          const spot = world.landmarks.find((item) => item.approach.x === goal.x && item.approach.y === goal.y);
          if (spot) setSelectedId(spot.id);
        }
        return next;
      });
    }, 150);
    return () => window.clearInterval(id);
  }, [world]);

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
        w: [0, -1],
        a: [-1, 0],
        s: [0, 1],
        d: [1, 0],
      };
      const dir = dirs[event.key];
      if (!dir) return;
      event.preventDefault();
      goalRef.current = null;
      followRef.current = true;
      setPlayer((current) => {
        const next = { x: current.x + dir[0], y: current.y + dir[1] };
        return canWalk(world, next.x, next.y) ? next : current;
      });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [world]);

  useEffect(() => {
    if (!panel) return;
    let cancel = false;
    setAgentsNote('');
    void (async () => {
      try {
        const base = await gatewayBase();
        const state = await api<{ agents: Agent[]; threads: Thread[] }>(base, '/api/state');
        if (cancel) return;
        setAgents(state.agents);
        setThreads(state.threads);
      } catch (error) {
        if (cancel) return;
        const message = error instanceof Error ? error.message : 'The desk is offline.';
        setAgents(null);
        setThreads([]);
        setAgentsNote(message);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [panel]);

  function focusLandmark(spot: Landmark, walk: boolean) {
    setSelectedId(spot.id);
    setTab('explore');
    setQuery('');
    setPanel(false);
    followRef.current = false;
    goalRef.current = walk ? spot.approach : null;
    const next = centerOf(world, spot.approach, viewRef.current.w, viewRef.current.h);
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
    const scale = viewRef.current.scale;
    const dx = (event.clientX - drag.x) / scale;
    const dy = (event.clientY - drag.y) / scale;
    if (Math.hypot(dx, dy) > 4) drag.moved = true;
    if (!drag.moved) return;
    followRef.current = false;
    const next = clampCam(world, drag.camX - dx, drag.camY - dy, viewRef.current.w, viewRef.current.h);
    camRef.current = next;
    setCam(next);
  }

  function onPointerUp(event: ReactPointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag || drag.moved) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const scale = viewRef.current.scale;
    const wx = camRef.current.x + (event.clientX - rect.left) / scale;
    const wy = camRef.current.y + (event.clientY - rect.top) / scale;
    const tile = { x: Math.floor(wx / TILE), y: Math.floor(wy / TILE) };
    const spot = landmarkAt(world, tile.x, tile.y);
    if (spot) {
      focusLandmark(spot, true);
      return;
    }
    if (!canWalk(world, tile.x, tile.y)) return;
    setSelectedId(null);
    goalRef.current = tile;
    followRef.current = true;
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

  const scale = viewRef.current.scale || 3;
  const recents = threads
    .filter((thread) => (thread.kind === 'direct' || thread.kind === 'group') && !thread.leftAt)
    .slice()
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 8);
  const place = selected ?? {
    name: 'Dawn',
    kind: 'Home',
    blurb: 'A 16-bit desk. Walk up to a building, or search it.',
    href: '/agents',
    suggestion: 'Things to do this weekend?',
  };

  return (
    <div className={panel ? 'ph menu-open' : 'ph'}>
      <div className="ph-stage">
      <canvas
        ref={canvasRef}
        className="ph-canvas"
        aria-label="Dawn overworld. Drag to pan. Arrow keys or a tap walk the player."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />
      {labels &&
        world.landmarks.map((spot) => {
          const left = (spot.x + spot.w / 2) * TILE - cam.x;
          const top = spot.y * TILE - cam.y;
          return (
            <button
              key={spot.id}
              type="button"
              className="ph-label"
              style={{ left: left * scale, top: top * scale }}
              onClick={() => focusLandmark(spot, true)}
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
          <span className="ph-dot" />
        </button>
        <form
          className="ph-glass ph-search"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            if (matches[0]) focusLandmark(matches[0], true);
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
          <img src={PLAYER_SRC} alt="" />
        </button>
      </header>
      {query.trim() && (
        <ul className="ph-results">
          {matches.length === 0 && <li className="ph-note">Nothing on the map matches.</li>}
          {matches.map((spot) => (
            <li key={spot.id}>
              <button type="button" onClick={() => focusLandmark(spot, true)}>
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
            <button key={chip.label} type="button" className="ph-chip" onClick={() => setPanel(true)}>
              <chip.icon aria-hidden />
              {chip.label}
            </button>
          ) : (
            <a key={chip.label} className={chip.ask ? 'ph-chip ask' : 'ph-chip'} href={chip.href}>
              <chip.icon aria-hidden />
              {chip.label}
            </a>
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
            followRef.current = true;
            const next = centerOf(world, player, viewRef.current.w, viewRef.current.h);
            camRef.current = next;
            setCam(next);
          }}
        >
          <LocateFixed />
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
                <h1>{place.name}</h1>
                <p className="ph-blurb">{place.blurb}</p>
              </div>
              <div className="ph-weather">
                <span className="ph-sun" aria-hidden />
                <span>
                  Clear
                  <span className="ph-aqi"><i />Studio air</span>
                </span>
              </div>
            </div>
            <a className="ph-plan" href="/agents">
              <span className="ph-plan-title">
                <Sparkles aria-hidden />
                Make plans with Ask Dawn
              </span>
              <span className="ph-suggest">→ {place.suggestion}</span>
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
          <span className="ph-tab-bubble"><Compass /></span>
          Explore
        </button>
        <button type="button" className={tab === 'you' ? 'ph-tab on' : 'ph-tab'} onClick={() => setTab('you')}>
          <span className="ph-tab-bubble"><Bookmark /></span>
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
          {agentsNote === 'Sign in with Google.' && (
            <p className="ph-note"><a href={googleSignInHref()}>Sign in with Google</a> to see your agents.</p>
          )}
          {agentsNote && agentsNote !== 'Sign in with Google.' && <p className="ph-note">{agentsNote}</p>}
          {agents && agents.length === 0 && <p className="ph-note">No agents yet.</p>}
          {!agents && !agentsNote && <p className="ph-note">Opening the list…</p>}
          {agents?.map((agent) => {
            const sprite = spriteById(agent.avatar.sprite || defaultSpriteId(agent.id));
            return (
              <a key={agent.id} className="ph-drawer-row" href={`/agents?agent=${encodeURIComponent(agent.id)}`}>
                {sprite && <img src={sprite.src} alt="" width={24} height={24} />}
                <span>{agent.name}</span>
              </a>
            );
          })}
          <p className="ph-drawer-label">Recents</p>
          {recents.length === 0 && <p className="ph-note">No chats yet.</p>}
          {recents.map((thread) => (
            <a key={thread.id} className="ph-drawer-row" href={`/agents?thread=${encodeURIComponent(thread.id)}`}>
              <MessageCircle aria-hidden />
              <span>{thread.title || 'Chat'}</span>
            </a>
          ))}
        </div>
        <div className="ph-drawer-foot">
          <button type="button" className="ph-drawer-avatar" aria-label="You" onClick={() => { setPanel(false); setTab('you'); }}>
            <img src={PLAYER_SRC} alt="" />
          </button>
          <a className="ph-newchat" href="/agents?section=edit"><Plus aria-hidden /> New chat</a>
        </div>
      </aside>
    </div>
  );
}

function paint(
  canvas: HTMLCanvasElement,
  world: Overworld,
  sheet: HTMLImageElement | null,
  face: HTMLImageElement | null,
  player: { x: number; y: number },
  cam: { x: number; y: number },
) {
  const ctx = canvas.getContext('2d');
  if (!ctx || !sheet || !sheet.complete || !sheet.naturalWidth) return;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#143018';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const x0 = Math.max(0, Math.floor(cam.x / TILE));
  const y0 = Math.max(0, Math.floor(cam.y / TILE));
  const x1 = Math.min(world.w, Math.ceil((cam.x + canvas.width) / TILE));
  const y1 = Math.min(world.h, Math.ceil((cam.y + canvas.height) / TILE));
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      blit(ctx, sheet, world.ground[y][x], x * TILE - cam.x, y * TILE - cam.y);
    }
  }
  const sprites: { x: number; y: number; tile: number }[] = [];
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const tile = world.object[y][x];
      if (tile != null) sprites.push({ x, y, tile });
    }
  }
  sprites.sort((a, b) => a.y - b.y);
  for (const sprite of sprites) {
    if (sprite.y >= player.y) break;
    blit(ctx, sheet, sprite.tile, sprite.x * TILE - cam.x, sprite.y * TILE - cam.y);
  }
  if (face && face.complete && face.naturalWidth) {
    ctx.drawImage(face, player.x * TILE - cam.x, player.y * TILE - cam.y - 4, TILE, TILE);
  }
  for (const sprite of sprites) {
    if (sprite.y < player.y) continue;
    blit(ctx, sheet, sprite.tile, sprite.x * TILE - cam.x, sprite.y * TILE - cam.y);
  }
}

function blit(ctx: CanvasRenderingContext2D, sheet: HTMLImageElement, index: number, dx: number, dy: number) {
  const sx = (index % SHEET_COLS) * TILE;
  const sy = Math.floor(index / SHEET_COLS) * TILE;
  ctx.drawImage(sheet, sx, sy, TILE, TILE, Math.round(dx), Math.round(dy), TILE, TILE);
}

function centerOf(world: Overworld, cell: { x: number; y: number }, viewW: number, viewH: number) {
  return clampCam(world, cell.x * TILE + TILE / 2 - viewW / 2, cell.y * TILE + TILE / 2 - viewH / 2, viewW, viewH);
}

function clampCam(world: Overworld, x: number, y: number, viewW: number, viewH: number) {
  const maxX = Math.max(0, world.w * TILE - viewW);
  const maxY = Math.max(0, world.h * TILE - viewH);
  return { x: Math.min(maxX, Math.max(0, x)), y: Math.min(maxY, Math.max(0, y)) };
}

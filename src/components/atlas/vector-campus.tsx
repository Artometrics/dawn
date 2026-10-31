'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Flower2,
  Footprints,
  House,
  Layers,
  LocateFixed,
  Menu,
  Search,
  TreePine,
  Waves,
  X,
} from 'lucide-react';
import rawPlaces from '../../../data/atlas/stanford-places.json';
import { AtlasMap } from '@/components/dawn/atlas-map';
import {
  CARDINAL_NOTE,
  type Place,
} from '@/lib/atlas/quest';
import type { LatLng } from '@/lib/atlas/walk';

const places = rawPlaces as Place[];
const WORLD = 1000;

type QuestPoint = Place & { label: string; placeName: string };
type Layer = 'campus' | 'here';
type Filter = 'all' | 'quest' | 'gardens' | 'halls';

type Props = {
  quest: QuestPoint[];
  start: Place;
  pos: LatLng;
  sprite: string;
  unlocked: number;
  walking: boolean;
  active: number | null;
  embed: boolean;
  framed: 'page' | 'shell';
  avatar: number;
  onStop: (index: number) => void;
  onWalk: () => void;
  onRole: (role: 'student' | 'researcher') => void;
  role: 'student' | 'researcher';
  onMenu?: () => void;
};

function boundsOf(list: Place[]) {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const place of list) {
    minLat = Math.min(minLat, place.lat);
    maxLat = Math.max(maxLat, place.lat);
    minLng = Math.min(minLng, place.lng);
    maxLng = Math.max(maxLng, place.lng);
  }
  const padLat = (maxLat - minLat) * 0.08 || 0.01;
  const padLng = (maxLng - minLng) * 0.08 || 0.01;
  return { minLat: minLat - padLat, maxLat: maxLat + padLat, minLng: minLng - padLng, maxLng: maxLng + padLng };
}

const BOUNDS = boundsOf(places);

function project(lat: number, lng: number) {
  return {
    x: ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * WORLD,
    y: ((BOUNDS.maxLat - lat) / (BOUNDS.maxLat - BOUNDS.minLat)) * WORLD,
  };
}

function nearestRoads(list: Place[]) {
  const seen = new Set<string>();
  const lines: Array<[{ x: number; y: number }, { x: number; y: number }]> = [];
  for (let i = 0; i < list.length; i += 1) {
    const ranked = list
      .map((place, index) => ({
        index,
        d: (place.lat - list[i].lat) ** 2 + (place.lng - list[i].lng) ** 2,
      }))
      .filter((item) => item.index !== i)
      .sort((a, b) => a.d - b.d)
      .slice(0, 2);
    for (const next of ranked) {
      const key = [i, next.index].sort((a, b) => a - b).join(':');
      if (seen.has(key)) continue;
      seen.add(key);
      lines.push([project(list[i].lat, list[i].lng), project(list[next.index].lat, list[next.index].lng)]);
    }
  }
  return lines;
}

const ROADS = nearestRoads(places);

function placeBucket(name: string): Filter {
  if (/garden|lake|golf|amphitheater|dish|oval|tree/i.test(name)) return 'gardens';
  if (/library|hall|tower|quad|center|stadium|union|cafe|coho|bookstore/i.test(name)) return 'halls';
  return 'all';
}

function stopIcon(label: string) {
  if (/tree|palo/i.test(label)) return TreePine;
  if (/garden/i.test(label)) return Flower2;
  if (/lake/i.test(label)) return Waves;
  return House;
}

const SNAPS = [0.26, 0.46, 0.78];

export function VectorCampus({
  quest,
  start,
  pos,
  sprite,
  unlocked,
  walking,
  active,
  embed,
  framed,
  avatar,
  onStop,
  onWalk,
  onRole,
  role,
  onMenu,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; scale: number } | null>(null);
  const follow = useRef(true);
  const opening = useMemo(() => {
    const pts = [project(start.lat, start.lng), ...quest.map((stop) => project(stop.lat, stop.lng))];
    const xs = pts.map((pt) => pt.x);
    const ys = pts.map((pt) => pt.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const span = Math.max(maxX - minX, maxY - minY, 40);
    return {
      cx: (minX + maxX) / 2,
      cy: (minY + maxY) / 2,
      scale: Math.min(3.2, Math.max(1.15, (WORLD * 0.62) / span)),
    };
  }, [quest, start.lat, start.lng]);
  const [view, setView] = useState(opening);
  const [detail, setDetail] = useState(true);
  const [layer, setLayer] = useState<Layer>('campus');
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [sheet, setSheet] = useState(SNAPS[0]);
  const [focusToken, setFocusToken] = useState(0);
  const lake = places.find((place) => place.name === 'Lake Lagunita');
  const lakePt = lake ? project(lake.lat, lake.lng) : null;

  const size = WORLD / view.scale;
  const viewBox = `${view.cx - size / 2} ${view.cy - size / 2} ${size} ${size}`;
  const labelFade = Math.min(1, Math.max(0, (view.scale - 1.15) / 0.7));

  const here = project(pos.lat, pos.lng);
  const path = useMemo(() => {
    const pts = [project(start.lat, start.lng)];
    for (let index = 0; index < unlocked; index += 1) {
      pts.push(project(quest[index].lat, quest[index].lng));
    }
    const last = pts[pts.length - 1];
    if (Math.hypot(last.x - here.x, last.y - here.y) > 1) pts.push(here);
    return pts.map((pt) => `${pt.x},${pt.y}`).join(' ');
  }, [here.x, here.y, quest, start.lat, start.lng, unlocked]);

  const next = unlocked < quest.length ? quest[unlocked] : null;
  const nextLine = next
    ? `${here.x},${here.y} ${project(next.lat, next.lng).x},${project(next.lat, next.lng).y}`
    : '';
  const zone = next ? project(next.lat, next.lng) : null;
  const shown = active !== null && active < unlocked ? quest[active] : null;
  const done = unlocked >= quest.length;

  useEffect(() => {
    if (!walking || !follow.current || layer !== 'campus') return;
    setView((current) => ({ ...current, cx: here.x, cy: here.y }));
  }, [here.x, here.y, layer, walking]);

  useEffect(() => {
    const node = mapRef.current;
    if (!node) return;
    const onWheel = (event: WheelEvent) => {
      if (layer !== 'campus') return;
      event.preventDefault();
      const factor = event.deltaY > 0 ? 0.92 : 1.08;
      setView((current) => ({
        ...current,
        scale: Math.min(5, Math.max(0.85, current.scale * factor)),
      }));
    };
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, [layer]);

  function toPercent(pt: { x: number; y: number }) {
    return {
      left: ((pt.x - (view.cx - size / 2)) / size) * 100,
      top: ((pt.y - (view.cy - size / 2)) / size) * 100,
    };
  }

  function recenter() {
    follow.current = true;
    if (layer === 'here') {
      setFocusToken((token) => token + 1);
      return;
    }
    setView({ cx: here.x, cy: here.y, scale: 1.8 });
  }

  function focusPlace(place: Place) {
    const pt = project(place.lat, place.lng);
    follow.current = false;
    setLayer('campus');
    setView({ cx: pt.x, cy: pt.y, scale: 2.2 });
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (layer !== 'campus') return;
    const target = event.target as HTMLElement;
    if (target.closest('button, a, input, label')) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), scale: view.scale };
    }
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(event.pointerId)) return;
    const prev = pointers.current.get(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (!prev) return;
    if (pointers.current.size >= 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const scale = Math.min(5, Math.max(0.85, pinch.current.scale * (dist / pinch.current.dist)));
      setView((current) => ({ ...current, scale }));
      return;
    }
    const rect = mapRef.current?.getBoundingClientRect();
    if (!rect) return;
    follow.current = false;
    const dx = ((event.clientX - prev.x) / rect.width) * size;
    const dy = ((event.clientY - prev.y) / rect.height) * size;
    setView((current) => ({ ...current, cx: current.cx - dx, cy: current.cy - dy }));
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  }

  function onSheetDown(event: React.PointerEvent<HTMLButtonElement>) {
    const origin = event.clientY;
    const startSheet = sheet;
    const height = rootRef.current?.clientHeight || 1;
    function move(next: PointerEvent) {
      const dy = origin - next.clientY;
      setSheet(Math.min(0.86, Math.max(0.18, startSheet + dy / height)));
    }
    function up() {
      setSheet((current) => SNAPS.reduce((best, snap) => (
        Math.abs(snap - current) < Math.abs(best - current) ? snap : best
      )));
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    }
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  const needle = query.trim().toLowerCase();
  const questNames = new Set(quest.map((stop) => stop.placeName));
  const listed = places.filter((place) => {
    if (needle && !place.name.toLowerCase().includes(needle)) return false;
    if (filter === 'quest') return questNames.has(place.name) || place.name === start.name;
    if (filter === 'gardens') return placeBucket(place.name) === 'gardens' || questNames.has(place.name);
    if (filter === 'halls') return placeBucket(place.name) === 'halls';
    return true;
  });

  return (
    <div ref={rootRef} className={`relative overflow-hidden bg-[var(--dawn-map)] text-[var(--dawn-text)] ${framed === 'shell' ? 'h-full' : 'h-dvh'}`}>
      <div
        ref={mapRef}
        className={`dawn-map-surface absolute inset-0 ${layer === 'here' ? 'is-here' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={() => {
          if (layer !== 'campus') return;
          setView((current) => ({ ...current, scale: Math.min(5, current.scale * 1.35) }));
        }}
      >
        {layer === 'here' ? (
          <AtlasMap avatar={avatar} focusToken={focusToken} />
        ) : (
          <>
            <svg className="h-full w-full" viewBox={viewBox} role="img" aria-label="Stanford campus, drawn flat">
              <rect x={-200} y={-200} width={WORLD + 400} height={WORLD + 400} fill="#161816" />
              {lakePt && (
                <ellipse cx={lakePt.x} cy={lakePt.y} rx={78} ry={48} fill="#152028" />
              )}
              {ROADS.map((line, index) => (
                <line
                  key={`road-${index}`}
                  x1={line[0].x}
                  y1={line[0].y}
                  x2={line[1].x}
                  y2={line[1].y}
                  stroke="#3a413c"
                  strokeWidth={3.5}
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              {zone && (
                <circle cx={zone.x} cy={zone.y} r={42} fill="#3ee08a" fillOpacity={0.16} stroke="#3ee08a" strokeWidth={2} vectorEffect="non-scaling-stroke" />
              )}
              {path && (
                <polyline
                  points={path}
                  fill="none"
                  stroke="#ff7a2f"
                  strokeWidth={4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              )}
              {nextLine && (
                <polyline
                  points={nextLine}
                  fill="none"
                  stroke="#4cb7ff"
                  strokeWidth={3}
                  strokeDasharray="8 8"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              )}
            </svg>
            {detail && places.map((place) => {
              if (questNames.has(place.name)) return null;
              const pct = toPercent(project(place.lat, place.lng));
              if (pct.left < -8 || pct.left > 108 || pct.top < -8 || pct.top > 108) return null;
              return (
                <button
                  key={place.name}
                  type="button"
                  className="absolute z-10 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center"
                  style={{ left: `${pct.left}%`, top: `${pct.top}%` }}
                  onClick={() => focusPlace(place)}
                  aria-label={place.name}
                >
                  <span className="block h-2 w-2 rounded-full bg-[#5c6560]" />
                  <span
                    className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] text-[#c4bdb3]"
                    style={{ opacity: labelFade }}
                  >
                    {place.name}
                  </span>
                </button>
              );
            })}
            {quest.map((stop, index) => {
              const pct = toPercent(project(stop.lat, stop.lng));
              const state = index < unlocked ? 'done' : index === unlocked ? 'next' : 'locked';
              const Icon = stopIcon(stop.label);
              const nudge = (index - 2) * 34;
              return (
                <button
                  key={stop.placeName}
                  type="button"
                  onClick={() => {
                    const pt = project(stop.lat, stop.lng);
                    follow.current = false;
                    setView((current) => ({ ...current, cx: pt.x, cy: pt.y, scale: Math.max(current.scale, 1.7) }));
                    onStop(index);
                  }}
                  disabled={state === 'locked' || walking}
                  aria-label={stop.label}
                  aria-current={active === index ? 'true' : undefined}
                  className="absolute z-20 flex min-h-11 -translate-y-1/2 items-center gap-1.5 rounded-lg bg-[#1a3358] pr-2.5 pl-1 text-[13px] font-medium text-white disabled:opacity-50"
                  style={{
                    left: `${pct.left}%`,
                    top: `calc(${pct.top}% + ${nudge}px)`,
                    boxShadow: state === 'next'
                      ? '0 0 0 2px #4cb7ff, 0 6px 16px rgba(0,0,0,0.35)'
                      : state === 'done'
                        ? '0 0 0 2px #ff7a2f, 0 6px 16px rgba(0,0,0,0.35)'
                        : '0 6px 16px rgba(0,0,0,0.35)',
                  }}
                >
                  <span className="grid h-6 w-6 place-items-center rounded-md bg-white/10">
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  {stop.label}
                </button>
              );
            })}
            <img
              src={sprite}
              alt=""
              width={36}
              height={36}
              className="pointer-events-none absolute z-30 h-9 w-9 -translate-x-1/2 -translate-y-full [image-rendering:pixelated]"
              style={{ left: `${toPercent(here).left}%`, top: `${toPercent(here).top}%` }}
            />
          </>
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-40 flex items-center gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        {framed === 'shell' && onMenu && (
          <button type="button" className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full bg-[#2a2a27] md:hidden" aria-label="Menu" onClick={onMenu}>
            <Menu className="h-5 w-5" aria-hidden />
          </button>
        )}
        {framed === 'page' && !embed && (
          <Link href="/" className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full bg-[#2a2a27]" aria-label="Dawn home">
            <House className="h-5 w-5" aria-hidden />
          </Link>
        )}
        <form className="pointer-events-auto min-w-0 flex-1" onSubmit={(event) => event.preventDefault()} role="search">
          <label className="dawn-search flex h-11 items-center gap-2 rounded-full bg-black/70 px-3">
            <Search className="h-4 w-4 shrink-0 text-[var(--dawn-muted)]" aria-hidden />
            <span className="sr-only">Search places</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search places"
              className="h-full min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-[#a8a199]"
            />
            {query && (
              <button type="button" aria-label="Clear search" onClick={() => setQuery('')} className="grid h-8 w-8 place-items-center">
                <X className="h-4 w-4" aria-hidden />
              </button>
            )}
          </label>
        </form>
      </div>

      <div className="absolute top-20 right-3 z-40 flex flex-col gap-2">
        <button
          type="button"
          aria-pressed={detail}
          aria-label={detail ? 'Hide minor labels' : 'Show minor labels'}
          onClick={() => setDetail((value) => !value)}
          className="grid h-11 w-11 place-items-center rounded-full bg-[#2a2a27] shadow-[0_8px_18px_rgba(0,0,0,0.35)]"
        >
          <Layers className="h-5 w-5" aria-hidden />
        </button>
        <button
          type="button"
          aria-label="Recenter on you"
          onClick={recenter}
          className="grid h-11 w-11 place-items-center rounded-full bg-[#2a2a27] shadow-[0_8px_18px_rgba(0,0,0,0.35)]"
        >
          <LocateFixed className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <section
        className="absolute inset-x-0 bottom-0 z-40 flex flex-col rounded-t-3xl bg-[#121211] shadow-[0_-10px_28px_rgba(0,0,0,0.4)]"
        style={{ height: `${sheet * 100}%` }}
        aria-label="Campus places"
      >
        <button
          type="button"
          aria-label="Drag the place list"
          onPointerDown={onSheetDown}
          className="flex h-11 shrink-0 items-center justify-center"
        >
          <span className="h-1 w-9 rounded-full bg-[#3a3834]" />
        </button>
        <div className="flex shrink-0 items-center gap-3 px-4">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[16px] font-medium">
              {walking ? 'Walking' : done ? 'Day complete' : next?.label}
            </p>
            <p className="text-[13px] text-[var(--dawn-muted)]">{unlocked}/{quest.length}</p>
          </div>
          <button
            type="button"
            onClick={onWalk}
            disabled={!next || walking}
            aria-label={next ? `Walk to ${next.label}` : 'Day complete'}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-[var(--dawn-pill)] px-4 text-[14px] font-medium text-[var(--dawn-ink)] disabled:opacity-40"
          >
            <Footprints className="h-4 w-4" aria-hidden />
            {done ? 'Done' : 'Walk'}
          </button>
        </div>
        <div className="mt-3 flex shrink-0 gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Filter places">
          {([
            ['all', 'All'],
            ['quest', 'Quest'],
            ['gardens', 'Gardens'],
            ['halls', 'Halls'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={filter === id}
              onClick={() => setFilter(id)}
              className={`inline-flex h-9 shrink-0 items-center rounded-full px-3 text-[14px] ${filter === id ? 'bg-[var(--dawn-accent)] text-[var(--dawn-ink)]' : 'bg-[var(--dawn-chip)] text-[var(--dawn-text)]'}`}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={layer === 'here'}
            onClick={() => setLayer((current) => (current === 'here' ? 'campus' : 'here'))}
            className={`inline-flex h-9 shrink-0 items-center rounded-full px-3 text-[14px] ${layer === 'here' ? 'bg-[var(--dawn-accent)] text-[var(--dawn-ink)]' : 'bg-[var(--dawn-chip)] text-[var(--dawn-text)]'}`}
          >
            Here
          </button>
        </div>
        <div className="mt-2 flex shrink-0 gap-2 px-4" role="group" aria-label="Who you are today">
          <button type="button" aria-pressed={role === 'student'} onClick={() => onRole('student')} className={`inline-flex h-9 items-center rounded-full px-3 text-[14px] ${role === 'student' ? 'bg-[var(--dawn-accent)] text-[var(--dawn-ink)]' : 'bg-[var(--dawn-chip)]'}`}>
            Student
          </button>
          <button type="button" aria-pressed={role === 'researcher'} onClick={() => onRole('researcher')} className={`inline-flex h-9 items-center rounded-full px-3 text-[14px] ${role === 'researcher' ? 'bg-[var(--dawn-accent)] text-[var(--dawn-ink)]' : 'bg-[var(--dawn-chip)]'}`}>
            Researcher
          </button>
        </div>
        <ul className="mt-2 min-h-0 flex-1 overflow-y-auto px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {listed.map((place) => {
            const stopIndex = quest.findIndex((stop) => stop.placeName === place.name);
            return (
              <li key={place.name}>
                <button
                  type="button"
                  onClick={() => {
                    if (stopIndex >= 0) onStop(stopIndex);
                    else focusPlace(place);
                  }}
                  className="flex min-h-11 w-full items-center rounded-xl px-2 text-left text-[15px]"
                >
                  <span className="truncate">{place.name}</span>
                </button>
              </li>
            );
          })}
          {listed.length === 0 && <li className="px-2 py-3 text-[14px] text-[var(--dawn-muted)]">No places match.</li>}
        </ul>
        {shown && (
          <article className="shrink-0 border-t border-white/10 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <h2 className="text-[16px] font-medium">{shown.label}</h2>
            <p className="mt-1 text-[14px] text-[var(--dawn-secondary)]">{CARDINAL_NOTE}</p>
          </article>
        )}
      </section>
    </div>
  );
}

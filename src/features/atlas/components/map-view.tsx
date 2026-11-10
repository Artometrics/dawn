'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import type { DecodedBasemap } from '../lib/basemap.ts';
import type { Projector, XY } from '../lib/geo.ts';
import { layoutMarkers } from '../lib/labels.ts';
import { shortName } from '../lib/places.ts';
import { eraIndex, type Progress } from '../lib/progress.ts';
import type { AtlasPlace, Region, Route } from '../lib/types.ts';
import { clampView, panBy, worldToScreen, zoomAt, type Size, type View } from '../lib/viewport.ts';

const GROUND = '#161816';
const COLORS = {
  green: '#1b211c',
  water: '#152028',
  rail: '#2c2f2d',
  buildingLarge: '#252a23',
  buildingSmall: '#20241f',
  path: '#2b312d',
  minor: '#323833',
  major: '#3a413c',
  label: '#8f887f',
};

type Layers = {
  green: Path2D;
  water: Path2D;
  waterways: Path2D;
  rail: Path2D;
  buildingsLarge: Path2D;
  buildingsSmall: Path2D;
  major: Path2D;
  minor: Path2D;
  path: Path2D;
};

function build(lists: [number, number][][], close: boolean): Path2D {
  const path = new Path2D();
  for (const points of lists) {
    points.forEach(([x, y], i) => (i === 0 ? path.moveTo(x, y) : path.lineTo(x, y)));
    if (close) path.closePath();
  }
  return path;
}

function buildLayers(map: DecodedBasemap): Layers {
  return {
    green: build(map.green, true),
    water: build(map.water, true),
    waterways: build(map.waterways, false),
    rail: build(map.rail, false),
    buildingsLarge: build(map.buildingsLarge, true),
    buildingsSmall: build(map.buildingsSmall, true),
    major: build(map.roads.major, false),
    minor: build(map.roads.minor, false),
    path: build(map.roads.path, false),
  };
}

const fade = (scale: number, from: number, span: number) => Math.min(1, Math.max(0, (scale - from) / span));

function draw(canvas: HTMLCanvasElement, layers: Layers | null, map: DecodedBasemap | null, view: View, size: Size) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = GROUND;
  ctx.fillRect(0, 0, size.w, size.h);
  if (!layers || !map) return;
  const s = view.scale;
  ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * (size.w / 2 - view.cx * s), dpr * (size.h / 2 - view.cy * s));
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const px = (n: number) => n / s;

  ctx.fillStyle = COLORS.green;
  ctx.fill(layers.green);
  ctx.fillStyle = COLORS.water;
  ctx.fill(layers.water);
  ctx.strokeStyle = COLORS.water;
  ctx.lineWidth = Math.max(px(2), 3);
  ctx.stroke(layers.waterways);
  ctx.strokeStyle = COLORS.rail;
  ctx.lineWidth = Math.max(px(1.5), 2);
  ctx.setLineDash([px(6), px(4)]);
  ctx.stroke(layers.rail);
  ctx.setLineDash([]);
  ctx.fillStyle = COLORS.buildingLarge;
  ctx.fill(layers.buildingsLarge);
  if (s >= 0.4) {
    ctx.fillStyle = COLORS.buildingSmall;
    ctx.fill(layers.buildingsSmall);
  }
  if (s >= 0.3) {
    ctx.strokeStyle = COLORS.path;
    ctx.lineWidth = Math.max(px(1), 1.4);
    ctx.stroke(layers.path);
  }
  ctx.strokeStyle = COLORS.minor;
  ctx.lineWidth = Math.max(px(1.4), 5);
  ctx.stroke(layers.minor);
  ctx.strokeStyle = COLORS.major;
  ctx.lineWidth = Math.max(px(2.6), 9);
  ctx.stroke(layers.major);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 4;
  ctx.strokeStyle = GROUND;
  const majorOpacity = fade(s, 0.28, 0.2);
  const minorOpacity = fade(s, 0.7, 0.4);
  const placed: XY[] = [];
  for (const label of map.labels) {
    const opacity = label.major ? majorOpacity : minorOpacity;
    if (opacity <= 0.02) continue;
    const x = size.w / 2 + (label.x - view.cx) * s;
    const y = size.h / 2 + (label.y - view.cy) * s;
    if (x < -60 || x > size.w + 60 || y < -20 || y > size.h + 20) continue;
    if (label.length * s < label.text.length * 6.4) continue;
    if (placed.some((p) => Math.abs(p.x - x) < 90 && Math.abs(p.y - y) < 16)) continue;
    placed.push({ x, y });
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(label.angle);
    ctx.globalAlpha = opacity;
    ctx.font = `${label.major ? 500 : 400} 11px system-ui, sans-serif`;
    ctx.strokeText(label.text, 0, 0);
    ctx.fillStyle = COLORS.label;
    ctx.fillText(label.text, 0, 0);
    ctx.restore();
  }
}

export type MapViewProps = {
  region: Region;
  projector: Projector;
  places: AtlasPlace[];
  basemap: DecodedBasemap | null;
  basemapError: string | null;
  view: View;
  size: Size;
  onView: (view: View) => void;
  onSize: (size: Size) => void;
  /** The user moved the map by hand, so stop following the sprite. */
  onUserMove: () => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  progress: Progress;
  /** The route drawn on the map, with its line and the line index where each stop is reached. */
  route: { route: Route; line: XY[]; indexes: number[] } | null;
  eraFilter: number;
  character: { pos: XY; facingRight: boolean; walking: boolean; src: string };
  gps: { pos: XY; accuracyM: number } | null;
  /** Pixels at the bottom the bottom sheet covers, so the credit stays visible above it. */
  bottomInset: number;
};

export const ZONE_RADIUS_M = 60;

export function MapView(props: MapViewProps) {
  const { region, projector, places, basemap, basemapError, view, size, onView, onSize, onUserMove, selectedId, onSelect, progress, route, eraFilter, character, gps, bottomInset } = props;
  const surface = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const viewRef = useRef(view);
  const sizeRef = useRef(size);
  useEffect(() => {
    viewRef.current = view;
    sizeRef.current = size;
  });
  const pointers = useRef(new Map<number, XY>());
  const gesture = useRef<{ start: XY; dragging: boolean; pinch: number | null }>({ start: { x: 0, y: 0 }, dragging: false, pinch: null });
  const moved = useRef(false);

  const layers = useMemo(() => (basemap ? buildLayers(basemap) : null), [basemap]);

  useEffect(() => {
    const node = surface.current;
    if (!node) return;
    const measure = () => {
      const rect = node.getBoundingClientRect();
      onSize({ w: Math.round(rect.width), h: Math.round(rect.height) });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [onSize]);

  useLayoutEffect(() => {
    const el = canvas.current;
    if (!el || size.w === 0) return;
    const dpr = window.devicePixelRatio || 1;
    const wantW = Math.round(size.w * dpr);
    const wantH = Math.round(size.h * dpr);
    if (el.width !== wantW || el.height !== wantH) {
      el.width = wantW;
      el.height = wantH;
    }
    draw(el, layers, basemap, view, size);
  }, [layers, basemap, view, size]);

  const apply = (next: View) => onView(clampView(next, sizeRef.current, projector.bounds));

  useEffect(() => {
    const node = surface.current;
    if (!node) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = node.getBoundingClientRect();
      const anchor = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      const factor = Math.exp(-event.deltaY * (event.ctrlKey ? 0.01 : 0.0016));
      onUserMove();
      onView(clampView(zoomAt(viewRef.current, sizeRef.current, anchor, factor), sizeRef.current, projector.bounds));
    };
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, [onView, onUserMove, projector]);

  const local = (event: { clientX: number; clientY: number }): XY => {
    const rect = surface.current?.getBoundingClientRect();
    return { x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) };
  };

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    pointers.current.set(event.pointerId, local(event));
    moved.current = false;
    gesture.current = { start: local(event), dragging: false, pinch: null };
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current.pinch = Math.hypot(a.x - b.x, a.y - b.y) || 1;
    }
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const prev = pointers.current.get(event.pointerId);
    if (!prev) return;
    const now = local(event);
    pointers.current.set(event.pointerId, now);
    if (pointers.current.size >= 2 && gesture.current.pinch) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      moved.current = true;
      onUserMove();
      apply(zoomAt(viewRef.current, sizeRef.current, mid, dist / gesture.current.pinch));
      gesture.current.pinch = dist;
      return;
    }
    if (!gesture.current.dragging) {
      if (Math.hypot(now.x - gesture.current.start.x, now.y - gesture.current.start.y) < 6) return;
      gesture.current.dragging = true;
      moved.current = true;
      surface.current?.setPointerCapture(event.pointerId);
    }
    onUserMove();
    apply(panBy(viewRef.current, now.x - prev.x, now.y - prev.y));
  }

  function onPointerEnd(event: ReactPointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) gesture.current.pinch = null;
    if (pointers.current.size === 0) window.setTimeout(() => (moved.current = false), 0);
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    const step = 90;
    const v = viewRef.current;
    const s = sizeRef.current;
    const centre = { x: s.w / 2, y: s.h / 2 };
    const moves: Record<string, () => View> = {
      ArrowLeft: () => panBy(v, step, 0),
      ArrowRight: () => panBy(v, -step, 0),
      ArrowUp: () => panBy(v, 0, step),
      ArrowDown: () => panBy(v, 0, -step),
      '+': () => zoomAt(v, s, centre, 1.3),
      '=': () => zoomAt(v, s, centre, 1.3),
      '-': () => zoomAt(v, s, centre, 1 / 1.3),
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    onUserMove();
    apply(move());
  }

  const got = new Set(progress.unlocked);
  const routeStopIds = route ? route.route.stops : [];
  const nextStopId = route ? (route.route.stops.find((id) => !got.has(id)) ?? null) : null;

  const markers = useMemo(
    () =>
      places
        .filter((place) => (place.mapState === 'stop' || place.mapState === 'pin') && place.lat !== null && place.lng !== null)
        .map((place) => ({ place, world: projector.toWorld(place.lat as number, place.lng as number) })),
    [places, projector],
  );

  const screenMarkers = markers
    .map(({ place, world }) => ({ place, at: worldToScreen(view, size, world) }))
    .filter(({ at }) => at.x > -120 && at.x < size.w + 40 && at.y > -60 && at.y < size.h + 60);

  const layout = layoutMarkers(
    screenMarkers.map(({ place, at }) => {
      const isStop = place.kind === 'stop';
      let priority = isStop ? 10 : 1;
      if (place.id === nextStopId) priority = 60;
      else if (routeStopIds.includes(place.id)) priority = 40;
      else if (isStop && got.has(place.id)) priority = 15;
      if (place.id === selectedId) priority = 100;
      return { id: place.id, at, priority, pillWidth: 66 + shortName(place.name).length * 7, force: place.id === selectedId };
    }),
  );
  const modeOf = new Map(layout.map((entry) => [entry.id, entry.mode]));
  const labelFade = fade(view.scale, 0.45, 0.35);

  const legs = useMemo(() => {
    if (!route) return [];
    return route.route.stops.slice(0, -1).map((id, i) => {
      const lo = Math.min(route.indexes[i], route.indexes[i + 1]);
      const hi = Math.max(route.indexes[i], route.indexes[i + 1]);
      return {
        id: `${id}-${route.route.stops[i + 1]}`,
        from: id,
        to: route.route.stops[i + 1],
        points: route.line
          .slice(lo, hi + 1)
          .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
          .join(' '),
      };
    });
  }, [route]);
  const nextLegId = legs.find((leg) => leg.to === nextStopId)?.id ?? null;

  const zoneStop = nextStopId ? places.find((p) => p.id === nextStopId) : null;
  const zoneWorld = zoneStop && zoneStop.lat !== null && zoneStop.lng !== null ? projector.toWorld(zoneStop.lat, zoneStop.lng) : null;

  const sprite = worldToScreen(view, size, character.pos);
  const gpsAt = gps ? worldToScreen(view, size, gps.pos) : null;
  const group = `translate(${size.w / 2 - view.cx * view.scale} ${size.h / 2 - view.cy * view.scale}) scale(${view.scale})`;

  return (
    <div
      ref={surface}
      className="at-map"
      role="application"
      aria-label="Campus map. Drag to move, pinch or use plus and minus to zoom. Places are buttons."
      aria-describedby="at-map-credit"
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onKeyDown={onKeyDown}
      onDoubleClick={(event) => {
        if ((event.target as HTMLElement).closest('button, a')) return;
        onUserMove();
        apply(zoomAt(viewRef.current, sizeRef.current, local(event), 1.6));
      }}
      data-scale={view.scale.toFixed(3)}
      data-region={region.id}
    >
      <canvas ref={canvas} className="at-canvas" style={{ width: size.w, height: size.h }} aria-hidden />
      <svg className="at-overlay" width={size.w} height={size.h} aria-hidden>
        <g transform={group}>
          {legs.map((leg) => {
            const done = got.has(leg.from) && got.has(leg.to);
            const next = leg.id === nextLegId;
            return (
              <polyline
                key={leg.id}
                points={leg.points}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                data-leg={done ? 'done' : next ? 'next' : 'later'}
                stroke={done ? '#ff7a2f' : next ? '#4cb7ff' : 'rgba(243,241,236,0.5)'}
                strokeWidth={done ? 4.5 : 3.5}
                strokeDasharray={next ? '9 8' : undefined}
              />
            );
          })}
          {zoneWorld && (
            <circle cx={zoneWorld.x} cy={zoneWorld.y} r={ZONE_RADIUS_M} fill="rgba(62,224,138,0.14)" stroke="#3ee08a" strokeWidth={2} vectorEffect="non-scaling-stroke" data-zone="live" />
          )}
          {gps && <circle cx={gps.pos.x} cy={gps.pos.y} r={Math.max(gps.accuracyM, 6)} fill="rgba(76,183,255,0.14)" stroke="#4cb7ff" strokeWidth={1} vectorEffect="non-scaling-stroke" />}
        </g>
      </svg>

      {screenMarkers.map(({ place, at }) => {
        const mode = modeOf.get(place.id) ?? 'dot';
        const isStop = place.kind === 'stop';
        const unlocked = got.has(place.id);
        const selected = place.id === selectedId;
        const next = place.id === nextStopId;
        const onRoute = routeStopIds.includes(place.id);
        const offEra = eraFilter >= 0 && isStop && place.stop !== null && eraIndex(place.stop.sortYear) !== eraFilter;
        const dimmed = (route !== null && isStop && !onRoute && !selected) || offEra;
        const label = shortName(place.name);
        const stepNumber = onRoute ? routeStopIds.indexOf(place.id) + 1 : 0;
        const style: CSSProperties = { transform: `translate3d(${at.x}px, ${at.y}px, 0)`, zIndex: selected ? 26 : next ? 24 : isStop ? 20 : 12 };
        if (!isStop) {
          return (
            <button
              key={place.id}
              type="button"
              className={`at-place${selected ? ' is-selected' : ''}`}
              style={style}
              aria-label={`${place.name}${place.catalog?.privateProperty ? ', private property, view from outside' : ''}`}
              aria-pressed={selected}
              data-place={place.id}
              data-mode="place"
              onClick={() => !moved.current && onSelect(place.id)}
            >
              <span className="at-place__dot" />
              <span className="at-place__label" style={{ opacity: selected ? 1 : labelFade }}>
                {label}
              </span>
            </button>
          );
        }
        return (
          <button
            key={place.id}
            type="button"
            className={`at-pin at-pin--${mode}${unlocked ? ' is-done' : ''}${next ? ' is-next' : ''}${selected ? ' is-selected' : ''}${dimmed ? ' is-dim' : ''}`}
            style={style}
            aria-label={`${place.name}${unlocked ? ', unlocked' : ''}${stepNumber ? `, stop ${stepNumber} of ${routeStopIds.length}` : ''}`}
            aria-pressed={selected}
            data-place={place.id}
            data-mode={mode}
            data-state={next ? 'next' : unlocked ? 'unlocked' : 'locked'}
            onClick={() => !moved.current && onSelect(place.id)}
          >
            <span className="at-pin__well" aria-hidden>
              {stepNumber ? <b>{stepNumber}</b> : place.icon}
            </span>
            {mode === 'pill' && <span className="at-pin__label">{label}</span>}
          </button>
        );
      })}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={character.src}
        alt=""
        width={48}
        height={48}
        className={`at-sprite${character.walking ? ' is-walking' : ''}`}
        style={{ transform: `translate3d(${sprite.x - 34}px, ${sprite.y + 14}px, 0) translate(-50%, -100%) scaleX(${character.facingRight ? 1 : -1})` }}
        data-sprite
      />
      {gpsAt && <span className="at-gps" style={{ transform: `translate3d(${gpsAt.x}px, ${gpsAt.y}px, 0)` }} data-gps aria-hidden />}

      {basemapError && (
        <p className="at-map-note" role="status">
          The map drawing could not load. Places and tours still work.
        </p>
      )}
      {!basemap && !basemapError && (
        <p className="at-map-note" role="status">
          Drawing the campus…
        </p>
      )}

      <p id="at-map-credit" className="at-credit" style={{ bottom: bottomInset + 8 }}>
        <a href={region.attribution.href} target="_blank" rel="noopener noreferrer">
          {region.attribution.text}
        </a>
        {' · '}
        <a href="https://opendatacommons.org/licenses/odbl/1-0/" target="_blank" rel="noopener noreferrer">
          {region.attribution.licence}
        </a>
      </p>
    </div>
  );
}

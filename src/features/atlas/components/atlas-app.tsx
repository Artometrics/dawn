'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type PointerEvent as ReactPointerEvent } from 'react';
import { BookOpen, Footprints, House, Layers, LocateFixed, Maximize2, MapPin, Menu, Minus, Plus, Search, Square, Trophy, X } from 'lucide-react';
import { YOU_LOOKS } from '@/lib/agents';
import { DEFAULT_REGION } from '../regions.ts';
import { createProjector, metresBetween, worldBounds, type XY } from '../lib/geo.ts';
import { buildPlaces, matchesQuery } from '../lib/places.ts';
import { UNLOCK_RADIUS_M, answerQuiz, pacificDay, setAt, unlockStop } from '../lib/progress.ts';
import { ease, legPoints, routeLine, routeProgress, spokenCard, spokenIntro, stopVertexIndexes, tourStep } from '../lib/tour.ts';
import type { Region, Route } from '../lib/types.ts';
import { clampScale, clampView, fitBounds, focusPoint, zoomAt, type Insets, type Size, type View } from '../lib/viewport.ts';
import { MapView } from './map-view.tsx';
import { filterPlaces, PlaceCard, PlacesView, type PlaceFilter } from './place-views.tsx';
import { speak, speechAvailable, hush } from './speech.ts';
import { StoryView, YouView } from './story-you-views.tsx';
import { ToursView } from './tour-views.tsx';
import { useAtlasProgress } from './use-atlas-progress.ts';
import { useBasemap } from './use-basemap.ts';
import { useWalker } from './use-walker.ts';
import './atlas.css';

const HereLayer = dynamic(() => import('@/components/dawn/atlas-map').then((mod) => mod.AtlasMap), { ssr: false });

type Tab = 'places' | 'tours' | 'story' | 'you';
const TABS: { id: Tab; label: string; icon: typeof MapPin }[] = [
  { id: 'places', label: 'Places', icon: MapPin },
  { id: 'tours', label: 'Tours', icon: Footprints },
  { id: 'story', label: 'Story', icon: BookOpen },
  { id: 'you', label: 'You', icon: Trophy },
];
const SNAPS = [0.26, 0.46, 0.78];
const WIDE_AT = 900;
/** The same walker as the town map. A look picked in the village overrides it. */
const HERO_SPRITE = '/sprites/town/player.png';

const noSubscribe = () => () => {};
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function useEmbed() {
  return useSyncExternalStore(noSubscribe, () => new URLSearchParams(window.location.search).get('embed') === '1', () => false);
}

type RouteGeo = { route: Route; line: XY[]; indexes: number[]; anchors: XY[] };

export type AtlasAppProps = {
  region?: Region;
  /** `page` is the /atlas route. `shell` is inside the village drawer, which supplies the menu button. */
  framed?: 'page' | 'shell';
  onMenu?: () => void;
  /** The look picked in the village. Without it the map uses the town walker. */
  avatar?: number;
};

export function AtlasApp({ region = DEFAULT_REGION, framed = 'page', onMenu, avatar }: AtlasAppProps) {
  const embed = useEmbed();
  const canSpeak = useSyncExternalStore(noSubscribe, speechAvailable, () => false);
  const { progress, update, reset } = useAtlasProgress();
  const basemap = useBasemap(region.basemapUrl);
  const walker = useWalker();

  const projector = useMemo(() => createProjector(region.frame), [region]);
  const places = useMemo(() => buildPlaces(region), [region]);
  const placeById = useMemo(() => new Map(places.map((p) => [p.id, p])), [places]);
  const geos = useMemo(() => {
    const stops = new Map(region.stops.map((s) => [s.id, s]));
    const out = new Map<string, RouteGeo>();
    for (const route of region.routes) {
      const line = routeLine(route, projector);
      const indexes = stopVertexIndexes(route, line, stops, projector);
      const anchors = route.stops.map((id) => {
        const stop = stops.get(id);
        return projector.toWorld(stop?.lat ?? 0, stop?.lng ?? 0);
      });
      out.set(route.id, { route, line, indexes, anchors });
    }
    return out;
  }, [region, projector]);

  const rootRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState(false);
  const [size, setSize] = useState<Size>({ w: 0, h: 0 });
  const [view, setView] = useState<View | null>(null);
  const [follow, setFollow] = useState(false);
  const [tab, setTab] = useState<Tab>('tours');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeRouteId, setActiveRouteId] = useState(region.openingRouteId);
  const [tourOpen, setTourOpen] = useState(true);
  const [filter, setFilter] = useState<PlaceFilter>('all');
  const [query, setQuery] = useState('');
  const [eraFilter, setEraFilter] = useState(-1);
  const [openThread, setOpenThread] = useState<string | null>(null);
  const [snap, setSnap] = useState(1);
  const [drag, setDrag] = useState<number | null>(null);
  const [layer, setLayer] = useState<'atlas' | 'here'>('atlas');
  const [toast, setToast] = useState<string | null>(null);
  const [listening, setListening] = useState<string | null>(null);
  const [resetArmed, setResetArmed] = useState(false);
  const [gpsOn, setGpsOn] = useState(false);
  const [gps, setGps] = useState<{ pos: XY; accuracyM: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState('');

  const flyRaf = useRef(0);
  const walkId = useRef(0);
  const toastTimer = useRef(0);
  const stopSpeech = useRef<(() => void) | null>(null);
  const drawerDrag = useRef<{ y: number; h: number; moved: boolean } | null>(null);

  useLayoutEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    const measure = () => setWide(node.getBoundingClientRect().width >= WIDE_AT);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(
    () => () => {
      window.clearTimeout(toastTimer.current);
      window.cancelAnimationFrame(flyRaf.current);
      stopSpeech.current?.();
      hush();
    },
    [],
  );

  const sheetPx = wide ? 0 : (drag ?? SNAPS[snap] * size.h);
  const insetsFor = useCallback(
    (snapIndex: number): Insets =>
      wide ? { top: 24, right: 76, bottom: 130, left: 24 } : { top: 72, right: 64, bottom: SNAPS[snapIndex] * size.h + 100, left: 16 },
    [wide, size.h],
  );
  const insets = insetsFor(snap);

  const activeGeo = geos.get(activeRouteId) ?? (geos.get(region.openingRouteId) as RouteGeo);
  const openingGeo = geos.get(region.openingRouteId) as RouteGeo;

  const fittedView = useMemo<View>(() => {
    if (size.w === 0) return { cx: 0, cy: 0, scale: 0.5 };
    return fitBounds(worldBounds(openingGeo.line), size, insets, 1.2);
  }, [size, insets, openingGeo]);

  const baseView = view ?? fittedView;
  const standingId = progress.at && placeById.get(progress.at)?.stop ? progress.at : openingGeo.route.stops[0];
  const standingWorld = useMemo(() => {
    const stop = placeById.get(standingId)?.stop;
    return projector.toWorld(stop?.lat ?? 0, stop?.lng ?? 0);
  }, [placeById, standingId, projector]);
  const characterPos = walker.pos ?? standingWorld;
  const renderView = follow && walker.pos ? focusPoint(walker.pos, baseView.scale, insets) : baseView;

  const viewRef = useRef(renderView);
  const sizeRef = useRef(size);
  useEffect(() => {
    viewRef.current = renderView;
    sizeRef.current = size;
  });

  const flash = useCallback((message: string) => {
    window.clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = window.setTimeout(() => setToast(null), 3600);
  }, []);

  const fly = useCallback((to: View, ms = 650) => {
    window.cancelAnimationFrame(flyRaf.current);
    const from = viewRef.current;
    if (ms <= 0 || reducedMotion()) {
      setView(to);
      return;
    }
    const started = performance.now();
    const step = (now: number) => {
      const t = ease((now - started) / ms);
      setView({
        cx: from.cx + (to.cx - from.cx) * t,
        cy: from.cy + (to.cy - from.cy) * t,
        scale: from.scale * Math.pow(to.scale / from.scale, t),
      });
      if (t < 1) flyRaf.current = window.requestAnimationFrame(step);
    };
    flyRaf.current = window.requestAnimationFrame(step);
  }, []);

  const onUserMove = useCallback(() => {
    window.cancelAnimationFrame(flyRaf.current);
    setFollow(false);
  }, []);

  const onMapView = useCallback((next: View) => setView(next), []);

  const stopListening = useCallback(() => {
    stopSpeech.current?.();
    stopSpeech.current = null;
    setListening(null);
  }, []);

  const listen = (key: string, text: string) => {
    if (listening === key) {
      stopListening();
      return;
    }
    stopSpeech.current?.();
    setListening(key);
    stopSpeech.current = speak([text], () => {
      stopSpeech.current = null;
      setListening(null);
    });
  };

  const stamp = (id: string) => {
    const out = { headline: '', changed: false };
    update((current) => {
      const result = unlockStop(current, region, id, pacificDay(new Date()));
      out.headline = result.headline;
      out.changed = result.changed;
      return setAt(result.progress, id);
    });
    if (out.changed) flash(out.headline);
  };

  const worldOf = (id: string): XY | null => {
    const place = placeById.get(id);
    return place && place.lat !== null && place.lng !== null ? projector.toWorld(place.lat, place.lng) : null;
  };

  const openPlace = (id: string, fromMap = false) => {
    const place = placeById.get(id);
    if (!place) return;
    stopListening();
    setSelectedId(id);
    setLayer('atlas');
    if (!wide) setSnap((s) => Math.max(s, 1));
    const at = worldOf(id);
    if (at && (place.mapState === 'stop' || place.mapState === 'pin')) {
      const target = insetsFor(Math.max(snap, wide ? 0 : 1));
      fly(focusPoint(at, clampScale(Math.max(viewRef.current.scale, fromMap ? viewRef.current.scale : 0.9)), target), 600);
    }
  };

  const closePlace = () => {
    stopListening();
    setSelectedId(null);
  };

  const cancelWalk = useCallback(() => {
    walkId.current += 1;
    walker.stop();
    setFollow(false);
  }, [walker]);

  const walkTo = async (stopId: string) => {
    if (walker.walking) {
      cancelWalk();
      return;
    }
    const stop = placeById.get(stopId)?.stop;
    const target = worldOf(stopId);
    if (!stop || !target) return;
    const geo = activeGeo;
    const ri = geo.route.stops.indexOf(stopId);
    const fi = geo.route.stops.indexOf(standingId);
    let points: XY[] = [];
    if (ri >= 0 && fi >= 0 && fi !== ri) points = legPoints(geo.line, geo.indexes, fi, ri, geo.anchors);
    else if (ri > 0 && fi < 0) points = legPoints(geo.line, geo.indexes, ri - 1, ri, geo.anchors);
    else if (ri < 0 && standingId !== stopId) points = [standingWorld, target];

    const me = ++walkId.current;
    stopListening();
    setSelectedId(null);
    setLayer('atlas');
    if (ri >= 0) {
      setTab('tours');
      setTourOpen(true);
    }
    if (!wide) setSnap(0);
    if (points.length >= 2) {
      setFollow(true);
      await walker.walk(points);
      if (me !== walkId.current) return;
    }
    setFollow(false);
    setView(focusPoint(target, clampScale(Math.max(viewRef.current.scale, 0.9)), insetsFor(wide ? 0 : 1)));
    stamp(stopId);
    walker.stop();
    openPlace(stopId, true);
  };

  const status = routeProgress(activeGeo.route, progress);
  const nextStop = status.nextStopId ? placeById.get(status.nextStopId) : null;

  const fitRoute = (geo: RouteGeo, snapIndex = snap) => fly(fitBounds(worldBounds(geo.line), size, insetsFor(snapIndex), 1.4), 700);

  const zoomBy = (factor: number) => {
    onUserMove();
    const s = sizeRef.current;
    const next = zoomAt(viewRef.current, s, { x: s.w / 2, y: (s.h - (wide ? 0 : sheetPx)) / 2 }, factor);
    setView(clampView(next, s, projector.bounds));
  };

  const recenter = () => {
    setLayer('atlas');
    fly(focusPoint(characterPos, clampScale(Math.max(viewRef.current.scale, 0.9)), insets), 600);
  };

  const pickTab = (next: Tab) => {
    setTab(next);
    setSelectedId(null);
    setLayer('atlas');
    if (!wide) setSnap((s) => Math.max(s, 1));
  };

  const onQuery = (value: string) => {
    setQuery(value);
    if (value) {
      setTab('places');
      setSelectedId(null);
      if (!wide) setSnap(2);
    }
  };

  const matches = useMemo(() => places.filter((p) => matchesQuery(p, query)), [places, query]);
  const listed = filterPlaces(matches, filter, new Set(progress.unlocked));

  const toggleGps = () => {
    if (gpsOn) {
      setGpsOn(false);
      setGps(null);
      setGpsStatus('Location is off.');
      return;
    }
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setGpsStatus('This browser has no location. Tap stops to visit them instead.');
      return;
    }
    setGpsStatus('Asking for your location…');
    setGpsOn(true);
  };

  useEffect(() => {
    if (!gpsOn) return;
    const id = navigator.geolocation.watchPosition(
      (position) => {
        const here = { lat: position.coords.latitude, lng: position.coords.longitude };
        const accuracyM = position.coords.accuracy;
        if (!projector.inside(here.lat, here.lng)) {
          setGps(null);
          setGpsStatus('You are outside the campus map, so nothing unlocks. The map still works.');
          return;
        }
        setGps({ pos: projector.toWorld(here.lat, here.lng), accuracyM });
        setGpsStatus(`Location on, accurate to about ${Math.round(accuracyM)} m. Stand within ${UNLOCK_RADIUS_M} m of a stop to unlock it.`);
        if (accuracyM > 120) return;
        const out = { headline: '' };
        update((current) => {
          let next = current;
          for (const stop of region.stops) {
            if (next.unlocked.includes(stop.id)) continue;
            if (metresBetween(here, { lat: stop.lat, lng: stop.lng }) > UNLOCK_RADIUS_M) continue;
            const result = unlockStop(next, region, stop.id, pacificDay(new Date()));
            next = setAt(result.progress, stop.id);
            out.headline = `You are at ${stop.name}. ${result.headline}`;
          }
          return next;
        });
        if (out.headline) setToast(out.headline);
      },
      () => {
        setGpsOn(false);
        setGps(null);
        setGpsStatus('Location was not allowed. Nothing leaves your device either way.');
      },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [gpsOn, projector, region, update]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [tab, selectedId, tourOpen, activeRouteId]);

  const onGrabDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drawerDrag.current = { y: event.clientY, h: SNAPS[snap] * size.h, moved: false };
  };
  const onGrabMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const d = drawerDrag.current;
    if (!d) return;
    const dy = d.y - event.clientY;
    if (Math.abs(dy) > 4) d.moved = true;
    if (d.moved) setDrag(Math.min(size.h * 0.9, Math.max(size.h * 0.16, d.h + dy)));
  };
  const onGrabUp = () => {
    const d = drawerDrag.current;
    drawerDrag.current = null;
    if (!d) return;
    if (!d.moved) {
      setSnap((s) => (s + 1) % SNAPS.length);
      return;
    }
    const now = drag ?? d.h;
    let best = 0;
    SNAPS.forEach((fraction, i) => {
      if (Math.abs(fraction * size.h - now) < Math.abs(SNAPS[best] * size.h - now)) best = i;
    });
    setSnap(best);
    setDrag(null);
  };

  const tourFor = (id: string) => {
    const index = activeGeo.route.stops.indexOf(id);
    if (index < 0) return null;
    const step = tourStep(activeGeo.route, index);
    return { route: activeGeo.route, index, bridge: step.bridge, outro: step.outro, sideQuest: activeGeo.route.side?.stopId === id ? activeGeo.route.side.text : null };
  };

  const selected = selectedId ? placeById.get(selectedId) : null;

  const body = selected ? (
    <PlaceCard
      place={selected}
      region={region}
      progress={progress}
      tour={tourFor(selected.id)}
      walking={walker.walking}
      canSpeak={canSpeak}
      listening={listening === `stop:${selected.id}`}
      onBack={closePlace}
      onWalk={() => void walkTo(selected.id)}
      onStamp={() => stamp(selected.id)}
      onQuiz={(answer) => {
        const result = answerQuiz(progress, region, selected.id, answer, pacificDay(new Date()));
        update(() => result.progress);
        flash(result.message);
      }}
      onListen={() => {
        const stop = selected.stop;
        if (!stop) return;
        const tour = tourFor(stop.id);
        listen(`stop:${stop.id}`, spokenCard(stop, tour ? spokenIntro(tour.route, tour.index) : ''));
      }}
      onShow={() => openPlace(selected.id)}
      onThread={(id) => {
        setOpenThread(id);
        pickTab('story');
      }}
    />
  ) : tab === 'places' ? (
    <PlacesView places={listed} progress={progress} filter={filter} onFilter={setFilter} onSelect={(id) => openPlace(id)} query={query} />
  ) : tab === 'tours' ? (
    <ToursView
      region={region}
      progress={progress}
      activeRouteId={activeGeo.route.id}
      open={tourOpen}
      walking={walker.walking}
      canSpeak={canSpeak}
      listening={listening === `route:${activeGeo.route.id}`}
      onOpen={(id) => {
        cancelWalk();
        setActiveRouteId(id);
        setTourOpen(true);
        const geo = geos.get(id);
        if (geo) fitRoute(geo, Math.max(snap, wide ? 0 : 1));
      }}
      onClose={() => setTourOpen(false)}
      onWalkNext={() => status.nextStopId && void walkTo(status.nextStopId)}
      onStopWalking={cancelWalk}
      onSelectStop={(id) => openPlace(id)}
      onFit={() => fitRoute(activeGeo)}
      onListen={() => listen(`route:${activeGeo.route.id}`, `${activeGeo.route.name}. ${activeGeo.route.description}${activeGeo.route.prologue ? ` ${activeGeo.route.prologue.text}` : ''}`)}
    />
  ) : tab === 'story' ? (
    <StoryView region={region} progress={progress} eraFilter={eraFilter} openThread={openThread} onEra={setEraFilter} onThread={setOpenThread} onSelectStop={(id) => openPlace(id)} />
  ) : (
    <YouView
      region={region}
      progress={progress}
      today={pacificDay(new Date())}
      gps={{ on: gpsOn, status: gpsStatus || `Off. Location stays on this device. Standing within ${UNLOCK_RADIUS_M} m of a stop unlocks it.` }}
      onGps={toggleGps}
      resetArmed={resetArmed}
      onReset={() => {
        if (!resetArmed) {
          setResetArmed(true);
          window.setTimeout(() => setResetArmed(false), 4000);
          return;
        }
        setResetArmed(false);
        cancelWalk();
        reset();
        flash('Progress erased on this device.');
      }}
      onSelectStop={(id) => openPlace(id)}
    />
  );

  const searchBox = (
    <form
      className="at-search"
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        const first = matches[0];
        if (first && query) openPlace(first.id);
      }}
    >
      <Search size={18} aria-hidden />
      <input
        type="search"
        value={query}
        onChange={(event) => onQuery(event.target.value)}
        onFocus={() => !wide && query && setSnap(2)}
        placeholder="Search places"
        aria-label="Search places"
        enterKeyHint="search"
        autoComplete="off"
        spellCheck={false}
      />
      {query && (
        <button type="button" aria-label="Clear search" onClick={() => setQuery('')}>
          <X size={18} aria-hidden />
        </button>
      )}
    </form>
  );

  const home =
    framed === 'shell' && onMenu ? (
      <button type="button" className="at-round dw-dock-hide" aria-label="Menu" onClick={onMenu}>
        <Menu size={20} aria-hidden />
      </button>
    ) : framed === 'page' && !embed ? (
      <Link href="/" className="at-round" aria-label="Dawn home">
        <House size={20} aria-hidden />
      </Link>
    ) : null;

  const tabs = (
    <div className="at-tabs" role="tablist" aria-label="Atlas sections">
      {TABS.map(({ id, label, icon: Icon }) => (
        <button key={id} type="button" role="tab" id={`at-tab-${id}`} aria-selected={tab === id} aria-controls="at-body" className="at-tab" onClick={() => pickTab(id)}>
          <Icon size={16} aria-hidden />
          {label}
        </button>
      ))}
    </div>
  );

  const bodyEl = (
    <div id="at-body" ref={bodyRef} className="at-body" role="tabpanel" aria-labelledby={`at-tab-${tab}`}>
      {body}
    </div>
  );

  const showCta = layer === 'atlas' && (walker.walking || nextStop) && !(!wide && snap === 2 && drag === null);
  const ctaLabel = walker.walking
    ? 'Stop walking'
    : nextStop
      ? `${status.done === 0 ? 'Start at' : 'Walk to'} ${nextStop.name.replace(/\s*\(.*\)$/, '')}`
      : '';

  const stage = (
    <div className="at-stage">
      <MapView
        region={region}
        projector={projector}
        places={places}
        basemap={basemap.status === 'ready' ? basemap.map : null}
        basemapError={basemap.status === 'error' ? basemap.message : null}
        view={renderView}
        size={size}
        onView={onMapView}
        onSize={setSize}
        onUserMove={onUserMove}
        selectedId={selectedId}
        onSelect={(id) => openPlace(id, true)}
        progress={progress}
        route={{ route: activeGeo.route, line: activeGeo.line, indexes: activeGeo.indexes }}
        eraFilter={eraFilter}
        character={{ pos: characterPos, facingRight: walker.facingRight, walking: walker.walking, src: avatar === undefined ? HERO_SPRITE : (YOU_LOOKS[avatar] ?? HERO_SPRITE) }}
        gps={gps}
        bottomInset={wide ? 0 : sheetPx}
      />
      {layer === 'here' && (
        <div className="at-here">
          <HereLayer avatar={avatar ?? 0} />
        </div>
      )}
      {!wide && (
        <div className="at-top">
          {home}
          {searchBox}
        </div>
      )}
      <div className="at-controls">
        <button
          type="button"
          className="at-fab"
          aria-pressed={layer === 'here'}
          aria-label={layer === 'here' ? 'Back to the Atlas map' : 'Show where I am on street tiles'}
          onClick={() => setLayer((l) => (l === 'here' ? 'atlas' : 'here'))}
        >
          <Layers size={20} aria-hidden />
        </button>
        {layer === 'atlas' && (
          <>
            <div className="at-zoom" role="group" aria-label="Zoom">
              <button type="button" aria-label="Zoom in" onClick={() => zoomBy(1.4)}>
                <Plus size={20} aria-hidden />
              </button>
              <button type="button" aria-label="Zoom out" onClick={() => zoomBy(1 / 1.4)}>
                <Minus size={20} aria-hidden />
              </button>
            </div>
            <button type="button" className="at-fab" aria-label="Find my character" onClick={recenter}>
              <LocateFixed size={20} aria-hidden />
            </button>
            <button type="button" className="at-fab" aria-label="Fit the tour on screen" onClick={() => fitRoute(activeGeo)}>
              <Maximize2 size={20} aria-hidden />
            </button>
          </>
        )}
      </div>
      {showCta && (
        <button
          type="button"
          className="at-btn at-cta"
          data-action="cta"
          style={{ bottom: (wide ? 0 : sheetPx) + 36 }}
          onClick={() => (walker.walking ? cancelWalk() : nextStop && void walkTo(nextStop.id))}
        >
          {walker.walking ? <Square size={16} aria-hidden /> : <Footprints size={18} aria-hidden />}
          <span>{ctaLabel}</span>
        </button>
      )}
      {!wide && (
        <section className="at-sheet" aria-label="Places and tours" data-dragging={drag !== null} data-snap={snap} style={{ ['--at-sheet-h' as string]: `${sheetPx}px` }}>
          <button
            type="button"
            className="at-grab"
            aria-label="Resize the panel"
            onPointerDown={onGrabDown}
            onPointerMove={onGrabMove}
            onPointerUp={onGrabUp}
            onPointerCancel={onGrabUp}
            onKeyDown={(event) => {
              if (event.key === 'ArrowUp') setSnap((s) => Math.min(SNAPS.length - 1, s + 1));
              if (event.key === 'ArrowDown') setSnap((s) => Math.max(0, s - 1));
            }}
          >
            <span />
          </button>
          {tabs}
          {bodyEl}
        </section>
      )}
      {toast && (
        <p className="at-toast" role="status">
          {toast}
        </p>
      )}
    </div>
  );

  return (
    <div ref={rootRef} className="at-root" data-framed={framed} data-layout={wide ? 'wide' : 'narrow'} data-region={region.id} data-ready={size.w > 0} data-covered={!wide && snap === 2 && drag === null}>
      {wide && (
        <aside className="at-panel" aria-label="Atlas">
          <div className="at-head">
            {home}
            <div className="at-head__text">
              <p className="at-title">Atlas</p>
              <p className="at-sub">
                {region.name} · {region.stops.length} stops · {region.routes.length} tours
              </p>
            </div>
          </div>
          {searchBox}
          {tabs}
          {bodyEl}
        </aside>
      )}
      {stage}
    </div>
  );
}

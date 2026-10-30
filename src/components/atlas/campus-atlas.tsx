'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Map as LeafletMap, Marker } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Footprints, GraduationCap, House, Microscope } from 'lucide-react';
import rawPlaces from '../../../data/atlas/stanford-places.json';
import { YOU_LOOKS } from '@/lib/agents';
import {
  CARDINAL_NOTE,
  DAY_START_NAME,
  findPlace,
  questPlaces,
  type Place,
} from '@/lib/atlas/quest';
import { pointAlong, walkDurationMs, type LatLng } from '@/lib/atlas/walk';

const places = rawPlaces as Place[];
const quest = questPlaces(places);
const startPlace = findPlace(places, DAY_START_NAME);
if (!startPlace) throw new Error(`Missing day start: ${DAY_START_NAME}`);

const START: LatLng = { lat: startPlace.lat, lng: startPlace.lng };
const QUEST_NAMES = new Set(quest.map((stop) => stop.placeName));
const SAVE_KEY = 'dawn.atlas.cardinal.v1';

type Role = 'student' | 'researcher';
type Chrome = 'pending' | 'embed' | 'app';

const FRAMES: Record<Role, readonly [string, string]> = {
  student: [YOU_LOOKS[0], YOU_LOOKS[1]],
  researcher: [YOU_LOOKS[2], YOU_LOOKS[0]],
};

type LeafletNs = typeof import('leaflet');

function playerIcon(L: LeafletNs, src: string) {
  return L.divIcon({
    className: '',
    html: `<img src="${src}" alt="" width="32" height="32" style="image-rendering:pixelated;width:32px;height:32px;display:block" />`,
    iconSize: [32, 32],
    iconAnchor: [16, 30],
  });
}

function stopIcon(L: LeafletNs, index: number, state: 'locked' | 'next' | 'done') {
  const background = state === 'locked' ? '#5a4636' : '#e2a04a';
  const color = state === 'locked' ? '#d9cbb8' : '#1c1410';
  const ring = state === 'next' ? '0 0 0 3px #f3e6d0' : 'none';
  return L.divIcon({
    className: '',
    html: `<div style="width:28px;height:28px;border-radius:999px;background:${background};color:${color};display:grid;place-items:center;font:700 13px/1 sans-serif;box-shadow:${ring}, 0 8px 18px rgba(28,20,16,.35)">${index + 1}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

export function CampusAtlas() {
  const host = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const playerRef = useRef<Marker | null>(null);
  const stopRefs = useRef<Marker[]>([]);
  const leafletRef = useRef<LeafletNs | null>(null);
  const posRef = useRef<LatLng>(START);
  const roleRef = useRef<Role>('student');
  const unlockedRef = useRef(0);
  const walkingRef = useRef(false);
  const cancelRef = useRef(false);
  const rafRef = useRef(0);

  const [chrome, setChrome] = useState<Chrome>('pending');
  const [role, setRole] = useState<Role>('student');
  const [unlocked, setUnlocked] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const [walking, setWalking] = useState(false);

  useEffect(() => {
    roleRef.current = role;
  }, [role]);

  useEffect(() => {
    unlockedRef.current = unlocked;
  }, [unlocked]);

  useEffect(() => {
    const embed = new URLSearchParams(window.location.search).get('embed') === '1';
    setChrome(embed ? 'embed' : 'app');
    try {
      const saved = JSON.parse(sessionStorage.getItem(SAVE_KEY) || 'null') as { role?: string; unlocked?: number } | null;
      if (!saved) return;
      if (saved.role === 'student' || saved.role === 'researcher') setRole(saved.role);
      if (typeof saved.unlocked === 'number' && Number.isFinite(saved.unlocked)) {
        const count = Math.max(0, Math.min(quest.length, Math.floor(saved.unlocked)));
        unlockedRef.current = count;
        if (count > 0) {
          const stop = quest[count - 1];
          posRef.current = { lat: stop.lat, lng: stop.lng };
        }
        setUnlocked(count);
      }
    } catch {
      // Private browsing can block sessionStorage. The day still runs.
    }
  }, []);

  useEffect(() => {
    if (chrome === 'pending') return;
    try {
      sessionStorage.setItem(SAVE_KEY, JSON.stringify({ role, unlocked }));
    } catch {
      // Ignore quota or private mode.
    }
  }, [chrome, role, unlocked]);

  useEffect(() => {
    const parent = host.current;
    if (!parent) return;
    let dead = false;
    cancelRef.current = false;

    void import('leaflet').then((leaflet) => {
      if (dead || mapRef.current) return;
      const L = leaflet.default;
      leafletRef.current = leaflet;
      const map = L.map(parent, { zoomControl: true, attributionControl: true }).setView([START.lat, START.lng], 14);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      for (const place of places) {
        if (QUEST_NAMES.has(place.name)) continue;
        L.circleMarker([place.lat, place.lng], {
          radius: 5,
          color: '#1c1410',
          weight: 1,
          fillColor: '#c4a484',
          fillOpacity: 0.92,
        })
          .addTo(map)
          .bindTooltip(place.name, { direction: 'top', opacity: 1 });
      }

      const doneCount = unlockedRef.current;
      const here = posRef.current;
      stopRefs.current = quest.map((stop, index) => {
        const state = index < doneCount ? 'done' : index === doneCount ? 'next' : 'locked';
        const marker = L.marker([stop.lat, stop.lng], {
          icon: stopIcon(leaflet, index, state),
          keyboard: true,
          title: stop.label,
        }).addTo(map);
        marker.on('click', () => onStop(index));
        return marker;
      });

      playerRef.current = L.marker([here.lat, here.lng], {
        icon: playerIcon(leaflet, FRAMES[roleRef.current][0]),
        zIndexOffset: 1000,
        title: 'You',
      }).addTo(map);

      const bounds = L.latLngBounds([
        [START.lat, START.lng],
        ...quest.map((stop) => [stop.lat, stop.lng] as [number, number]),
      ]);
      map.fitBounds(bounds, { padding: [28, 28], maxZoom: 15 });
      mapRef.current = map;
      window.setTimeout(() => map.invalidateSize(), 150);
    });

    return () => {
      dead = true;
      cancelRef.current = true;
      window.cancelAnimationFrame(rafRef.current);
      mapRef.current?.remove();
      mapRef.current = null;
      playerRef.current = null;
      stopRefs.current = [];
    };
    // Markers bind once. Later progress updates go through the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const L = leafletRef.current;
    if (!L) return;
    stopRefs.current.forEach((marker, index) => {
      const state = index < unlocked ? 'done' : index === unlocked ? 'next' : 'locked';
      marker.setIcon(stopIcon(L, index, state));
    });
    if (!walking) {
      playerRef.current?.setIcon(playerIcon(L, FRAMES[role][0]));
    }
  }, [unlocked, role, walking]);

  function paint(next: LatLng, frame: 0 | 1) {
    const L = leafletRef.current;
    const marker = playerRef.current;
    if (!L || !marker) return;
    marker.setLatLng([next.lat, next.lng]);
    marker.setIcon(playerIcon(L, FRAMES[roleRef.current][frame]));
    posRef.current = next;
  }

  function animate(from: LatLng, to: LatLng): Promise<void> {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      paint(to, 0);
      mapRef.current?.panTo([to.lat, to.lng], { animate: false });
      return Promise.resolve();
    }
    const duration = walkDurationMs(from, to);
    const started = performance.now();
    return new Promise((resolve) => {
      const tick = (now: number) => {
        if (cancelRef.current) {
          resolve();
          return;
        }
        const t = Math.min(1, (now - started) / duration);
        const next = pointAlong(from, to, t);
        paint(next, (Math.floor(now / 180) % 2) as 0 | 1);
        mapRef.current?.panTo([next.lat, next.lng], { animate: false });
        if (t < 1) rafRef.current = window.requestAnimationFrame(tick);
        else resolve();
      };
      rafRef.current = window.requestAnimationFrame(tick);
    });
  }

  async function walkTo(index: number) {
    if (walkingRef.current || index !== unlockedRef.current || index >= quest.length) return;
    const stop = quest[index];
    walkingRef.current = true;
    setWalking(true);
    setActive(null);
    await animate(posRef.current, { lat: stop.lat, lng: stop.lng });
    if (cancelRef.current) return;
    paint({ lat: stop.lat, lng: stop.lng }, 0);
    mapRef.current?.panTo([stop.lat, stop.lng], { animate: false });
    unlockedRef.current = index + 1;
    setUnlocked(index + 1);
    setActive(index);
    walkingRef.current = false;
    setWalking(false);
  }

  function onStop(index: number) {
    if (index < unlockedRef.current) {
      const stop = quest[index];
      setActive(index);
      mapRef.current?.panTo([stop.lat, stop.lng], { animate: true });
      return;
    }
    void walkTo(index);
  }

  const next = unlocked < quest.length ? quest[unlocked] : null;
  const shown = active !== null && active < unlocked ? quest[active] : null;
  const done = unlocked >= quest.length;

  return (
    <div className="flex h-dvh min-h-0 flex-col bg-[#1c1410] text-[#f3e6d0]">
      <header className="flex shrink-0 items-center gap-2 border-b border-[#5a4636] px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        {chrome === 'app' && (
          <a href="/" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-[#e2a04a]" aria-label="Dawn home">
            <House className="h-5 w-5" aria-hidden />
          </a>
        )}
        <h1 className="font-pixel text-[10px] tracking-wide">Atlas</h1>
        <div className="ml-auto flex gap-1" role="group" aria-label="Who you are today">
          <RoleButton
            pressed={role === 'student'}
            label="Student"
            onClick={() => setRole('student')}
          >
            <GraduationCap className="h-5 w-5" aria-hidden />
          </RoleButton>
          <RoleButton
            pressed={role === 'researcher'}
            label="Researcher"
            onClick={() => setRole('researcher')}
          >
            <Microscope className="h-5 w-5" aria-hidden />
          </RoleButton>
        </div>
      </header>

      <div ref={host} className="min-h-[45vh] w-full flex-1" />

      <section className="shrink-0 border-t border-[#5a4636] bg-gradient-to-b from-[#241910] to-[#1c1410] px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-10px_28px_rgba(28,20,16,0.45)]">
        <div className="flex gap-2" role="list" aria-label="Cardinal Quest">
          {quest.map((stop, index) => {
            const state = index < unlocked ? 'done' : index === unlocked ? 'next' : 'locked';
            return (
              <button
                key={stop.placeName}
                type="button"
                role="listitem"
                aria-label={stop.label}
                aria-current={active === index ? 'true' : undefined}
                disabled={state === 'locked' || walking}
                onClick={() => onStop(index)}
                className={`flex min-h-11 flex-1 flex-col items-center justify-center rounded-2xl border text-sm transition duration-300 ease-out disabled:opacity-40 ${
                  state === 'locked'
                    ? 'border-[#5a4636] text-[#d9cbb8]'
                    : 'border-[#e2a04a] bg-[#3a2414] text-[#f3e6d0] shadow-[0_8px_18px_rgba(28,20,16,0.35)]'
                }`}
              >
                <span className="font-semibold">{index + 1}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold">
              {walking ? 'Walking' : done ? 'Day complete' : next?.label}
            </p>
            <p className="text-sm text-[#d9cbb8]">{unlocked}/{quest.length}</p>
          </div>
          <button
            type="button"
            onClick={() => { if (next) void walkTo(unlocked); }}
            disabled={!next || walking}
            aria-label={next ? `Walk to ${next.label}` : 'Day complete'}
            className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full bg-[#e2a04a] px-4 text-[#1c1410] shadow-[0_8px_18px_rgba(28,20,16,0.35)] transition duration-300 ease-out disabled:opacity-40"
          >
            <Footprints className="h-5 w-5" aria-hidden />
            <span className="text-sm font-semibold">{done ? 'Done' : 'Walk'}</span>
          </button>
        </div>

        {shown && (
          <article className="mt-3 rounded-2xl border border-[#5a4636] bg-[#1c1410] p-3 shadow-[0_10px_24px_rgba(28,20,16,0.35)]">
            <h2 className="text-base font-semibold">{shown.label}</h2>
            <p className="mt-1 text-sm text-[#d9cbb8]">{CARDINAL_NOTE}</p>
          </article>
        )}
      </section>
    </div>
  );
}

function RoleButton({
  pressed,
  label,
  onClick,
  children,
}: {
  pressed: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={label}
      onClick={onClick}
      className={`inline-flex min-h-11 min-w-11 flex-col items-center justify-center rounded-2xl px-2 text-[11px] transition duration-300 ease-out ${
        pressed ? 'bg-[#e2a04a] text-[#1c1410]' : 'text-[#d9cbb8]'
      }`}
    >
      {children}
    </button>
  );
}

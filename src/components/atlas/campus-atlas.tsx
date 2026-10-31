'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import rawPlaces from '../../../data/atlas/stanford-places.json';
import { YOU_LOOKS } from '@/lib/agents';
import { VectorCampus } from '@/components/atlas/vector-campus';
import {
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
const dayStart: Place = startPlace;

const START: LatLng = { lat: dayStart.lat, lng: dayStart.lng };
const SAVE_KEY = 'dawn.atlas.cardinal.v1';

type Role = 'student' | 'researcher';

const FRAMES: Record<Role, readonly [string, string]> = {
  student: [YOU_LOOKS[0], YOU_LOOKS[1]],
  researcher: [YOU_LOOKS[2], YOU_LOOKS[0]],
};

const SAVE_EVENT = 'dawn-atlas-save';

function readSave(): string {
  try {
    return sessionStorage.getItem(SAVE_KEY) || '';
  } catch {
    // Private browsing can block sessionStorage. The day still runs.
    return '';
  }
}

function parseSave(raw: string): { role: Role; unlocked: number } {
  try {
    const saved = JSON.parse(raw || 'null') as { role?: string; unlocked?: number } | null;
    const role: Role = saved?.role === 'researcher' ? 'researcher' : 'student';
    const unlocked = typeof saved?.unlocked === 'number' && Number.isFinite(saved.unlocked)
      ? Math.max(0, Math.min(quest.length, Math.floor(saved.unlocked)))
      : 0;
    return { role, unlocked };
  } catch {
    return { role: 'student', unlocked: 0 };
  }
}

function writeSave(next: { role: Role; unlocked: number }) {
  try {
    sessionStorage.setItem(SAVE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(SAVE_EVENT));
  } catch {
    // Ignore quota or private mode.
  }
}

function useAtlasSave() {
  const raw = useSyncExternalStore(
    (notify) => {
      window.addEventListener(SAVE_EVENT, notify);
      return () => window.removeEventListener(SAVE_EVENT, notify);
    },
    readSave,
    () => '',
  );
  return parseSave(raw);
}

function useEmbed() {
  return useSyncExternalStore(
    () => () => {},
    () => new URLSearchParams(window.location.search).get('embed') === '1',
    () => false,
  );
}

export function CampusAtlas({
  framed = 'page',
  onMenu,
  avatar,
}: {
  framed?: 'page' | 'shell';
  onMenu?: () => void;
  avatar?: number;
}) {
  const posRef = useRef<LatLng>(START);
  const walkingRef = useRef(false);
  const cancelRef = useRef(false);
  const rafRef = useRef(0);

  const embed = useEmbed();
  const saved = useAtlasSave();
  const { role, unlocked } = saved;

  const parked: LatLng = unlocked > 0
    ? { lat: quest[unlocked - 1].lat, lng: quest[unlocked - 1].lng }
    : START;
  const [live, setLive] = useState<LatLng | null>(null);
  const [active, setActive] = useState<number | null>(null);
  const [walking, setWalking] = useState(false);
  const [frame, setFrame] = useState<0 | 1>(0);
  const pos = live ?? parked;

  useEffect(() => {
    return () => {
      cancelRef.current = true;
      window.cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function paint(next: LatLng, step: 0 | 1) {
    posRef.current = next;
    setLive(next);
    setFrame(step);
  }

  function animate(from: LatLng, to: LatLng): Promise<void> {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      paint(to, 0);
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
        if (t < 1) rafRef.current = window.requestAnimationFrame(tick);
        else resolve();
      };
      rafRef.current = window.requestAnimationFrame(tick);
    });
  }

  async function walkTo(index: number) {
    if (walkingRef.current || index !== unlocked || index >= quest.length) return;
    const stop = quest[index];
    const from = live ?? parked;
    posRef.current = from;
    walkingRef.current = true;
    setWalking(true);
    setActive(null);
    await animate(from, { lat: stop.lat, lng: stop.lng });
    if (cancelRef.current) return;
    paint({ lat: stop.lat, lng: stop.lng }, 0);
    writeSave({ role, unlocked: index + 1 });
    setLive(null);
    setActive(index);
    walkingRef.current = false;
    setWalking(false);
  }

  function onStop(index: number) {
    if (index < unlocked) {
      setActive(index);
      return;
    }
    void walkTo(index);
  }

  return (
    <VectorCampus
      quest={quest}
      start={dayStart}
      pos={pos}
      sprite={FRAMES[role][frame]}
      unlocked={unlocked}
      walking={walking}
      active={active}
      embed={embed}
      framed={framed}
      avatar={avatar ?? (role === 'researcher' ? 2 : 0)}
      onStop={onStop}
      onWalk={() => { if (unlocked < quest.length) void walkTo(unlocked); }}
      onRole={(next) => writeSave({ role: next, unlocked })}
      role={role}
      onMenu={onMenu}
    />
  );
}

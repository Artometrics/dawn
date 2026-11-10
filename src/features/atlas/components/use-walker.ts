'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { polylineLength, pointAtDistance, type XY } from '../lib/geo.ts';
import { ease, legDurationMs } from '../lib/tour.ts';

export type Walker = {
  /** Where the sprite is while it walks. After a walk it stays at the last point until `stop` clears it. */
  pos: XY | null;
  /** True while heading east (sprite faces right). */
  facingRight: boolean;
  walking: boolean;
  walk: (points: XY[]) => Promise<void>;
  stop: () => void;
};

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Walks the sprite along a polyline, easing out of the start and into the end. */
export function useWalker(): Walker {
  const [pos, setPos] = useState<XY | null>(null);
  const [facingRight, setFacingRight] = useState(true);
  const [walking, setWalking] = useState(false);
  const raf = useRef(0);
  const token = useRef(0);

  const stop = useCallback(() => {
    token.current += 1;
    window.cancelAnimationFrame(raf.current);
    setWalking(false);
    setPos(null);
  }, []);

  useEffect(() => () => {
    token.current += 1;
    window.cancelAnimationFrame(raf.current);
  }, []);

  const walk = useCallback((points: XY[]) => {
    token.current += 1;
    const mine = token.current;
    window.cancelAnimationFrame(raf.current);
    if (points.length < 2 || reducedMotion()) {
      setPos(null);
      setWalking(false);
      return Promise.resolve();
    }
    const length = polylineLength(points);
    const duration = legDurationMs(points);
    const started = performance.now();
    setWalking(true);
    return new Promise<void>((resolve) => {
      let last: XY = points[0];
      const tick = (now: number) => {
        if (mine !== token.current) {
          resolve();
          return;
        }
        const t = Math.min(1, (now - started) / duration);
        const next = pointAtDistance(points, length * ease(t));
        if (Math.abs(next.x - last.x) > 0.05) setFacingRight(next.x > last.x);
        last = next;
        setPos(next);
        if (t < 1) raf.current = window.requestAnimationFrame(tick);
        else {
          setWalking(false);
          resolve();
        }
      };
      raf.current = window.requestAnimationFrame(tick);
    });
  }, []);

  return { pos, facingRight, walking, walk, stop };
}

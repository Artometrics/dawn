'use client';

import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import type { ForgeCharacter } from '@/lib/forge/schema';
import type { ForgeStage } from '@/lib/forge/engine/stage';

export function ForgeViewport({
  character,
  skeleton,
  stageRef,
}: {
  character: ForgeCharacter;
  skeleton: boolean;
  stageRef: MutableRefObject<ForgeStage | null>;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [stage, setStage] = useState<ForgeStage | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    let dead = false;
    let made: ForgeStage | null = null;
    void import('@/lib/forge/engine/stage')
      .then(({ ForgeStage: Stage }) => {
        if (dead) return;
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        made = new Stage(element, { reducedMotion: reduced });
        stageRef.current = made;
        setStage(made);
      })
      .catch(() => {
        if (!dead) setFailed(true);
      });
    return () => {
      dead = true;
      made?.dispose();
      stageRef.current = null;
      setStage(null);
    };
  }, [stageRef]);

  useEffect(() => {
    stage?.setCharacter(character);
  }, [stage, character]);

  useEffect(() => {
    stage?.setSkeletonVisible(skeleton);
  }, [stage, skeleton, character]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[18px] bg-[var(--dawn-elev)]">
      <canvas
        ref={canvas}
        data-forge-canvas
        aria-label={`${character.name}, a 3D character. Drag to turn.`}
        role="img"
        className="block h-full w-full touch-pan-y"
      />
      {failed && (
        <p role="alert" className="absolute inset-0 grid place-items-center px-6 text-center text-[14px] text-[var(--dawn-accent)]">
          This browser could not start 3D. Your characters still save.
        </p>
      )}
    </div>
  );
}

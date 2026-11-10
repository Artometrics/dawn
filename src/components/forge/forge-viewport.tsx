'use client';

import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { hasWebGL } from '@/components/forge/webgl';
import type { ForgeCharacter } from '@/lib/forge/schema';
import type { PoseName } from '@/lib/forge/engine/bones';
import type { ForgeStage } from '@/lib/forge/engine/stage';

export function ForgeViewport({
  character,
  pose,
  turntable,
  onTurntable,
  skeleton,
  stageRef,
}: {
  character: ForgeCharacter;
  pose: PoseName;
  turntable: boolean;
  onTurntable: (on: boolean) => void;
  skeleton: boolean;
  stageRef: MutableRefObject<ForgeStage | null>;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [stage, setStage] = useState<ForgeStage | null>(null);
  const [failed, setFailed] = useState(false);
  const turnRef = useRef(onTurntable);
  const startTurn = useRef(turntable);
  useEffect(() => {
    turnRef.current = onTurntable;
  }, [onTurntable]);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    if (!hasWebGL()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- browser capability is only known after mount
      setFailed(true);
      return;
    }
    let dead = false;
    let made: ForgeStage | null = null;
    void import('@/lib/forge/engine/stage')
      .then(({ ForgeStage: Stage }) => {
        if (dead) return;
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        made = new Stage(element, {
          reducedMotion: reduced || !startTurn.current,
          onTurntable: (on) => turnRef.current(on),
        });
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
    stage?.setPose(pose);
  }, [stage, pose, character]);

  useEffect(() => {
    stage?.setTurntable(turntable);
  }, [stage, turntable]);

  useEffect(() => {
    stage?.setSkeletonVisible(skeleton);
  }, [stage, skeleton, character]);

  return (
    <div className="dw-stage">
      <canvas
        ref={canvas}
        data-forge-canvas
        aria-label={`${character.name}, a 3D character. Drag to turn.`}
        role="img"
      />
      {failed && (
        <p role="alert" className="dw-stage-message">
          This browser could not start 3D, so there is no preview. JSON import and export still work.
        </p>
      )}
    </div>
  );
}

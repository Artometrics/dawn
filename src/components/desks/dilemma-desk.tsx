'use client';

import { useEffect, useRef, useState } from 'react';
import {
  DilemmaVillage,
  STRATEGY_LABELS,
  STRATEGY_RULES,
  readableEvent,
  type SimulationSnapshot,
} from '@/lib/games/dilemma';

const SPEEDS = [0.5, 1, 1.5, 2, 3] as const;

/** The original village: a roaming field, then controls, standings, and the meeting log. */
export function DilemmaDesk() {
  const hostRef = useRef<HTMLDivElement>(null);
  const villageRef = useRef<DilemmaVillage | null>(null);
  const runningRef = useRef(true);
  const speedRef = useRef(1);
  const [snap, setSnap] = useState<SimulationSnapshot>(() => new DilemmaVillage().snapshot());
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const parent = hostRef.current;
    if (!parent) return;
    const village = new DilemmaVillage();
    villageRef.current = village;
    let game: { destroy: (removeCanvas: boolean) => void } | undefined;
    let dead = false;
    let frame = 0;
    void import('@/components/desks/dilemma-world').then(({ mountDilemmaWorld }) => {
      if (dead || !hostRef.current) return;
      game = mountDilemmaWorld(hostRef.current, {
        step(dt) {
          const current = villageRef.current ?? village;
          const next = runningRef.current && dt > 0 ? current.step(Math.min(0.05, dt) * speedRef.current) : current.snapshot();
          frame += 1;
          if (!dead && frame % 6 === 0) setSnap(next);
          return next;
        },
      });
      if (!dead) setReady(true);
    });
    return () => {
      dead = true;
      game?.destroy(true);
    };
  }, []);

  function toggleRunning() {
    runningRef.current = !runningRef.current;
    setRunning(runningRef.current);
  }

  function chooseSpeed(next: (typeof SPEEDS)[number]) {
    speedRef.current = next;
    setSpeed(next);
  }

  function reset() {
    const next = new DilemmaVillage();
    villageRef.current = next;
    runningRef.current = true;
    setRunning(true);
    setSnap(next.snapshot());
  }

  const points = snap.standings.reduce((sum, row) => sum + row.score, 0);
  const meeting = snap.agents.filter((agent) => agent.mode === 'interacting');

  return (
    <div className="dilemma">
      <div className="dilemma-stage">
        <div ref={hostRef} className="dilemma-host" role="img" aria-label="Prisoner's dilemma village" />
        {ready ? null : <p className="dw-stage-message">The field is opening.</p>}
      </div>
      <div className="dilemma-panels">
        <section className="dw-panel dilemma-panel" aria-labelledby="dilemma-controls">
          <p className="dw-eyebrow">In this browser</p>
          <h2 id="dilemma-controls" className="dw-card-title">Controls</h2>
          <p className="dw-note">
            Seven strategies roam a shared field, meet, and choose to cooperate or defect. Reset starts the same world again. Nothing is sent.
          </p>
          <p className="dw-note dilemma-status" role="status">
            {running ? (meeting.length > 0 ? 'A meeting is on the field.' : 'They are walking the paths.') : 'Paused.'}
            {` ${points} points scored.`}
          </p>
          <div className="dw-actions">
            <button type="button" className="dw-btn dw-btn--primary" onClick={toggleRunning}>
              {running ? 'Pause' : 'Resume'}
            </button>
            <button type="button" className="dw-btn" onClick={reset}>Reset</button>
          </div>
          <p className="dw-note" id="dilemma-speed">Speed</p>
          <div className="dw-actions dw-actions--chips" role="group" aria-labelledby="dilemma-speed">
            {SPEEDS.map((value) => (
              <button
                key={value}
                type="button"
                className="dw-btn dw-btn--chip"
                aria-pressed={speed === value}
                onClick={() => chooseSpeed(value)}
              >
                {value}×
              </button>
            ))}
          </div>
        </section>

        <section className="dw-panel dilemma-panel" aria-labelledby="dilemma-standings">
          <p className="dw-eyebrow">Live ladder</p>
          <h2 id="dilemma-standings" className="dw-card-title">Standings</h2>
          <ol className="dilemma-standings">
            {snap.standings.map((row, index) => (
              <li key={row.name}>
                <span className="dilemma-rank">{index + 1}</span>
                <span className="dilemma-swatch" style={{ background: row.color }} />
                <span className="dilemma-who">
                  <strong>{STRATEGY_LABELS[row.name]}</strong>
                  <small>{STRATEGY_RULES[row.name]}</small>
                </span>
                <b>{row.score}</b>
              </li>
            ))}
          </ol>
        </section>

        <section className="dw-panel dilemma-panel" aria-labelledby="dilemma-feed">
          <p className="dw-eyebrow">Meetings</p>
          <h2 id="dilemma-feed" className="dw-card-title">Play-by-play</h2>
          {snap.events.length === 0 ? (
            <p className="dw-note">No meetings yet. They are still walking the paths.</p>
          ) : (
            <div className="dilemma-feed" role="log" aria-relevant="additions">
              {snap.events.map((event, index) => (
                <p key={`${event}-${index}`} className="dilemma-event">{readableEvent(event)}</p>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PREVIEW_KEY, STUCK_STEPS, emptyPreview, normalizePreview, stepRound, type PreviewState } from '@/lib/preview/board';

export function StuckView() {
  const [state, setState] = useState<PreviewState>(emptyPreview);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(PREVIEW_KEY);
      if (raw) setState(normalizePreview(JSON.parse(raw)));
    } catch {
      setState(emptyPreview());
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    sessionStorage.setItem(PREVIEW_KEY, JSON.stringify(state));
  }, [ready, state]);

  useEffect(() => {
    if (!ready || state.steps >= STUCK_STEPS) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'ArrowRight') return;
      event.preventDefault();
      setState((current) => ({ ...current, steps: stepRound(current.steps) }));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ready, state.steps]);

  const done = state.steps >= STUCK_STEPS;
  const place = Math.min(state.steps, STUCK_STEPS - 1);

  function step() {
    setState((current) => ({ ...current, steps: stepRound(current.steps) }));
  }

  if (!ready) return <p className="pv-lead">Opening the board…</p>;

  return (
    <section aria-live="polite">
      <div className="pv-lane" role="img" aria-label={`Break board, step ${state.steps} of ${STUCK_STEPS}`}>
        {Array.from({ length: STUCK_STEPS }, (_, index) => (
          <div className="pv-tile" data-on={index < state.steps ? 'true' : 'false'} key={index}>
            {index === place ? (
              <img src="/sprites/town/player.png" alt="" width={64} height={64} />
            ) : null}
          </div>
        ))}
      </div>
      <p className="pv-count">Demo · step {state.steps} of {STUCK_STEPS}</p>
      {done ? (
        <p className="pv-lead"><Link className="pv-pill" href="/preview/bench">Back to the bench</Link></p>
      ) : (
        <p className="pv-lead">
          <button className="pv-pill" type="button" onClick={step}>Step</button>
        </p>
      )}
    </section>
  );
}

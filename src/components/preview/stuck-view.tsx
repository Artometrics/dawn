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

  const done = state.steps >= STUCK_STEPS;

  function step() {
    setState((current) => ({ ...current, steps: stepRound(current.steps) }));
  }

  if (!ready) return <p className="pv-lead">Opening the round…</p>;

  return (
    <section aria-live="polite">
      <div className="pv-lane" aria-hidden="true">
        {Array.from({ length: STUCK_STEPS }, (_, index) => (
          <div className="pv-tile" data-on={index < state.steps ? 'true' : 'false'} key={index}>
            {index === Math.max(0, state.steps - 1) && state.steps > 0 ? (
              <img src="/sprites/town/player.png" alt="" width={48} height={48} />
            ) : null}
          </div>
        ))}
      </div>
      <p className="pv-lead">Step {Math.min(state.steps, STUCK_STEPS)} of {STUCK_STEPS}. The pixel is the town player. It is not an agent.</p>
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

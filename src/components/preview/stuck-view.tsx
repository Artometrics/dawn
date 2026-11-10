'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePreviewState } from '@/components/preview/use-preview-state';
import { STUCK_STEPS, stepRound } from '@/lib/preview/board';

export function StuckView() {
  const [state, setState, ready] = usePreviewState();

  useEffect(() => {
    if (!ready || state.steps >= STUCK_STEPS) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'ArrowRight') return;
      event.preventDefault();
      setState((current) => ({ ...current, steps: stepRound(current.steps) }));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ready, state.steps, setState]);

  const done = state.steps >= STUCK_STEPS;
  const place = Math.min(state.steps, STUCK_STEPS - 1);

  function step() {
    setState((current) => ({ ...current, steps: stepRound(current.steps) }));
  }

  if (!ready) return <p className="dw-lead">Opening the board…</p>;

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
        <p className="dw-lead"><Link prefetch={false} className="dw-btn" href="/preview/bench">Back to the bench</Link></p>
      ) : (
        <p className="dw-lead">
          <button className="dw-btn dw-btn--primary" type="button" onClick={step}>Step</button>
        </p>
      )}
    </section>
  );
}

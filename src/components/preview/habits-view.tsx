'use client';

import { useEffect, useState } from 'react';
import {
  HABITS,
  PREVIEW_KEY,
  emptyPreview,
  normalizePreview,
  selectHabit,
  toggleHabit,
  type PreviewState,
} from '@/lib/preview/board';

export function HabitsView() {
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

  const open = HABITS.find((habit) => habit.id === state.habitId) ?? null;
  const doneCount = HABITS.filter((habit) => state.habitDone[habit.id]).length;

  if (!ready) return <p className="dw-lead">Opening the sample day…</p>;

  return (
    <>
      <ul className="pv-list" aria-label="Sample habits">
        {HABITS.map((habit) => (
          <li key={habit.id}>
            <button
              type="button"
              className="pv-choice"
              aria-pressed={state.habitId === habit.id}
              onClick={() => setState(selectHabit(state, habit.id))}
            >
              <img src="/sprites/town/player.png" alt="" width={40} height={40} />
              <span>
                <strong>{habit.title}</strong>
                <span>{state.habitDone[habit.id] ? 'Done' : 'Open'}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <section className="pv-stage" aria-live="polite">
        {open ? (
          <>
            <h2>{open.title}</h2>
            <label className="pv-field">
              <input
                type="checkbox"
                checked={state.habitDone[open.id]}
                onChange={() => setState(toggleHabit(state, open.id))}
              />
              Done
            </label>
          </>
        ) : (
          <p className="dw-lead">Choose one habit.</p>
        )}
        <p className="pv-count">Demo · {doneCount} of {HABITS.length}</p>
      </section>
    </>
  );
}

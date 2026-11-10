'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  PREVIEW_KEY,
  SAMPLES,
  canVerify,
  emptyPreview,
  normalizePreview,
  sampleById,
  saveIdea,
  selectSample,
  toggleCheck,
  verifySample,
  type PreviewState,
} from '@/lib/preview/board';

export function BenchView() {
  const [state, setState] = useState<PreviewState>(emptyPreview);
  const [ready, setReady] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect -- reads sessionStorage after hydration so the static HTML and the first client render match */
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(PREVIEW_KEY);
      if (raw) setState(normalizePreview(JSON.parse(raw)));
    } catch {
      setState(emptyPreview());
    }
    setReady(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!ready) return;
    sessionStorage.setItem(PREVIEW_KEY, JSON.stringify(state));
  }, [ready, state]);

  const sample = state.sampleId ? sampleById(state.sampleId) : null;

  function onSave() {
    const next = saveIdea(state, draft, `idea_${Date.now().toString(36)}`);
    setError(next.error);
    if (!next.error) {
      setState(next.state);
      setDraft('');
    }
  }

  function onVerify() {
    const next = verifySample(state);
    setError(next.error);
    setState(next.state);
  }

  if (!ready) {
    return <p className="dw-lead">Opening the sample…</p>;
  }

  return (
    <div className="pv-split">
      <ul className="pv-list" aria-label="Samples">
        {SAMPLES.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className="pv-choice"
              aria-pressed={state.sampleId === item.id}
              onClick={() => {
                setState(selectSample(state, item.id));
                setError(null);
              }}
            >
              <img src={item.sprite} alt="" width={40} height={40} />
              <span>
                <strong>{item.title}</strong>
                <span>{item.spriteName}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <section className="pv-stage" aria-live="polite">
        {sample ? (
          <>
            <div className="pv-stage-head">
              <img src={sample.sprite} alt="" width={64} height={64} />
              <div>
                <h2>{sample.title}</h2>
              </div>
            </div>
            <ul className="pv-checks">
              {state.checks.map((check) => (
                <li key={check.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={check.done}
                      onChange={() => setState(toggleCheck(state, check.id))}
                    />
                    {check.label}
                  </label>
                </li>
              ))}
            </ul>
            <div className="pv-field">
              <label htmlFor="idea">Idea</label>
              <input
                id="idea"
                type="text"
                value={draft}
                maxLength={80}
                placeholder="A sample idea"
                onChange={(event) => setDraft(event.target.value)}
              />
              <button className="dw-btn dw-btn--primary" type="button" onClick={canVerify(state) ? onVerify : onSave} disabled={!canVerify(state) && draft.trim().length < 2}>
                {canVerify(state) ? 'I checked this' : 'Save idea'}
              </button>
            </div>
            {error ? <p className="pv-error" role="alert">{error}</p> : null}
            {state.verified ? <p className="pv-count">Demo · checked</p> : (
              <p className="pv-count">Demo · {state.checks.filter((check) => check.done).length} of {state.checks.length}</p>
            )}
            <ul className="pv-ideas">
              {state.ideas.length === 0 ? <li>No ideas yet.</li> : state.ideas.map((idea) => <li key={idea.id}>{idea.text}</li>)}
            </ul>
            <p className="dw-lead"><Link prefetch={false} className="dw-btn" href="/preview/stuck">Take a short break</Link></p>
          </>
        ) : (
          <p className="dw-lead">Choose a sample.</p>
        )}
      </section>
    </div>
  );
}

'use client';

import { useState } from 'react';
import './desks.css';

const WALK = [
  { place: 'Elowen’s Study', note: 'Choose a partner before the marches start.' },
  { place: 'Mossgate', note: 'Nia gives capture orbs. Tall grass hides wildkin.' },
  { place: 'Rest House', note: 'Lumen heals the party, and never charges.' },
  { place: 'The east path', note: 'Scout Mara, then Echo Hollow if you want, then Warden Bram at the Trial Gym.' },
];

/**
 * The original Godot field, framed by Dawn. The wasm already lives at public/play/fernbound.
 * The story source is compiled, so this desk does not change the game.
 */
export function FernboundDesk() {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (!open) {
    return (
      <div className="fern">
        <div className="fern-landing">
          <p className="dw-eyebrow">The Fern Marches</p>
          <h2 className="fern-title">Fernbound</h2>
          <p className="dw-lead">
            An original wildkin-binding story on a made-up map. You choose a partner, walk the tall grass, and face the trial at Bramblehold. It plays in this page. It does not use your location, and it does not call a server.
          </p>
          <section className="dw-panel" aria-labelledby="fern-walk">
            <h3 id="fern-walk" className="dw-card-title">The walk</h3>
            <ol className="fern-walk">
              {WALK.map((step) => (
                <li key={step.place}>
                  <strong>{step.place}</strong>
                  <span>{step.note}</span>
                </li>
              ))}
            </ol>
          </section>
          <section className="dw-panel" aria-labelledby="fern-controls">
            <h3 id="fern-controls" className="dw-card-title">Controls</h3>
            <ul className="fern-controls">
              <li><strong>Move</strong><span>Arrow keys. On a phone, the pad on the field.</span></li>
              <li><strong>Confirm</strong><span>Z, or A on the pad. That is how you speak.</span></li>
              <li><strong>Menu</strong><span>X, or B on the pad.</span></li>
            </ul>
            <p className="dw-note">The sign on the path says: Speak with A. Run with care. On a phone, turn sideways if the marches feel tight.</p>
          </section>
          <div className="dw-actions">
            <button type="button" className="dw-btn dw-btn--primary fern-play-btn" onClick={() => setOpen(true)}>
              Play the marches
            </button>
          </div>
          <p className="dw-note">
            This is the original field, unchanged. Dawn only frames it. The story source is the compiled game, not an editable project.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fern fern-live">
      <header className="fern-bar">
        <div>
          <p className="dw-eyebrow">The Fern Marches</p>
          <h2 className="dw-card-title">Fernbound</h2>
        </div>
        <button
          type="button"
          className="dw-btn"
          onClick={() => {
            setOpen(false);
            setLoaded(false);
          }}
        >
          Leave the field
        </button>
      </header>
      <p className="fern-caption">Arrows move. Z confirms, X opens the menu. On a phone, use the pad and A / B. Turn sideways if the field feels tight.</p>
      <div className="fern-frame">
        {loaded ? null : <p className="dw-stage-message">The field is loading.</p>}
        <iframe
          className="fern-iframe"
          title="Fernbound"
          src="/play/fernbound/index.html"
          onLoad={() => setLoaded(true)}
        />
      </div>
    </div>
  );
}

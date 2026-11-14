'use client';

import { useState } from 'react';
import './desks.css';

/** The compiled field stays unloaded until someone asks to play, so the desk itself stays light. */
export function FernboundDesk() {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <div className="desk">
        <p className="dw-note">Fernbound is a wildkin field. It plays in this page and does not call a server.</p>
        <button type="button" className="dw-btn dw-btn--primary" onClick={() => setOpen(true)}>Open the field</button>
      </div>
    );
  }
  return <iframe className="game-frame" title="Fernbound" src="/play/fernbound/index.html" />;
}

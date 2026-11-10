'use client';

import { useState } from 'react';
import { KITS, type KitInfo } from '@/lib/kits/registry';

export function KitDashboard() {
  return (
    <main className="dawn-agents" style={{ minHeight: '100dvh', padding: '20px 16px 32px' }}>
      <div style={{ width: 'min(880px, 100%)', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p className="word">DAWN</p>
        <h1>Kits</h1>
        <p className="note">Six local checks adapted from the Code with Antonio projects. None of them call a model or send a message. They are not live on this host until the gateway that serves /api/kits is the process on 127.0.0.1:8787.</p>
        <p><a href="/">Town</a></p>
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {KITS.map((kit) => (
            <li key={kit.id} style={{ border: '1px solid #333', borderRadius: 12, padding: 12 }}>
              <a href={kit.href}><strong>{kit.title}</strong></a>
              <p className="note">{kit.adapted}</p>
              <p className="note">Replaced: {kit.replaced}</p>
              <p className="note">After the deploy worker publishes this build and restarts the gateway: {kit.liveUrl}</p>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}

export function KitPage({ kit }: { kit: KitInfo }) {
  const [note, setNote] = useState('Sign in on this host, then run the check. A static host with no gateway cannot run it.');
  const [html, setHtml] = useState('');

  async function run() {
    setNote('Running the local check…');
    try {
      const response = await fetch(`/api/kits/${kit.id}`, {
        method: 'POST',
        credentials: 'include',
        redirect: 'manual',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ check: 'run' }),
      });
      if (response.type === 'opaqueredirect' || response.status === 401) {
        setNote('Google sign-in is in front of this host. Open /oauth2/start on this same site, then come back.');
        return;
      }
      const data = await response.json() as { summary?: string; error?: string; detail?: { html?: string } };
      setNote(data.summary || data.error || 'The check did not finish.');
      setHtml(data.detail?.html || '');
    } catch {
      setNote('The gateway is not answering on this origin.');
    }
  }

  return (
    <main className="dawn-agents" style={{ minHeight: '100dvh', padding: '20px 16px 32px' }}>
      <div style={{ width: 'min(880px, 100%)', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p className="word">DAWN</p>
        <h1>{kit.title}</h1>
        <p><a href="/kits">All kits</a> · <a href="/">Town</a></p>
        <p className="note">Source: {kit.source}</p>
        <p className="note">{kit.adapted}</p>
        <p className="note">Replaced: {kit.replaced}</p>
        <p className="note">Intended URL after deploy: {kit.liveUrl}. It is not live until that deploy finishes.</p>
        <button type="button" className="primary" onClick={() => { void run(); }}>Run local check</button>
        <p role="status">{note}</p>
        {html && (
          <iframe title="Seeded game" sandbox="" srcDoc={html} style={{ width: '100%', height: 180, border: '1px solid #333', background: '#fff' }} />
        )}
      </div>
    </main>
  );
}

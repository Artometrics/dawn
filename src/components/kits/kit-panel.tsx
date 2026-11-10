'use client';

import { useState } from 'react';
import { PageShell } from '@/components/site/page-shell';
import { KITS, type KitInfo } from '@/lib/kits/registry';

export function KitDashboard() {
  return (
    <PageShell
      title="Kits"
      current="/kits"
      lead="Six local checks adapted from the Code with Antonio projects. None of them call a model or send a message. They only run where the local gateway is running; a static host cannot run them."
    >
      <ul className="dw-list" style={{ gap: 12 }}>
        {KITS.map((kit) => (
          <li key={kit.id} className="dw-card">
            <h2 className="dw-card-title"><a className="dw-link" href={kit.href}>{kit.title}</a></h2>
            <p className="dw-note">{kit.adapted}</p>
            <p className="dw-note">Replaced: {kit.replaced}</p>
            <p className="dw-note">After the deploy worker publishes this build and restarts the gateway: {kit.liveUrl}</p>
            <a className="dw-btn dw-btn--chip" style={{ marginTop: 12 }} href={kit.href}>Open</a>
          </li>
        ))}
      </ul>
    </PageShell>
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
    <PageShell title={kit.title} current="/kits" lead={kit.adapted}>
      <p className="dw-actions"><a className="dw-btn dw-btn--chip" href="/kits">All kits</a></p>
      <section className="dw-card">
        <p className="dw-note">Source: {kit.source}</p>
        <p className="dw-note">Replaced: {kit.replaced}</p>
        <p className="dw-note">Intended URL after deploy: {kit.liveUrl}. It is not live until that deploy finishes.</p>
      </section>
      <div className="dw-actions">
        <button type="button" className="dw-btn dw-btn--primary" onClick={() => { void run(); }}>Run local check</button>
      </div>
      <p className="dw-alert" role="status">{note}</p>
      {html && (
        <iframe title="Seeded game" sandbox="" srcDoc={html} style={{ width: '100%', height: 180, border: 0, borderRadius: 'var(--dawn-radius-row)', background: '#fff' }} />
      )}
    </PageShell>
  );
}

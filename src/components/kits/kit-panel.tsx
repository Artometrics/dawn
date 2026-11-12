'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DeskGate } from '@/components/shell/status-card';
import { PageShell } from '@/components/site/page-shell';
import { KITS, type KitInfo } from '@/lib/kits/registry';
import { jsonInit, kitCall } from '@/lib/site/kit-client';
import '@/components/code/code-hub.css';

type Desk = 'loading' | 'ready' | 'offline' | 'signin';
const deskOf = (status: string): Desk => (status === 'ok' ? 'ready' : status === 'closed' ? 'signin' : 'offline');

export function KitDashboard() {
  const [desk, setDesk] = useState<Desk>('loading');
  useEffect(() => {
    void kitCall<unknown>('/api/kits').then((result) => setDesk(deskOf(result.status)));
  }, []);
  return (
    <PageShell title="Kits" lead="Small checks you can run on the Dawn server.">
      <DeskGate status={desk} offline="Offline preview. Open live Dawn to run the kits." />
      <ul className="ch-grid">
        {KITS.map((kit, index) => (
          <li key={kit.id} style={{ ['--i' as string]: index }}>
            <Link className="ch-card" href={kit.href}>
              <span className="ch-title">{kit.title}</span>
              <span className="ch-line">{kit.blurb}</span>
            </Link>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}

export function KitPage({ kit }: { kit: KitInfo }) {
  const [desk, setDesk] = useState<Desk>('loading');
  const [note, setNote] = useState('');
  const [html, setHtml] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void kitCall<unknown>('/api/kits').then((result) => setDesk(deskOf(result.status)));
  }, []);

  async function run() {
    setBusy(true);
    setNote('Running…');
    const result = await kitCall<{ summary?: string; detail?: { html?: string } }>(`/api/kits/${kit.id}`, jsonInit({ check: 'run' }));
    setBusy(false);
    if (result.status === 'ok') {
      setNote(result.data.summary || 'Done.');
      setHtml(result.data.detail?.html || '');
    } else {
      setNote(result.status === 'error' ? result.message : 'The check did not run.');
    }
  }

  return (
    <PageShell title={kit.title} lead={kit.blurb}>
      <DeskGate status={desk} offline="Offline preview. Open live Dawn to run this check." />
      {desk === 'ready' && (
        <div className="dw-actions">
          <button type="button" className="dw-btn dw-btn--primary" disabled={busy} onClick={() => { void run(); }}>Run check</button>
        </div>
      )}
      {note && <p className="dw-alert" role="status">{note}</p>}
      {html && (
        <iframe title="Result" sandbox="" srcDoc={html} style={{ width: '100%', height: 180, border: 0, borderRadius: 'var(--dawn-radius-row)', background: 'var(--dawn-sheet)' }} />
      )}
    </PageShell>
  );
}

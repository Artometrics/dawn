'use client';

import { useEffect, useState } from 'react';
import { gatewayBase } from '@/components/dawn-agents/api';
import { probeDesk, type DeskStatus } from '@/lib/home/town-action';
import { PageShell } from '@/components/site/page-shell';

const SAMPLE = `// Dawn Code is the OpenVSCode workspace in editor/.
// This static page does not run it and does not save a file.
`;

export default function EditorPage() {
  const [desk, setDesk] = useState<DeskStatus | 'loading'>('loading');
  const [files, setFiles] = useState<string[]>([]);
  const [booth, setBooth] = useState('');
  const [note, setNote] = useState('');
  useEffect(() => {
    let cancel = false;
    void (async () => {
      const base = await gatewayBase();
      const status = await probeDesk(fetch, `${base}/api/state`);
      if (cancel) return;
      setDesk(status);
      if (status !== 'ready') return;
      const response = await fetch(`${base}/api/local-drafts`, { credentials: 'include', redirect: 'manual' });
      if (!response.ok) return;
      const data = await response.json() as { files?: string[] };
      setFiles(data.files ?? []);
    })();
    return () => {
      cancel = true;
    };
  }, []);
  async function post(body: Record<string, string>) {
    const response = await fetch('/api/local-drafts', {
      method: 'POST',
      credentials: 'include',
      redirect: 'manual',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({})) as { error?: string; html?: string };
    return { ok: response.ok, data };
  }
  const status = desk === 'signin'
    ? 'Google sign-in is in front of this host. Open /oauth2/start on this same site. The editor process is OpenVSCode on 127.0.0.1:3000 and does not need a model key.'
    : desk === 'ready'
      ? 'The owner desk answered on this site. OpenVSCode, when the host runs editor/scripts/dev.sh, is the editor. Mock mode does not call a model. Files below are the desk workspace.'
      : 'This origin has no /api desk, and static hosting cannot start one. The editor is not connected here. Run node server/dawn-agents.mjs next to this site to turn the desk buttons on.';
  return (
    <PageShell
      title="Code"
      current="/editor"
      lead="A read-only workspace note and the desk file list. Nothing on this page executes."
    >
      <p className="dw-alert" role="status">{status}</p>
      <label className="dw-label">
        Workspace note
        <textarea className="dw-field" value={SAMPLE} readOnly rows={4} spellCheck={false} style={{ fontFamily: 'var(--dawn-font-mono)' }} />
      </label>
      <section className="dw-card">
        <h2 className="dw-card-title">Desk files</h2>
        <ul className="dw-list">{files.length === 0 ? <li className="dw-note">No desk files yet.</li> : files.map((name) => <li key={name}>{name}</li>)}</ul>
      </section>
      {desk === 'ready' && (
        <div className="dw-actions">
          <button type="button" className="dw-btn dw-btn--primary" onClick={() => {
            void post({ kind: 'sandbox', name: 'booth.html', html: '<p>Local booth</p>' }).then(async (saved) => {
              if (!saved.ok) { setNote(saved.data.error || 'Sandbox was refused.'); return; }
              const read = await post({ kind: 'browser', target: 'booth.html' });
              setBooth(read.data.html || '');
              setNote(read.ok ? 'Local booth read back. Nothing was fetched.' : (read.data.error || 'Refused.'));
            });
          }}>Open local booth</button>
          <button type="button" className="dw-btn" onClick={() => {
            void post({ kind: 'browser', target: 'https://example.com' }).then((read) => {
              setNote(read.data.error || 'Remote pages are refused.');
            });
          }}>Try a remote page</button>
          <button type="button" className="dw-btn" onClick={() => {
            void post({ kind: 'send', to: 'review@localhost', body: 'Hold this draft.' }).then((read) => {
              setNote(read.ok ? 'Draft held for review. Nothing was sent.' : (read.data.error || 'Refused.'));
            });
          }}>Hold a draft</button>
        </div>
      )}
      {booth && <pre>{booth}</pre>}
      {note && <p className="dw-alert" role="status">{note}</p>}
    </PageShell>
  );
}

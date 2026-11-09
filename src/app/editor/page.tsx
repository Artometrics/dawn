'use client';

import { useEffect, useState } from 'react';
import { gatewayBase } from '@/components/dawn-agents/api';
import { probeDesk, type DeskStatus } from '@/lib/home/town-action';
import '../agents/agents.css';

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
      : 'This origin has no /api desk. Firebase Hosting cannot start it. The process is node server/dawn-agents.mjs on 127.0.0.1:8787, and Caddy on https://2-29-173-68.sslip.io already proxies /api there after Google sign-in.';
  return (
    <main className="dawn-agents" style={{ minHeight: '100dvh', padding: '20px 16px 32px' }}>
      <div style={{ width: 'min(720px, 100%)', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p className="word">DAWN</p>
        <h1>Code</h1>
        <p className="note" role="status">{status} Nothing on this page executes.</p>
        <nav aria-label="Dawn" style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <a href="/">Town</a>
          <a href="/village">Village</a>
          <a href="/atlas">Atlas</a>
          <a href="/projects">Projects</a>
          <a href="/artifacts">Artifacts</a>
          <a href="/village?section=library">Village history</a>
        </nav>
        <label>
          Workspace note
          <textarea
            value={SAMPLE}
            readOnly
            rows={4}
            spellCheck={false}
            style={{ width: '100%', fontFamily: 'ui-monospace, monospace', fontSize: 16 }}
          />
        </label>
        <ul>{files.length === 0 ? <li>No desk files yet.</li> : files.map((name) => <li key={name}>{name}</li>)}</ul>
        {desk === 'ready' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button type="button" className="primary" onClick={() => {
              void post({ kind: 'sandbox', name: 'booth.html', html: '<p>Local booth</p>' }).then(async (saved) => {
                if (!saved.ok) { setNote(saved.data.error || 'Sandbox was refused.'); return; }
                const read = await post({ kind: 'browser', target: 'booth.html' });
                setBooth(read.data.html || '');
                setNote(read.ok ? 'Local booth read back. Nothing was fetched.' : (read.data.error || 'Refused.'));
              });
            }}>Open local booth</button>
            <button type="button" onClick={() => {
              void post({ kind: 'browser', target: 'https://example.com' }).then((read) => {
                setNote(read.data.error || 'Remote pages are refused.');
              });
            }}>Try a remote page</button>
            <button type="button" onClick={() => {
              void post({ kind: 'send', to: 'review@localhost', body: 'Hold this draft.' }).then((read) => {
                setNote(read.ok ? 'Draft held for review. Nothing was sent.' : (read.data.error || 'Refused.'));
              });
            }}>Hold a draft</button>
          </div>
        )}
        {booth && <pre>{booth}</pre>}
        {note && <p role="status">{note}</p>}
      </div>
    </main>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { gatewayBase } from '@/components/dawn-agents/api';
import { probeDesk, type DeskStatus } from '@/lib/home/town-action';
import { PageShell } from '@/components/site/page-shell';

const TRUTH = 'OpenVSCode is not installed here, and editor/dist/gateway.cjs is not built. This is the Dawn file editor for the owner desk. It is not OpenVSCode and it does not call a model.';

export default function EditorPage() {
  const [desk, setDesk] = useState<DeskStatus | 'loading'>('loading');
  const [files, setFiles] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<{ id: string; to: string; status: string }[]>([]);
  const [fileText, setFileText] = useState('');
  const [booth, setBooth] = useState('');
  const [note, setNote] = useState(TRUTH);
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
      const data = await response.json() as { files?: string[]; sends?: { id: string; to: string; status: string }[] };
      setFiles(data.files ?? []);
      setDrafts(data.sends ?? []);
      if ((data.files ?? []).includes('page.txt')) {
        const file = await fetch(`${base}/api/local-drafts?file=page.txt`, { credentials: 'include', redirect: 'manual' });
        if (file.ok) {
          const body = await file.json() as { text?: string };
          setFileText(body.text || '');
        }
      }
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
    const data = await response.json().catch(() => ({})) as { error?: string; html?: string; result?: string; delivery?: { reason?: string } };
    return { ok: response.ok, data };
  }
  async function refresh() {
    const response = await fetch('/api/local-drafts', { credentials: 'include', redirect: 'manual' });
    if (!response.ok) return;
    const data = await response.json() as { files?: string[]; sends?: { id: string; to: string; status: string }[] };
    setFiles(data.files ?? []);
    setDrafts(data.sends ?? []);
  }
  const status = desk === 'signin'
    ? 'Google sign-in is in front of this host. Use /oauth2/start on this same site. OpenVSCode is not installed in this checkout.'
    : desk === 'ready'
      ? 'The owner desk answered. Files save through /api/local-drafts. OpenVSCode is not running.'
      : 'This origin has no owner desk, so Save cannot persist. Firebase Hosting cannot start the gateway.';
  return (
    <PageShell
      title="Code"
      current="/editor"
      lead="The Dawn file editor for the owner desk. It is not OpenVSCode and it does not call a model."
    >
      <p className="dw-alert" role="status">{status} {TRUTH}</p>
      <label className="dw-label">
        page.txt
        <textarea
          id="file-body"
          className="dw-field"
          value={fileText}
          onChange={(event) => setFileText(event.target.value)}
          rows={8}
          spellCheck={false}
          style={{ fontFamily: 'var(--dawn-font-mono)' }}
        />
      </label>
      <div className="dw-actions">
        <button type="button" className="dw-btn dw-btn--primary" disabled={desk !== 'ready'} onClick={() => {
          void post({ kind: 'file', name: 'page.txt', text: fileText }).then(async (saved) => {
            setNote(saved.ok ? 'page.txt stored on the desk.' : (saved.data.error || 'Not stored.'));
            if (saved.ok) await refresh();
          });
        }}>Save page.txt</button>
      </div>
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
      {booth && (
        <iframe title="Local booth" sandbox="allow-scripts" srcDoc={`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">${booth}`} style={{ width: '100%', height: 120, border: 0, background: '#fff' }} />
      )}
      {drafts.length > 0 && (
        <section className="dw-card">
          <h2 className="dw-card-title">Drafts</h2>
          <ul className="dw-list" aria-label="Drafts">
            {drafts.map((draft) => (
              <li key={draft.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--dawn-space-3)' }}>
                <span>{draft.to} · {draft.status}</span>
                {draft.status === 'review' && (
                  <button type="button" className="dw-btn" onClick={() => {
                    void post({ kind: 'approve', id: draft.id }).then(async (saved) => {
                      setNote(saved.data.delivery?.reason || saved.data.error || 'Not sent.');
                      await refresh();
                    });
                  }}>Approve</button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      {note && <p className="dw-alert" role="status">{note}</p>}
    </PageShell>
  );
}

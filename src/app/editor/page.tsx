'use client';

import { useEffect, useState } from 'react';
import { gatewayBase } from '@/components/dawn-agents/api';
import { probeDesk, type DeskStatus } from '@/lib/home/town-action';
import '../agents/agents.css';

const TRUTH = 'This page is the Dawn file editor. It is not the OpenVSCode workbench and it does not call a model. OpenVSCode is a separate process from editor/scripts/dev.sh.';

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
    const data = await response.json().catch(() => ({})) as { error?: string; html?: string; text?: string; result?: string; delivery?: { reason?: string }; mockMail?: { note?: string } };
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
    ? 'Google sign-in is in front of this host. Use /oauth2/start on this same site. This page is not the OpenVSCode workbench.'
    : desk === 'ready'
      ? 'The owner desk answered. Files save through /api/local-drafts. This page is not the OpenVSCode workbench.'
      : 'This origin has no owner desk, so Save cannot persist. Firebase Hosting cannot start the gateway.';
  return (
    <main className="dawn-agents" style={{ minHeight: '100dvh', padding: '20px 16px 32px' }}>
      <div style={{ width: 'min(720px, 100%)', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p className="word">DAWN</p>
        <h1>Code</h1>
        <p className="note" role="status">{status} {TRUTH}</p>
        <nav aria-label="Dawn" style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <a href="/">Town</a>
          <a href="/village">Village</a>
          <a href="/atlas">Atlas</a>
          <a href="/projects">Projects</a>
          <a href="/artifacts">Artifacts</a>
          <a href="/village?section=library">Village history</a>
        </nav>
        <label>
          page.txt
          <textarea
            id="file-body"
            value={fileText}
            onChange={(event) => setFileText(event.target.value)}
            rows={8}
            spellCheck={false}
            style={{ width: '100%', fontFamily: 'ui-monospace, monospace', fontSize: 16 }}
          />
        </label>
        <button type="button" className="primary" disabled={desk !== 'ready'} onClick={() => {
          void post({ kind: 'file', name: 'page.txt', text: fileText }).then(async (saved) => {
            setNote(saved.ok ? 'page.txt stored on the desk.' : (saved.data.error || 'Not stored.'));
            if (saved.ok) await refresh();
          });
        }}>Save page.txt</button>
        <ul>{files.length === 0 ? <li>No desk files yet.</li> : files.map((name) => <li key={name}>{name}</li>)}</ul>
        {desk === 'ready' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button type="button" className="primary" onClick={() => {
              void post({ kind: 'sandbox', name: 'booth.html', html: '<p>Local booth</p>' }).then(async (saved) => {
                if (!saved.ok) { setNote(saved.data.error || 'The file was refused.'); return; }
                const read = await post({ kind: 'page', name: 'booth.html' });
                setBooth(read.data.html || '');
                setNote(read.ok ? 'Saved file read back. This is not a browser.' : (read.data.error || 'Refused.'));
              });
            }}>Open local booth</button>
            <button type="button" onClick={() => {
              void post({ kind: 'browse', mode: 'fixture' }).then((read) => {
                setNote(read.ok ? `Chrome clicked the fixture. Text: ${read.data.text || ''}.` : (read.data.error || 'Browser check failed.'));
              });
            }}>Run local browser check</button>
            <button type="button" onClick={() => {
              void post({ kind: 'browse', url: 'https://example.com' }).then((read) => {
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
        {booth && (
          <iframe title="Local booth" sandbox="allow-scripts" srcDoc={`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">${booth}`} style={{ width: '100%', height: 120, border: 0, background: '#fff' }} />
        )}
        <ul aria-label="Drafts">
          {drafts.map((draft) => (
            <li key={draft.id}>
              {draft.to} · {draft.status}
              {draft.status === 'review' && (
                <button type="button" onClick={() => {
                  void post({ kind: 'approve', id: draft.id }).then(async (saved) => {
                    setNote(saved.data.mockMail?.note || saved.data.delivery?.reason || saved.data.error || 'Not sent.');
                    await refresh();
                  });
                }}>Approve</button>
              )}
            </li>
          ))}
        </ul>
        {note && <p role="status">{note}</p>}
      </div>
    </main>
  );
}

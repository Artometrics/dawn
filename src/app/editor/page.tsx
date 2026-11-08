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
  useEffect(() => {
    let cancel = false;
    void (async () => {
      const base = await gatewayBase();
      const status = await probeDesk(fetch, `${base}/api/state`);
      if (!cancel) setDesk(status);
    })();
    return () => {
      cancel = true;
    };
  }, []);
  const status = desk === 'signin'
    ? 'Google sign-in is in front of the desk. Dawn Code itself is a separate process and is not this page.'
    : desk === 'ready'
      ? 'The agent desk answered. Dawn Code, the OpenVSCode process, is still a separate program and is not embedded here.'
      : 'Dawn Code, the OpenVSCode process in editor/, is not running on this static host.';
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
          <a href="/studio">Projects</a>
          <a href="/artifacts">Artifacts</a>
          <a href="/village?section=library">Village history</a>
        </nav>
        <label>
          What this page is not
          <textarea
            value={SAMPLE}
            readOnly
            rows={6}
            spellCheck={false}
            style={{ width: '100%', fontFamily: 'ui-monospace, monospace', fontSize: 16 }}
          />
        </label>
      </div>
    </main>
  );
}

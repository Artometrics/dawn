'use client';

import { useState } from 'react';
import '../agents/agents.css';

const SAMPLE = `// Sample only. Nothing on this page runs.
export function greet(name: string) {
  return \`Hello, \${name}\`;
}
`;

export default function EditorPage() {
  const [text, setText] = useState(SAMPLE);
  const [note, setNote] = useState('Edits stay in this browser. No model is called and no file is saved.');
  return (
    <main className="dawn-agents" style={{ minHeight: '100dvh', padding: '20px 16px 32px' }}>
      <div style={{ width: 'min(720px, 100%)', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p className="word">DAWN</p>
        <h1>Code</h1>
        <p className="note">This is the coding workspace shell. Dawn Code, the separate editor process, is not running on this host. The box below is a sample you can change locally. It does not execute.</p>
        <nav aria-label="Dawn" style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <a href="/">Town</a>
          <a href="/village">Village</a>
          <a href="/atlas">Atlas</a>
          <a href="/studio">Projects</a>
          <a href="/artifacts">Artifacts</a>
        </nav>
        <label>
          Sample file
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={10}
            spellCheck={false}
            style={{ width: '100%', fontFamily: 'ui-monospace, monospace', fontSize: 16 }}
          />
        </label>
        <button
          type="button"
          className="primary"
          onClick={() => setNote('Nothing ran. A model is not connected, and this host has no code runner.')}
        >
          Run
        </button>
        <p role="status">{note}</p>
      </div>
    </main>
  );
}

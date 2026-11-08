'use client';

import { useState } from 'react';
import { RecipesBoard } from '@/components/dawn-agents/recipes-board';
import '../agents/agents.css';

export default function ArtifactsPage() {
  const [note, setNote] = useState('These are Dawn style recipes. Looking and mixing work in this browser. Saving a like needs the gateway, which is not connected. This is not a Refero or Envato catalog.');
  return (
    <main className="dawn-agents" style={{ minHeight: '100dvh' }}>
      <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p className="word">DAWN</p>
        <h1>Artifacts</h1>
        <p className="note">{note}</p>
        <nav aria-label="Dawn" style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <a href="/">Town</a>
          <a href="/letter">Letter</a>
          <a href="/credits">Credits</a>
          <a href="/editor">Code</a>
        </nav>
      </div>
      <RecipesBoard
        onEvent={async (action) => {
          setNote(`“${action}” stayed on this page. The gateway is not connected, so it was not saved.`);
        }}
      />
    </main>
  );
}

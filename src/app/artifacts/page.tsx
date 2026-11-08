'use client';

import { useEffect, useState } from 'react';
import { RecipesBoard } from '@/components/dawn-agents/recipes-board';
import { api, gatewayBase, googleSignInHref } from '@/components/dawn-agents/api';
import { recipeAttributes, type Recipe } from '@/lib/dawn-agents/recipes';
import { probeDesk, type DeskStatus } from '@/lib/home/town-action';
import '../agents/agents.css';

export default function ArtifactsPage() {
  const [desk, setDesk] = useState<DeskStatus>('offline');
  const [base, setBase] = useState('');
  const [note, setNote] = useState('These are Dawn style recipes. Looking and mixing work in this browser.');
  useEffect(() => {
    let cancel = false;
    void (async () => {
      const next = await gatewayBase();
      const status = await probeDesk(fetch, `${next}/api/state`);
      if (cancel) return;
      setBase(next);
      setDesk(status);
      if (status === 'ready') setNote('These are Dawn style recipes. A like, save, or skip is written to the desk.');
      else if (status === 'signin') setNote('These are Dawn style recipes. Saving one needs Google sign-in.');
      else setNote('These are Dawn style recipes. The desk is not running, so a like stays on this page. This is not a Refero or Envato catalog.');
    })();
    return () => {
      cancel = true;
    };
  }, []);
  return (
    <main className="dawn-agents" style={{ minHeight: '100dvh' }}>
      <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p className="word">DAWN</p>
        <h1>Artifacts</h1>
        <p className="note" role="status">{note}</p>
        {desk === 'signin' && <a href={googleSignInHref()}>Sign in with Google</a>}
        <nav aria-label="Dawn" style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <a href="/">Town</a>
          <a href="/letter">Letter</a>
          <a href="/credits">Credits</a>
          <a href="/editor">Code</a>
          <a href="/village?section=library">Village history</a>
        </nav>
      </div>
      <RecipesBoard
        onEvent={async (action, recipe) => {
          if (desk !== 'ready') {
            setNote(`“${action}” stayed on this page. ${desk === 'signin' ? 'Sign in before it can be saved.' : 'The desk is not connected, so it was not saved.'}`);
            return;
          }
          await api(base, '/api/events', {
            method: 'POST',
            body: JSON.stringify({ surface: 'recipes', action, itemId: recipe.id, attributes: recipeAttributes(recipe as Recipe) }),
          });
          setNote(`“${action}” was sent to the desk.`);
        }}
      />
    </main>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { RecipesBoard } from '@/components/dawn-agents/recipes-board';
import { api, gatewayBase, googleSignInHref } from '@/components/dawn-agents/api';
import { recipeAttributes, type Recipe } from '@/lib/dawn-agents/recipes';
import { probeDesk, type DeskStatus } from '@/lib/home/town-action';
import { PageShell } from '@/components/site/page-shell';
import './recipes.css';

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
    <PageShell title="Recipes" current="/artifacts" wide lead="Dawn style recipes: layouts, textures, palettes and type to look at and mix. They are not a catalog of other products.">
      <p className="dw-alert" role="status">{note}</p>
      {desk === 'signin' && <a className="dw-btn dw-btn--primary" style={{ alignSelf: 'flex-start' }} href={googleSignInHref()}>Sign in with Google</a>}
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
    </PageShell>
  );
}

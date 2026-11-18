'use client';

import { useEffect, useState } from 'react';
import { RecipesBoard } from '@/components/dawn-agents/recipes-board';
import { api, gatewayBase } from '@/components/dawn-agents/api';
import { OfflineCard } from '@/components/shell/status-card';
import { recipeAttributes, type Recipe } from '@/lib/dawn-agents/recipes';
import { probeDesk, type DeskStatus } from '@/lib/home/town-action';
import { PageShell } from '@/components/site/page-shell';
import { RecipesStudio } from '@/components/studio/recipes-studio';
import './recipes.css';
import './studio.css';

export default function ArtifactsPage() {
  const [desk, setDesk] = useState<DeskStatus>('offline');
  const [base, setBase] = useState('');
  const [note, setNote] = useState('');
  const [offlineNote, setOfflineNote] = useState(false);
  useEffect(() => {
    let cancel = false;
    void (async () => {
      const next = await gatewayBase();
      const status = await probeDesk(fetch, `${next}/api/state`);
      if (cancel) return;
      setBase(next);
      setDesk(status);
    })();
    return () => {
      cancel = true;
    };
  }, []);
  return (
    <PageShell title="Recipes" wide>
      <RecipesStudio
        classic={
          <>
            <p className="dw-lead">
              Layouts, textures, palettes and type to look at and mix. Historical artifacts live in{' '}
              <a href="https://gotha.artometrics.com/artifacts">Gotha Artifacts</a>.
            </p>
              {note && <p className="dw-alert" role="status">{note}</p>}
              {offlineNote && <OfflineCard line="Desk not connected. Open your Dawn desk to save a like." />}
              <RecipesBoard
                onEvent={async (action, recipe) => {
                  if (desk !== 'ready') {
                    setOfflineNote(true);
                    return;
                  }
                  setOfflineNote(false);
                  await api(base, '/api/events', {
                    method: 'POST',
                    body: JSON.stringify({ surface: 'recipes', action, itemId: recipe.id, attributes: recipeAttributes(recipe as Recipe) }),
                  });
                  setNote(`Saved: ${action}.`);
                }}
              />
          </>
        }
      />
    </PageShell>
  );
}

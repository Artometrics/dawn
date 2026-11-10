'use client';

import { useEffect, useState } from 'react';
import { decodeBasemap, type BakedBasemap, type DecodedBasemap } from '../lib/basemap.ts';

type State = { status: 'loading' } | { status: 'ready'; map: DecodedBasemap } | { status: 'error'; message: string };

const cache = new Map<string, Promise<DecodedBasemap>>();

function load(url: string): Promise<DecodedBasemap> {
  let hit = cache.get(url);
  if (!hit) {
    hit = fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`Basemap ${response.status}`);
        return response.json() as Promise<BakedBasemap>;
      })
      .then(decodeBasemap);
    hit.catch(() => cache.delete(url));
    cache.set(url, hit);
  }
  return hit;
}

export function useBasemap(url: string): State {
  const [state, setState] = useState<State>({ status: 'loading' });
  useEffect(() => {
    let live = true;
    load(url).then(
      (map) => live && setState({ status: 'ready', map }),
      (error: unknown) => live && setState({ status: 'error', message: error instanceof Error ? error.message : 'Could not load the map' }),
    );
    return () => {
      live = false;
    };
  }, [url]);
  return state;
}

'use client';

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { PREVIEW_KEY, emptyPreview, normalizePreview, type PreviewState } from '@/lib/preview/board';

export function usePreviewState(): [PreviewState, Dispatch<SetStateAction<PreviewState>>, boolean] {
  const [state, setState] = useState<PreviewState>(emptyPreview);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(PREVIEW_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage does not exist during static render, so the saved board can only be read after hydration to keep the first client render equal to the static HTML
      if (raw) setState(normalizePreview(JSON.parse(raw)));
    } catch {
      setState(emptyPreview());
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    sessionStorage.setItem(PREVIEW_KEY, JSON.stringify(state));
  }, [ready, state]);

  return [state, setState, ready];
}

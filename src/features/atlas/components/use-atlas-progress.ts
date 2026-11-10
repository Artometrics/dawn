'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { emptyProgress, parseProgress, PROGRESS_KEY, serializeProgress, type Progress } from '../lib/progress.ts';

const listeners = new Set<() => void>();
const EMPTY = emptyProgress();

let memoryRaw: string | null = null;
let cacheRaw: string | null | undefined;
let cacheValue: Progress = EMPTY;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(PROGRESS_KEY) ?? memoryRaw;
  } catch {
    // Storage can be blocked (private browsing). Progress then lasts for this visit only.
    return memoryRaw;
  }
}

function getSnapshot(): Progress {
  const raw = readRaw();
  if (raw !== cacheRaw) {
    cacheRaw = raw;
    cacheValue = parseProgress(raw);
  }
  return cacheValue;
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  window.addEventListener('storage', notify);
  return () => {
    listeners.delete(notify);
    window.removeEventListener('storage', notify);
  };
}

function write(next: Progress | null) {
  const raw = next ? serializeProgress(next) : null;
  memoryRaw = raw;
  try {
    if (raw === null) window.localStorage.removeItem(PROGRESS_KEY);
    else window.localStorage.setItem(PROGRESS_KEY, raw);
  } catch {
    // Quota or blocked storage: keep the in-memory copy.
  }
  listeners.forEach((notify) => notify());
}

/** Atlas progress, kept in localStorage on this device only. */
export function useAtlasProgress() {
  const progress = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
  const update = useCallback((fn: (current: Progress) => Progress) => write(fn(getSnapshot())), []);
  const reset = useCallback(() => write(null), []);
  return { progress, update, reset };
}

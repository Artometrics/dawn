'use client';

import { useEffect, useState } from 'react';
import { api, gatewayBase, type Thread } from '@/components/dawn-agents/api';
import { probeDesk, type DeskStatus } from '@/lib/home/town-action';

/**
 * Whether the agent desk answers on this host, and its saved threads when it does.
 * Nothing is requested until `enabled` turns true, so the map loads with no desk traffic.
 */
export function useDesk(enabled: boolean): { desk: DeskStatus; threads: Thread[] } {
  const [desk, setDesk] = useState<DeskStatus>('offline');
  const [threads, setThreads] = useState<Thread[]>([]);
  const [asked, setAsked] = useState(false);

  useEffect(() => {
    if (!enabled || asked) return;
    let cancel = false;
    void (async () => {
      const base = await gatewayBase();
      const status = await probeDesk(fetch, `${base}/api/state`);
      if (cancel) return;
      setAsked(true);
      setDesk(status);
      if (status !== 'ready') return;
      try {
        const state = await api<{ threads?: Thread[] }>(base, '/api/state');
        if (!cancel) setThreads(state.threads ?? []);
      } catch {
        if (!cancel) setThreads([]);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [enabled, asked]);

  return { desk, threads };
}

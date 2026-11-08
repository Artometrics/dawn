'use client';

import { useEffect, useState } from 'react';
import { AgentsRoot } from '@/components/dawn-agents/agents-app';
import { gatewayBase } from '@/components/dawn-agents/api';
import { HomeClient } from '@/components/home/home-client';
import { probeDesk, type DeskStatus } from '@/lib/home/town-action';

export function AgentsEntry() {
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
  if (desk === 'loading') return <div className="dawn-agents login">Opening the agent list…</div>;
  if (desk === 'offline') return <HomeClient initialPanel />;
  return <AgentsRoot />;
}

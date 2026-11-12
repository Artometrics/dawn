'use client';

import { Suspense, useEffect, useState } from 'react';
import { AgentsRoot } from '@/components/dawn-agents/agents-app';
import { gatewayBase } from '@/components/dawn-agents/api';
import { DeskGate } from '@/components/shell/status-card';
import { PageShell } from '@/components/site/page-shell';
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
  if (desk === 'ready') {
    return (
      <Suspense fallback={null}>
        <AgentsRoot />
      </Suspense>
    );
  }
  return (
    <PageShell title="Agents" lead="Your agents and their chats.">
      <DeskGate status={desk} offline="Offline preview. Open live Dawn to see your agents." />
    </PageShell>
  );
}

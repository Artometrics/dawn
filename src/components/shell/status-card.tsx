'use client';

import { useEffect, useState } from 'react';
import { liveHref } from '@/lib/site/live';
import type { DeskStatus } from '@/lib/home/town-action';
import './status-card.css';

/** One calm card for "this needs the Dawn server". Offline pages link to the same page on the live origin. */
export function OfflineCard({ line = 'Offline preview. Open live Dawn to save and chat.' }: { line?: string }) {
  const [href, setHref] = useState<string | null>(null);
  useEffect(() => {
    // The origin is only known in the browser, so the link appears after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- static HTML cannot know the origin it is served from
    setHref(liveHref(`${location.pathname}${location.search}`, location.origin));
  }, []);
  return (
    <div className="sc" role="status" data-status="offline">
      <p className="sc-line">{line}</p>
      {href && <a className="sc-btn" href={href}>Open live Dawn</a>}
    </div>
  );
}

/** Picks the card for a desk status. Renders nothing while the desk is ready. */
export function DeskGate({ status, offline }: { status: DeskStatus | 'loading'; offline?: string }) {
  if (status === 'offline') return <OfflineCard line={offline} />;
  if (status === 'signin') {
    return (
      <div className="sc" role="status" data-status="closed">
        <p className="sc-line">This is not available right now.</p>
      </div>
    );
  }
  return null;
}

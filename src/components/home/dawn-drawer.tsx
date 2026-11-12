'use client';

import { useRef, type PointerEvent as ReactPointerEvent, type Ref } from 'react';
import { Box, Castle, Code, Folder, MapPinned, MessageCircle, User, X } from 'lucide-react';
import { googleSignInHref } from '@/components/dawn-agents/api';
import { TOWN_CAST } from '@/lib/credits/town';
import { DRAWER_LINKS, pinnedHref, recentsFrom, swipeClosesDrawer, VILLAGE_HISTORY_HREF } from '@/lib/home/drawer';
import type { DeskStatus } from '@/lib/home/town-action';
import type { Thread } from '@/components/dawn-agents/api';
import './dawn-drawer.css';

const ICONS: Record<string, typeof Folder> = {
  projects: Folder,
  code: Code,
  artifacts: Box,
  village: Castle,
  town: MapPinned,
};

export type DawnDrawerProps = {
  open: boolean;
  desk: DeskStatus;
  threads: Thread[];
  onClose: () => void;
  onYou: () => void;
  closeRef?: Ref<HTMLButtonElement>;
};

/** The Dawn sidebar: Projects, Code, Artifacts, Village, pinned agents, recents, and the account row. */
export function DawnDrawer({ open, desk, threads, onClose, onYou, closeRef }: DawnDrawerProps) {
  const recents = recentsFrom(desk, threads);
  const start = useRef<{ x: number; y: number; t: number; id: number } | null>(null);

  const onDown = (event: ReactPointerEvent<HTMLElement>) => {
    start.current = { x: event.clientX, y: event.clientY, t: performance.now(), id: event.pointerId };
  };
  const finish = (event: ReactPointerEvent<HTMLElement>, cancelled: boolean) => {
    const from = start.current;
    start.current = null;
    if (!from || from.id !== event.pointerId || cancelled) return;
    const swipe = { dx: event.clientX - from.x, dy: event.clientY - from.y, ms: performance.now() - from.t };
    if (swipeClosesDrawer(swipe, event.currentTarget.getBoundingClientRect().width)) onClose();
  };

  return (
    <aside
      id="dawn-menu"
      className="dd"
      data-open={open}
      aria-label="Dawn"
      inert={!open}
      onPointerDown={onDown}
      onPointerUp={(event) => finish(event, false)}
      onPointerCancel={(event) => finish(event, true)}
    >
      <div className="dd-head">
        <p className="dd-mark">Dawn</p>
        <button ref={closeRef} type="button" className="dd-close" aria-label="Close menu" onClick={onClose}>
          <X aria-hidden />
        </button>
      </div>
      <nav className="dd-nav" aria-label="Dawn">
        {DRAWER_LINKS.map((link) => {
          const Icon = ICONS[link.id] ?? Folder;
          return (
            <a key={link.id} href={link.href} data-drawer-link={link.id}>
              <Icon aria-hidden /> {link.label}
            </a>
          );
        })}
      </nav>
      <div className="dd-scroll">
        <p className="dd-label">Pinned</p>
        {TOWN_CAST.map((agent) => (
          <a key={agent.id} className="dd-row" href={pinnedHref(agent.id)} data-pinned={agent.id}>
            <img src={agent.src} alt="" width={28} height={28} />
            <span>{agent.name}</span>
          </a>
        ))}
        <p className="dd-label">Recents</p>
        {desk === 'signin' && <a className="dd-row" href={googleSignInHref()}>Sign in to see saved threads</a>}
        {desk === 'offline' && <p className="dd-note">No saved threads on this host.</p>}
        {desk === 'ready' && recents.length === 0 && <p className="dd-note">No saved threads on this desk.</p>}
        {recents.map((thread) => (
          <a key={thread.id} className="dd-row" href={thread.href}>
            <MessageCircle aria-hidden />
            <span>{thread.title}</span>
          </a>
        ))}
        <a className="dd-row" href={VILLAGE_HISTORY_HREF}>Village history</a>
      </div>
      <div className="dd-foot">
        <button type="button" className="dd-avatar" aria-label="You" onClick={onYou}>
          <User aria-hidden />
        </button>
        {desk === 'signin' && <a className="dd-account" href={googleSignInHref()}>Sign in with Google</a>}
        {desk === 'ready' && <a className="dd-account" href="/oauth2/sign_out?rd=/">Sign out</a>}
        {desk === 'offline' && <span className="dd-account dd-account--quiet">On this device</span>}
      </div>
    </aside>
  );
}

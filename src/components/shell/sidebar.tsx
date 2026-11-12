'use client';

import {
  BookOpen,
  Bot,
  Castle,
  Code,
  Database,
  FileCode2,
  Flag,
  Folder,
  Hammer,
  LayoutGrid,
  Mail,
  MapPinned,
  MessageCircle,
  Moon,
  Palette,
  Settings,
  Terminal,
  Users,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type Ref } from 'react';
import type { Thread } from '@/components/dawn-agents/api';
import { recentsFrom, swipeClosesDrawer } from '@/lib/home/drawer';
import type { DeskStatus } from '@/lib/home/town-action';
import { liveHref } from '@/lib/site/live';
import { activeItem, CREDITS_HREF, NAV_GROUPS, PINNED_AGENTS, pinnedHref, type IconKey } from '@/lib/site/nav';

const ICONS: Record<IconKey, typeof Folder> = {
  atlas: MapPinned,
  quests: Flag,
  village: Castle,
  characters: Hammer,
  library: BookOpen,
  projects: Folder,
  studio: Palette,
  recipes: LayoutGrid,
  letter: Mail,
  code: Code,
  nightcode: Moon,
  teammates: Users,
  editor: FileCode2,
  kits: Terminal,
  agents: Bot,
  desk: Bot,
  data: Database,
  settings: Settings,
};

export type SidebarProps = {
  open: boolean;
  desk: DeskStatus;
  threads: Thread[];
  onClose: () => void;
  closeRef?: Ref<HTMLButtonElement>;
};

/** The one Dawn sidebar. Same items in the same order on every route; the current page is highlighted. */
export function Sidebar({ open, desk, threads, onClose, closeRef }: SidebarProps) {
  const pathname = usePathname() || '/';
  const section = useSearchParams().get('section');
  const current = activeItem(pathname, section);
  const recents = recentsFrom(desk, threads);
  const start = useRef<{ x: number; y: number; t: number; id: number } | null>(null);
  const [live, setLive] = useState<string | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the origin is only known in the browser
    setLive(liveHref('/', location.origin));
  }, []);

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
      className="sb"
      aria-label="Dawn"
      data-sidebar="dawn"
      inert={!open}
      onPointerDown={onDown}
      onPointerUp={(event) => finish(event, false)}
      onPointerCancel={(event) => finish(event, true)}
    >
      <div className="sb-head">
        <p className="sb-mark">Dawn</p>
        <button ref={closeRef} type="button" className="as-round dw-dock-hide" aria-label="Close menu" onClick={onClose}>
          <X aria-hidden />
        </button>
      </div>
      <nav className="sb-scroll" aria-label="Dawn">
        {NAV_GROUPS.map((group) => (
          <div key={group.id} className="sb-group">
            {group.label && <p className="sb-label">{group.label}</p>}
            {group.items.map((item) => {
              const Icon = ICONS[item.icon];
              return (
                <Link key={item.id} className="sb-link" href={item.href} data-nav={item.id} aria-current={current?.id === item.id ? 'page' : undefined}>
                  <Icon aria-hidden />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
        <p className="sb-label">Pinned</p>
        {PINNED_AGENTS.map((agent) => (
          <Link key={agent.id} className="sb-link" href={pinnedHref(agent.id)} data-pinned={agent.id}>
            <img src={agent.src} alt="" width={24} height={24} />
            <span>{agent.name}</span>
          </Link>
        ))}
        <p className="sb-label">Recents</p>
        {recents.length === 0 && <p className="sb-note">{desk === 'ready' ? 'No saved chats yet.' : 'Nothing here yet.'}</p>}
        {recents.map((thread) => (
          <Link key={thread.id} className="sb-link" href={thread.href}>
            <MessageCircle aria-hidden />
            <span>{thread.title}</span>
          </Link>
        ))}
      </nav>
      <div className="sb-foot">
        <p className="sb-status">{desk === 'ready' ? 'Connected to Dawn' : 'Offline preview'}</p>
        {desk !== 'ready' && live && <a className="sb-link" href={live}>Open live Dawn</a>}
        <Link className="sb-link" href={CREDITS_HREF} aria-current={pathname.startsWith('/credits') ? 'page' : undefined}>Credits &amp; licenses</Link>
      </div>
    </aside>
  );
}

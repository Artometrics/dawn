'use client';

import { Menu } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Suspense,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { useDesk } from '@/components/home/use-desk';
import { swipeClosesDrawer } from '@/lib/home/drawer';
import type { DeskStatus } from '@/lib/home/town-action';
import { AGENTS } from '@/lib/agents';
import { CREDITS_HREF, normalizePath, pageTitle } from '@/lib/site/nav';
import { liveHref } from '@/lib/site/live';
import { Sidebar } from './sidebar';
import './shell.css';

/** The sidebar sits beside the page from this width. Below it, the page slides over and a scrim closes it. */
const DOCK_QUERY = '(min-width: 768px) and (min-height: 520px)';
const subscribeDock = (notify: () => void) => {
  const query = window.matchMedia(DOCK_QUERY);
  query.addEventListener('change', notify);
  return () => query.removeEventListener('change', notify);
};
const isDocked = () => window.matchMedia(DOCK_QUERY).matches;

/** Pages that fill the view and manage their own scrolling. Every other page scrolls inside the view. */
const FILL_ROUTES = new Set(['/', '/village', '/agents', '/studio', '/preview/village', '/town', '/atlas']);

type ShellState = { desk: DeskStatus; open: boolean; docked: boolean; setOpen: (open: boolean) => void };
const ShellContext = createContext<ShellState>({ desk: 'offline', open: false, docked: false, setOpen: () => undefined });
export const useShell = () => useContext(ShellContext);

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '/';
  const [open, setOpenState] = useState(false);
  const docked = useSyncExternalStore(subscribeDock, isDocked, () => false);
  const [asked, setAsked] = useState(false);
  const { desk, threads } = useDesk(asked || docked);
  const swipe = useRef<{ x: number; y: number; t: number; id: number } | null>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const refocus = useRef(false);

  const setOpen = useCallback((next: boolean, restoreFocus = true) => {
    if (next) setAsked(true);
    else refocus.current = restoreFocus;
    setOpenState(next);
  }, []);

  useEffect(() => {
    // A new page closes the sidebar. The shell itself never remounts, so it would otherwise stay open.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reacting to navigation is the point of this effect
    setOpenState(false);
  }, [pathname]);

  useEffect(() => {
    if (open && !docked) closeRef.current?.focus();
    else if (refocus.current) {
      refocus.current = false;
      menuRef.current?.focus();
    }
  }, [open, docked]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  const scrimDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    swipe.current = { x: event.clientX, y: event.clientY, t: performance.now(), id: event.pointerId };
  };
  const scrimUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const from = swipe.current;
    swipe.current = null;
    if (!from || from.id !== event.pointerId) return;
    const drawer = document.getElementById('dawn-menu')?.getBoundingClientRect().width ?? 300;
    const flick = { dx: event.clientX - from.x, dy: event.clientY - from.y, ms: performance.now() - from.t };
    if (swipeClosesDrawer(flick, drawer)) {
      event.preventDefault();
      setOpen(false);
    }
  };

  const value = useMemo<ShellState>(() => ({ desk, open, docked, setOpen: (next) => setOpen(next) }), [desk, open, docked, setOpen]);
  const fill = FILL_ROUTES.has(normalizePath(pathname));

  return (
    <ShellContext.Provider value={value}>
      <div className="as-root" data-open={open} data-docked={docked} data-shell="dawn">
        <a className="as-skip" href="#main">Skip to content</a>
        <Suspense fallback={null}>
          <Sidebar open={open || docked} desk={desk} threads={threads} closeRef={closeRef} onClose={() => setOpen(false)} />
        </Suspense>
        <div className="as-stage">
          <Suspense fallback={<TopBar title="Dawn" open={open} desk={desk} menuRef={menuRef} onMenu={() => setOpen(!open)} />}>
            <SectionBar open={open} desk={desk} menuRef={menuRef} onMenu={() => setOpen(!open)} />
          </Suspense>
          <div className="as-view" data-fill={fill} inert={open && !docked}>
            <div key={pathname} className="as-page">{children}</div>
          </div>
          {open && !docked && (
            <button
              type="button"
              className="as-scrim"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              onPointerDown={scrimDown}
              onPointerUp={scrimUp}
              onPointerCancel={() => {
                swipe.current = null;
              }}
            />
          )}
        </div>
      </div>
    </ShellContext.Provider>
  );
}

type BarProps = { open: boolean; desk: DeskStatus; menuRef: React.Ref<HTMLButtonElement>; onMenu: () => void };

function SectionBar(props: BarProps) {
  const pathname = usePathname() || '/';
  const params = useSearchParams();
  const agent = normalizePath(pathname) === '/village' ? AGENTS.find((item) => item.id === params.get('agent')) : undefined;
  return <TopBar {...props} title={agent?.name ?? pageTitle(pathname, params.get('section'))} />;
}

function TopBar({ title, open, desk, menuRef, onMenu }: BarProps & { title: string }) {
  const [account, setAccount] = useState(false);
  const [live, setLive] = useState<string | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the origin is only known in the browser
    setLive(liveHref('/', location.origin));
  }, []);
  useEffect(() => {
    if (!account) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAccount(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [account]);
  return (
    <header className="as-bar" data-bar="dawn">
      <button ref={menuRef} type="button" className="as-round" data-menu aria-label="Menu" aria-expanded={open} aria-controls="dawn-menu" onClick={onMenu}>
        <Menu aria-hidden />
      </button>
      <h2 className="as-title">{title}</h2>
      <button type="button" className="as-round" aria-label="Account" aria-expanded={account} onClick={() => setAccount((value) => !value)}>
        <img src="/tiles/you-0.png" alt="" width={28} height={28} />
      </button>
      {account && (
        <div className="as-menu" role="menu">
          <p>{desk === 'ready' ? 'Connected to Dawn.' : 'Offline preview.'}</p>
          {desk !== 'ready' && live && <a role="menuitem" href={live}>Open live Dawn</a>}
          <Link role="menuitem" href={CREDITS_HREF}>Credits &amp; licenses</Link>
        </div>
      )}
    </header>
  );
}

'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type PointerEvent as ReactPointerEvent } from 'react';
import { AtlasApp } from '@/features/atlas/components/atlas-app';
import { DawnDrawer } from '@/components/home/dawn-drawer';
import { useDesk } from '@/components/home/use-desk';
import { swipeClosesDrawer } from '@/lib/home/drawer';
import './atlas-home.css';

/** The sidebar sits beside the map from this width. Below it, the map slides over and a scrim closes it. Same cut as .dw-dock-hide. */
const DOCK_QUERY = '(min-width: 768px) and (min-height: 520px)';
const subscribeDock = (notify: () => void) => {
  const query = window.matchMedia(DOCK_QUERY);
  query.addEventListener('change', notify);
  return () => query.removeEventListener('change', notify);
};
const isDocked = () => window.matchMedia(DOCK_QUERY).matches;

/** Dawn's home screen. The Atlas map, with the Dawn sidebar behind its top-left button. */
export function AtlasHome() {
  const [open, setOpen] = useState(false);
  const [asked, setAsked] = useState(false);
  const [tabRequest, setTabRequest] = useState<{ tab: 'you'; id: number } | null>(null);
  const docked = useSyncExternalStore(subscribeDock, isDocked, () => false);
  const { desk, threads } = useDesk(asked);
  const closeRef = useRef<HTMLButtonElement>(null);
  const swipe = useRef<{ x: number; y: number; t: number; id: number } | null>(null);

  const show = () => {
    setAsked(true);
    setOpen(true);
  };
  const refocus = useRef(false);
  const hide = useCallback((restoreFocus = true) => {
    refocus.current = restoreFocus;
    setOpen(false);
  }, []);

  useEffect(() => {
    if (open) {
      closeRef.current?.focus();
    } else if (refocus.current) {
      // The map is inert until this render commits, so focus can only return now.
      refocus.current = false;
      document.querySelector<HTMLElement>('button[aria-controls="dawn-menu"]')?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') hide();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, hide]);

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
      hide();
    }
  };

  return (
    <div className="ah" data-open={open} data-docked={docked}>
      <DawnDrawer
        open={open}
        desk={desk}
        threads={threads}
        closeRef={closeRef}
        onClose={() => hide()}
        onYou={() => {
          setTabRequest((current) => ({ tab: 'you', id: (current?.id ?? 0) + 1 }));
          hide(false);
        }}
      />
      <div className="ah-stage">
        <div className="ah-map" inert={open && !docked}>
          <AtlasApp framed="home" onMenu={() => (open ? hide() : show())} menuOpen={open} tabRequest={tabRequest} />
        </div>
        {open && !docked && (
          <button
            type="button"
            className="ah-scrim"
            aria-label="Close menu"
            onClick={() => hide()}
            onPointerDown={scrimDown}
            onPointerUp={scrimUp}
            onPointerCancel={() => {
              swipe.current = null;
            }}
          />
        )}
      </div>
    </div>
  );
}

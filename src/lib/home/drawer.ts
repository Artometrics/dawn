/** Pure rules for the Dawn sidebar on the Atlas home. The component only wires them to the DOM. */
import type { Thread } from '@/components/dawn-agents/api';
import type { DeskStatus } from './town-action.ts';

export type DrawerLink = { id: string; label: string; href: string };

/** Where the sidebar sends you. Village and Dawn Town are the two pixel places that are no longer the first screen. */
export const DRAWER_LINKS: DrawerLink[] = [
  { id: 'projects', label: 'Projects', href: '/projects' },
  { id: 'code', label: 'Code', href: '/editor' },
  { id: 'artifacts', label: 'Artifacts', href: '/artifacts' },
  { id: 'village', label: 'Village', href: '/village?section=village' },
  { id: 'town', label: 'Dawn Town', href: '/town' },
];

export const VILLAGE_HISTORY_HREF = '/village?section=library';

/** A pinned agent opens its chat in the town, which owns the chat preview. */
export function pinnedHref(agentId: string): string {
  return `/town?bot=${encodeURIComponent(agentId)}`;
}

export type Recent = { id: string; title: string; href: string };

/** Saved direct and group chats, newest first. Only a ready desk has any. */
export function recentsFrom(desk: DeskStatus, threads: Thread[], limit = 8): Recent[] {
  if (desk !== 'ready') return [];
  return threads
    .filter((thread) => (thread.kind === 'direct' || thread.kind === 'group') && !thread.leftAt)
    .slice()
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, limit)
    .map((thread) => ({ id: thread.id, title: thread.title || 'Chat', href: `/agents?thread=${encodeURIComponent(thread.id)}` }));
}

export type Swipe = { dx: number; dy: number; ms: number };

/** A leftward, mostly horizontal flick closes the sidebar. A slow drag past a third of the sidebar does too. */
export function swipeClosesDrawer(swipe: Swipe, drawerWidth: number): boolean {
  const { dx, dy, ms } = swipe;
  if (dx >= 0) return false;
  const across = Math.abs(dx);
  if (across < Math.abs(dy) * 1.2) return false;
  if (across >= 48 && ms <= 400) return true;
  return across >= drawerWidth / 3;
}

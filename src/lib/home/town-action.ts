/** What a town control may do on this host. The static site has no agent gateway. */

export type DeskStatus = 'ready' | 'signin' | 'offline';

export type TownAction =
  | { kind: 'navigate'; href: string }
  | { kind: 'blocked'; title: string; reason: string };

export async function probeDesk(fetchImpl: typeof fetch, url: string): Promise<DeskStatus> {
  try {
    const response = await fetchImpl(url, { method: 'GET', redirect: 'manual' });
    if (response.status === 401 || response.status === 302 || response.status === 303) return 'signin';
    if (response.ok) return 'ready';
    return 'offline';
  } catch {
    return 'offline';
  }
}

export function townAction(href: string, desk: DeskStatus): TownAction {
  const path = href.split('?')[0] || '/';
  if (path === '/editor') {
    return { kind: 'blocked', title: 'Dawn Code', reason: 'The editor is not published on this host.' };
  }
  if (path === '/agents' || path.startsWith('/oauth2')) {
    if (desk === 'ready' || desk === 'signin') return { kind: 'navigate', href };
    return {
      kind: 'blocked',
      title: 'Ask Dawn',
      reason: 'The agent desk is not running on this host. The map, village, atlas, studio, and letter still open.',
    };
  }
  return { kind: 'navigate', href };
}

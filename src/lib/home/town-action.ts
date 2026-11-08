/** What a town control may do on this host. The static site has no agent gateway. */

export type DeskStatus = 'ready' | 'signin' | 'offline';

export type TownAction =
  | { kind: 'navigate'; href: string }
  | { kind: 'blocked'; title: string; reason: string };

/** A redirect response the browser will actually hand to script. Node keeps 302/303. Chrome's redirect:'manual' hides them as type opaqueredirect and status 0. */
export type DeskResponse = {
  status: number;
  ok: boolean;
  type?: string;
};

export function classifyDesk(response: DeskResponse): DeskStatus {
  if (response.type === 'opaqueredirect') return 'signin';
  if (response.status === 401 || response.status === 302 || response.status === 303) return 'signin';
  if (response.ok && response.type !== 'error' && response.type !== 'opaque') return 'ready';
  return 'offline';
}

export async function probeDesk(fetchImpl: typeof fetch, url: string): Promise<DeskStatus> {
  try {
    const response = await fetchImpl(url, { method: 'GET', redirect: 'manual', credentials: 'include' });
    return classifyDesk(response);
  } catch {
    return 'offline';
  }
}

export function townAction(href: string, desk: DeskStatus): TownAction {
  const path = href.split('?')[0] || '/';
  if (path === '/agents' || path.startsWith('/oauth2')) {
    if (desk === 'ready' || desk === 'signin') return { kind: 'navigate', href };
    return {
      kind: 'blocked',
      title: 'Ask Dawn',
      reason: 'The agent desk is not running on this host. The map, village, atlas, studio, letter, code, and artifacts still open.',
    };
  }
  return { kind: 'navigate', href };
}

export type KitResult<T> =
  | { status: 'ok'; data: T }
  | { status: 'offline' }
  | { status: 'closed' }
  | { status: 'error'; message: string };

/**
 * One call to a Dawn gateway route on this origin.
 * offline: nothing JSON answered (a static host). closed: the gateway refused the request.
 */
export async function kitCall<T>(path: string, init: RequestInit = {}): Promise<KitResult<T>> {
  let response: Response;
  try {
    response = await fetch(path, { ...init, credentials: 'include', redirect: 'manual' });
  } catch {
    return { status: 'offline' };
  }
  if (response.type === 'opaqueredirect' || response.status === 401 || response.status === 403) return { status: 'closed' };
  if (!(response.headers.get('content-type') || '').includes('json')) return { status: 'offline' };
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) return { status: 'error', message: data.error || `The request failed (${response.status}).` };
  return { status: 'ok', data };
}

export function jsonInit(body: unknown): RequestInit {
  return { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) };
}

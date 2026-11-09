const MUTATIONS = new Set(['POST', 'PATCH', 'DELETE']);

/** Browser calls that are allowed to reach an owner mutation. Not a wildcard and not the Host header. */
export const DEFAULT_TRUSTED_ORIGINS = [
  'https://2-29-173-68.sslip.io',
  'http://127.0.0.1:3000',
  'http://localhost:3000',
] as const;

export type MutationDecision =
  | { allow: true }
  | { allow: false; status: 403; error: string };

/**
 * Owner writes fail closed.
 * A browser request (Origin or Sec-Fetch-Site) must send JSON, a trusted Origin,
 * and must not be cross-site. A non-browser client omits both of those headers
 * and still needs the owner check. Host is not consulted.
 */
export function ownerMutationDecision(
  method: string,
  headers: { origin?: string; secFetchSite?: string; contentType?: string },
  trustedOrigins: readonly string[],
): MutationDecision {
  if (!MUTATIONS.has(method)) return { allow: true };
  const origin = (headers.origin || '').trim();
  const site = (headers.secFetchSite || '').trim().toLowerCase();
  const contentType = (headers.contentType || '').split(';')[0].trim().toLowerCase();
  const browser = Boolean(origin || site);
  if (browser) {
    if (site === 'cross-site') return { allow: false, status: 403, error: 'Cross-site requests are refused.' };
    if (!origin || !trustedOrigins.includes(origin)) return { allow: false, status: 403, error: 'Origin is not allowed.' };
    if (site && site !== 'same-origin' && site !== 'same-site') {
      return { allow: false, status: 403, error: 'Request provenance is refused.' };
    }
  }
  if (contentType !== 'application/json') return { allow: false, status: 403, error: 'JSON is required.' };
  return { allow: true };
}

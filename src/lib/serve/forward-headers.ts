/** Headers a browser must not be able to set. oauth2-proxy is the only writer. */
export const CLIENT_AUTH_HEADERS = [
  'x-auth-request-email',
  'x-auth-request-user',
  'x-auth-request-preferred-username',
  'x-forwarded-email',
] as const;

/**
 * Drops client auth headers, then sets the owner email only when this
 * process already decided the session. The gateway trusts that header
 * from loopback, so a proxy that forwards the client value would be a spoof.
 */
export function forwardedApiHeaders(
  incoming: Iterable<[string, string]>,
  sessionEmail: string | null,
): Headers {
  const headers = new Headers();
  for (const [key, value] of incoming) {
    const name = key.toLowerCase();
    if (name === 'host' || name === 'content-length') continue;
    if (CLIENT_AUTH_HEADERS.includes(name as (typeof CLIENT_AUTH_HEADERS)[number])) continue;
    headers.append(key, value);
  }
  if (sessionEmail) headers.set('x-auth-request-email', sessionEmail);
  return headers;
}

/**
 * Where the browser should call the agents gateway.
 * An empty string means same origin (`/api` on this host).
 * Whitespace is empty. A deploy that leaves gatewayUrl blank must not
 * fall through to a hardcoded host.
 */
export function resolveGatewayBase(envValue: string | undefined, configValue: unknown): string {
  const env = typeof envValue === 'string' ? envValue.trim() : '';
  if (env) return stripSlash(env);
  const config = typeof configValue === 'string' ? configValue.trim() : '';
  if (config) return stripSlash(config);
  return '';
}

function stripSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

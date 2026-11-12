/** The origin that runs the Dawn gateway. The static Firebase site has no gateway and links here for anything that needs one. */
export const LIVE_ORIGIN = (process.env.NEXT_PUBLIC_DAWN_LIVE_ORIGIN || 'https://2-29-173-68.sslip.io').trim().replace(/\/+$/, '');

/** The same path on the live origin, or null when this page already is the live origin. */
export function liveHref(pathAndQuery: string, currentOrigin: string, live: string = LIVE_ORIGIN): string | null {
  if (!live || currentOrigin.replace(/\/+$/, '') === live) return null;
  return `${live}${pathAndQuery.startsWith('/') ? pathAndQuery : `/${pathAndQuery}`}`;
}

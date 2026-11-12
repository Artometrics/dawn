/** A sliding-window limit per key, kept in memory. Used for the per-IP cap on chat requests. */
export class RateLimiter {
  private hits = new Map<string, number[]>();

  private readonly max: number;
  private readonly windowMs: number;
  private readonly now: () => number;

  constructor(max: number, windowMs = 60_000, now: () => number = Date.now) {
    this.max = max;
    this.windowMs = windowMs;
    this.now = now;
  }

  take(key: string): boolean {
    const at = this.now();
    const recent = (this.hits.get(key) ?? []).filter((time) => at - time < this.windowMs);
    if (recent.length >= this.max) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(at);
    this.hits.set(key, recent);
    if (this.hits.size > 5000) {
      for (const [other, times] of this.hits) {
        if (!times.some((time) => at - time < this.windowMs)) this.hits.delete(other);
      }
    }
    return true;
  }
}

export function perIpLimit(env: Record<string, string | undefined> = process.env): number {
  const value = Number(env.DAWN_IP_RATE_PER_MINUTE);
  return Number.isFinite(value) && value >= 1 ? Math.floor(value) : 20;
}

/** The caller's address. A forwarded address counts only when the hop is the local reverse proxy. */
export function clientIp(remote: string | undefined, forwarded: string | string[] | undefined): string {
  const local = !remote || remote === '127.0.0.1' || remote === '::1' || remote === '::ffff:127.0.0.1';
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim();
  return local && first ? first : remote || 'local';
}

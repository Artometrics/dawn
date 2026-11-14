import type { LngLat } from './types.ts';

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

/** Haversine-free equirectangular metres. `a` and `b` are `[lon, lat]`. */
export function distance(a: LngLat, b: LngLat): number {
  const r = Math.PI / 180;
  const x = (b[0] - a[0]) * r * Math.cos(((a[1] + b[1]) / 2) * r);
  const y = (b[1] - a[1]) * r;
  return Math.hypot(x, y) * 6371e3;
}

/**
 * Pacific calendar day, same boundary as Atlas `pacificDay`.
 * Questroad used the phone's local date; Walk uses Pacific so a day
 * ends once for everyone Dawn already counts hunts for.
 */
export function pacificDay(now: Date): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

/** Add calendar days to a `YYYY-MM-DD` key. */
export function shiftDay(day: string, delta: number): string {
  const [year, month, date] = day.split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, date + delta));
  return utc.toISOString().slice(0, 10);
}

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** Hour and weekday in Pacific time. Hour 24 (midnight in some engines) becomes 0. */
export function pacificClock(now: Date): { hour: number; weekday: number } {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    hour: '2-digit',
    hourCycle: 'h23',
    weekday: 'short',
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map((part) => [part.type, part.value]));
  let hour = Number(parts.hour);
  if (!Number.isFinite(hour)) hour = 0;
  if (hour === 24) hour = 0;
  return { hour, weekday: WEEKDAYS[parts.weekday] ?? 0 };
}

/** ISO week, `YYYY-Www`. Kept from Questroad; the weekly board itself is not. */
export function isoWeek(now = new Date()): string {
  const t = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const n = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - n);
  const year = t.getUTCFullYear();
  const week = Math.ceil(((t.getTime() - Date.UTC(year, 0, 1)) / 864e5 + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

export function geohash(lat: number, lon: number, precision: number): string {
  const latRange: [number, number] = [-90, 90];
  const lonRange: [number, number] = [-180, 180];
  let out = '';
  let bit = 0;
  let ch = 0;
  let even = true;
  while (out.length < precision) {
    const range = even ? lonRange : latRange;
    const value = even ? lon : lat;
    const mid = (range[0] + range[1]) / 2;
    if (value >= mid) {
      ch |= 16 >> bit;
      range[0] = mid;
    } else range[1] = mid;
    even = !even;
    if (++bit === 5) {
      out += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }
  return out;
}

export function geohashBox(hash: string): { la: [number, number]; lo: [number, number] } {
  const latRange: [number, number] = [-90, 90];
  const lonRange: [number, number] = [-180, 180];
  let even = true;
  for (const ch of hash) {
    const value = BASE32.indexOf(ch);
    for (let bit = 4; bit >= 0; bit--) {
      const range = even ? lonRange : latRange;
      const mid = (range[0] + range[1]) / 2;
      if ((value >> bit) & 1) range[0] = mid;
      else range[1] = mid;
      even = !even;
    }
  }
  return { la: latRange, lo: lonRange };
}

export function geohashAround(lat: number, lon: number, precision: number): string[] {
  const box = geohashBox(geohash(lat, lon, precision));
  const dLat = box.la[1] - box.la[0];
  const dLon = box.lo[1] - box.lo[0];
  const cells = new Set<string>();
  for (const i of [-1, 0, 1]) {
    for (const j of [-1, 0, 1]) cells.add(geohash(lat + i * dLat, lon + j * dLon, precision));
  }
  return [...cells];
}

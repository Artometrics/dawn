type Fields = {
  minute: Set<number>;
  hour: Set<number>;
  day: Set<number>;
  month: Set<number>;
  dow: Set<number>;
};

function parseField(spec: string, min: number, max: number): Set<number> | null {
  const set = new Set<number>();
  for (const raw of spec.split(',')) {
    const part = raw.trim();
    if (!part) return null;
    const stepMatch = part.match(/^(.*)\/(\d+)$/);
    const step = stepMatch ? Number(stepMatch[2]) : 1;
    const base = (stepMatch ? stepMatch[1] : part).trim();
    if (!Number.isInteger(step) || step < 1) return null;
    let lo = min;
    let hi = max;
    if (base !== '*') {
      const range = base.match(/^(\d+)-(\d+)$/);
      if (range) {
        lo = Number(range[1]);
        hi = Number(range[2]);
      } else if (/^\d+$/.test(base)) {
        lo = Number(base);
        hi = lo;
      } else {
        return null;
      }
    }
    if (lo < min || hi > max || lo > hi) return null;
    for (let n = lo; n <= hi; n += step) set.add(n);
  }
  return set.size ? set : null;
}

export function parseCron(expr: string): Fields | null {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return null;
  const minute = parseField(parts[0], 0, 59);
  const hour = parseField(parts[1], 0, 23);
  const day = parseField(parts[2], 1, 31);
  const month = parseField(parts[3], 1, 12);
  const dow = parseField(parts[4], 0, 7);
  if (!minute || !hour || !day || !month || !dow) return null;
  if (dow.has(7)) {
    dow.add(0);
    dow.delete(7);
  }
  return { minute, hour, day, month, dow };
}

function matches(fields: Fields, date: Date): boolean {
  return (
    fields.minute.has(date.getUTCMinutes()) &&
    fields.hour.has(date.getUTCHours()) &&
    fields.day.has(date.getUTCDate()) &&
    fields.month.has(date.getUTCMonth() + 1) &&
    fields.dow.has(date.getUTCDay())
  );
}

/** Next UTC minute strictly after `fromMs`. Day-of-week 0 and 7 are Sunday. */
export function nextCron(expr: string, fromMs: number): number | null {
  const fields = parseCron(expr);
  if (!fields) return null;
  const start = new Date(fromMs);
  start.setUTCSeconds(0, 0);
  const origin = start.getTime() + 60_000;
  for (let i = 0; i < 366 * 24 * 60; i += 1) {
    const at = origin + i * 60_000;
    if (matches(fields, new Date(at))) return at;
  }
  return null;
}

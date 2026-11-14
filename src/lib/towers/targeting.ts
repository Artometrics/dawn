import type { TargetMode } from './config';

export type Targetable = {
  id: number;
  x: number;
  z: number;
  flying: boolean;
  hp: number;
  progress: number;
  alive?: boolean;
};

export type TargetOptions = {
  air: boolean;
  ground: boolean;
  splash?: number;
  exclude?: ReadonlySet<number>;
};

export function canHit(e: Targetable, opts: TargetOptions): boolean {
  return e.flying ? opts.air : opts.ground;
}

export function inRange(origin: { x: number; z: number }, e: Targetable, range: number): boolean {
  return Math.hypot(e.x - origin.x, e.z - origin.z) <= range;
}

export function pickTarget<T extends Targetable>(
  mode: TargetMode,
  origin: { x: number; z: number },
  range: number,
  enemies: readonly T[],
  opts: TargetOptions,
): T | null {
  let best: T | null = null;
  let bestScore = -Infinity;
  for (const e of enemies) {
    if (e.alive === false || opts.exclude?.has(e.id)) continue;
    if (!canHit(e, opts) || !inRange(origin, e, range)) continue;
    let score: number;
    if (mode === 'first') score = e.progress;
    else if (mode === 'strongest') score = e.hp;
    else if (mode === 'closest') score = -Math.hypot(e.x - origin.x, e.z - origin.z);
    else {
      const r = opts.splash ?? 1;
      let n = 0;
      for (const o of enemies) if (o.alive !== false && canHit(o, opts) && Math.hypot(o.x - e.x, o.z - e.z) <= r) n++;
      score = n + e.progress * 0.001;
    }
    if (score > bestScore || (score === bestScore && best !== null && e.id < best.id)) {
      best = e;
      bestScore = score;
    }
  }
  return best;
}

export function pickTargets<T extends Targetable>(
  mode: TargetMode,
  origin: { x: number; z: number },
  range: number,
  enemies: readonly T[],
  opts: TargetOptions,
  count: number,
): T[] {
  const chosen: T[] = [];
  const exclude = new Set<number>(opts.exclude);
  for (let i = 0; i < count; i++) {
    const next = pickTarget(mode, origin, range, enemies, { ...opts, exclude });
    if (!next) break;
    chosen.push(next);
    exclude.add(next.id);
  }
  return chosen;
}

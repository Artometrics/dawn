import { ENEMIES, MAX_WAVE, type EnemyKind } from './config';

export type SpawnGroup = { kind: EnemyKind; count: number; start: number; interval: number };
export type WaveDef = { number: number; groups: readonly SpawnGroup[]; hpScale: number; bonus: number };

const g = (kind: EnemyKind, count: number, start: number, interval: number): SpawnGroup => ({ kind, count, start, interval });

const GROUPS: readonly (readonly SpawnGroup[])[] = [
  [g('smudge', 8, 0, 1.1)],
  [g('smudge', 12, 0, 0.8)],
  [g('blotter', 3, 0, 3.0), g('smudge', 8, 2, 0.9)],
  [g('moth', 6, 0, 1.4), g('smudge', 8, 4, 0.7)],
  [g('blotter', 6, 0, 2.2), g('moth', 6, 3, 1.2)],
  [g('smudge', 20, 0, 0.5), g('blotter', 4, 4, 2.5)],
  [g('moth', 12, 0, 0.9), g('smudge', 10, 3, 0.7), g('blotter', 4, 6, 2.5)],
  [g('blotter', 10, 0, 1.8), g('smudge', 16, 2, 0.5), g('moth', 8, 8, 1.0)],
  [g('smudge', 24, 0, 0.4), g('moth', 14, 2, 0.8), g('blotter', 8, 5, 1.6)],
  [g('blotter', 6, 0, 2.0), g('moth', 10, 4, 0.9), g('eraser', 1, 8, 1), g('smudge', 20, 10, 0.4)],
];

export const hpScaleFor = (n: number): number => 1 + 0.28 * (n - 1);
export const bonusFor = (n: number): number => 15 + 5 * n;

export const WAVES: readonly WaveDef[] = GROUPS.map((groups, i) => ({
  number: i + 1,
  groups,
  hpScale: hpScaleFor(i + 1),
  bonus: bonusFor(i + 1),
}));

export type Spawn = { time: number; kind: EnemyKind };

export function schedule(wave: WaveDef): Spawn[] {
  const out: Spawn[] = [];
  for (const group of wave.groups) {
    for (let i = 0; i < group.count; i++) out.push({ time: group.start + i * group.interval, kind: group.kind });
  }
  out.sort((a, b) => a.time - b.time);
  return out;
}

export function enemyHp(kind: EnemyKind, wave: WaveDef): number {
  const def = ENEMIES[kind];
  return def.fixedHp ? def.hp : Math.round(def.hp * wave.hpScale);
}

if (WAVES.length !== MAX_WAVE) throw new Error('WAVES must have MAX_WAVE entries.');

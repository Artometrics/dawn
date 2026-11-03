import { spriteById } from '../credits/sprites';
import type { PixelAvatar } from './types';

export const PALETTE = ['', '#0047ff', '#ff3d8a', '#f4f1ea', '#10131c', '#7aa2ff', '#ff9ec4', '#243049'] as const;

export const PAINT_COLORS = ['0', '1', '2', '3', '4', '5', '6', '7'] as const;

function hashSeed(seed: string): number {
  let hash = 0;
  for (const char of seed) hash = (hash * 33 + char.charCodeAt(0)) >>> 0;
  return hash;
}

function draw8(seed: string): string {
  const cells = Array.from({ length: 64 }, () => '0');
  const set = (x: number, y: number, value: string) => {
    if (x < 0 || y < 0 || x > 7 || y > 7) return;
    cells[y * 8 + x] = value;
  };
  const hash = hashSeed(seed);
  const body = ['1', '2', '5', '6'][hash % 4];
  for (let y = 1; y <= 4; y += 1) {
    for (let x = 2; x <= 5; x += 1) set(x, y, '3');
  }
  set(2, 2, '4');
  set(5, 2, '4');
  set(3, 4, body);
  set(4, 4, body);
  for (let y = 5; y <= 7; y += 1) {
    for (let x = 2; x <= 5; x += 1) set(x, y, body);
  }
  set(1, 5, body);
  set(6, 5, body);
  if (hash % 2 === 0) {
    set(2, 0, body);
    set(5, 0, body);
  }
  return cells.join('');
}

export function scaleAvatar(cells: string, from: 8 | 16, to: 8 | 16): string {
  if (from === to) return cells.slice(0, from * from);
  if (from === 8 && to === 16) {
    let big = '';
    for (let y = 0; y < 8; y += 1) {
      const wide = cells
        .slice(y * 8, y * 8 + 8)
        .split('')
        .map((cell) => cell + cell)
        .join('');
      big += wide + wide;
    }
    return big;
  }
  let small = '';
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) small += cells[(y * 2) * 16 + x * 2] || '0';
  }
  return small;
}

export function avatarFromSeed(seed: string, grid: 8 | 16 = 8): PixelAvatar {
  const base = draw8(seed || 'dawn');
  if (grid === 8) return { grid: 8, cells: base };
  return { grid: 16, cells: scaleAvatar(base, 8, 16) };
}

export function validAvatar(value: unknown): value is PixelAvatar {
  if (!value || typeof value !== 'object') return false;
  const avatar = value as PixelAvatar;
  if (typeof avatar.sprite === 'string' && spriteById(avatar.sprite)) return true;
  if (avatar.grid !== 8 && avatar.grid !== 16) return false;
  return typeof avatar.cells === 'string' && avatar.cells.length === avatar.grid * avatar.grid && /^[0-7]+$/.test(avatar.cells);
}

'use client';

import { useEffect, useRef } from 'react';
const TILE = 16;
const SHEET_COLS = 12;
const SHEET_SRC = '/tiles/kenney-tiny-town.png';

export const WALLPAPERS = [
  { id: 'plain', name: 'Plain' },
  { id: 'town', name: 'Town' },
  { id: 'grove', name: 'Grove' },
  { id: 'castle', name: 'Castle' },
] as const;

export type WallpaperId = (typeof WALLPAPERS)[number]['id'];

const WALL_KEY = 'dawn-chat-wallpaper';

export function readWallpaper(): WallpaperId {
  if (typeof localStorage === 'undefined') return 'plain';
  const saved = localStorage.getItem(WALL_KEY);
  return WALLPAPERS.some((item) => item.id === saved) ? (saved as WallpaperId) : 'plain';
}

export function writeWallpaper(id: WallpaperId) {
  localStorage.setItem(WALL_KEY, id);
}

export function ChatWallpaper({ scene }: { scene: WallpaperId }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || scene === 'plain') return;
    const image = new Image();
    let cancel = false;
    image.onload = () => {
      if (!cancel) paintWallpaper(canvas, image, scene);
    };
    image.src = SHEET_SRC;
    return () => {
      cancel = true;
    };
  }, [scene]);

  if (scene === 'plain') return null;
  return <canvas ref={ref} className="im-wall" aria-hidden />;
}

function paintWallpaper(canvas: HTMLCanvasElement, sheet: HTMLImageElement, scene: Exclude<WallpaperId, 'plain'>) {
  const { ground, object } = sceneGrid(scene);
  const rows = ground.length;
  const cols = ground[0].length;
  const scale = 3;
  canvas.width = cols * TILE * scale;
  canvas.height = rows * TILE * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  const draw = (index: number, x: number, y: number) => {
    const sx = (index % SHEET_COLS) * TILE;
    const sy = Math.floor(index / SHEET_COLS) * TILE;
    ctx.drawImage(sheet, sx, sy, TILE, TILE, x * TILE * scale, y * TILE * scale, TILE * scale, TILE * scale);
  };
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) draw(ground[y][x], x, y);
  }
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const tile = object[y][x];
      if (tile != null) draw(tile, x, y);
    }
  }
}

function sceneGrid(scene: Exclude<WallpaperId, 'plain'>): { ground: number[][]; object: (number | null)[][] } {
  const cols = 18;
  const rows = 24;
  const ground: number[][] = Array.from({ length: rows }, (_, y) =>
    Array.from({ length: cols }, (_, x) => ((x * 5 + y * 3) % 19 === 0 ? 1 : 0)),
  );
  const object: (number | null)[][] = Array.from({ length: rows }, () => Array<number | null>(cols).fill(null));
  if (scene === 'grove') {
    for (let y = 2; y < rows; y += 2) {
      for (let x = 1; x < cols - 1; x += 2) {
        if ((x + y) % 4 === 0) continue;
        object[y - 1][x] = y % 4 === 0 ? 5 : 4;
        object[y][x] = 16;
      }
    }
    for (let y = 9; y < 16; y += 1) ground[y][9] = 25;
    return { ground, object };
  }
  if (scene === 'castle') {
    for (let x = 0; x < cols; x += 1) ground[16][x] = 25;
    place(object, 6, 8, 6, [96, 99, 100, 101, 102, 98, 108, 111, 112, 113, 114, 110, 120, 123, 125, 126, 124, 122]);
    tree(object, 2, 14);
    tree(object, 15, 14);
    tree(object, 2, 6);
    tree(object, 15, 6);
    return { ground, object };
  }
  for (let y = 0; y < rows; y += 1) ground[y][8] = 25;
  for (let x = 3; x < 14; x += 1) ground[12][x] = 25;
  place(object, 2, 3, 4, [63, 64, 66, 67, 84, 85, 86, 87]);
  place(object, 11, 7, 4, [52, 53, 54, 55, 72, 84, 85, 75]);
  tree(object, 1, 10);
  tree(object, 15, 11);
  tree(object, 4, 18);
  object[16][13] = 29;
  return { ground, object };
}

function place(object: (number | null)[][], x: number, y: number, width: number, tiles: number[]) {
  for (let i = 0; i < tiles.length; i += 1) {
    const cx = x + (i % width);
    const cy = y + Math.floor(i / width);
    if (object[cy] && cx >= 0 && cx < object[cy].length) object[cy][cx] = tiles[i];
  }
}

function tree(object: (number | null)[][], x: number, y: number) {
  if (y <= 0 || !object[y] || !object[y - 1]) return;
  object[y - 1][x] = 4;
  object[y][x] = 16;
}

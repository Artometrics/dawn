import type { Bounds, XY } from './geo.ts';

/** The camera: the world point at the middle of the screen and pixels per metre. */
export type View = { cx: number; cy: number; scale: number };
export type Size = { w: number; h: number };
export type Insets = { top: number; right: number; bottom: number; left: number };

export const MIN_SCALE = 0.12;
export const MAX_SCALE = 3.2;

export const clampScale = (scale: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));

export function worldToScreen(view: View, size: Size, point: XY): XY {
  return { x: size.w / 2 + (point.x - view.cx) * view.scale, y: size.h / 2 + (point.y - view.cy) * view.scale };
}

export function screenToWorld(view: View, size: Size, point: XY): XY {
  return { x: view.cx + (point.x - size.w / 2) / view.scale, y: view.cy + (point.y - size.h / 2) / view.scale };
}

/** A view that fits the bounds inside the screen, leaving room for floating chrome. */
export function fitBounds(bounds: Bounds, size: Size, insets: Insets, maxScale = 1.4): View {
  const availW = Math.max(40, size.w - insets.left - insets.right);
  const availH = Math.max(40, size.h - insets.top - insets.bottom);
  const spanX = Math.max(30, bounds.x1 - bounds.x0);
  const spanY = Math.max(30, bounds.y1 - bounds.y0);
  const scale = clampScale(Math.min(availW / spanX, availH / spanY, maxScale));
  const midX = (bounds.x0 + bounds.x1) / 2;
  const midY = (bounds.y0 + bounds.y1) / 2;
  // The fitted box centres in the free area, so the camera centre sits off by half the inset difference.
  const shiftX = (insets.left - insets.right) / 2 / scale;
  const shiftY = (insets.top - insets.bottom) / 2 / scale;
  return { cx: midX - shiftX, cy: midY - shiftY, scale };
}

/** Zoom about a screen point so the world point under it stays put. */
export function zoomAt(view: View, size: Size, anchor: XY, factor: number): View {
  const scale = clampScale(view.scale * factor);
  const before = screenToWorld(view, size, anchor);
  return {
    scale,
    cx: before.x - (anchor.x - size.w / 2) / scale,
    cy: before.y - (anchor.y - size.h / 2) / scale,
  };
}

export function panBy(view: View, dxPx: number, dyPx: number): View {
  return { ...view, cx: view.cx - dxPx / view.scale, cy: view.cy - dyPx / view.scale };
}

/** Keeps the camera inside the baked frame, with a margin, so the user cannot pan into empty space. */
export function clampView(view: View, size: Size, bounds: Bounds, marginM = 200): View {
  const halfW = size.w / 2 / view.scale;
  const halfH = size.h / 2 / view.scale;
  const clamp = (value: number, lo: number, hi: number) => (lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, value)));
  return {
    ...view,
    cx: clamp(view.cx, bounds.x0 + halfW - marginM, bounds.x1 - halfW + marginM),
    cy: clamp(view.cy, bounds.y0 + halfH - marginM, bounds.y1 - halfH + marginM),
  };
}

import assert from 'node:assert/strict';
import test from 'node:test';
import { layoutMarkers } from './labels.ts';
import { clampScale, clampView, fitBounds, panBy, screenToWorld, worldToScreen, zoomAt, MAX_SCALE, MIN_SCALE } from './viewport.ts';

const size = { w: 390, h: 844 };

test('screen and world are inverse', () => {
  const view = { cx: 120, cy: -300, scale: 0.7 };
  const point = { x: 33, y: -410 };
  const back = screenToWorld(view, size, worldToScreen(view, size, point));
  assert.ok(Math.abs(back.x - point.x) < 1e-9 && Math.abs(back.y - point.y) < 1e-9);
  assert.deepEqual(worldToScreen(view, size, { x: 120, y: -300 }), { x: 195, y: 422 });
});

test('fit puts the bounds inside the free area, below the floating search and above the sheet', () => {
  const bounds = { x0: -100, y0: -1200, x1: 100, y1: -100 };
  const insets = { top: 70, right: 12, bottom: 400, left: 12 };
  const view = fitBounds(bounds, size, insets);
  const tl = worldToScreen(view, size, { x: bounds.x0, y: bounds.y0 });
  const br = worldToScreen(view, size, { x: bounds.x1, y: bounds.y1 });
  assert.ok(tl.y >= insets.top - 1 && br.y <= size.h - insets.bottom + 1, `${tl.y} ${br.y}`);
  assert.ok(tl.x >= insets.left - 1 && br.x <= size.w - insets.right + 1);
  assert.ok(view.scale <= 1.4);
});

test('zoom keeps the point under the finger still, and scale stays in range', () => {
  const view = { cx: 0, cy: 0, scale: 0.5 };
  const anchor = { x: 300, y: 200 };
  const before = screenToWorld(view, size, anchor);
  const next = zoomAt(view, size, anchor, 2);
  const after = screenToWorld(next, size, anchor);
  assert.ok(Math.abs(before.x - after.x) < 1e-9 && Math.abs(before.y - after.y) < 1e-9);
  assert.equal(next.scale, 1);
  assert.equal(clampScale(100), MAX_SCALE);
  assert.equal(clampScale(0), MIN_SCALE);
  assert.equal(zoomAt(view, size, anchor, 1000).scale, MAX_SCALE);
});

test('pan moves the camera against the drag, and the camera cannot leave the map', () => {
  const view = { cx: 0, cy: 0, scale: 0.5 };
  assert.deepEqual(panBy(view, 50, -20), { cx: -100, cy: 40, scale: 0.5 });
  const bounds = { x0: -1000, y0: -1000, x1: 1000, y1: 1000 };
  const clamped = clampView({ cx: 50000, cy: -50000, scale: 0.5 }, size, bounds);
  assert.ok(clamped.cx <= 1200 && clamped.cy >= -1200);
  const zoomedOut = clampView({ cx: 900, cy: 900, scale: 0.12 }, size, bounds);
  assert.equal(zoomedOut.cx, 0, 'a view wider than the map centres on it');
});

test('marker layout gives crowded pins a dot and the winner a pill', () => {
  const layout = layoutMarkers([
    { id: 'a', at: { x: 100, y: 100 }, priority: 1, pillWidth: 150 },
    { id: 'b', at: { x: 140, y: 110 }, priority: 5, pillWidth: 150 },
    { id: 'c', at: { x: 100, y: 400 }, priority: 0, pillWidth: 150 },
  ]);
  const mode = Object.fromEntries(layout.map((l) => [l.id, l.mode]));
  assert.deepEqual(mode, { a: 'dot', b: 'pill', c: 'pill' });
  const forced = layoutMarkers([
    { id: 'a', at: { x: 100, y: 100 }, priority: 9, pillWidth: 150 },
    { id: 'b', at: { x: 140, y: 110 }, priority: 0, pillWidth: 150, force: true },
  ]);
  assert.equal(forced.find((l) => l.id === 'b')?.mode, 'pill');
});

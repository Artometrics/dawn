import assert from 'node:assert/strict';
import test from 'node:test';
import { activeMapLayer, hotspotAt } from './map-layer';

test('the staging map is an image layer with a hotspot on each building', () => {
  const layer = activeMapLayer();
  assert.equal(layer.kind, 'staging-image');
  assert.equal(layer.src.endsWith('.png'), true);
  assert.equal(layer.hotspots.length, 6);
  const ids = new Set(layer.hotspots.map((spot) => spot.id));
  assert.equal(ids.size, 6);
  for (const spot of layer.hotspots) {
    assert.equal(hotspotAt(layer, spot.x + 4, spot.y + 4)?.id, spot.id);
    assert.equal(spot.x >= layer.view.x, true);
    assert.equal(spot.y >= layer.view.y, true);
    assert.equal(spot.x + spot.w <= layer.view.x + layer.view.w, true);
  }
  assert.equal(hotspotAt(layer, 0, 0), null);
});

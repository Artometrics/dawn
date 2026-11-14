import assert from 'node:assert/strict';
import test from 'node:test';
import { natalChart, signAt } from './chart.ts';

test('the sun lands in the calendar sign, and a bad date is refused', () => {
  const cap = natalChart({ iso: '2000-01-01' });
  const sun = cap?.bodies.find((body) => body.id === 'sun');
  assert.ok(sun);
  assert.ok(sun!.longitude > 278 && sun!.longitude < 283);
  assert.equal(sun!.sign, 'Capricorn');
  assert.equal(signAt(sun!.longitude).name, 'Capricorn');

  const leo = natalChart({ iso: '1990-07-23' });
  assert.equal(leo?.bodies.find((body) => body.id === 'sun')?.sign, 'Leo');
  const pisces = natalChart({ iso: '1992-03-14' });
  assert.equal(pisces?.bodies.find((body) => body.id === 'sun')?.sign, 'Pisces');
  assert.equal(natalChart({ iso: '2023-02-29' }), null);
});

test('the moon moves about a day\'s worth, and houses appear only with time and place', () => {
  const noon = natalChart({ iso: '1992-03-14' });
  const next = natalChart({ iso: '1992-03-15' });
  const a = noon?.bodies.find((body) => body.id === 'moon')?.longitude ?? 0;
  const b = next?.bodies.find((body) => body.id === 'moon')?.longitude ?? 0;
  const step = ((b - a + 540) % 360) - 180;
  assert.ok(step > 8 && step < 18);
  assert.equal(noon?.houses, null);
  assert.equal(noon?.bodies.length, 10);

  const placed = natalChart({ iso: '1992-03-14', time: '07:40', lat: 38.72, lng: -9.14 });
  assert.equal(placed?.houses?.length, 12);
  assert.equal(placed?.bodies.find((body) => body.id === 'sun')?.house === null, false);
  for (let i = 1; i < 12; i++) {
    const gap = (((placed!.houses![i] - placed!.houses![i - 1]) % 360) + 360) % 360;
    assert.equal(gap, 30);
  }
});

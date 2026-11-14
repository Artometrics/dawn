import assert from 'node:assert/strict';
import test from 'node:test';
import { dealReading, numbersFor, parseAftercare } from './desk.ts';
import { lifePath } from './numerology.ts';
import { readingLines } from './reading.ts';

test('the worked life-path example is 4, and a bad date is refused', () => {
  assert.equal(lifePath('1990-07-23')?.number, 4);
  assert.equal(lifePath('2023-02-29'), null);
  const numbers = numbersFor('Mara Ellison', '1992-03-14', 2026);
  assert.equal(numbers?.lifePath.number, 11);
  assert.equal(numbers?.personalYear, 9);
  assert.equal(numbers?.sign, 'Pisces');
});

test('a three-card deal is stored and reads back', () => {
  const dealt = dealReading(parseAftercare(null), 'three', 'What now?', 1_700_000_000_000, 9);
  assert.equal(dealt.ok, true);
  if (!dealt.ok) return;
  assert.equal(dealt.reading.cards.length, 3);
  assert.equal(readingLines('three', dealt.reading.cards).length, 3);
  const again = parseAftercare(dealt.data);
  assert.equal(again.readings.length, 1);
  assert.equal(again.readings[0].question, 'What now?');
});

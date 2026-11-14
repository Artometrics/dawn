import assert from 'node:assert/strict';
import test from 'node:test';
import { cardArtSvg } from './card-art.ts';
import { layoutConstellation } from './constellation.ts';
import { DECK } from './deck.ts';
import { addNote, asProfile, dealReading, editNote, exportBackup, importBackup, numbersFor, parseAftercare, removeNote } from './desk.ts';
import { lifePath } from './numerology.ts';
import { readingLines } from './reading.ts';
import { buildView, redactView } from './second-self.ts';
import { decodeShare, encodeShare } from './share.ts';

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
  assert.equal(again.birthTime, '');
  assert.equal(again.favorites.length, 0);
});

test('a journal entry can be saved, edited, and removed', () => {
  const added = addNote(parseAftercare(null), 'steady', 'First line', 1_700_000_000_000, 'Morning');
  assert.equal(added.ok, true);
  if (!added.ok) return;
  const id = added.data.notes[0].id;
  const edited = editNote(added.data, id, 'bright', 'Second line', 1_700_000_000_100, 'Morning');
  assert.equal(edited.ok, true);
  if (!edited.ok) return;
  assert.equal(edited.data.notes[0].text, 'Second line');
  assert.equal(edited.data.notes[0].mood, 'bright');
  assert.equal(edited.data.notes[0].at, 1_700_000_000_000);
  const cleared = removeNote(edited.data, id);
  assert.equal(cleared.notes.length, 0);
});

test('a backup round-trips, including an original Almanac file', () => {
  const data = parseAftercare({ name: 'Mara', birthDate: '1992-03-14', birthTime: '07:40', notes: [], readings: [] });
  const restored = importBackup(exportBackup(data, 1_700_000_000_000));
  assert.equal(restored?.name, 'Mara');
  assert.equal(restored?.birthTime, '07:40');
  const legacy = importBackup({
    app: 'aftercare',
    version: 1,
    profile: { displayName: 'Mara', birthDate: '1992-03-14', favorites: [] },
    readings: [],
  });
  assert.equal(legacy?.name, 'Mara');
  assert.equal(legacy?.birthDate, '1992-03-14');
  assert.equal(importBackup({ app: 'other' }), null);
});

test('every card has procedural art, and a share link can hide the birth date', () => {
  assert.equal(DECK.length, 78);
  for (const card of DECK) assert.ok(cardArtSvg(card, { uid: 't' }).includes(`aria-label="${card.name}"`));
  const profile = asProfile(parseAftercare({
    name: 'Mara Ellison',
    birthDate: '1992-03-14',
    favorites: [{ id: 'f1', kind: 'book', title: 'The Hobbit', themeId: 'home' }],
  }), 1_700_000_000_000);
  assert.ok(profile);
  if (!profile) return;
  const view = buildView(profile, new Date('2026-06-01T00:00:00Z'));
  assert.equal(view.numbers?.lifePath, 11);
  assert.ok(layoutConstellation(view)?.stars.some((star) => star.own.includes('Life path')));
  const hidden = redactView(view, profile.visibility);
  assert.equal(hidden.birthDate, undefined);
  const decoded = decodeShare(`#${encodeShare(view)}`);
  assert.equal(decoded?.name, 'Mara Ellison');
  assert.equal(decoded?.numbers?.signId, 'pisces');
});

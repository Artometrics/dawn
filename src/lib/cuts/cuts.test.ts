import assert from 'node:assert/strict';
import test from 'node:test';
import { applyPackage, newCutFields, SCRIPT_MAX } from './cut.ts';
import { addCut, addShelf, CUT_CAP, parseCuts } from './desk.ts';
import { draftPackage, DRAFT_WARNING } from './draft.ts';
import { parsePackage } from './parse-package.ts';
import { inspectUrl, isPrivateIp, VIDEO_HOST_MESSAGE } from './policy.ts';
import { advanceColumn, chapterBlock, scriptToSrt } from './text.ts';
import type { Cut } from './types.ts';

test('scriptToSrt uses 2.6 words a second and chapterBlock starts at 0:00', () => {
  const short = scriptToSrt('Hello there.');
  assert.match(short, /00:00:00,000 --> 00:00:00,900/);
  const words = Array.from({ length: 26 }, () => 'word').join(' ');
  const long = scriptToSrt(`${words}.`);
  assert.match(long, /00:00:00,000 --> 00:00:10,000/);
  assert.equal(chapterBlock([{ title: 'Open', summary: '', startSeconds: 12 }]), '0:00 Open');
});

test('inspectUrl blocks video hosts and private addresses', () => {
  for (const url of [
    'https://www.youtube.com/watch?v=abc',
    'https://youtu.be/abc',
    'https://vimeo.com/1',
    'https://www.tiktok.com/@a',
    'https://instagram.com/p/1',
    'https://www.dailymotion.com/video/1',
    'https://twitch.tv/a',
  ]) {
    const result = inspectUrl(url);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error, VIDEO_HOST_MESSAGE);
  }
  assert.equal(inspectUrl('https://youtu.be/abc').ok, false);
  assert.equal(isPrivateIp('127.0.0.1'), true);
  assert.equal(isPrivateIp('10.1.1.1'), true);
  assert.equal(isPrivateIp('192.168.0.4'), true);
  assert.equal(inspectUrl('http://127.0.0.1/secret').ok, false);
  assert.equal(inspectUrl('https://example.com/story').ok, true);
});

test('columns only move forward and a draft package is labelled', () => {
  assert.equal(advanceColumn('idea', 'script'), 'script');
  assert.equal(advanceColumn('package', 'script'), 'package');
  const made = newCutFields({ topic: 'Harbor lights at dusk', sourceUrl: '' });
  assert.equal(made.ok, true);
  if (!made.ok) return;
  const cut: Cut = { ...made.fields, id: 'abc', createdAt: 1, updatedAt: 1 };
  const pack = draftPackage(cut.topic, '');
  assert.equal(pack.titles.length, 3);
  assert.equal(pack.visuals[1].chartValues.length, 0);
  const next = applyPackage(cut, pack, { provider: 'draft', model: 'local-draft', warning: DRAFT_WARNING });
  assert.equal(next.generationProvider, 'draft');
  assert.match(next.scriptText, /not a Gemini script/);
  assert.equal(next.column, 'script');
});

test('parsePackage reads fenced JSON and rejects junk', () => {
  const fenced = '```json\n{"scriptText":"Hello there.","titles":["A"],"description":"d","tags":["t"],"chapters":[{"title":"Open","summary":"s","startSeconds":0}],"visuals":[],"thumbnailConcepts":[]}\n```';
  assert.equal(parsePackage(fenced).scriptText, 'Hello there.');
  assert.throws(() => parsePackage('not json'), /could not read/);
});

test('the 41st cut is refused and a long script is clipped', () => {
  let data = parseCuts(null);
  for (let i = 0; i < CUT_CAP; i += 1) {
    const added = addCut(data, { topic: `Topic ${i}`, sourceUrl: '' });
    assert.equal(added.ok, true);
    if (added.ok) data = added.data;
  }
  const refused = addCut(data, { topic: 'one more', sourceUrl: '' });
  assert.equal(refused.ok, false);
  const made = newCutFields({ topic: 'Clip', sourceUrl: '' });
  assert.equal(made.ok, true);
  if (!made.ok) return;
  const cut: Cut = { ...made.fields, id: 'c', createdAt: 1, updatedAt: 1 };
  const next = applyPackage(cut, { ...draftPackage('Clip', ''), scriptText: 'a'.repeat(SCRIPT_MAX + 1) }, { provider: 'draft', model: 'local-draft', warning: '' });
  assert.equal(next.scriptText.length, SCRIPT_MAX);
  const shelf = addShelf(data, { title: 'Chart', url: 'https://www.youtube.com/watch?v=abc', creator: 'A', license: 'cc0', notes: '' });
  assert.equal(shelf.ok, false);
  if (!shelf.ok) assert.equal(shelf.error, VIDEO_HOST_MESSAGE);
});

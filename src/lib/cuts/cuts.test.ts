import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { DailyRequestCap } from '../dawn-agents/model-choice';
import { applyPackage, cutCaptions, cutChapters, newCutFields, SCRIPT_MAX } from './cut';
import { CUT_CAP, addCut, addMedia, parseCuts } from './desk';
import { DRAFT_WARNING, draftPackage } from './draft';
import { generateCutPackage } from './generate';
import { narrateCut } from './media';
import { parsePackage } from './parse-package';
import { NARRATION_OFF, VIDEO_BLOCKED_MESSAGE, inspectUrl, isPrivateIp } from './policy';
import { advanceColumn, chapterBlock, scriptToSrt } from './text';
import { pcmToWav } from './wav';
import type { Cut } from './types';

test('inspectUrl blocks video hosts and private addresses', () => {
  for (const url of [
    'https://www.youtube.com/watch?v=abc',
    'https://youtu.be/abc',
    'https://vimeo.com/1',
    'https://www.tiktok.com/@a/video/1',
    'https://instagram.com/p/abc',
    'https://www.dailymotion.com/video/x',
    'https://twitch.tv/videos/1',
  ]) {
    const result = inspectUrl(url);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error, VIDEO_BLOCKED_MESSAGE);
  }
  assert.equal(inspectUrl('https://youtu.be/abc').ok, false);
  assert.equal(inspectUrl('http://127.0.0.1/secret').ok, false);
  assert.equal(inspectUrl('http://10.1.1.1/a').ok, false);
  assert.equal(inspectUrl('http://192.168.0.2/a').ok, false);
  assert.equal(isPrivateIp('::1'), true);
  assert.equal(inspectUrl('https://example.com/story').ok, true);
  assert.equal(inspectUrl('').ok, true);
});

test('columns only move forward', () => {
  assert.equal(advanceColumn('idea', 'script'), 'script');
  assert.equal(advanceColumn('package', 'script'), 'package');
  assert.equal(advanceColumn('ready', 'idea'), 'ready');
});

test('chapterBlock starts at 0:00 and SRT uses 2.6 words a second', () => {
  assert.equal(chapterBlock([{ title: 'Open', summary: '', startSeconds: 12 }]), '0:00 Open');
  const sentence = 'one two three four five six seven eight nine ten.';
  const srt = scriptToSrt(sentence);
  assert.match(srt, /00:00:00,000 --> 00:00:03,846/);
  assert.match(srt, /-->/);
  const wav = pcmToWav(new Uint8Array([0, 0, 1, 0]), 24000);
  assert.equal(String.fromCharCode(...wav.slice(0, 4)), 'RIFF');
});

test('draftPackage is labelled and does not invent chart values', () => {
  const made = newCutFields({ topic: 'Harbor lights at dusk', sourceUrl: '' });
  assert.equal(made.ok, true);
  if (!made.ok) return;
  const cut: Cut = { ...made.fields, id: 'abc', createdAt: 1, updatedAt: 1 };
  const next = applyPackage(cut, draftPackage(cut.topic, ''), { provider: 'draft', model: 'local-draft', warning: DRAFT_WARNING });
  assert.equal(next.generationProvider, 'draft');
  assert.match(next.scriptText, /local draft/);
  assert.deepEqual(next.visuals[1].chartValues, []);
  assert.equal(cutChapters(next).startsWith('0:00'), true);
  assert.match(cutCaptions(next), /00:00:00,000/);
  assert.equal('captionsSrt' in next, false);
});

test('parsePackage reads fenced JSON and rejects invalid JSON', () => {
  const fenced = '```json\n{"scriptText":"Hello there.","titles":["A"],"description":"D","tags":["one"],"chapters":[{"title":"Open","summary":"","startSeconds":0}],"visuals":[],"thumbnailConcepts":[]}\n```';
  const pack = parsePackage(fenced);
  assert.equal(pack.scriptText, 'Hello there.');
  assert.equal(pack.titles[0], 'A');
  assert.throws(() => parsePackage('not json at all'), /could not read/);
});

test('the 41st cut is refused and a long script is clipped', () => {
  let data = parseCuts(null);
  for (let i = 0; i < CUT_CAP; i += 1) {
    const added = addCut(data, { topic: `Cut ${i}`, sourceUrl: '' });
    assert.equal(added.ok, true);
    if (added.ok) data = added.data;
  }
  const refused = addCut(data, { topic: 'one more', sourceUrl: '' });
  assert.equal(refused.ok, false);
  const made = newCutFields({ topic: 'clip', sourceUrl: '' });
  assert.equal(made.ok, true);
  if (!made.ok) return;
  const cut: Cut = { ...made.fields, id: 'c', createdAt: 1, updatedAt: 1 };
  const pack = draftPackage('clip', '');
  pack.scriptText = 'a'.repeat(SCRIPT_MAX + 1);
  const next = applyPackage(cut, pack, { provider: 'draft', model: 'local-draft', warning: '', excerpt: 'e'.repeat(3000) });
  assert.equal(next.scriptText.length, SCRIPT_MAX);
  assert.equal(next.sourceExcerpt.length, 2000);
});

test('the shelf refuses a video host with the policy message', () => {
  const added = addMedia(parseCuts(null), {
    title: 'A video',
    url: 'https://www.youtube.com/watch?v=abc',
    license: 'cc0',
    creator: 'Someone',
    notes: '',
  });
  assert.equal(added.ok, false);
  if (!added.ok) assert.equal(added.error, VIDEO_BLOCKED_MESSAGE);
  const kept = addMedia(parseCuts(null), {
    title: 'Harbor chart',
    url: 'https://commons.wikimedia.org/wiki/File:Example.svg',
    license: 'cc0',
    creator: 'Wikimedia',
    notes: '',
  });
  assert.equal(kept.ok, true);
});

test('generate returns a draft when no model key is configured and never echoes a key', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'cuts-gen-'));
  try {
    const cap = new DailyRequestCap(path.join(dir, 'daily.json'), 20);
    const recorded: unknown[] = [];
    const secret = 'AIzaSECRETKEY1234567890';
    const result = await generateCutPackage(
      { topic: 'Harbor lights' },
      {
        cap,
        env: { GEMINI_API_KEY: secret },
        spend: { blocked: async () => null, record: async (entry) => { recorded.push(entry); } },
        generate: async () => ({ text: '{"scriptText":"Hello there. The lamp is lit.","titles":["Lamp"],"description":"","tags":[],"chapters":[],"visuals":[],"thumbnailConcepts":[]}', promptTokens: 3, completionTokens: 4 }),
      },
    );
    assert.equal(result.status, 200);
    assert.equal(result.body.provider, 'model');
    assert.equal(JSON.stringify(result.body).includes(secret), false);
    assert.equal(recorded.length, 1);
    const draft = await generateCutPackage({ topic: 'Harbor lights' }, { cap, env: {}, spend: { blocked: async () => null, record: async () => {} } });
    assert.equal(draft.body.provider, 'draft');
    assert.match(draft.body.warning || '', /Local draft/);
    const capped = await generateCutPackage(
      { topic: 'Harbor lights' },
      { cap, env: { GEMINI_API_KEY: secret }, spend: { blocked: async () => 'Spend cap reached ($20.00 of $20.00 this UTC month). Raise it in Settings.', record: async () => { recorded.push('no'); } }, generate: async () => { throw new Error('should not run'); } },
    );
    assert.equal(capped.status, 429);
    assert.match(capped.body.error || '', /Spend cap reached/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('narration stays off unless the gateway flag is set', async () => {
  const result = await narrateCut({ text: 'Hello there.', voice: 'Kore' }, { env: {}, spend: { capBlocked: async () => null, record: async () => {} } });
  assert.equal(result.status, 403);
  assert.equal(result.body.error, NARRATION_OFF);
});

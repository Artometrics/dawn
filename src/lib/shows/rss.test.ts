import assert from 'node:assert/strict';
import test from 'node:test';
import { buildRss, itunesDuration, itunesTags, xmlEscape } from './rss.ts';
import type { Episode, Show } from './types.ts';

function show(): Show {
  return {
    id: 'cardinal',
    title: 'Cardinal',
    slug: 'cardinal',
    description: 'A show about the desk.',
    author: 'Kyle McAuliffe',
    ownerEmail: 'kylesmcauliffe@gmail.com',
    language: 'en-us',
    category: 'Arts',
    explicit: false,
    artworkUrl: 'https://example.com/cardinal.png',
    websiteUrl: 'https://artometrics.com',
    status: 'active',
  };
}

function episode(n: number, status: 'draft' | 'published' = 'published'): Episode {
  return {
    id: `e0${n}`,
    showId: 'cardinal',
    title: n === 1 ? 'Tom & Jerry <live>' : `Episode ${n}`,
    summary: `Summary ${n}`,
    audioUrl: `https://example.com/${n}.mp3`,
    audioBytes: 1200 + n,
    contentType: 'audio/mpeg',
    durationSeconds: 8,
    episodeNumber: n,
    season: 1,
    explicit: false,
    status,
    publishedAt: status === 'published' ? `2026-0${n}-04T15:00:00.000Z` : null,
    guid: `dawn:cardinal:e0${n}`,
    artworkUrl: '',
  };
}

test('rss escapes text and prints itunes duration', () => {
  assert.equal(xmlEscape('A & B <C>'), 'A &amp; B &lt;C&gt;');
  assert.equal(itunesDuration(8), '00:08');
  assert.equal(itunesDuration(3661), '01:01:01');
});

test('buildRss keeps published episodes and the itunes tags', () => {
  const xml = buildRss({
    show: show(),
    episodes: [episode(2), episode(1), episode(3, 'draft')],
    feedUrl: 'https://dawn.example/api/public/rss/cardinal',
    enclosureUrl: (row) => `https://dawn.example/api/public/listen/cardinal/${row.id}`,
    now: new Date('2026-10-21T00:00:00.000Z'),
  });
  assert.match(xml, /xmlns:itunes="http:\/\/www.itunes.com\/dtds\/podcast-1.0.dtd"/);
  assert.match(xml, /Tom &amp; Jerry &lt;live&gt;/);
  assert.equal(xml.match(/<item>/g)?.length, 2);
  assert.ok(xml.indexOf('e01') < xml.indexOf('e02'));
  const tags = itunesTags(xml);
  for (const name of ['image', 'summary', 'author', 'explicit', 'owner', 'name', 'email', 'category', 'episode', 'duration']) {
    assert.ok(tags.includes(name), name);
  }
});

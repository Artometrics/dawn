import assert from 'node:assert/strict';
import test from 'node:test';
import { listenResult, renderEmbed, renderFeed } from './public';
import { buildRss, itunesDuration, rssProblems, xmlEscape } from './rss';
import { validateShow, addEpisode, addShow, parseShows } from './desk';
import type { Episode, Show } from './types';

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

test('buildRss keeps published episodes with audio, in episode order, with itunes tags', () => {
  const xml = buildRss({
    show: show(),
    episodes: [episode(2), episode(1), episode(3, 'draft')],
    feedUrl: 'https://dawn.example/api/public/rss/cardinal',
    enclosureUrl: (row) => `https://dawn.example/api/public/listen/cardinal/${row.id}`,
    now: new Date('2026-10-21T00:00:00.000Z'),
  });
  assert.deepEqual(rssProblems(xml), []);
  assert.match(xml, /Tom &amp; Jerry &lt;live&gt;/);
  assert.match(xml, /<enclosure url="https:\/\/dawn.example\/api\/public\/listen\/cardinal\/e01" length="1201" type="audio\/mpeg"\/>/);
  assert.equal(xml.match(/<item>/g)?.length, 2);
  assert.ok(xml.indexOf('e01') < xml.indexOf('e02'));
  const rendered = renderFeed(show(), [episode(2), episode(1)], 'https://dawn.example');
  assert.match(rendered, /\/api\/public\/rss\/cardinal/);
  assert.match(rendered, /\/api\/public\/listen\/cardinal\/e01/);
});

test('HEAD does not count and a redirect never uses a request URL', () => {
  const row = episode(1);
  const head = listenResult(row, 'HEAD', false, 1);
  assert.equal(head.counted, false);
  assert.equal(head.location, row.audioUrl);
  const got = listenResult(row, 'GET', false, 4);
  assert.equal(got.counted, true);
  assert.equal(got.location, 'https://example.com/1.mp3');
  const json = listenResult(row, 'GET', true, 4);
  assert.deepEqual(json.json, { count: 4, location: 'https://example.com/1.mp3' });
  assert.equal(listenResult({ ...row, audioUrl: 'http://example.com/a.mp3' }, 'GET', false, 1).status, 404);
});

test('the embed escapes a title that tries to close the tag', () => {
  const row = episode(1);
  row.title = '"><script>alert(1)</script>';
  const html = renderEmbed(show(), row);
  assert.equal(html.includes('<script>'), false);
  assert.match(html, /&quot;&gt;&lt;script&gt;/);
});

test('validate names missing artwork, a missing audio URL, a non-https URL, a zero duration, and a repeated GUID', () => {
  let data = parseShows(null);
  const added = addShow(data, { ...show(), artworkUrl: '' });
  assert.equal(added.ok, true);
  if (!added.ok) return;
  data = added.data;
  const first = addEpisode(data, { ...episode(1), showId: show().id, audioUrl: '', durationSeconds: 0, status: 'published' });
  assert.equal(first.ok, true);
  if (!first.ok) return;
  data = first.data;
  const second = addEpisode(data, { ...episode(2), showId: show().id, id: 'e02', guid: first.episode.guid, audioUrl: 'http://example.com/a.mp3', status: 'published', publishedAt: '2026-02-04T15:00:00.000Z' });
  assert.equal(second.ok, true);
  if (!second.ok) return;
  const problems = validateShow(second.data, show().id);
  assert.ok(problems.some((line) => /artwork/i.test(line)));
  assert.ok(problems.some((line) => /missing audio/i.test(line)));
  assert.ok(problems.some((line) => /not https/i.test(line)));
  assert.ok(problems.some((line) => /duration is 0/i.test(line)));
  assert.ok(problems.some((line) => /GUID/i.test(line)));
});

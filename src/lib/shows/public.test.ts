import assert from 'node:assert/strict';
import test from 'node:test';
import { embedResult, listenResult } from './public.ts';
import type { Episode, PublishedShow } from './types.ts';

function row(): PublishedShow {
  const episode: Episode = {
    id: 'ep',
    showId: 'cardinal',
    title: '"><script>',
    summary: 'A',
    audioUrl: 'https://example.com/a.mp3',
    audioBytes: 10,
    contentType: 'audio/mpeg',
    durationSeconds: 8,
    episodeNumber: 1,
    season: 1,
    explicit: false,
    status: 'published',
    publishedAt: '2026-01-01T00:00:00.000Z',
    guid: 'g',
    artworkUrl: '',
  };
  return {
    show: {
      id: 'cardinal',
      title: 'Cardinal',
      slug: 'cardinal',
      description: '',
      author: 'Artometrics',
      ownerEmail: '',
      language: 'en-us',
      category: 'Arts',
      explicit: false,
      artworkUrl: 'https://example.com/art.png',
      websiteUrl: '',
      status: 'active',
    },
    episodes: [episode],
  };
}

test('HEAD does not count and the embed escapes a title', () => {
  const head = listenResult(row(), 'ep', 'HEAD', false, {});
  assert.equal(head.listens.ep, undefined);
  assert.equal(head.listens['cardinal/ep'], undefined);
  const got = listenResult(row(), 'ep', 'GET', false, {});
  assert.equal(got.listens['cardinal/ep'], 1);
  const embed = embedResult(row(), 'ep');
  assert.equal('body' in embed, true);
  if ('body' in embed) {
    assert.equal(embed.body.includes('<script>'), false);
    assert.match(embed.body, /&lt;script&gt;/);
    assert.match(embed.body, /<audio controls/);
  }
});

import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { startAgentsServer } from './http.ts';

const owner = { 'content-type': 'application/json', 'x-auth-request-email': 'kyle@example.com' };

test('the public feed lists published episodes, counts only GET, and ignores a request URL', async () => {
  const home = await mkdtemp(path.join(tmpdir(), 'dawn-shows-'));
  const server = await startAgentsServer({
    storePath: path.join(home, 'store.json'),
    ownerEmail: 'kyle@example.com',
    workerToken: 't',
    editorToken: 'e',
    schedule: false,
    port: 0,
  });
  try {
    const published = await fetch(`${server.url}/api/shows/publish`, {
      method: 'POST',
      headers: owner,
      body: JSON.stringify({
        show: {
          id: 'cardinal',
          title: 'Cardinal',
          slug: 'cardinal',
          description: 'A show.',
          author: 'Artometrics',
          ownerEmail: 'studio@example.com',
          language: 'en-us',
          category: 'Arts',
          explicit: false,
          artworkUrl: 'https://example.com/art.png',
          websiteUrl: 'https://example.com',
          status: 'active',
        },
        episodes: [
          episode('one', 'published'),
          episode('two', 'draft'),
        ],
      }),
    });
    assert.equal(published.status, 200);
    const missing = await fetch(`${server.url}/api/public/rss/nope`);
    assert.equal(missing.status, 404);
    const feed = await fetch(`${server.url}/api/public/rss/cardinal`);
    const xml = await feed.text();
    assert.equal(feed.headers.get('content-type'), 'application/rss+xml; charset=utf-8');
    assert.equal(feed.headers.get('x-robots-tag'), null);
    assert.equal(xml.match(/<item>/g)?.length, 1);
    assert.match(xml, /Tom &amp; Jerry/);
    assert.equal(xml.includes('Draft only'), false);
    const head = await fetch(`${server.url}/api/public/listen/cardinal/one?url=https://evil.example/a.mp3`, { method: 'HEAD', redirect: 'manual' });
    assert.equal(head.status, 302);
    assert.equal(head.headers.get('location'), 'https://example.com/one.mp3');
    const again = await fetch(`${server.url}/api/public/listen/cardinal/one?url=https://evil.example/a.mp3`, { redirect: 'manual', headers: { accept: 'application/json' } });
    const json = (await again.json()) as { count: number; location: string };
    assert.equal(json.count, 1);
    assert.equal(json.location, 'https://example.com/one.mp3');
    const embed = await fetch(`${server.url}/api/public/embed/cardinal/one`);
    const html = await embed.text();
    assert.match(html, /Tom &amp; Jerry &lt;live&gt;/);
    assert.equal(html.includes('<script'), false);
  } finally {
    await server.close();
    await rm(home, { recursive: true, force: true });
  }
});

function episode(id: string, status: 'draft' | 'published') {
  return {
    id,
    title: id === 'one' ? 'Tom & Jerry <live>' : 'Draft only',
    summary: 'Summary',
    audioUrl: `https://example.com/${id}.mp3`,
    audioBytes: 1200,
    contentType: 'audio/mpeg',
    durationSeconds: 8,
    episodeNumber: id === 'one' ? 1 : 2,
    season: 1,
    explicit: false,
    status,
    publishedAt: status === 'published' ? '2026-01-04T15:00:00.000Z' : null,
    guid: `dawn:cardinal:${id}`,
    artworkUrl: '',
  };
}

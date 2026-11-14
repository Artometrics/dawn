import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { DRAFT_WARNING } from '../cuts/draft';
import { VIDEO_BLOCKED_MESSAGE } from '../cuts/policy';
import { startAgentsServer } from './http';

async function readLedger(dir: string): Promise<unknown[]> {
  try {
    const stored = JSON.parse(await readFile(path.join(dir, 'store.json'), 'utf8')) as { ledger?: unknown[] };
    return stored.ledger ?? [];
  } catch {
    return [];
  }
}

const KEYS = ['GEMINI_API_KEY', 'GOOGLE_GENERATIVE_AI_API_KEY', 'XAI_API_KEY', 'OPENROUTER_API_KEY'] as const;

async function gateway(spendCapUsd = 20) {
  const dir = await mkdtemp(path.join(tmpdir(), 'dawn-features-'));
  const saved = KEYS.map((key) => process.env[key]);
  for (const key of KEYS) delete process.env[key];
  const server = await startAgentsServer({
    storePath: path.join(dir, 'store.json'),
    ownerEmail: 'kyle@example.com',
    workerToken: 'worker',
    editorToken: 'editor',
    forceStandIn: true,
    schedule: false,
    port: 0,
    authDisabled: true,
    spendCapUsd,
    trustedOrigins: ['http://127.0.0.1:3000'],
  });
  const call = (route: string, init: RequestInit = {}) => fetch(`${server.url}${route}`, {
    ...init,
    redirect: 'manual',
    headers: {
      'content-type': 'application/json',
      origin: 'http://127.0.0.1:3000',
      'sec-fetch-site': 'same-origin',
      ...(init.headers as Record<string, string> | undefined),
    },
  });
  return {
    call,
    dir,
    close: async () => {
      await server.close();
      await rm(dir, { recursive: true, force: true });
      KEYS.forEach((key, index) => {
        if (saved[index] === undefined) delete process.env[key];
        else process.env[key] = saved[index];
      });
    },
  };
}

test('cuts generate drafts without a key, rejects a video URL, and stops at the spend cap', async () => {
  const open = await gateway();
  try {
    const drafted = await open.call('/api/cuts/generate', { method: 'POST', body: JSON.stringify({ topic: 'Harbor lights' }) });
    const body = await drafted.json() as { provider: string; warning: string; package: { scriptText: string } };
    assert.equal(drafted.status, 200);
    assert.equal(body.provider, 'draft');
    assert.equal(body.warning, DRAFT_WARNING);
    assert.match(body.package.scriptText, /local draft/);
    assert.equal(JSON.stringify(body).includes('AIza'), false);
    const blocked = await open.call('/api/cuts/generate', { method: 'POST', body: JSON.stringify({ topic: 'lights', sourceUrl: 'https://youtu.be/abc' }) });
    const refused = await blocked.json() as { error: string };
    assert.equal(blocked.status, 400);
    assert.equal(refused.error, VIDEO_BLOCKED_MESSAGE);
  } finally {
    await open.close();
  }
  const capped = await gateway(0);
  try {
    const response = await capped.call('/api/cuts/generate', { method: 'POST', body: JSON.stringify({ topic: 'Harbor lights' }) });
    const body = await response.json() as { error?: string };
    assert.equal(response.status, 429);
    assert.match(body.error || '', /Spend cap reached/);
    const stored = await readLedger(capped.dir);
    assert.equal(stored.length, 0);
  } finally {
    await capped.close();
  }
});

test('the public show feed, the download counter, and the embed', async () => {
  const open = await gateway();
  try {
    const show = {
      id: 'cardinal',
      title: 'Cardinal',
      slug: 'cardinal',
      description: 'Notes from the desk.',
      author: 'Kyle McAuliffe',
      ownerEmail: 'kylesmcauliffe@gmail.com',
      language: 'en-us',
      category: 'Arts',
      explicit: false,
      artworkUrl: 'https://example.com/cardinal.png',
      websiteUrl: 'https://example.com',
      status: 'active',
    };
    const episodes = [
      { id: 'e01', showId: 'cardinal', title: 'Tom & Jerry <live>', summary: 'One', audioUrl: 'https://cdn.example/one.mp3', audioBytes: 10, contentType: 'audio/mpeg', durationSeconds: 8, episodeNumber: 1, season: 1, explicit: false, status: 'published', publishedAt: '2026-01-04T15:00:00.000Z', guid: 'dawn:cardinal:e01', artworkUrl: '' },
      { id: 'e02', showId: 'cardinal', title: 'Draft', summary: 'Two', audioUrl: 'https://cdn.example/two.mp3', audioBytes: 10, contentType: 'audio/mpeg', durationSeconds: 8, episodeNumber: 2, season: 1, explicit: false, status: 'draft', publishedAt: null, guid: 'dawn:cardinal:e02', artworkUrl: '' },
    ];
    const published = await open.call('/api/shows/publish', { method: 'POST', body: JSON.stringify({ show, episodes }) });
    assert.equal(published.status, 200);
    const missing = await open.call('/api/public/rss/nope');
    assert.equal(missing.status, 404);
    const feed = await open.call('/api/public/rss/cardinal');
    const xml = await feed.text();
    assert.equal(feed.status, 200);
    assert.match(feed.headers.get('content-type') || '', /application\/rss\+xml/);
    assert.equal(feed.headers.get('x-robots-tag'), null);
    assert.equal(xml.match(/<item>/g)?.length, 1);
    assert.match(xml, /Tom &amp; Jerry &lt;live&gt;/);
    assert.match(xml, /<itunes:author>/);
    const head = await open.call('/api/public/listen/cardinal/e01', { method: 'HEAD' });
    assert.equal(head.status, 302);
    assert.equal(head.headers.get('location'), 'https://cdn.example/one.mp3');
    const statsBefore = await (await open.call('/api/shows/stats')).json() as { shows: { episodes: { downloads: number }[] }[] };
    assert.equal(statsBefore.shows[0].episodes[0].downloads, 0);
    const got = await open.call('/api/public/listen/cardinal/e01?url=https://evil.example/steal.mp3');
    assert.equal(got.status, 302);
    assert.equal(got.headers.get('location'), 'https://cdn.example/one.mp3');
    const json = await open.call('/api/public/listen/cardinal/e01', { headers: { accept: 'application/json' } });
    const counted = await json.json() as { count: number; location: string };
    assert.equal(counted.count, 2);
    assert.equal(counted.location, 'https://cdn.example/one.mp3');
    const embed = await open.call('/api/public/embed/cardinal/e01');
    const html = await embed.text();
    assert.equal(html.includes('<script>'), false);
    const nasty = await open.call('/api/shows/publish', { method: 'POST', body: JSON.stringify({ show, episodes: [{ ...episodes[0], id: 'e03', title: '"><script>alert(1)</script>', guid: 'dawn:cardinal:e03' }] }) });
    assert.equal(nasty.status, 200);
    const player = await (await open.call('/api/public/embed/cardinal/e03')).text();
    assert.equal(player.includes('<script>'), false);
    assert.match(player, /&quot;&gt;&lt;script&gt;/);
  } finally {
    await open.close();
  }
});

test('research process and ask honour the spend cap and answer locally without a key', async () => {
  const capped = await gateway(0);
  try {
    const asked = await capped.call('/api/research/ask', { method: 'POST', body: JSON.stringify({ collectionId: 'everything', question: 'What is filed?' }) });
    const askBody = await asked.json() as { error?: string };
    assert.equal(asked.status, 429);
    assert.match(askBody.error || '', /Spend cap reached/);
    assert.equal((await readLedger(capped.dir)).length, 0);
  } finally {
    await capped.close();
  }

  const open = await gateway();
  try {
    const uploaded = await open.call('/api/research/sources', {
      method: 'POST',
      body: JSON.stringify({
        collectionId: 'cardinal',
        title: 'Cooling notes',
        fileName: 'cool.txt',
        contentType: 'text/plain',
        text: '[00:11:20] Silica glaze crazes when the cool is too fast.',
      }),
    });
    assert.equal(uploaded.status, 201);
    const made = await uploaded.json() as { sources: { id: string }[] };
    const processed = await open.call(`/api/research/sources/${made.sources[0].id}/process`, { method: 'POST', body: '{}' });
    const processedBody = await processed.json() as { source: { status: string } };
    assert.equal(processed.status, 200);
    assert.equal(processedBody.source.status, 'ready');
    const stored = JSON.parse(await readFile(path.join(open.dir, 'store.json'), 'utf8')) as { ledger: { model: string; costUsd: number }[] };
    assert.equal(stored.ledger.length, 1);
    assert.equal(stored.ledger[0].model, 'hash-embed');
    const asked = await open.call('/api/research/ask', { method: 'POST', body: JSON.stringify({ collectionId: 'cardinal', question: 'Why does the silica glaze craze?' }) });
    const answer = await asked.json() as { note: string; answer: { mode: string; citations: { timestamp: string | null }[] } };
    assert.equal(asked.status, 200);
    assert.equal(answer.note, 'Local matching, no model key.');
    assert.equal(answer.answer.mode, 'local');
    assert.equal(answer.answer.citations[0]?.timestamp, '11:20');
    assert.equal(JSON.stringify(answer).includes('research-files'), false);
  } finally {
    await open.close();
  }
});

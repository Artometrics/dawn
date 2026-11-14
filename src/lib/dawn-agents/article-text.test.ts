import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchArticleText, htmlToText } from './article-text.ts';

test('htmlToText strips markup', () => {
  assert.equal(htmlToText('<style>a{}</style><p>Harbor &amp; lamp</p>'), 'Harbor & lamp');
});

test('a video host is refused before any fetch', async () => {
  let called = false;
  const original = globalThis.fetch;
  globalThis.fetch = (async () => {
    called = true;
    throw new Error('network');
  }) as typeof fetch;
  try {
    await assert.rejects(fetchArticleText('https://youtu.be/abc'), (error: unknown) => {
      assert.equal((error as { code?: string }).code, 'YOUTUBE_BLOCKED');
      return true;
    });
    assert.equal(called, false);
  } finally {
    globalThis.fetch = original;
  }
});

test('a private address is refused', async () => {
  await assert.rejects(fetchArticleText('http://127.0.0.1/secret'), (error: unknown) => {
    assert.equal((error as { status?: number }).status, 400);
    return true;
  });
});

test('a public article is read', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => new Response('<html><body><article><p>The harbor lamp is a fixed white light on the north pier and it is tended every evening.</p></article></body></html>', {
    status: 200,
    headers: { 'content-type': 'text/html' },
  })) as typeof fetch;
  try {
    const result = await fetchArticleText('https://example.com/story');
    assert.match(result.text, /harbor lamp/);
  } finally {
    globalThis.fetch = original;
  }
});

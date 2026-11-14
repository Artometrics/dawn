import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchArticleText, htmlToText } from './article-text';
import { VIDEO_BLOCKED_MESSAGE } from '../cuts/policy';

test('htmlToText strips markup', () => {
  assert.equal(htmlToText('<style>a{}</style><p>Harbor &amp; lamp</p>'), 'Harbor & lamp');
});

test('a video host is refused before any fetch', async () => {
  await assert.rejects(
    () => fetchArticleText('https://youtu.be/abc', async () => {
      throw new Error('network');
    }),
    (error: unknown) => error instanceof Error && error.message === VIDEO_BLOCKED_MESSAGE,
  );
});

test('a private address is refused before any fetch', async () => {
  await assert.rejects(
    () => fetchArticleText('http://127.0.0.1/secret', async () => {
      throw new Error('network');
    }),
    /not a public article/,
  );
});

test('a public article is read through the injected fetch', async () => {
  const result = await fetchArticleText('https://example.com/story', async () => new Response('<html><body><article><p>The harbor lamp is a fixed white light on the north pier and it is tended every evening.</p></article></body></html>', {
    status: 200,
    headers: { 'content-type': 'text/html' },
  }));
  assert.match(result.text, /harbor lamp/);
});

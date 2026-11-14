import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { startAgentsServer } from '../dawn-agents/http';
import { mailSendingEnabled, SEND_BATCH_CAP } from '../dawn-agents/publish';

const owner = { 'x-auth-request-email': 'kyle@example.com', 'content-type': 'application/json' };

test('mail stays off unless NEWSLETTER_SEND_ENABLED is exactly true, even with a provider key', async () => {
  const previousFlag = process.env.NEWSLETTER_SEND_ENABLED;
  const previousKey = process.env.RESEND_API_KEY;
  delete process.env.NEWSLETTER_SEND_ENABLED;
  process.env.RESEND_API_KEY = 're_live_looking_key';
  assert.equal(mailSendingEnabled(), false);
  assert.equal(SEND_BATCH_CAP, 50);
  const calls: string[] = [];
  const home = await mkdtemp(path.join(tmpdir(), 'dawn-mail-'));
  const storePath = path.join(home, 'store.json');
  const server = await startAgentsServer({
    storePath,
    ownerEmail: 'kyle@example.com',
    workerToken: 'test-worker-token',
    editorToken: 'test-editor-token',
    forceStandIn: true,
    schedule: false,
    fetchImpl: async (input) => {
      calls.push(String(input));
      throw new Error('a mail host was called');
    },
  });
  try {
    const created = await post(server.url, '/api/articles', { title: 'Hello', body: 'A letter.', subject: 'Hello' });
    assert.equal(created.status, 201);
    const published = await post(server.url, `/api/articles/${created.id}/publish`, {});
    assert.equal(published.status, 200);
    const subscribed = await fetch(`${server.url}/api/public/subscribe`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'reader@example.com' }),
    });
    assert.equal(subscribed.status, 200);
    const store = JSON.parse(await readFile(storePath, 'utf8')) as { subscribers: { confirmToken: string; unsubToken: string }[] };
    const confirmed = await fetch(`${server.url}/api/public/confirm`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: store.subscribers[0].confirmToken }),
    });
    assert.equal(confirmed.status, 200);
    const sent = await post(server.url, `/api/articles/${created.id}/send`, { confirm: true });
    assert.equal(sent.status, 200);
    assert.equal(sent.dryRun, true);
    assert.equal(sent.sent, 0);
    assert.equal(sent.provider, 'off');
    assert.equal(calls.length, 0);
    assert.equal(server.outbox.length, 0);
    const oneClick = await fetch(`${server.url}/api/public/unsubscribe?token=${encodeURIComponent(store.subscribers[0].unsubToken)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: 'List-Unsubscribe=One-Click',
    });
    assert.equal(oneClick.status, 200);
  } finally {
    await server.close();
    await rm(home, { recursive: true, force: true });
    restore('NEWSLETTER_SEND_ENABLED', previousFlag);
    restore('RESEND_API_KEY', previousKey);
  }
});

test('the flag sends through the console outbox only, with one-click unsubscribe headers', async () => {
  const previousFlag = process.env.NEWSLETTER_SEND_ENABLED;
  const previousKey = process.env.RESEND_API_KEY;
  process.env.NEWSLETTER_SEND_ENABLED = 'true';
  delete process.env.RESEND_API_KEY;
  assert.equal(mailSendingEnabled(), true);
  const home = await mkdtemp(path.join(tmpdir(), 'dawn-mail-on-'));
  const storePath = path.join(home, 'store.json');
  const server = await startAgentsServer({
    storePath,
    ownerEmail: 'kyle@example.com',
    workerToken: 'test-worker-token',
    editorToken: 'test-editor-token',
    forceStandIn: true,
    schedule: false,
    fetchImpl: async () => {
      throw new Error('a mail host was called');
    },
  });
  try {
    const created = await post(server.url, '/api/articles', { title: 'Hello', body: 'A letter.', subject: 'Hello' });
    await post(server.url, `/api/articles/${created.id}/publish`, {});
    await fetch(`${server.url}/api/public/subscribe`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'reader@example.com' }),
    });
    const store = JSON.parse(await readFile(storePath, 'utf8')) as { subscribers: { confirmToken: string }[] };
    await fetch(`${server.url}/api/public/confirm`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: store.subscribers[0].confirmToken }),
    });
    const sent = await post(server.url, `/api/articles/${created.id}/send`, { confirm: true });
    assert.equal(sent.dryRun, false);
    assert.equal(sent.sent, 1);
    assert.equal(sent.provider, 'console');
    assert.equal(server.outbox.length, 1);
    assert.match(server.outbox[0].headers?.['List-Unsubscribe'] || '', /unsubscribe\?token=/);
    assert.equal(server.outbox[0].headers?.['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click');
    assert.match(server.outbox[0].text, /548 Market Street/);
  } finally {
    await server.close();
    await rm(home, { recursive: true, force: true });
    restore('NEWSLETTER_SEND_ENABLED', previousFlag);
    restore('RESEND_API_KEY', previousKey);
  }
});

function restore(name: 'NEWSLETTER_SEND_ENABLED' | 'RESEND_API_KEY', value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

async function post(url: string, pathname: string, body: unknown) {
  const response = await fetch(`${url}${pathname}`, { method: 'POST', headers: owner, body: JSON.stringify(body) });
  const data = (await response.json()) as { id?: string; status?: number; dryRun?: boolean; sent?: number; provider?: string };
  return { ...data, status: response.status };
}

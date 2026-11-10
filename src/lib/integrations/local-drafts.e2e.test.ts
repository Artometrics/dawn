import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { startAgentsServer } from '../dawn-agents/http.ts';

test('a signed-in desk stores chat and refuses a remote page, and a stranger cannot', async () => {
  const home = await mkdtemp(path.join(tmpdir(), 'dawn-drafts-'));
  const server = await startAgentsServer({
    storePath: path.join(home, 'store.json'),
    ownerEmail: 'kyle@example.com',
    workerToken: 'worker',
    editorToken: 'editor',
    forceStandIn: true,
    schedule: false,
    port: 0,
  });
  const owner = { 'content-type': 'application/json', 'x-auth-request-email': 'kyle@example.com' };
  try {
    const stranger = await fetch(`${server.url}/api/local-drafts`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"kind":"chat","personId":"letter-carrier","text":"no"}' });
    assert.equal(stranger.status, 401);
    const saved = await fetch(`${server.url}/api/local-drafts`, {
      method: 'POST',
      headers: owner,
      body: JSON.stringify({ kind: 'chat', personId: 'letter-carrier', text: 'kept on the desk' }),
    });
    assert.equal(saved.status, 201);
    const read = await fetch(`${server.url}/api/local-drafts?person=letter-carrier`, { headers: owner });
    const body = await read.json() as { chat: { text: string }[] };
    assert.equal(body.chat.at(-1)?.text, 'kept on the desk');
    const draft = await fetch(`${server.url}/api/local-drafts`, {
      method: 'POST',
      headers: owner,
      body: JSON.stringify({ kind: 'send', to: 'review@localhost', body: 'hold this' }),
    });
    const held = await draft.json() as { id: string; status: string };
    assert.equal(held.status, 'review');
    await fetch(`${server.url}/api/local-drafts`, {
      method: 'POST',
      headers: owner,
      body: JSON.stringify({ kind: 'sandbox', name: 'booth.html', html: '<p>booth</p>' }),
    });
    const remote = await fetch(`${server.url}/api/local-drafts`, {
      method: 'POST',
      headers: owner,
      body: JSON.stringify({ kind: 'browse', url: 'https://example.com' }),
    });
    assert.equal(remote.status, 403);
    const fileRead = await fetch(`${server.url}/api/local-drafts`, {
      method: 'POST',
      headers: owner,
      body: JSON.stringify({ kind: 'browser', target: 'booth.html' }),
    });
    assert.equal(fileRead.status, 400);
    const local = await fetch(`${server.url}/api/local-drafts`, {
      method: 'POST',
      headers: owner,
      body: JSON.stringify({ kind: 'page', name: 'booth.html' }),
    });
    const page = await local.json() as { html: string; kind: string };
    assert.equal(page.kind, 'file');
    assert.match(page.html, /booth/);
    const script = await fetch(`${server.url}/api/local-drafts`, {
      method: 'POST',
      headers: owner,
      body: JSON.stringify({ kind: 'script', name: 'fixture.js' }),
    });
    assert.equal(script.status, 501);
    const approved = await fetch(`${server.url}/api/local-drafts`, {
      method: 'POST',
      headers: owner,
      body: JSON.stringify({ kind: 'approve', id: held.id }),
    });
    const mailed = await approved.json() as { delivery: { delivered: boolean }; mockMail: { transport: string; delivered: boolean; note: string } };
    assert.equal(mailed.delivery.delivered, false);
    assert.equal(mailed.mockMail.transport, 'mock');
    assert.equal(mailed.mockMail.delivered, false);
    assert.match(mailed.mockMail.note, /Nothing was sent/);
    await server.close();
    const again = await startAgentsServer({
      storePath: path.join(home, 'store.json'),
      ownerEmail: 'kyle@example.com',
      workerToken: 'worker',
      editorToken: 'editor',
      forceStandIn: true,
      schedule: false,
      port: 0,
    });
    const reloaded = await fetch(`${again.url}/api/local-drafts?person=letter-carrier`, { headers: owner });
    const after = await reloaded.json() as { chat: { text: string }[] };
    assert.equal(after.chat.at(-1)?.text, 'kept on the desk');
    await again.close();
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

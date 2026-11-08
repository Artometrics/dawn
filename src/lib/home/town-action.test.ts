import assert from 'node:assert/strict';
import test from 'node:test';
import { probeDesk, townAction } from './town-action';

test('a missing gateway is offline and does not offer a fake sign-in', async () => {
  const status = await probeDesk(async () => new Response('missing', { status: 404 }), '/api/state');
  assert.equal(status, 'offline');
  const ask = townAction('/agents', status);
  assert.equal(ask.kind, 'blocked');
  const editor = townAction('/editor', status);
  assert.equal(editor.kind, 'blocked');
  assert.equal(townAction('/village', status).kind, 'navigate');
  assert.equal(townAction('/atlas', status).kind, 'navigate');
});

test('a 401 gateway is a real sign-in, and a 200 gateway may open the desk', async () => {
  const signin = await probeDesk(async () => new Response(null, { status: 401 }), '/api/state');
  assert.equal(signin, 'signin');
  assert.equal(townAction('/agents', signin).kind, 'navigate');
  const ready = await probeDesk(async () => new Response('{}', { status: 200 }), '/api/state');
  assert.equal(ready, 'ready');
  assert.deepEqual(townAction('/agents?section=recipes', ready), { kind: 'navigate', href: '/agents?section=recipes' });
});

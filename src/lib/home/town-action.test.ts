import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyDesk, probeDesk, townAction } from './town-action';

test('a missing gateway is offline and does not offer a fake sign-in', async () => {
  const status = await probeDesk(async () => new Response('missing', { status: 404 }), '/api/state');
  assert.equal(status, 'offline');
  const ask = townAction('/agents', status);
  assert.equal(ask.kind, 'blocked');
  assert.equal(townAction('/editor', status).kind, 'navigate');
  assert.equal(townAction('/artifacts', status).kind, 'navigate');
  assert.deepEqual(townAction('/letter', status), { kind: 'navigate', href: '/letter' });
  assert.equal(townAction('/village', status).kind, 'navigate');
  assert.equal(townAction('/atlas', status).kind, 'navigate');
});

test('an opaque redirect is sign-in, and a bare status 0 is not', () => {
  assert.equal(classifyDesk({ status: 0, ok: false, type: 'opaqueredirect' }), 'signin');
  assert.equal(classifyDesk({ status: 302, ok: false, type: 'default' }), 'signin');
  assert.equal(classifyDesk({ status: 0, ok: false, type: 'error' }), 'offline');
  assert.equal(classifyDesk({ status: 0, ok: false, type: 'opaque' }), 'offline');
  assert.equal(classifyDesk({ status: 0, ok: false }), 'offline');
  assert.equal(classifyDesk({ status: 200, ok: true, type: 'basic' }), 'ready');
  assert.equal(classifyDesk({ status: 404, ok: false, type: 'basic' }), 'offline');
});

test('a 401 gateway is a real sign-in, and a 200 gateway may open the desk', async () => {
  const signin = await probeDesk(async () => new Response(null, { status: 401 }), '/api/state');
  assert.equal(signin, 'signin');
  assert.equal(townAction('/agents', signin).kind, 'navigate');
  const ready = await probeDesk(async () => new Response('{}', { status: 200 }), '/api/state');
  assert.equal(ready, 'ready');
  assert.deepEqual(townAction('/agents?section=recipes', ready), { kind: 'navigate', href: '/agents?section=recipes' });
});

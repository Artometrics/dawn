import assert from 'node:assert/strict';
import test from 'node:test';
import { forwardedApiHeaders } from './forward-headers.ts';

test('a client email header is dropped unless this process sets the session', () => {
  const incoming: [string, string][] = [
    ['x-auth-request-email', 'attacker@example.com'],
    ['content-type', 'application/json'],
    ['origin', 'http://127.0.0.1:3000'],
    ['sec-fetch-site', 'same-origin'],
  ];
  const stripped = forwardedApiHeaders(incoming, null);
  assert.equal(stripped.get('x-auth-request-email'), null);
  assert.equal(stripped.get('origin'), 'http://127.0.0.1:3000');
  const owner = forwardedApiHeaders(incoming, 'kyle@example.com');
  assert.equal(owner.get('x-auth-request-email'), 'kyle@example.com');
});

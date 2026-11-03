import assert from 'node:assert/strict';
import test from 'node:test';
import { isLoopback, proxyUserAllowed } from './proxy-auth';

test('the owner header is ignored unless the peer is loopback', () => {
  const headers = { 'x-auth-request-email': 'kylesmcauliffe@gmail.com' };
  assert.equal(proxyUserAllowed('127.0.0.1', headers, 'kylesmcauliffe@gmail.com'), true);
  assert.equal(proxyUserAllowed('::ffff:127.0.0.1', headers, 'KyleSmcauliffe@gmail.com'), true);
  assert.equal(proxyUserAllowed('10.1.1.5', headers, 'kylesmcauliffe@gmail.com'), false);
  assert.equal(proxyUserAllowed('127.0.0.1', headers, 'someone@example.com'), false);
  assert.equal(proxyUserAllowed('127.0.0.1', {}, 'kylesmcauliffe@gmail.com'), false);
  assert.equal(isLoopback('::1'), true);
});

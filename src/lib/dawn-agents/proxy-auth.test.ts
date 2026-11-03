import assert from 'node:assert/strict';
import test from 'node:test';
import { firstAllowedEmail, isLoopback, proxyUserAllowed } from './proxy-auth';

const LIST = 'kylesmcauliffe@gmail.com, team@artometrics.com';

test('the owner header is ignored unless the peer is loopback', () => {
  const headers = { 'x-auth-request-email': 'kylesmcauliffe@gmail.com' };
  assert.equal(proxyUserAllowed('127.0.0.1', headers, 'kylesmcauliffe@gmail.com'), true);
  assert.equal(proxyUserAllowed('::ffff:127.0.0.1', headers, 'KyleSmcauliffe@gmail.com'), true);
  assert.equal(proxyUserAllowed('10.1.1.5', headers, 'kylesmcauliffe@gmail.com'), false);
  assert.equal(proxyUserAllowed('127.0.0.1', headers, 'someone@example.com'), false);
  assert.equal(proxyUserAllowed('127.0.0.1', {}, 'kylesmcauliffe@gmail.com'), false);
  assert.equal(isLoopback('::1'), true);
});

test('DAWN_ALLOWED_EMAIL is a comma-separated list', () => {
  const kyle = { 'x-auth-request-email': 'kylesmcauliffe@gmail.com' };
  const team = { 'x-forwarded-email': 'Team@Artometrics.com' };
  const stranger = { 'x-auth-request-email': 'someone@example.com' };
  assert.equal(proxyUserAllowed('127.0.0.1', kyle, LIST), true);
  assert.equal(proxyUserAllowed('127.0.0.1', team, LIST), true);
  assert.equal(proxyUserAllowed('127.0.0.1', stranger, LIST), false);
  assert.equal(proxyUserAllowed('10.1.1.5', team, LIST), false);
  assert.equal(firstAllowedEmail(LIST), 'kylesmcauliffe@gmail.com');
  assert.equal(firstAllowedEmail('  ,  '), '');
});

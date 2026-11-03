import assert from 'node:assert/strict';
import test from 'node:test';
import { redact } from './redact.ts';

test('redact strips env secrets, bearer tokens, and key shapes', () => {
  const env = {
    XAI_API_KEY: 'xai-test-secret-value',
    DAWN_CODE_TOKEN: 'dawn-code-token-value',
  };
  const raw = 'failed key xai-test-secret-value Authorization: Bearer dawn-code-token-value and sk-or-v1-abcdefghijklmnopqrstuvwxyz';
  const clean = redact(raw, env);
  assert.equal(clean.includes('xai-test-secret-value'), false);
  assert.equal(clean.includes('dawn-code-token-value'), false);
  assert.equal(clean.includes('sk-or-v1-'), false);
  assert.match(clean, /\[redacted\]/);
});

test('redact leaves ordinary code alone', () => {
  assert.equal(redact('const token = 1;', {}), 'const token = 1;');
});

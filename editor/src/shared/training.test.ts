import assert from 'node:assert/strict';
import test from 'node:test';
import { trainingRecord } from './training.ts';

test('a training row keeps the interaction and strips secrets', () => {
  const env = { XAI_API_KEY: 'xai-test-secret-value' };
  const row = trainingRecord(
    {
      kind: 'inline',
      action: 'accept',
      model: 'x-ai/grok-4.7',
      prompt: 'rename foo, key xai-test-secret-value',
      response: 'const bar = 1',
      paths: ['src/a.ts'],
      edit: [{ path: 'src/a.ts', before: 'const foo = 1', after: 'const bar = 1' }],
    },
    env,
    new Date('2026-11-03T08:00:00.000Z'),
  );
  assert.equal(row.source, 'dawn-code');
  assert.equal(row.kind, 'inline');
  assert.equal(row.action, 'accept');
  assert.equal(row.model, 'x-ai/grok-4.7');
  assert.equal(row.prompt.includes('xai-test-secret-value'), false);
  assert.match(row.prompt, /\[redacted\]/);
  assert.equal(row.edit[0].after, 'const bar = 1');
  assert.match(row.id, /^tl_[0-9a-f]{16}$/);
});

test('unknown training actions are rejected', () => {
  assert.throws(() =>
    trainingRecord({
      kind: 'chat',
      action: 'delete' as 'reject',
      model: 'gemini-3.8-flash',
      prompt: 'x',
      response: 'y',
    }),
  );
});

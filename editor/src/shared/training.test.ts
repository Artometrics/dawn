import assert from 'node:assert/strict';
import test from 'node:test';
import { toBackfillLine, trainingRecord } from './training.ts';

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

test('backfill lines match the Dawn Agents import schema', () => {
  const row = trainingRecord(
    { kind: 'chat', action: 'response', model: 'gemini-3.8-flash', prompt: 'Hi', response: 'Hello', paths: ['a.ts'] },
    {},
    new Date('2026-11-03T08:00:00.000Z'),
  );
  const line = JSON.parse(toBackfillLine(row)) as { messages: { role: string; content: string }[]; metadata: { source: string; license: string; provenance: string } };
  assert.deepEqual(line.messages.map((message) => message.role), ['system', 'user', 'assistant']);
  assert.equal(line.messages[1].content, 'Hi');
  assert.equal(line.messages[2].content, 'Hello');
  assert.equal(line.metadata.source, 'dawn-code');
  assert.equal(line.metadata.license, 'internal');
  assert.equal(line.metadata.provenance, 'Dawn Code editor');
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

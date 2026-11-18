import assert from 'node:assert/strict';
import test from 'node:test';
import { geminiHistory } from './chat-history.ts';

test('history never opens with a model turn', () => {
  const out = geminiHistory([
    { role: 'assistant', content: 'Hi, I am Trinity.' },
    { role: 'assistant', content: '' },
  ]);
  assert.deepEqual(out, []);
});

test('history keeps user-first alternating turns and folds repeats', () => {
  const out = geminiHistory([
    { role: 'assistant', content: 'Welcome' },
    { role: 'user', content: 'Hi' },
    { role: 'assistant', content: 'Hello!' },
    { role: 'assistant', content: 'Anything else?' },
    { role: 'user', content: 'Yes' },
    { role: 'assistant', content: 'Sure.' },
  ]);
  assert.equal(out[0].role, 'user');
  assert.deepEqual(out.map((m) => m.role), ['user', 'assistant', 'user', 'assistant']);
  assert.equal(out[1].content, 'Hello!\n\nAnything else?');
});

test('a trailing user turn is dropped so the next send stays alternating', () => {
  const out = geminiHistory([
    { role: 'user', content: 'first' },
    { role: 'assistant', content: 'reply' },
    { role: 'user', content: 'unanswered' },
  ]);
  assert.deepEqual(out.map((m) => m.role), ['user', 'assistant']);
});

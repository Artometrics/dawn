import assert from 'node:assert/strict';
import test from 'node:test';
import { GROK_MODEL, remapModelId, xaiModelSlug } from './models.ts';

test('retired Grok 2 ids map to Grok 4.7', () => {
  assert.equal(remapModelId('x-ai/grok-2-1212'), GROK_MODEL);
  assert.equal(remapModelId('X-AI/GROK-2'), GROK_MODEL);
  assert.equal(remapModelId('openrouter/x-ai/grok-2'), GROK_MODEL);
});

test('current gateway ids stay put', () => {
  assert.equal(remapModelId('x-ai/grok-4.7'), 'x-ai/grok-4.7');
  assert.equal(remapModelId('openai/gpt-4o-mini'), 'openai/gpt-4o-mini');
  assert.equal(remapModelId('gemini-3.8-flash'), 'gemini-3.8-flash');
});

test('retired Gemini aliases map forward', () => {
  assert.equal(remapModelId('gemini-2.0-flash'), 'gemini-3.8-flash');
  assert.equal(remapModelId('gemini-1.5-pro'), 'gemini-3.1-pro-preview');
});

test('direct xAI calls drop the vendor prefix', () => {
  assert.equal(xaiModelSlug('x-ai/grok-4.7'), 'grok-4.7');
  assert.equal(xaiModelSlug('x-ai/grok-2-1212'), 'grok-4.7');
});

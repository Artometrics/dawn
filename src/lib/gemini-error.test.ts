import assert from 'node:assert/strict';
import test from 'node:test';
import { describeGeminiError } from './gemini-error.ts';

test('app check failures stay free of urls', () => {
  const raw = 'Error fetching from https://firebasevertexai.googleapis.com/v1beta/projects/dawn/models/gemini-flash-latest:generateContent: [401 Unauthorized] Firebase App Check token is UNAUTHENTICATED';
  const text = describeGeminiError(new Error(raw));
  assert.equal(text, 'Gemini was blocked. This page has no Firebase App Check token.');
  assert.equal(text.includes('http'), false);
});

test('timeouts, missing models, and unknown failures get their own sentences', () => {
  assert.match(describeGeminiError(new Error('Timeout has expired.')), /too long/);
  assert.match(describeGeminiError(new Error('models/gemini-flash-latest was not found')), /model name/);
  assert.equal(describeGeminiError(new Error('socket hang up')), 'Gemini did not answer.');
  assert.match(describeGeminiError('Gemini is not on this host yet.'), /not on this host/);
});

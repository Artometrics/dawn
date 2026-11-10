import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';
import { browserDecision, runKit } from './runners.ts';

test('private browser targets are refused and a send stays a draft', async () => {
  assert.equal(browserDecision('http://169.254.169.254/latest').allow, false);
  assert.equal(browserDecision('http://127.0.0.1/').allow, false);
  assert.equal(browserDecision('http://10.1.1.1/').allow, false);
  const external = browserDecision('https://example.com/');
  assert.equal(external.allow, false);
  if (!external.allow) assert.match(external.reason, /not enabled/);
  const draft = await runKit('sendkit');
  assert.equal(draft.delivered, false);
  assert.equal(draft.model, 'mock');
  assert.match(draft.summary, /Telegram was not called/);
});

test('teammate, assistant, sandbox, and nightcode checks stay inside the jail', async () => {
  const team = await runKit('teammates');
  assert.equal(team.ok, true);
  assert.equal(team.delivered, false);
  const assistant = await runKit('assistant');
  assert.equal(assistant.detail && (assistant.detail.draft as { delivered: boolean }).delivered, false);
  const game = await runKit('sandbox');
  assert.match(String((game.detail as { html?: string }).html), /Collect/);
  const code = await runKit('nightcode');
  assert.match(code.summary, /Bash was not run/);
});

test('Chrome clicks the local relay fixture', { skip: existsSync('/usr/bin/google-chrome') ? false : 'Chrome is not installed' }, async () => {
  const result = await runKit('browser');
  assert.equal(result.ok, true);
  assert.equal((result.detail as { text?: string }).text, 'collected');
});

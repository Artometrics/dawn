import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { resolveGatewayBase } from './gateway-url';

test('an empty gatewayUrl stays on this host', () => {
  assert.equal(resolveGatewayBase(undefined, ''), '');
  assert.equal(resolveGatewayBase('', ''), '');
  assert.equal(resolveGatewayBase('   ', '  '), '');
  assert.equal(resolveGatewayBase(undefined, undefined), '');
  assert.equal(resolveGatewayBase(undefined, null), '');
  const config = JSON.parse(readFileSync('public/dawn-agents-config.json', 'utf8')) as { gatewayUrl?: unknown };
  assert.equal(resolveGatewayBase(undefined, config.gatewayUrl), '');
});

test('a real gateway URL is trimmed and used', () => {
  assert.equal(resolveGatewayBase(undefined, 'https://agents.example/'), 'https://agents.example');
  assert.equal(resolveGatewayBase(' http://127.0.0.1:8787/ ', ''), 'http://127.0.0.1:8787');
});

test('the agents desk does not treat same-origin as a missing gateway', () => {
  const desk = readFileSync('src/components/dawn-agents/agents-app.tsx', 'utf8');
  const letter = readFileSync('src/app/letter/page.tsx', 'utf8');
  assert.equal(desk.includes('Set the gateway URL'), false);
  assert.equal(letter.includes('if (!url) return'), false);
});

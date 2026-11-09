import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { startAgentsServer } from './http.ts';
import { ownerMutationDecision } from './request-provenance.ts';

const trusted = ['https://town.example'];

test('provenance refuses cross-site, plaintext, and a missing or unknown origin', () => {
  assert.equal(ownerMutationDecision('POST', { origin: 'https://town.example', secFetchSite: 'cross-site', contentType: 'text/plain' }, trusted).allow, false);
  assert.equal(ownerMutationDecision('POST', { origin: 'https://town.example', secFetchSite: 'cross-site', contentType: 'application/json' }, trusted).allow, false);
  assert.equal(ownerMutationDecision('POST', { secFetchSite: 'same-origin', contentType: 'application/json' }, trusted).allow, false);
  assert.equal(ownerMutationDecision('POST', { origin: 'https://evil.example', secFetchSite: 'same-origin', contentType: 'application/json' }, trusted).allow, false);
  assert.equal(ownerMutationDecision('POST', { origin: 'https://town.example', secFetchSite: 'same-origin', contentType: 'application/json' }, trusted).allow, true);
  assert.equal(ownerMutationDecision('POST', { contentType: 'application/json' }, trusted).allow, true);
});

test('the owner draft route enforces provenance and does not publish a wildcard', async () => {
  const home = await mkdtemp(path.join(tmpdir(), 'dawn-provenance-'));
  const server = await startAgentsServer({
    storePath: path.join(home, 'store.json'),
    ownerEmail: 'kyle@example.com',
    workerToken: 'worker',
    editorToken: 'editor',
    forceStandIn: true,
    schedule: false,
    port: 0,
    trustedOrigins: trusted,
  });
  const body = JSON.stringify({ kind: 'chat', personId: 'letter-carrier', text: 'kept' });
  try {
    const crossPlain = await post(server.url, {
      'content-type': 'text/plain',
      origin: 'https://evil.example',
      'sec-fetch-site': 'cross-site',
      'x-auth-request-email': 'kyle@example.com',
    }, 'hello');
    assert.equal(crossPlain.status, 403);
    assert.equal(crossPlain.acao, null);
    assert.equal(crossPlain.text.includes('evil.example'), false);

    const crossJson = await post(server.url, {
      'content-type': 'application/json',
      origin: 'https://town.example',
      'sec-fetch-site': 'cross-site',
      'x-auth-request-email': 'kyle@example.com',
    }, body);
    assert.equal(crossJson.status, 403);
    assert.equal(crossJson.acao, null);

    const missingOrigin = await post(server.url, {
      'content-type': 'application/json',
      'sec-fetch-site': 'same-origin',
      'x-auth-request-email': 'kyle@example.com',
    }, body);
    assert.equal(missingOrigin.status, 403);

    const badOrigin = await post(server.url, {
      'content-type': 'application/json',
      origin: 'https://evil.example',
      'sec-fetch-site': 'same-origin',
      'x-auth-request-email': 'kyle@example.com',
    }, body);
    assert.equal(badOrigin.status, 403);
    assert.equal(badOrigin.acao, null);
    assert.equal(badOrigin.text.includes('evil.example'), false);

    const noAuth = await post(server.url, {
      'content-type': 'application/json',
      origin: 'https://town.example',
      'sec-fetch-site': 'same-origin',
    }, body);
    assert.equal(noAuth.status, 401);
    assert.equal(noAuth.acao, null);

    const ok = await post(server.url, {
      'content-type': 'application/json',
      origin: 'https://town.example',
      'sec-fetch-site': 'same-origin',
      'x-auth-request-email': 'kyle@example.com',
    }, body);
    assert.equal(ok.status, 201);
    assert.equal(ok.acao, null);

    const preflight = await fetch(`${server.url}/api/local-drafts`, {
      method: 'OPTIONS',
      headers: { origin: 'https://evil.example', 'access-control-request-method': 'POST' },
    });
    assert.notEqual(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-origin'), null);
    const trustedPreflight = await fetch(`${server.url}/api/local-drafts`, {
      method: 'OPTIONS',
      headers: { origin: 'https://town.example', 'access-control-request-method': 'POST' },
    });
    assert.equal(trustedPreflight.headers.get('access-control-allow-origin'), null);
  } finally {
    await server.close();
    await rm(home, { recursive: true, force: true });
  }
});

async function post(url: string, headers: Record<string, string>, body: string) {
  const response = await fetch(`${url}/api/local-drafts`, { method: 'POST', headers, body });
  const text = await response.text();
  return { status: response.status, text, acao: response.headers.get('access-control-allow-origin') };
}

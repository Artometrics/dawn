import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { cleanMessages, personaPrompt, runChat } from './chat-route.ts';
import { startAgentsServer } from './http.ts';
import {
  DailyRequestCap,
  capMessage,
  configuredProviders,
  dailyRequestCap,
  defaultChoice,
  maxOutputTokens,
  resolveChoice,
} from './model-choice.ts';
import { createKitModel, type Generate } from './model-reply.ts';
import { RateLimiter, clientIp, perIpLimit } from './rate-limit.ts';

test('the picker lists only providers whose key is set, Gemini first', () => {
  assert.deepEqual(configuredProviders({}), []);
  assert.deepEqual(configuredProviders({ XAI_API_KEY: 'x' }).map((item) => item.id), ['xai']);
  assert.deepEqual(configuredProviders({ OPENROUTER_API_KEY: 'o', GEMINI_API_KEY: 'g' }).map((item) => item.id), ['google', 'openrouter']);
  assert.deepEqual(configuredProviders({ GOOGLE_GENERATIVE_AI_API_KEY: 'g' }).map((item) => item.id), ['google']);
  assert.deepEqual(configuredProviders({ GEMINI_API_KEY: '   ' }), []);
  assert.equal(defaultChoice({}), null);
  assert.equal(defaultChoice({ XAI_API_KEY: 'x', GEMINI_API_KEY: 'g' })?.provider, 'google');
});

test('a browser choice is honored only for a configured provider and a listed model', () => {
  const env = { GEMINI_API_KEY: 'g', OPENROUTER_API_KEY: 'o' };
  assert.deepEqual(resolveChoice({ provider: 'openrouter', model: 'deepseek/deepseek-chat' }, env), { provider: 'openrouter', model: 'deepseek/deepseek-chat' });
  assert.equal(resolveChoice({ provider: 'xai', model: 'grok' }, env)?.provider, 'google');
  assert.equal(resolveChoice({ provider: 'openrouter', model: 'not-listed' }, env)?.provider, 'google');
  assert.equal(resolveChoice('nonsense', env)?.provider, 'google');
  assert.equal(resolveChoice({ provider: 'google', model: 'x' }, {}), null);
});

test('the daily cap counts per UTC day, refuses at the limit, and resets at midnight', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'dawn-cap-'));
  try {
    let now = Date.UTC(2026, 10, 12, 23, 59, 0);
    const cap = new DailyRequestCap(path.join(dir, 'daily.json'), 3, () => now);
    assert.deepEqual([cap.take(), cap.take(), cap.take(), cap.take()], [true, true, true, false]);
    assert.equal(cap.status().used, 3);
    assert.match(capMessage(cap.status()), /3 of 3/);
    assert.equal(new DailyRequestCap(path.join(dir, 'daily.json'), 3, () => now).take(), false, 'the count survives a restart');
    now = Date.UTC(2026, 10, 13, 0, 0, 1);
    assert.equal(cap.take(), true);
    assert.equal(cap.status().used, 1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('cap and token settings default to 200 requests and 600 tokens, and tokens never pass 1200', () => {
  assert.equal(dailyRequestCap({}), 200);
  assert.equal(dailyRequestCap({ DAWN_DAILY_REQUEST_CAP: '50' }), 50);
  assert.equal(dailyRequestCap({ DAWN_DAILY_REQUEST_CAP: 'abc' }), 200);
  assert.equal(maxOutputTokens({}), 600);
  assert.equal(maxOutputTokens({ DAWN_MAX_OUTPUT_TOKENS: '300' }), 300);
  assert.equal(maxOutputTokens({ DAWN_MAX_OUTPUT_TOKENS: '99999' }), 1200);
});

test('a chat reply passes the token ceiling, takes one cap slot, and records spend', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'dawn-reply-'));
  try {
    const seen: number[] = [];
    const generate: Generate = async (_choice, _system, _messages, maxTokens) => {
      seen.push(maxTokens);
      return { text: 'Hello.', promptTokens: 100, completionTokens: 20 };
    };
    const ledger: unknown[] = [];
    const cap = new DailyRequestCap(path.join(dir, 'daily.json'), 1);
    const env = { GEMINI_API_KEY: 'g', DAWN_MAX_OUTPUT_TOKENS: '300' };
    const model = createKitModel({ requested: null, cap, env, generate, spend: { blocked: async () => null, record: async (entry) => { ledger.push(entry); } } });
    assert.ok(model);
    assert.equal(await model.reply('system', [{ role: 'user', content: 'hi' }]), 'Hello.');
    assert.deepEqual(seen, [300]);
    assert.equal(ledger.length, 1);
    await assert.rejects(model.reply('system', [{ role: 'user', content: 'again' }]), /Daily model limit/);
    assert.equal(seen.length, 1, 'the provider was not called past the cap');
    assert.equal(createKitModel({ requested: null, cap, env: {}, generate }), null);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('/api/chat rules: known persona only, a message is required, no key is a 503, and a cap error is a 429', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'dawn-chat-'));
  try {
    const cap = new DailyRequestCap(path.join(dir, 'daily.json'), 1);
    const generate: Generate = async () => ({ text: 'A quest step.', promptTokens: 10, completionTokens: 5 });
    const model = createKitModel({ requested: null, cap, env: { GEMINI_API_KEY: 'g' }, generate });
    const messages = [{ role: 'user', text: 'Hi' }];
    assert.equal((await runChat({ persona: 'someone-else', messages }, model)).status, 400);
    assert.equal((await runChat({ persona: 'quest', messages: [] }, model)).status, 400);
    assert.equal((await runChat({ persona: 'quest', messages }, null)).status, 503);
    const ok = await runChat({ persona: 'quest', messages }, model);
    assert.equal(ok.status, 200);
    assert.equal(ok.payload.reply, 'A quest step.');
    assert.match(String(ok.payload.model), /^google:/);
    const capped = await runChat({ persona: 'quest', messages }, model);
    assert.equal(capped.status, 429);
    assert.match(String(capped.payload.error), /Daily model limit/);
    assert.deepEqual(cleanMessages([{ role: 'assistant', text: 'x' }, { role: 'user', text: ' hi ' }, { role: 'system', text: 'no' }]), [{ role: 'user', content: 'hi' }]);
    assert.ok(personaPrompt('quest', ['Learn piano'])?.includes('Learn piano'));
    assert.equal(personaPrompt({}, []), null);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('the per-IP limiter slides, and a forwarded address counts only from the local proxy', () => {
  let now = 0;
  const limiter = new RateLimiter(2, 1000, () => now);
  assert.deepEqual([limiter.take('a'), limiter.take('a'), limiter.take('a'), limiter.take('b')], [true, true, false, true]);
  now = 1001;
  assert.equal(limiter.take('a'), true);
  assert.equal(clientIp('127.0.0.1', '203.0.113.9, 10.0.0.1'), '203.0.113.9');
  assert.equal(clientIp('198.51.100.4', '203.0.113.9'), '198.51.100.4');
  assert.equal(clientIp(undefined, undefined), 'local');
  assert.equal(perIpLimit({}), 20);
  assert.equal(perIpLimit({ DAWN_IP_RATE_PER_MINUTE: '5' }), 5);
});

async function gateway(authDisabled: boolean) {
  const dir = await mkdtemp(path.join(tmpdir(), 'dawn-gw-'));
  const server = await startAgentsServer({
    storePath: path.join(dir, 'store.json'),
    ownerEmail: 'kyle@example.com',
    workerToken: 'worker',
    editorToken: 'editor',
    forceStandIn: true,
    schedule: false,
    port: 0,
    authDisabled,
    trustedOrigins: ['http://127.0.0.1:3000'],
  });
  const call = (route: string, init: RequestInit & { owner?: boolean } = {}) => {
    const { owner, ...rest } = init;
    return fetch(`${server.url}${route}`, {
      ...rest,
      headers: {
        'content-type': 'application/json',
        origin: 'http://127.0.0.1:3000',
        'sec-fetch-site': 'same-origin',
        ...(owner ? { 'x-auth-request-email': 'kyle@example.com' } : {}),
        ...(rest.headers as Record<string, string> | undefined),
      },
    });
  };
  return { call, close: async () => { await server.close(); await rm(dir, { recursive: true, force: true }); } };
}

test('kit sessions: the owner and DAWN_AUTH_DISABLED can start one, anyone else gets 401', async () => {
  const keys = ['GEMINI_API_KEY', 'GOOGLE_GENERATIVE_AI_API_KEY', 'XAI_API_KEY', 'OPENROUTER_API_KEY'] as const;
  const saved = keys.map((key) => process.env[key]);
  for (const key of keys) delete process.env[key];
  const normal = await gateway(false);
  const open = await gateway(true);
  try {
    const body = JSON.stringify({ title: 'Test' });
    assert.equal((await normal.call('/api/kits/nightcode/sessions', { method: 'POST', body })).status, 401);
    assert.equal((await normal.call('/api/kits/nightcode/sessions', { method: 'POST', body, headers: { 'x-auth-request-email': 'someone@example.com' } })).status, 401);
    const owned = await normal.call('/api/kits/nightcode/sessions', { method: 'POST', body, owner: true });
    assert.equal(owned.status, 201);
    const free = await open.call('/api/kits/nightcode/sessions', { method: 'POST', body });
    assert.equal(free.status, 201);
    const session = (await free.json()) as { id: string };
    const sent = await open.call(`/api/kits/nightcode/sessions/${session.id}/messages`, { method: 'POST', body: JSON.stringify({ text: 'hello', mode: 'plan' }) });
    assert.equal(sent.status, 200);
    const reply = (await sent.json()) as { model: string; reason?: string };
    assert.equal(reply.model, 'mock');
    assert.match(reply.reason || '', /No model key/);
    assert.equal((await open.call('/api/models')).status, 200);
    assert.deepEqual(((await (await open.call('/api/models')).json()) as { providers: unknown[] }).providers, []);
    assert.equal((await open.call('/api/chat', { method: 'POST', body: JSON.stringify({ persona: 'quest', messages: [{ role: 'user', text: 'Hi' }] }) })).status, 503);
    assert.equal((await normal.call('/api/chat', { method: 'POST', body: '{}' })).status, 401);
  } finally {
    keys.forEach((key, index) => { if (saved[index] === undefined) delete process.env[key]; else process.env[key] = saved[index]; });
    await normal.close();
    await open.close();
  }
});

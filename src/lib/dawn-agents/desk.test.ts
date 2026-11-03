import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chartStoryExample, parseBackfill, syntheticRoom, toDpoJsonl, toSftJsonl } from './data-studio';
import { tastePairs, type EngagementEvent } from './engage';
import { startAgentsServer } from './http';
import { scrubText } from './scrub';
import { toFineTuneJsonl } from './training';
import { DEFAULT_TRAINING_PROVIDERS } from './types';
import { assessTask } from '../../../worker/sandbox.mjs';
import { validAvatar } from './avatar';
import { AGENT_SPRITES } from '../credits/sprites';

test('training export includes every provider until a switch is turned off', () => {
  assert.equal(DEFAULT_TRAINING_PROVIDERS.google, true);
  assert.equal(DEFAULT_TRAINING_PROVIDERS.xai, true);
  assert.equal(DEFAULT_TRAINING_PROVIDERS.openrouter, true);
  const rows = [
    row('google'),
    row('xai'),
  ];
  const all = toFineTuneJsonl(rows, { ...DEFAULT_TRAINING_PROVIDERS });
  assert.equal(all.trim().split('\n').length, 2);
  const hidden = toFineTuneJsonl(rows, { ...DEFAULT_TRAINING_PROVIDERS, xai: false });
  assert.equal(hidden.includes('grok'), false);
  assert.equal(JSON.parse(hidden.trim()).messages.at(-1).content, 'hello from google');
});

test('scrub removes key shapes and known secret values', () => {
  const cleaned = scrubText('key sk-or-v1-abcdefghijklmnopqrstuvwxyz and AIzaSyDUMMYDUMMYDUMMYDUMMY12 password=hunter2', ['hunter2']);
  assert.equal(cleaned.includes('sk-or'), false);
  assert.equal(cleaned.includes('AIza'), false);
  assert.equal(cleaned.includes('hunter2'), false);
});

test('taste pairs join a like with a skip and keep newsletter clicks', () => {
  const events: EngagementEvent[] = [
    event('recipes', 'like', 'pixel-billboard', 'owner'),
    event('recipes', 'skip', 'brutalist', 'owner'),
    event('newsletter', 'click', 'letter-1', 'r_abcdef1234567890'),
    event('newsletter', 'unsubscribe', 'letter-2', 'r_abcdef1234567890'),
  ];
  const pairs = tastePairs(events);
  assert.equal(pairs.length, 2);
  assert.match(pairs[0].chosen, /pixel-billboard|Pixel/);
  assert.equal(pairs[1].prompt.includes('letter'), true);
});

test('chart stories without a source are dropped and synthetic room is half the real set', () => {
  const dropped = chartStoryExample({ id: 'ex_1', now: 1, sourceUrl: 'not a url', story: 'up 20%', chart: 'bars' });
  assert.equal(dropped.ok, false);
  const kept = chartStoryExample({ id: 'ex_2', now: 1, sourceUrl: 'https://example.com/chart', story: 'The sourced story.', chart: 'bars' });
  assert.equal(kept.ok, true);
  assert.equal(syntheticRoom([
    { ...kept.example, synthetic: false },
    { ...kept.example, id: 'ex_3', synthetic: false },
    { ...kept.example, id: 'ex_4', synthetic: true, track: 'synthetic' },
  ]), 0);
});

test('backfill JSONL keeps metadata and parks unknown licenses in review', () => {
  const parsed = parseBackfill('{"messages":[{"role":"user","content":"Hi"},{"role":"assistant","content":"Hello"}],"metadata":{"source":"personal-model","license":"internal","provenance":"Kyle archive","id":"b1"}}\n', 10, (prefix) => `${prefix}_1`);
  assert.equal(parsed.errors.length, 0);
  assert.equal(parsed.examples[0].license, 'internal');
  assert.equal(parsed.examples[0].consent, 'missing');
  assert.equal(parsed.examples[0].status, 'pending');
  assert.match(toSftJsonl(parsed.examples), /internal/);
  assert.match(toDpoJsonl(parsed.examples), /^$/);
});

test('a Kenney sprite is a valid agent avatar and the painted grid still is', () => {
  assert.equal(validAvatar({ sprite: AGENT_SPRITES[0].id }), true);
  assert.equal(validAvatar({ sprite: 'not-a-sprite' }), false);
  assert.equal(validAvatar({ grid: 8, cells: '1'.repeat(64) }), true);
});

test('risky commands wait and blocked commands never run', () => {
  const curl = assessTask({ action: 'exec', command: 'curl https://example.com' });
  assert.equal(curl.decision, 'confirm');
  const wipe = assessTask({ action: 'exec', command: 'rm -rf /' });
  assert.equal(wipe.decision, 'deny');
  const write = assessTask({ action: 'write', path: 'hello.txt', content: 'dawn' });
  assert.equal(write.decision, 'allow');
  const escape = assessTask({ action: 'read', path: '../secret' });
  assert.equal(escape.decision, 'deny');
});

test('owner can chat, group, track spend, export training, and run a sandbox tool', async () => {
  const home = await mkdtemp(path.join(tmpdir(), 'dawn-agents-'));
  const storePath = path.join(home, 'store.json');
  const server = await startAgentsServer({
    storePath,
    ownerEmail: 'kyle@example.com',
    workerToken: 'test-worker-token',
    editorToken: 'test-editor-token',
    forceStandIn: true,
    schedule: false,
    port: 0,
  });
  const worker = spawn(process.execPath, ['worker/dawn-worker.mjs'], {
    cwd: path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../..'),
    env: {
      PATH: process.env.PATH,
      HOME: home,
      DAWN_AGENTS_URL: server.url,
      DAWN_WORKER_TOKEN: 'test-worker-token',
      DAWN_WORKER_KIND: 'linux',
      DAWN_AGENTS_HOME: home,
    },
  });
  try {
    const blocked = await fetch(`${server.url}/api/state`, { headers: { 'x-auth-request-email': 'other@example.com' } });
    assert.equal(blocked.status, 401);
    const token = 'owner';
    const first = await api(server.url, token, '/api/agents', { name: 'Ada', instructions: 'Ada keeps the plan short.', model: 'gemini-3.8-flash', computer: 'hetzner', avatar: { grid: 8, cells: '1'.repeat(64) } });
    const second = await api(server.url, token, '/api/agents', { name: 'Bea', instructions: 'Bea looks things up.', model: 'x-ai/grok-4.7', computer: 'hetzner', avatar: { grid: 8, cells: '2'.repeat(64) } });
    const adaThread = first.thread.id as string;
    const adaId = first.agent.id as string;
    await waitForWorker(server.url, token);
    const chat = await sse(server.url, token, `/api/threads/${adaThread}/messages`, { text: 'Use the computer to write file hello.txt that says dawn and list the directory' });
    const list = chat.filter((event) => event.event === 'tool' && event.data.tool?.name === 'computer_list').at(-1);
    assert.equal(list?.data.tool.state, 'done');
    const written = await readFile(path.join(home, adaId, 'hello.txt'), 'utf8');
    assert.equal(written, 'dawn');
    const group = await api(server.url, token, '/api/threads', { title: 'Studio', agentIds: [adaId, second.agent.id] });
    const grouped = await sse(server.url, token, `/api/threads/${group.thread.id}/messages`, { text: 'Hello team' });
    const assistants = grouped.filter((event) => event.event === 'assistant');
    assert.equal(assistants.length, 2);
    const state = await api(server.url, token, '/api/state');
    assert.equal(state.spend.capUsd, 20);
    assert.ok(state.spend.entries.length >= 1);
    assert.equal(state.training.providers.xai, true);
    assert.equal(state.training.providers.google, true);
    const denied = await api(server.url, token, `/api/articles/missing/send`, { confirm: false });
    assert.equal(denied.status, 400);
    assert.equal(server.outbox.length, 0);
    const exportRes = await fetch(`${server.url}/api/training/export.jsonl`, { headers: ownerHeaders() });
    const jsonl = await exportRes.text();
    assert.match(jsonl, /"messages"/);
    const editor = await fetch(`${server.url}/api/v1/agents/${adaId}/messages`, {
      method: 'POST',
      headers: { authorization: 'Bearer test-editor-token', 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'Status please' }),
    });
    assert.equal(editor.status, 200);
    const unsent = await fetch(`${server.url}/api/articles/nope/send`, {
      method: 'POST',
      headers: ownerHeaders(),
      body: JSON.stringify({ confirm: false }),
    });
    assert.equal(unsent.status, 400);
  } finally {
    worker.kill();
    await server.close();
    await rm(home, { recursive: true, force: true });
  }
});

function row(provider: 'google' | 'xai') {
  return {
    id: provider,
    at: 1,
    provider,
    model: provider === 'google' ? 'gemini-3.8-flash' : 'grok-4.7',
    agentId: 'a_1',
    threadId: 'th_1',
    messageId: 'm_1',
    latencyMs: 10,
    promptTokens: 4,
    completionTokens: 4,
    costUsd: 0,
    system: 'Be brief.',
    messages: [{ role: 'user' as const, content: 'Hi' }],
    response: `hello from ${provider}`,
    feedback: null,
    correction: null,
    channel: 'chat' as const,
  };
}

function event(surface: 'recipes' | 'newsletter', action: EngagementEvent['action'], itemId: string, actor: string): EngagementEvent {
  return {
    id: `${surface}-${action}-${itemId}`,
    at: 1,
    surface,
    action,
    itemId,
    attributes: { name: itemId, tags: ['Styles'], colors: ['#0047ff'], topic: 'desk' },
    actor: actor === 'owner' ? { kind: 'owner', id: 'owner' } : { kind: 'reader', id: actor },
  };
}

function ownerHeaders(): Record<string, string> {
  return { 'x-auth-request-email': 'kyle@example.com', 'content-type': 'application/json' };
}

async function api(url: string, token: string, pathname: string, body?: unknown) {
  const response = await fetch(`${url}${pathname}`, {
    method: body ? 'POST' : 'GET',
    headers: ownerHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await response.json()) as Record<string, never> & { status?: number };
  return { ...data, status: response.status, thread: (data as { thread?: { id: string } }).thread, agent: (data as { agent?: { id: string } }).agent, spend: (data as { spend?: { capUsd: number; entries: unknown[] } }).spend, training: (data as { training?: { providers: { xai: boolean; google: boolean } } }).training };
}

async function sse(url: string, token: string, pathname: string, body: unknown) {
  const response = await fetch(`${url}${pathname}`, {
    method: 'POST',
    headers: ownerHeaders(),
    body: JSON.stringify(body),
  });
  const text = await response.text();
  assert.equal(response.status, 200, text.slice(0, 300));
  return text.split('\n\n').filter(Boolean).map((block) => {
    const event = block.match(/^event: (.+)$/m)?.[1] || 'message';
    const data = block.split('\n').filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trim()).join('\n');
    return { event, data: data ? JSON.parse(data) : {} };
  });
}

async function waitForWorker(url: string, token: string) {
  for (let i = 0; i < 20; i += 1) {
    const state = await api(url, token, '/api/state');
    const workers = (state as { workers?: { linux?: { online?: boolean } } }).workers;
    if (workers?.linux?.online) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Hetzner-shaped worker did not connect.');
}

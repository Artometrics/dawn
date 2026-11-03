import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { startAgentsServer } from './http';
import { toFineTuneJsonl } from './training';
import { DEFAULT_TRAINING_PROVIDERS, type TrainingRow } from './types';

test('training export skips a chat that opted out', () => {
  const row: TrainingRow = {
    id: 'tr',
    at: 1,
    provider: 'google',
    model: 'gemini-3.8-flash',
    agentId: 'a',
    threadId: 'th_quiet',
    messageId: 'm',
    latencyMs: 1,
    promptTokens: 1,
    completionTokens: 1,
    costUsd: 0,
    system: 'Be brief.',
    messages: [{ role: 'user', content: 'Hi' }],
    response: 'Hello',
    feedback: null,
    correction: null,
    channel: 'chat',
  };
  const kept = toFineTuneJsonl([row], { ...DEFAULT_TRAINING_PROVIDERS });
  assert.match(kept, /Hello/);
  const skipped = toFineTuneJsonl([row], { ...DEFAULT_TRAINING_PROVIDERS }, new Set(['th_quiet']));
  assert.equal(skipped, '');
});

test('a group keeps several agents, a summoned figure, and an unsent invite', async () => {
  const home = await mkdtemp(path.join(tmpdir(), 'dawn-group-'));
  const server = await startAgentsServer({
    storePath: path.join(home, 'store.json'),
    ownerEmail: 'kyle@example.com',
    workerToken: 'test-worker-token',
    editorToken: 'test-editor-token',
    forceStandIn: true,
    schedule: false,
    port: 0,
  });
  try {
    const ada = await post(server.url, '/api/agents', { name: 'Ada', instructions: 'Keep it short.', avatar: { sprite: 'sage' } });
    const bea = await post(server.url, '/api/agents', { name: 'Bea', instructions: 'Keep it short.', avatar: { sprite: 'scout' } });
    const added = await patch(server.url, `/api/threads/${ada.thread.id}`, { addAgentId: bea.agent.id });
    assert.equal(added.thread.kind, 'group');
    assert.deepEqual(added.thread.agentIds, [ada.agent.id, bea.agent.id]);
    const figure = await patch(server.url, `/api/threads/${ada.thread.id}`, {
      summon: { name: 'Hypatia', persona: 'Speak as a mathematician in Alexandria. Be brief.', sprite: 'elder' },
    });
    assert.equal(figure.summoned?.figure, true);
    assert.equal(figure.summoned?.instructions.includes('Alexandria'), true);
    assert.equal(figure.thread.agentIds.includes(figure.summoned?.id), true);
    const invite = await patch(server.url, `/api/threads/${ada.thread.id}`, { invite: { name: 'Sam', email: 'sam@example.com' } });
    assert.equal(invite.delivered, false);
    assert.equal(server.outbox.length, 0);
    assert.equal(invite.thread.humans?.[0]?.status, 'invited');
    assert.equal(invite.thread.humans?.[0]?.email, 'sam@example.com');
    const flags = await patch(server.url, `/api/threads/${ada.thread.id}`, { hideAlerts: true, saveTraining: false });
    assert.equal(flags.thread.hideAlerts, true);
    assert.equal(flags.thread.saveTraining, false);
    const left = await patch(server.url, `/api/threads/${ada.thread.id}`, { leave: true });
    assert.equal(typeof left.thread.leftAt, 'number');
  } finally {
    await server.close();
    await rm(home, { recursive: true, force: true });
  }
});

function headers(): Record<string, string> {
  return { 'x-auth-request-email': 'kyle@example.com', 'content-type': 'application/json' };
}

async function post(url: string, pathname: string, body: unknown) {
  const response = await fetch(`${url}${pathname}`, { method: 'POST', headers: headers(), body: JSON.stringify(body) });
  const data = (await response.json()) as ThreadBody;
  assert.equal(response.status, 201, JSON.stringify(data));
  return data;
}

async function patch(url: string, pathname: string, body: unknown) {
  const response = await fetch(`${url}${pathname}`, { method: 'PATCH', headers: headers(), body: JSON.stringify(body) });
  const data = (await response.json()) as ThreadBody;
  assert.equal(response.status, 200, JSON.stringify(data));
  return data;
}

type ThreadBody = {
  agent: { id: string };
  thread: { id: string; kind: string; agentIds: string[]; humans?: { status: string; email?: string }[]; hideAlerts?: boolean; saveTraining?: boolean; leftAt?: number | null };
  summoned?: { id: string; figure?: boolean; instructions: string };
  delivered?: boolean;
};

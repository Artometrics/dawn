import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import { createDawnJob, listDawnAgents, postDawnJobMessage, readDawnAgentsSpend } from './agents.ts';

async function withServer(
  handler: (req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => void,
  run: (baseUrl: string) => Promise<void>,
) {
  const server = createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as AddressInfo).port;
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  }
}

test('missing Dawn Agents config is a stub, not a thrown error', async () => {
  const list = await listDawnAgents({});
  assert.equal(list.stubbed, true);
  assert.equal(list.agents[0].id, 'a_000000000001');
  const job = await createDawnJob({}, { agentId: 'a_000000000001', prompt: 'look at auth' });
  assert.equal(job.stubbed, true);
  assert.match(job.message ?? '', /not configured/);
});

test('a live editor API is parsed and a 401 is not stubbed as success', async () => {
  await withServer((req, res) => {
    if (req.url === '/api/v1/agents' && req.headers.authorization === 'Bearer editor-token') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        agents: [
          { id: 'a_0123456789ab', name: 'Researcher', model: 'gemini-3.8-flash', computer: 'hetzner' },
          { id: 'not-an-id', name: 'Dropped' },
        ],
      }));
      return;
    }
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Email or password is wrong' }));
  }, async (baseUrl) => {
    const list = await listDawnAgents({ baseUrl, token: 'editor-token' });
    assert.equal(list.stubbed, false);
    assert.equal(list.agents.length, 1);
    assert.equal(list.agents[0].name, 'Researcher');

    const refused = await listDawnAgents({ baseUrl, token: 'nope' });
    assert.equal(refused.stubbed, false);
    assert.equal(refused.agents.length, 0);
    assert.equal(refused.message, 'Email or password is wrong');
  });
});

test('jobs and follow-ups round-trip, and a 404 becomes a stub', async () => {
  await withServer((req, res) => {
    if (req.method === 'POST' && req.url === '/api/v1/jobs') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        jobId: 'job_1',
        status: 'completed',
        agentId: 'a_0123456789ab',
        replies: [{ agentId: 'a_0123456789ab', content: 'Done', toolCalls: [], usage: { inputTokens: 3, outputTokens: 1, costUsd: 0.01 } }],
      }));
      return;
    }
    if (req.method === 'POST' && req.url === '/api/v1/jobs/job_1/messages') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ id: 'job_1', status: 'completed', replies: [{ content: 'Follow-up' }] }));
      return;
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'missing' }));
  }, async (baseUrl) => {
    const opts = { baseUrl, token: 'editor-token' };
    const job = await createDawnJob(opts, { agentId: 'a_0123456789ab', prompt: 'refactor auth', title: 'Dawn Code handoff' });
    assert.equal(job.stubbed, false);
    assert.equal(job.jobId, 'job_1');
    assert.equal(job.replies[0].content, 'Done');

    const follow = await postDawnJobMessage(opts, 'job_1', 'also rename the helper');
    assert.equal(follow.replies[0].content, 'Follow-up');

    const missing = await createDawnJob({ ...opts, baseUrl: baseUrl + '/nope' }, { agentId: 'a_0123456789ab', prompt: 'x' });
    assert.equal(missing.stubbed, true);
  });
});

test('spend stays unknown when the route is not merged', async () => {
  await withServer((_req, res) => {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'missing' }));
  }, async (baseUrl) => {
    const spend = await readDawnAgentsSpend({ baseUrl, token: 'editor-token' });
    assert.equal(spend.known, false);
    assert.equal(spend.spentUsd, null);
  });
});

test('an unreachable host is a stub', async () => {
  const list = await listDawnAgents({ baseUrl: 'http://127.0.0.1:9', token: 'editor-token', timeoutMs: 500 });
  assert.equal(list.stubbed, true);
  assert.match(list.message ?? '', /not reachable/);
});

import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createGateway } from './server.ts';

async function listen(server: ReturnType<typeof createGateway>): Promise<number> {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  return (server.address() as AddressInfo).port;
}

function close(server: ReturnType<typeof createGateway>): Promise<void> {
  return new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
}

async function readSse(response: Response): Promise<{ event: string; data: Record<string, unknown> }[]> {
  const text = await response.text();
  const events: { event: string; data: Record<string, unknown> }[] = [];
  for (const block of text.split('\n\n')) {
    const event = block.match(/^event: (.+)$/m)?.[1];
    const data = block.match(/^data: (.+)$/m)?.[1];
    if (event && data) events.push({ event, data: JSON.parse(data) });
  }
  return events;
}

test('gateway auth, stand-in chat, inline diff, agent review, and cap', async () => {
  const dataDir = await mkdtemp(path.join(tmpdir(), 'dawn-code-'));
  const server = createGateway({
    token: 'test-token-value',
    dataDir,
    capUsd: 20,
    mock: true,
    mockDelayMs: 0,
    agentsUrl: '',
    editorToken: '',
  });
  const port = await listen(server);
  const base = `http://127.0.0.1:${port}`;
  try {
    const health = await fetch(`${base}/health`);
    assert.equal(health.status, 200);
    const open = await fetch(`${base}/v1/spend`);
    assert.equal(open.status, 401);

    const headers = { Authorization: 'Bearer test-token-value', 'Content-Type': 'application/json' };
    const chat = await fetch(`${base}/v1/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'gemini-2.0-flash',
        messages: [{ role: 'user', content: 'What does greet return?' }],
        context: {
          workspaceName: 'dawn',
          file: { path: 'editor/sample/hello.ts', language: 'typescript', content: 'export function greet(){ return "Hello"; }' },
          selection: { text: 'return "Hello";', startLine: 1, endLine: 1 },
        },
      }),
    });
    const events = await readSse(chat);
    const deltas = events.filter((event) => event.event === 'delta').map((event) => event.data.text).join('');
    assert.match(deltas, /hello\.ts/);
    assert.match(deltas, /stand-in/i);
    assert.equal(events.at(-1)?.event, 'done');
    assert.equal(events.find((event) => event.event === 'usage')?.data.costUsd, 0);
    const joined = JSON.stringify(events);
    assert.equal(joined.includes('test-token-value'), false);

    const edit = await fetch(`${base}/v1/edit`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'x-ai/grok-4.7',
        instruction: 'rename foo to bar',
        path: 'src/a.ts',
        language: 'typescript',
        selection: 'const foo = 1;',
        fullFile: 'const foo = 1;\n',
        startLine: 1,
        endLine: 1,
      }),
    });
    const edited = await edit.json() as { replacement: string; proposedFile: string; standIn: boolean };
    assert.equal(edit.status, 200);
    assert.equal(edited.replacement, 'const bar = 1;');
    assert.equal(edited.proposedFile, 'const bar = 1;\n');
    assert.equal(edited.standIn, true);

    const agent = await fetch(`${base}/v1/agent`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        task: 'mark the files',
        files: [
          { path: 'src/a.ts', content: 'export const a = 1;\n' },
          { path: '../etc/passwd', content: 'nope' },
        ],
      }),
    });
    const agentEvents = await readSse(agent);
    const review = agentEvents.find((event) => event.event === 'review');
    const edits = review?.data.edits as { path: string; proposed: string }[];
    assert.equal(edits.length, 1);
    assert.equal(edits[0].path, 'src/a.ts');
    assert.match(edits[0].proposed, /Dawn Code/);
    const ledger = JSON.parse(await readFile(path.join(dataDir, 'spend.json'), 'utf8')) as { spentUsd: number };
    assert.equal(ledger.spentUsd, 0);

    const agents = await fetch(`${base}/v1/dawn-agents/agents`, { headers });
    const listed = await agents.json() as { stubbed: boolean; agents: { id: string }[] };
    assert.equal(listed.stubbed, true);
    const job = await fetch(`${base}/v1/dawn-agents/jobs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ agentId: 'a_000000000001', prompt: 'check the auth module', title: 'handoff' }),
    });
    const created = await job.json() as { stubbed: boolean; jobId: string; message: string };
    assert.equal(created.stubbed, true);
    assert.match(created.message, /not configured|not sent/);
  } finally {
    await close(server);
  }
});

test('provider errors are redacted and the next paid call stops at the cap', async () => {
  const dataDir = await mkdtemp(path.join(tmpdir(), 'dawn-code-cap-'));
  const secret = 'xai-live-secret-value';
  let calls = 0;
  const server = createGateway({
    token: 'test-token-value',
    dataDir,
    capUsd: 1,
    mock: false,
    env: { XAI_API_KEY: secret },
    fetchImpl: async () => {
      calls += 1;
      if (calls === 1) {
        const stream = new ReadableStream({
          start(controller) {
            const encode = new TextEncoder();
            controller.enqueue(encode.encode('data: {"choices":[{"delta":{"content":"Hi"}}]}\n'));
            controller.enqueue(encode.encode('data: {"usage":{"prompt_tokens":1000000,"completion_tokens":1000000}}\n'));
            controller.enqueue(encode.encode('data: [DONE]\n'));
            controller.close();
          },
        });
        return new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
      }
      throw new Error(`provider blew up with ${secret}`);
    },
  });
  const port = await listen(server);
  const base = `http://127.0.0.1:${port}`;
  try {
    const headers = { Authorization: 'Bearer test-token-value', 'Content-Type': 'application/json' };
    const first = await readSse(await fetch(`${base}/v1/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ model: 'x-ai/grok-4.7', messages: [{ role: 'user', content: 'hello' }] }),
    }));
    assert.match(first.filter((event) => event.event === 'delta').map((event) => event.data.text).join(''), /Hi/);
    const blocked = await readSse(await fetch(`${base}/v1/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ model: 'x-ai/grok-4.7', messages: [{ role: 'user', content: 'again' }] }),
    }));
    assert.equal(blocked.find((event) => event.event === 'error')?.data.code, 'cap');
    assert.equal(calls, 1);
    assert.equal(JSON.stringify(blocked).includes(secret), false);

    const leaked = createGateway({
      token: 'test-token-value',
      dataDir: await mkdtemp(path.join(tmpdir(), 'dawn-code-redact-')),
      capUsd: 20,
      mock: false,
      env: { XAI_API_KEY: secret },
      fetchImpl: async () => {
        throw new Error(`provider blew up with ${secret}`);
      },
    });
    const leakedPort = await listen(leaked);
    try {
      const events = await readSse(await fetch(`http://127.0.0.1:${leakedPort}/v1/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ model: 'x-ai/grok-4.7', messages: [{ role: 'user', content: 'hello' }] }),
      }));
      const body = JSON.stringify(events);
      assert.equal(body.includes(secret), false);
      assert.match(String(events.find((event) => event.event === 'error')?.data.message), /\[redacted\]/);
    } finally {
      await close(leaked);
    }
  } finally {
    await close(server);
  }
});

test('each chat is stored and forwarded to the training log', async () => {
  const upstream = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => {
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as { source: string; prompt: string; action: string };
      assert.equal(req.headers.authorization, 'Bearer editor-token');
      assert.equal(body.source, 'dawn-code');
      assert.equal(JSON.stringify(body).includes('xai-test-secret-value'), false);
      assert.ok(body.action === 'response' || body.action === 'reject');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    });
  });
  await new Promise<void>((resolve) => upstream.listen(0, '127.0.0.1', () => resolve()));
  const upstreamPort = (upstream.address() as AddressInfo).port;
  const dataDir = await mkdtemp(path.join(tmpdir(), 'dawn-code-train-'));
  const server = createGateway({
    token: 'test-token-value',
    dataDir,
    mock: true,
    mockDelayMs: 0,
    trainingLogUrl: `http://127.0.0.1:${upstreamPort}/api/v1/training-log`,
    trainingToken: 'editor-token',
    env: { XAI_API_KEY: 'xai-test-secret-value' },
  });
  const port = await listen(server);
  try {
    const headers = { Authorization: 'Bearer test-token-value', 'Content-Type': 'application/json' };
    const events = await readSse(await fetch(`http://127.0.0.1:${port}/v1/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'gemini-3.8-flash',
        messages: [{ role: 'user', content: 'explain greet. key xai-test-secret-value' }],
        context: { file: { path: 'editor/sample/hello.ts', language: 'typescript', content: 'export function greet(){ return 1 }' } },
      }),
    }));
    const training = events.find((event) => event.event === 'training')?.data as { forwarded: boolean; stubbed: boolean };
    assert.equal(training.forwarded, true);
    assert.equal(training.stubbed, false);
    const lines = (await readFile(path.join(dataDir, 'training-log.jsonl'), 'utf8')).trim().split('\n');
    const row = JSON.parse(lines.at(-1) ?? '{}') as { messages: { role: string; content: string }[]; metadata: { action: string; source: string } };
    assert.equal(row.metadata.source, 'dawn-code');
    assert.equal(row.metadata.action, 'response');
    assert.equal(row.messages.some((message) => message.role === 'user' && message.content.includes('explain greet')), true);
    assert.equal(JSON.stringify(row).includes('xai-test-secret-value'), false);

    const decision = await (await fetch(`http://127.0.0.1:${port}/v1/training-log`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        kind: 'inline',
        action: 'reject',
        model: 'gemini-3.8-flash',
        prompt: 'rename foo to bar',
        response: 'const bar = 1',
        paths: ['src/a.ts'],
        edit: [{ path: 'src/a.ts', before: 'const foo = 1', after: 'const bar = 1' }],
      }),
    })).json() as { logged: boolean; forwarded: boolean };
    assert.equal(decision.logged, true);
    assert.equal(decision.forwarded, true);
  } finally {
    await close(server);
    await new Promise<void>((resolve, reject) => upstream.close((err) => (err ? reject(err) : resolve())));
  }
});

test('a reachable Dawn Agents API is proxied with the editor token', async () => {
  const upstream = createServer((req, res) => {
    assert.equal(req.headers.authorization, 'Bearer editor-token');
    assert.equal(req.headers.authorization?.includes('gateway-token'), false);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    if (req.url === '/api/v1/agents') {
      res.end(JSON.stringify({ agents: [{ id: 'a_0123456789ab', name: 'Researcher', computer: 'hetzner' }] }));
      return;
    }
    if (req.url === '/api/v1/spend') {
      res.end(JSON.stringify({ spentUsd: 1.5, capUsd: 20 }));
      return;
    }
    res.end(JSON.stringify({ jobId: 'job_9', status: 'completed', agentId: 'a_0123456789ab', replies: [{ content: 'Shipped' }] }));
  });
  await new Promise<void>((resolve) => upstream.listen(0, '127.0.0.1', () => resolve()));
  const upstreamPort = (upstream.address() as AddressInfo).port;
  const dataDir = await mkdtemp(path.join(tmpdir(), 'dawn-code-agents-'));
  const server = createGateway({
    token: 'gateway-token',
    dataDir,
    mock: true,
    agentsUrl: `http://127.0.0.1:${upstreamPort}`,
    editorToken: 'editor-token',
  });
  const port = await listen(server);
  try {
    const headers = { Authorization: 'Bearer gateway-token', 'Content-Type': 'application/json' };
    const listed = await (await fetch(`http://127.0.0.1:${port}/v1/dawn-agents/agents`, { headers })).json() as { stubbed: boolean; agents: { name: string }[] };
    assert.equal(listed.stubbed, false);
    assert.equal(listed.agents[0].name, 'Researcher');
    const spend = await (await fetch(`http://127.0.0.1:${port}/v1/spend`, { headers })).json() as { agentsKnown: boolean; agentsUsd: number; totalUsd: number };
    assert.equal(spend.agentsKnown, true);
    assert.equal(spend.agentsUsd, 1.5);
    const job = await (await fetch(`http://127.0.0.1:${port}/v1/dawn-agents/jobs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ agentId: 'a_0123456789ab', prompt: 'rename the helper' }),
    })).json() as { jobId: string; replies: { content: string }[]; stubbed: boolean };
    assert.equal(job.stubbed, false);
    assert.equal(job.jobId, 'job_9');
    assert.equal(job.replies[0].content, 'Shipped');
  } finally {
    await close(server);
    await new Promise<void>((resolve, reject) => upstream.close((err) => (err ? reject(err) : resolve())));
  }
});

import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { hashEmbed } from '../research/embed.ts';
import { startAgentsServer } from './http.ts';

const owner = { 'content-type': 'application/json', 'x-auth-request-email': 'kyle@example.com' };

test('a full spend cap refuses process and ask and writes no ledger entry', async () => {
  const home = await mkdtemp(path.join(tmpdir(), 'dawn-research-cap-'));
  const storePath = path.join(home, 'store.json');
  await writeFile(storePath, JSON.stringify({
    ledger: [{ id: 'led_cap', at: Date.now(), model: 'gemini-3.8-flash', provider: 'google', promptTokens: 1, completionTokens: 1, costUsd: 20, source: 'kit' }],
    settings: { spendCapUsd: 20, embeddingsEnabled: true, trainingEnabled: true },
  }));
  const server = await startAgentsServer({
    storePath,
    ownerEmail: 'kyle@example.com',
    workerToken: 't',
    editorToken: 'e',
    schedule: false,
    port: 0,
    researchEmbed: async (texts) => texts.map((text) => hashEmbed(text)),
  });
  try {
    const uploaded = await post(server.url, '/api/research/sources', {
      fileName: 'note.txt',
      contentType: 'text/plain',
      collectionId: 'cardinal',
      title: 'Tall stick',
      dataBase64: Buffer.from('[00:00:12] Cardinal opens on the tall stick.').toString('base64'),
    });
    assert.equal(uploaded.status, 200);
    const id = (uploaded.source as { id: string }).id;
    const processed = await post(server.url, `/api/research/sources/${id}/process`, {});
    assert.equal(processed.status, 402);
    assert.match(String(processed.error), /Spend cap reached/);
    const asked = await post(server.url, '/api/research/ask', { collectionId: 'cardinal', question: 'Where does Cardinal open?' });
    assert.equal(asked.status, 402);
    assert.match(String(asked.error), /Spend cap reached/);
    const ledger = JSON.parse(await readFile(storePath, 'utf8')) as { ledger: unknown[] };
    assert.equal(ledger.ledger.length, 1);
  } finally {
    await server.close();
    await rm(home, { recursive: true, force: true });
  }
});

test('a fake embedder writes one ledger entry per batch when embeddings are on', async () => {
  const home = await mkdtemp(path.join(tmpdir(), 'dawn-research-embed-'));
  const storePath = path.join(home, 'store.json');
  await writeFile(storePath, JSON.stringify({
    settings: { spendCapUsd: 20, embeddingsEnabled: true, trainingEnabled: true },
  }));
  let batches = 0;
  const server = await startAgentsServer({
    storePath,
    ownerEmail: 'kyle@example.com',
    workerToken: 't',
    editorToken: 'e',
    schedule: false,
    port: 0,
    env: { ...process.env, DAWN_EMBEDDINGS_ENABLED: 'true', GEMINI_API_KEY: undefined, GOOGLE_GENERATIVE_AI_API_KEY: undefined },
    researchEmbed: async (texts) => {
      batches += 1;
      return texts.map((text) => hashEmbed(text));
    },
  });
  try {
    const body = Array.from({ length: 9 }, (_, index) => `[00:${String(index).padStart(2, '0')}] Pantheon towers wait in the courtyard, note ${index}.`).join('\n\n');
    const uploaded = await post(server.url, '/api/research/sources', {
      fileName: 'long.txt',
      contentType: 'text/plain',
      collectionId: 'pantheon',
      title: 'Courtyard',
      dataBase64: Buffer.from(body).toString('base64'),
    });
    const id = (uploaded.source as { id: string }).id;
    const processed = await post(server.url, `/api/research/sources/${id}/process`, {});
    assert.equal(processed.status, 200, JSON.stringify(processed));
    const ledger = JSON.parse(await readFile(storePath, 'utf8')) as { ledger: { source: string }[] };
    const research = ledger.ledger.filter((entry) => entry.source === 'research');
    assert.equal(research.length, batches);
    assert.ok(batches >= 2);
  } finally {
    await server.close();
    await rm(home, { recursive: true, force: true });
  }
});

test('with embeddings off, a transcript answers from passages and writes no ledger', async () => {
  const home = await mkdtemp(path.join(tmpdir(), 'dawn-research-local-'));
  const storePath = path.join(home, 'store.json');
  const server = await startAgentsServer({
    storePath,
    ownerEmail: 'kyle@example.com',
    workerToken: 't',
    editorToken: 'e',
    schedule: false,
    port: 0,
    env: { ...process.env, DAWN_EMBEDDINGS_ENABLED: undefined, GEMINI_API_KEY: undefined, GOOGLE_GENERATIVE_AI_API_KEY: undefined, OPENROUTER_API_KEY: undefined, XAI_API_KEY: undefined },
  });
  try {
    const uploaded = await post(server.url, '/api/research/sources', {
      fileName: 'note.txt',
      contentType: 'text/plain',
      collectionId: 'cardinal',
      title: 'Tall stick',
      dataBase64: Buffer.from('[00:11:20] Cardinal opens on the tall stick by the creek.').toString('base64'),
    });
    const id = (uploaded.source as { id: string }).id;
    const processed = await post(server.url, `/api/research/sources/${id}/process`, {});
    assert.equal(processed.status, 200, JSON.stringify(processed));
    const asked = await post(server.url, '/api/research/ask', {
      collectionId: 'cardinal',
      question: 'Where does Cardinal open?',
      names: [{ id: 'cardinal', name: 'Cardinal' }],
    });
    assert.equal(asked.status, 200, JSON.stringify(asked));
    const answer = asked.answer as { mode: string; citations: { timestamp: string | null }[]; answer: string };
    assert.equal(answer.mode, 'local');
    assert.equal(answer.citations[0]?.timestamp, '11:20');
    assert.match(String(asked.note), /Local matching|embeddings are off/i);
    const ledger = await readFile(storePath, 'utf8').catch(() => '{"ledger":[]}');
    assert.equal((JSON.parse(ledger) as { ledger?: unknown[] }).ledger?.length ?? 0, 0);
  } finally {
    await server.close();
    await rm(home, { recursive: true, force: true });
  }
});

async function post(url: string, pathname: string, body: unknown) {
  const response = await fetch(`${url}${pathname}`, { method: 'POST', headers: owner, body: JSON.stringify(body) });
  const data = (await response.json()) as Record<string, unknown>;
  return { ...data, status: response.status };
}

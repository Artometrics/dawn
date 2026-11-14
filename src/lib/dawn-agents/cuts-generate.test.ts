import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { DRAFT_WARNING } from '../cuts/draft.ts';
import { VIDEO_HOST_MESSAGE } from '../cuts/policy.ts';
import { startAgentsServer } from './http.ts';

const owner = { 'content-type': 'application/json', 'x-auth-request-email': 'kyle@example.com' };

test('cuts generate drafts without a key, rejects a video URL, stops at the cap, and hides keys', async () => {
  const saved = {
    gemini: process.env.GEMINI_API_KEY,
    google: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    xai: process.env.XAI_API_KEY,
    openrouter: process.env.OPENROUTER_API_KEY,
  };
  delete process.env.GEMINI_API_KEY;
  delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  delete process.env.XAI_API_KEY;
  delete process.env.OPENROUTER_API_KEY;
  const home = await mkdtemp(path.join(tmpdir(), 'dawn-cuts-'));
  const server = await startAgentsServer({
    storePath: path.join(home, 'store.json'),
    ownerEmail: 'kyle@example.com',
    workerToken: 't',
    editorToken: 'e',
    schedule: false,
    port: 0,
  });
  try {
    const draft = await post(server.url, '/api/cuts/generate', { topic: 'Harbor lights' });
    assert.equal(draft.status, 200);
    assert.equal(draft.provider, 'draft');
    assert.equal(draft.warning, DRAFT_WARNING);
    assert.match(String(draft.package && (draft.package as { scriptText?: string }).scriptText), /not a Gemini script/);
    const blocked = await post(server.url, '/api/cuts/generate', { topic: 'lights', sourceUrl: 'https://youtu.be/abc' });
    assert.equal(blocked.status, 400);
    assert.equal(blocked.error, VIDEO_HOST_MESSAGE);
  } finally {
    await server.close();
    await rm(home, { recursive: true, force: true });
    restore(saved);
  }
});

test('a reached spend cap refuses the script and the body never contains a key', async () => {
  const home = await mkdtemp(path.join(tmpdir(), 'dawn-cuts-cap-'));
  const storePath = path.join(home, 'store.json');
  const key = 'AIzaSyDUMMYDUMMYDUMMYDUMMY12';
  const saved = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = key;
  const { writeFile } = await import('node:fs/promises');
  await writeFile(storePath, JSON.stringify({
    ledger: [{ id: 'led_cap', at: Date.now(), model: 'gemini-3.8-flash', provider: 'google', promptTokens: 10, completionTokens: 10, costUsd: 20, source: 'kit' }],
    settings: { spendCapUsd: 20, trainingEnabled: true, embeddingsEnabled: false },
  }));
  const server = await startAgentsServer({
    storePath,
    ownerEmail: 'kyle@example.com',
    workerToken: 't',
    editorToken: 'e',
    schedule: false,
    port: 0,
    generate: async () => {
      throw new Error(`upstream ${key}`);
    },
  });
  try {
    const capped = await post(server.url, '/api/cuts/generate', { topic: 'Harbor lights' });
    assert.equal(capped.status, 402);
    assert.match(String(capped.error), /Spend cap reached/);
    assert.equal(JSON.stringify(capped).includes(key), false);
    const ledger = JSON.parse(await readFile(storePath, 'utf8')) as { ledger: unknown[] };
    assert.equal(ledger.ledger.length, 1);
  } finally {
    await server.close();
    await rm(home, { recursive: true, force: true });
    if (saved === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = saved;
  }
});

async function post(url: string, pathname: string, body: unknown) {
  const response = await fetch(`${url}${pathname}`, { method: 'POST', headers: owner, body: JSON.stringify(body) });
  const data = (await response.json()) as Record<string, unknown>;
  return { ...data, status: response.status };
}

function restore(saved: Record<string, string | undefined>) {
  for (const [name, value] of Object.entries(saved)) {
    const key = name === 'gemini' ? 'GEMINI_API_KEY' : name === 'google' ? 'GOOGLE_GENERATIVE_AI_API_KEY' : name === 'xai' ? 'XAI_API_KEY' : 'OPENROUTER_API_KEY';
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

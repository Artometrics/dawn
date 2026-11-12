import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { DailyRequestCap } from '../dawn-agents/model-choice.ts';
import { createKitModel, type AgentTool, type GenerateAgent, type SpendHooks } from '../dawn-agents/model-reply.ts';
import { NightcodeDesk, modelState, nightcodeArmed } from './nightcode-agent.ts';
import { TeammatesDesk } from './teammates-chat.ts';

const ENV = { GEMINI_API_KEY: 'test-key', DAWN_NIGHTCODE_MODEL: 'gemini', DAWN_SPEND_CAP_USD: '20' };

type Call = { tool: string; input: Record<string, unknown> };

/** A stand-in provider. It "decides" to call the listed tools in order, then answers. */
function fakeProvider(calls: Call[], text: string, seen: { tools: string[][]; system: string[] } = { tools: [], system: [] }): GenerateAgent {
  return async (_choice, system, _messages, tools: AgentTool[]) => {
    seen.tools.push(tools.map((item) => item.name));
    seen.system.push(system);
    const steps = [];
    for (const call of calls) {
      const found = tools.find((item) => item.name === call.tool);
      if (!found) throw new Error(`The model asked for ${call.tool}, which is not offered.`);
      steps.push({ tool: call.tool, input: call.input, output: await found.run(call.input), failed: false });
    }
    return { text, steps, promptTokens: 1000, completionTokens: 200 };
  };
}

function setup(root: string, generateAgent: GenerateAgent, cap = 10) {
  const ledger: Parameters<SpendHooks['record']>[0][] = [];
  let blocked: string | null = null;
  const spend: SpendHooks = { blocked: async () => blocked, record: async (entry) => { ledger.push(entry); } };
  const counter = new DailyRequestCap(path.join(root, 'daily.json'), cap);
  const make = () => createKitModel({ requested: null, cap: counter, spend, env: ENV, generateAgent });
  return { ledger, counter, make, block: (message: string) => { blocked = message; } };
}

test('NightCode runs a model turn with plan tools only, and records spend once', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'dawn-model-nc-'));
  try {
    const desk = new NightcodeDesk(path.join(root, 'nightcode.sqlite'));
    const { id } = desk.createSession('Plan');
    await desk.postMessage(id, 'write notes/a.txt hello world', 'build');
    const seen = { tools: [] as string[][], system: [] as string[] };
    const run = setup(root, fakeProvider([{ tool: 'listDirectory', input: { path: '.' } }, { tool: 'readFile', input: { path: 'notes/a.txt' } }], 'The note says hello world.', seen));
    const model = run.make();
    assert.ok(model);
    const session = await desk.postMessage(id, 'what is in my notes?', 'plan', model);
    assert.deepEqual(seen.tools[0], ['readFile', 'listDirectory', 'glob', 'grep']);
    const bodies = session.messages.slice(-3);
    assert.equal(bodies[0].tool, 'listDirectory');
    assert.equal(bodies[1].tool, 'readFile');
    assert.match(bodies[1].body, /hello world/);
    assert.equal(bodies[2].tool, 'model');
    assert.equal(bodies[2].body, 'The note says hello world.');
    assert.equal(run.ledger.length, 1);
    assert.equal(run.ledger[0].provider, 'google');
    assert.ok(run.ledger[0].costUsd > 0);
    assert.equal(run.counter.status().used, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('NightCode build mode lets the model write, and plan mode never offers write tools', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'dawn-model-build-'));
  try {
    const desk = new NightcodeDesk(path.join(root, 'nightcode.sqlite'));
    const { id } = desk.createSession('Build');
    const seen = { tools: [] as string[][], system: [] as string[] };
    const built = setup(root, fakeProvider([{ tool: 'writeFile', input: { path: 'page.txt', content: 'one' } }, { tool: 'bash', input: { command: 'printf hi' } }], 'Wrote page.txt.', seen));
    const done = await desk.postMessage(id, 'make a page', 'build', built.make());
    assert.ok(seen.tools[0].includes('writeFile') && seen.tools[0].includes('bash'));
    assert.ok(done.files.includes('page.txt'));
    assert.match(done.messages.find((message) => message.tool === 'bash')?.body || '', /hi/);

    const refused = setup(root, fakeProvider([{ tool: 'writeFile', input: { path: 'x.txt', content: 'no' } }], 'never'));
    const planned = await desk.postMessage(id, 'write something', 'plan', refused.make());
    assert.match(planned.messages.at(-1)?.body || '', /not offered/);
    assert.equal(planned.messages.at(-1)?.tool, 'refused');
    assert.ok(!planned.files.includes('x.txt'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('the daily cap and the spend cap stop a NightCode model turn', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'dawn-model-cap-'));
  try {
    const desk = new NightcodeDesk(path.join(root, 'nightcode.sqlite'));
    const { id } = desk.createSession('Cap');
    const run = setup(root, fakeProvider([], 'ok'), 1);
    const first = await desk.postMessage(id, 'hello there', 'plan', run.make());
    assert.equal(first.messages.at(-1)?.tool, 'model');
    const second = await desk.postMessage(id, 'again please', 'plan', run.make());
    assert.equal(second.messages.at(-1)?.tool, 'refused');
    assert.match(second.messages.at(-1)?.body || '', /daily/i);
    assert.equal(run.ledger.length, 1);

    const dollars = setup(root, fakeProvider([], 'ok'), 50);
    dollars.block('Spend cap reached (20 of 20 this UTC month).');
    const stopped = await desk.postMessage(id, 'one more', 'plan', dollars.make());
    assert.match(stopped.messages.at(-1)?.body || '', /Spend cap reached/);
    assert.equal(dollars.ledger.length, 0);
    assert.equal(dollars.counter.status().used, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('NightCode reports the live model only when the flag, the cap and a key are set', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'dawn-model-state-'));
  try {
    const counter = new DailyRequestCap(path.join(root, 'daily.json'), 5);
    const live = createKitModel({ requested: null, cap: counter, env: ENV });
    assert.ok(live);
    assert.equal(nightcodeArmed(ENV), true);
    assert.equal(modelState(live, ENV).model, 'google:gemini-3.8-flash');
    assert.equal(modelState(live, ENV).reason, undefined);

    const noFlag = { GEMINI_API_KEY: 'k', DAWN_SPEND_CAP_USD: '20' };
    assert.equal(nightcodeArmed(noFlag), false);
    assert.equal(modelState(createKitModel({ requested: null, cap: counter, env: noFlag }), noFlag).model, 'mock');
    const noCap = { GEMINI_API_KEY: 'k', DAWN_NIGHTCODE_MODEL: 'gemini' };
    assert.equal(nightcodeArmed(noCap), false);
    const noKey = { DAWN_NIGHTCODE_MODEL: 'gemini', DAWN_SPEND_CAP_USD: '20' };
    const none = createKitModel({ requested: null, cap: counter, env: noKey });
    assert.equal(none, null);
    assert.match(modelState(none, noKey).reason || '', /No model key/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('Teammates ask the model, and the model can hand the turn on', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'dawn-model-team-'));
  try {
    const desk = new TeammatesDesk(path.join(root, 'teammates.sqlite'));
    const { id } = desk.createRoom();
    const run = setup(root, fakeProvider([{ tool: 'handoff', input: { note: 'please review' } }], 'Draft is ready.'));
    const room = await desk.postMessage(id, 'draft a title', run.make());
    const lines = room.messages.slice(-2);
    assert.equal(lines[0].speaker, 'builder');
    assert.equal(lines[0].body, 'Draft is ready.');
    assert.equal(lines[1].speaker, 'reviewer');
    assert.equal(lines[1].handoffTo, 'reviewer');
    assert.equal(room.active, 'reviewer');
    assert.equal(run.ledger.length, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

/**
 * One inspectable Dawn bot task on the OpenMausBot runtime.
 *
 * The runtime, store, approval level, and event log are the Apache-2.0
 * OpenMausBot core at commit 97b4b57e11910676c7c89e70e888a5aab3378e23.
 * Dawn supplies the turn runner. No model is called. Spend is checked and
 * not written. Tools stay inside the workspace passed by the caller.
 */

import { existsSync, mkdirSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { openRuntimeStore, Runtime, type AssignmentEvent, type RunResult, type TurnRunner } from '../../../third_party/openmausbot/server/runtime/index.ts';
import { dawnTools, type ToolCall, type ToolMode, type ToolOutcome } from './bot-tools';
import { canSpend } from './spend';

export type BotLevel = 'ask' | 'edits';

export type SessionTool = {
  tool: string;
  ok: boolean;
  reason?: string;
  result?: unknown;
};

export type BotSessionView = {
  ok: boolean;
  reason?: string;
  runtime: 'openmausbot';
  revision: '97b4b57e11910676c7c89e70e888a5aab3378e23';
  model: 'not_called';
  toolSource: 'dawn' | 'nightcode-private';
  mode: ToolMode;
  level: BotLevel;
  assignmentId?: string;
  status?: string;
  result?: string;
  question?: string;
  events: { kind: string; detail?: string }[];
  tools: SessionTool[];
  usage: { ledgerWrites: 0; estimatedUsd: 0; capChecked: boolean; capAllows: boolean };
  workspace: string;
};

type ToolPort = {
  source: 'dawn' | 'nightcode-private';
  runTool(root: string, mode: ToolMode, call: ToolCall): Promise<ToolOutcome>;
};

function repoRoot(): string {
  let dir = path.dirname(new URL(import.meta.url).pathname);
  for (let i = 0; i < 8; i += 1) {
    if (existsSync(path.join(dir, '.git'))) return realpathSync(dir);
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return '';
}

async function loadTools(): Promise<ToolPort> {
  const home = process.env.DAWN_NIGHTCODE_HOME;
  if (!home) return dawnTools;
  let resolved = '';
  try {
    resolved = realpathSync(home);
  } catch {
    return dawnTools;
  }
  const root = repoRoot();
  if (!root || resolved === root || resolved.startsWith(root + path.sep)) return dawnTools;
  const file = path.join(resolved, 'dawn-tools.mjs');
  if (!existsSync(file)) return dawnTools;
  const mod = await import(pathToFileURL(file).href) as Partial<ToolPort>;
  if (mod.source !== 'nightcode-private' || typeof mod.runTool !== 'function') return dawnTools;
  return { source: 'nightcode-private', runTool: mod.runTool };
}

const WRITES = new Set(['writeFile', 'editFile', 'bash']);

function hostRunner(execute: () => Promise<RunResult>): { runner: TurnRunner; done: () => Promise<RunResult> } {
  let pending: Promise<RunResult> = Promise.resolve({ kind: 'failed', outcome: 'provider_error', text: 'The turn did not start.' });
  const runner: TurnRunner = {
    validate: () => undefined,
    canStart: () => true,
    run: () => {
      pending = execute();
      return pending;
    },
    park: () => undefined,
    report: () => undefined,
    changed: () => undefined,
    names: (assignment) => ({ requester: 'Person', assignee: assignment.assignee.botId }),
  };
  return { runner, done: () => pending };
}

export async function runBotTask(input: {
  sqlitePath: string;
  workspace: string;
  mode: ToolMode;
  level: BotLevel;
  calls: ToolCall[];
  spentUsd: number;
  capUsd: number;
}): Promise<BotSessionView> {
  const tools = await loadTools();
  const capAllows = canSpend(input.spentUsd, input.capUsd);
  const base: BotSessionView = {
    ok: false,
    runtime: 'openmausbot',
    revision: '97b4b57e11910676c7c89e70e888a5aab3378e23',
    model: 'not_called',
    toolSource: tools.source,
    mode: input.mode,
    level: input.level,
    events: [],
    tools: [],
    usage: { ledgerWrites: 0, estimatedUsd: 0, capChecked: true, capAllows },
    workspace: input.workspace,
  };
  if (!capAllows) return { ...base, reason: 'The spend cap is already reached.' };
  if (input.calls.length > 8) return { ...base, reason: 'A task can run at most 8 tools.' };

  mkdirSync(input.workspace, { recursive: true });
  mkdirSync(path.dirname(input.sqlitePath), { recursive: true });
  const workspace = realpathSync(input.workspace);
  const store = openRuntimeStore(input.sqlitePath);
  let toolsRun: SessionTool[] = [];

  const { runner, done } = hostRunner(async () => {
    const ran: SessionTool[] = [];
    const changed: string[] = [];
    for (const call of input.calls) {
      if (input.mode === 'plan' && WRITES.has(call.tool)) {
        const outcome = await tools.runTool(workspace, input.mode, call);
        ran.push({ tool: call.tool, ok: false, reason: outcome.ok ? 'That tool is not available in plan mode.' : outcome.reason });
        toolsRun = ran;
        return {
          kind: 'failed',
          outcome: 'denied',
          text: ran[ran.length - 1]?.reason || 'That tool is not available in plan mode.',
          evidence: { toolCalls: ran.length, errors: [ran[ran.length - 1]?.reason || 'refused'], summary: 'Plan mode refused a write.' },
        };
      }
      if (input.level === 'ask' && WRITES.has(call.tool)) {
        const question = 'This step writes or runs a command. Approve it on the desk before it runs.';
        ran.push({ tool: call.tool, ok: false, reason: question });
        toolsRun = ran;
        return {
          kind: 'needs_input',
          question,
          evidence: { toolCalls: ran.length, okToolCalls: ran.filter((item) => item.ok).length, summary: 'Waiting for approval.' },
        };
      }
      const outcome = await tools.runTool(workspace, input.mode, call);
      ran.push({
        tool: call.tool,
        ok: outcome.ok,
        reason: outcome.ok ? undefined : outcome.reason,
        result: outcome.ok ? outcome.result : undefined,
      });
      if (outcome.ok && (call.tool === 'writeFile' || call.tool === 'editFile')) changed.push(call.path);
      if (!outcome.ok) {
        toolsRun = ran;
        return {
          kind: 'failed',
          outcome: 'denied',
          text: outcome.reason,
          evidence: {
            toolCalls: ran.length,
            okToolCalls: ran.filter((item) => item.ok).length,
            filesChanged: changed,
            errors: [outcome.reason],
            summary: outcome.reason,
          },
        };
      }
    }
    toolsRun = ran;
    return {
      kind: 'completed',
      text: 'The task finished inside the workspace.',
      evidence: {
        toolCalls: ran.length,
        okToolCalls: ran.length,
        filesChanged: changed,
        summary: ran.map((item) => `${item.tool} ok`).join(', ').slice(0, 180),
      },
    };
  });

  const runtime = new Runtime(store, runner, { log: () => undefined });
  const admitted = runtime.enqueue({
    origin: { kind: 'person', source: 'chat', quote: 'desk task' },
    requester: { kind: 'person' },
    assignee: { botId: 'dawn-desk', destination: { kind: 'work_thread', threadId: 'desk' } },
    brief: `${input.mode} task`,
    levels: { own: input.level },
    mode: 'work',
  });
  if (!admitted.ok) {
    store.close();
    return { ...base, reason: admitted.reason };
  }
  runtime.open();
  runtime.tick();
  await done();
  await new Promise((resolve) => setImmediate(resolve));
  const assignment = runtime.status(admitted.assignment.id)?.assignment;
  const events = store.events(admitted.assignment.id).map((event: AssignmentEvent) => ({
    kind: event.kind,
    detail: event.detail,
  }));
  const view: BotSessionView = {
    ...base,
    ok: assignment?.status === 'completed' || assignment?.status === 'needs_input',
    reason: assignment?.status === 'failed' ? assignment.result || assignment.outcomeDetail : undefined,
    assignmentId: admitted.assignment.id,
    status: assignment?.status,
    result: assignment?.result,
    question: assignment?.question,
    events,
    tools: toolsRun,
  };
  store.close();
  return view;
}

export function latestBotSession(sqlitePath: string): BotSessionView | null {
  if (!existsSync(sqlitePath)) return null;
  const store = openRuntimeStore(sqlitePath);
  const roots = store.all({ roots: true });
  const latest = roots[roots.length - 1];
  if (!latest) {
    store.close();
    return null;
  }
  const events = store.events(latest.id).map((event) => ({ kind: event.kind, detail: event.detail }));
  const view: BotSessionView = {
    ok: latest.status === 'completed' || latest.status === 'needs_input',
    runtime: 'openmausbot',
    revision: '97b4b57e11910676c7c89e70e888a5aab3378e23',
    model: 'not_called',
    toolSource: 'dawn',
    mode: 'plan',
    level: latest.level === 'edits' ? 'edits' : 'ask',
    assignmentId: latest.id,
    status: latest.status,
    result: latest.result,
    question: latest.question,
    events,
    tools: [],
    usage: { ledgerWrites: 0, estimatedUsd: 0, capChecked: true, capAllows: true },
    workspace: '',
  };
  store.close();
  return view;
}

export async function runDeskPreset(input: {
  sqlitePath: string;
  workspace: string;
  action: 'plan' | 'build' | 'ask';
  spentUsd: number;
  capUsd: number;
}): Promise<BotSessionView> {
  if (input.action === 'plan') {
    return runBotTask({
      sqlitePath: input.sqlitePath,
      workspace: input.workspace,
      mode: 'plan',
      level: 'ask',
      spentUsd: input.spentUsd,
      capUsd: input.capUsd,
      calls: [
        { tool: 'listDirectory', path: '.' },
        { tool: 'readFile', path: 'readme.txt' },
        { tool: 'grep', path: '.', pattern: 'Dawn' },
      ],
    });
  }
  if (input.action === 'ask') {
    return runBotTask({
      sqlitePath: input.sqlitePath,
      workspace: input.workspace,
      mode: 'build',
      level: 'ask',
      spentUsd: input.spentUsd,
      capUsd: input.capUsd,
      calls: [{ tool: 'writeFile', path: 'desk-line.txt', content: 'This line should wait.\n' }],
    });
  }
  return runBotTask({
    sqlitePath: input.sqlitePath,
    workspace: input.workspace,
    mode: 'build',
    level: 'edits',
    spentUsd: input.spentUsd,
    capUsd: input.capUsd,
    calls: [{ tool: 'writeFile', path: 'desk-line.txt', content: 'A line saved from the desk.\n' }],
  });
}

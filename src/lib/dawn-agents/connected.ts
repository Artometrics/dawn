/**
 * Model-free desk workflows. No provider is called. These are not an
 * autonomous agent and not a live backend.
 *
 * NightCode, ai-teammates, sandbox, Relay, and SendKit are not imported.
 * Their public trees have no SPDX license. Compatible behavior is written here:
 * plan then approve, a single-file game, a local page reading, and a handoff
 * recorded by the OpenMausBot runtime.
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { runBotTask, type BotSessionView } from './bot-session';

export const EXECUTION = 'model-free-fixture' as const;

export function playableGame(prompt: string): { html: string; goal: number; signature: string } {
  const match = /(\d+)/.exec(prompt);
  const goal = Math.min(9, Math.max(1, match ? Number(match[1]) : 3));
  const html = [
    '<!doctype html>',
    '<html><head><meta charset="utf-8"><title>Desk game</title></head><body>',
    `<p id="goal">Collect ${goal}</p>`,
    '<p id="score">0</p>',
    '<button id="tap" type="button">Collect</button>',
    '<p id="done" hidden>Done</p>',
    '<script>',
    'let score = 0;',
    `const goal = ${goal};`,
    "document.getElementById('tap').addEventListener('click', () => {",
    "  score += 1;",
    "  document.getElementById('score').textContent = String(score);",
    "  if (score >= goal) document.getElementById('done').hidden = false;",
    '});',
    '</script></body></html>',
  ].join('\n');
  return { html, goal, signature: createHash('sha256').update(html).digest('hex') };
}

export function refuseRemote(target: string): { ok: false; outbound: false; reason: string } | { ok: true } {
  if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('//')) {
    return { ok: false, outbound: false, reason: 'Outbound pages are not opened.' };
  }
  return { ok: true };
}

export async function handoffNote(input: {
  sqlitePath: string;
  workspace: string;
  spentUsd: number;
  capUsd: number;
  note: string;
}): Promise<{ writer: BotSessionView; reader: BotSessionView; memory: string }> {
  const memoryPath = path.join(input.workspace, 'memory.json');
  if (existsSync(memoryPath)) {
    const memory = readFileSync(memoryPath, 'utf8');
    const skipped = await runBotTask({
      sqlitePath: input.sqlitePath,
      workspace: input.workspace,
      mode: 'plan',
      level: 'ask',
      spentUsd: input.spentUsd,
      capUsd: input.capUsd,
      botId: 'dawn-b',
      brief: JSON.stringify({ handoff: 'already-stored', from: 'dawn-a' }),
      calls: [{ tool: 'readFile', path: 'memory.json' }],
    });
    return { writer: skipped, reader: skipped, memory };
  }
  const line = JSON.stringify({ from: 'dawn-a', note: input.note, once: true });
  const writer = await runBotTask({
    sqlitePath: input.sqlitePath,
    workspace: input.workspace,
    mode: 'build',
    level: 'edits',
    spentUsd: input.spentUsd,
    capUsd: input.capUsd,
    botId: 'dawn-a',
    brief: JSON.stringify({ handoff: 'store', to: 'dawn-b' }),
    calls: [{ tool: 'writeFile', path: 'memory.json', content: line }],
  });
  const reader = await runBotTask({
    sqlitePath: input.sqlitePath,
    workspace: input.workspace,
    mode: 'plan',
    level: 'ask',
    spentUsd: input.spentUsd,
    capUsd: input.capUsd,
    botId: 'dawn-b',
    brief: JSON.stringify({ handoff: 'read', from: 'dawn-a', provenance: 'workspace file memory.json' }),
    calls: [{ tool: 'readFile', path: 'memory.json' }],
  });
  return { writer, reader, memory: readFileSync(memoryPath, 'utf8') };
}

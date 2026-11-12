import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { runJail, type JailRequest } from './jail.ts';
import { z } from 'zod';
import type { AgentTool, KitModel } from '../dawn-agents/model-reply.ts';

export type NightcodeMode = 'plan' | 'build';

export type NightcodeMessage = {
  id: string;
  role: 'user' | 'assistant';
  body: string;
  tool: string;
  created: number;
};

export type NightcodeSession = {
  id: string;
  title: string;
  mode: NightcodeMode;
  messages: NightcodeMessage[];
  files: string[];
  tools: string[];
  prompt: string;
};

export const PLAN_TOOLS = ['readFile', 'listDirectory', 'glob', 'grep'] as const;
export const BUILD_TOOLS = [...PLAN_TOOLS, 'writeFile', 'editFile', 'bash'] as const;

/** The tool set is chosen before a turn runs. Plan never receives write, edit, or bash. */
export function toolsFor(mode: NightcodeMode): readonly string[] {
  return mode === 'plan' ? PLAN_TOOLS : BUILD_TOOLS;
}

/** Prompt text that tells the assistant which mode it is in. No model is called. */
export function systemPrompt(mode: NightcodeMode): string {
  if (mode === 'plan') {
    return 'We are in plan mode. The agent has no write tools, no edit tools, and no shell access. It can only read and search: readFile, listDirectory, glob, and grep.';
  }
  return 'We are in build mode. The agent has read, write, edit, and bash, plus the read tools. Bash runs in a child process in this folder. Network commands are refused.';
}

/**
 * NightCode session desk.
 * Antonio's chat route used Clerk, Prisma on Neon, and Polar credits.
 * This keeps his PLAN/BUILD split and the same tool names, stores sessions in
 * SQLite, and runs tools in scripts/kit-jail.mjs. Typed commands (read, list,
 * grep, write, edit, bash) run a tool. Any other line goes to the chosen model,
 * which can call the same tools for this mode, when the server is armed with a
 * key, a spend cap and DAWN_NIGHTCODE_MODEL. Otherwise it gets a labeled fixture reply.
 */
export class NightcodeDesk {
  private readonly db: DatabaseSync;
  readonly workspaceRoot: string;

  constructor(dbPath: string) {
    mkdirSync(path.dirname(dbPath), { recursive: true });
    this.db = new DatabaseSync(dbPath);
    this.workspaceRoot = path.join(path.dirname(dbPath), 'nightcode-workspaces');
    mkdirSync(this.workspaceRoot, { recursive: true });
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        mode TEXT NOT NULL,
        created INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        body TEXT NOT NULL,
        tool TEXT NOT NULL,
        created INTEGER NOT NULL
      );
    `);
  }

  createSession(title = 'NightCode'): { id: string } {
    const id = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const now = Date.now();
    mkdirSync(this.workspace(id), { recursive: true });
    this.db.prepare('INSERT INTO sessions (id, title, mode, created) VALUES (?, ?, ?, ?)').run(id, title.slice(0, 80), 'plan', now);
    return { id };
  }

  listSessions(): { id: string; title: string; mode: NightcodeMode }[] {
    return this.db.prepare('SELECT id, title, mode FROM sessions ORDER BY created DESC').all() as { id: string; title: string; mode: NightcodeMode }[];
  }

  searchSessions(query: string): { id: string; title: string; mode: NightcodeMode }[] {
    const needle = query.trim().toLowerCase();
    return this.listSessions().filter((session) => !needle || session.title.toLowerCase().includes(needle));
  }

  getSession(id: string): NightcodeSession {
    const row = this.db.prepare('SELECT id, title, mode FROM sessions WHERE id = ?').get(id) as { id: string; title: string; mode: NightcodeMode } | undefined;
    if (!row) throw new Error('Session not found');
    const messages = this.db.prepare('SELECT id, role, body, tool, created FROM messages WHERE session_id = ? ORDER BY created ASC').all(id) as NightcodeMessage[];
    return { ...row, messages, files: this.files(id), tools: [...toolsFor(row.mode)], prompt: systemPrompt(row.mode) };
  }

  async postMessage(id: string, text: string, mode: NightcodeMode, model: KitModel | null = null): Promise<NightcodeSession> {
    this.getSession(id);
    const body = text.trim().slice(0, 4000);
    if (!body) throw new Error('Say what to plan or build.');
    if (mode !== 'plan' && mode !== 'build') throw new Error('Mode must be plan or build.');
    this.db.prepare('UPDATE sessions SET mode = ? WHERE id = ?').run(mode, id);
    this.add(id, 'user', body, '');
    const request = this.command(body, mode, Boolean(model));
    if (!request && model) {
      await this.modelTurn(id, mode, model);
      return this.getSession(id);
    }
    if (!request) throw new Error('Say what to plan or build.');
    if (!toolsFor(mode).includes(request.tool)) {
      this.add(id, 'assistant', `Tool ${request.tool} is not available in PLAN mode`, 'refused');
      return this.getSession(id);
    }
    let tool = request.tool;
    let reply = '';
    try {
      const result = await runJail(this.workspace(id), request);
      reply = this.speak(mode, request, result);
    } catch (error) {
      tool = 'refused';
      reply = error instanceof Error ? error.message.split('\n')[0] : 'The tool stopped.';
    }
    this.add(id, 'assistant', reply, tool);
    return this.getSession(id);
  }

  /** Null means a free-form line, which only a model answers. Without one it keeps the old fixture behavior. */
  private command(text: string, mode: NightcodeMode, hasModel: boolean): JailRequest | null {
    const read = /^read\s+(\S+)\s*$/i.exec(text);
    const suite = 'nightcode' as const;
    if (read) return { tool: 'readFile', mode, suite, path: read[1] };
    const list = /^list(?:\s+(\S+))?\s*$/i.exec(text);
    if (list) return { tool: 'listDirectory', mode, suite, path: list[1] || '.' };
    const glob = /^glob\s+(\S+)(?:\s+(\S+))?\s*$/i.exec(text);
    if (glob) return { tool: 'glob', mode, suite, pattern: glob[1], path: glob[2] || '.' };
    const grep = /^grep\s+(\S+)\s*$/i.exec(text);
    if (grep) return { tool: 'grep', mode, suite, pattern: grep[1], path: '.' };
    const edit = /^edit\s+(\S+)\s+(\S+)\s+(\S+)\s*$/i.exec(text);
    if (edit) return { tool: 'editFile', mode, suite, path: edit[1], oldString: edit[2], newString: edit[3] };
    const bash = /^bash\s+([\s\S]+)$/i.exec(text);
    if (bash) return { tool: 'bash', mode, suite, command: bash[1] };
    const write = /^write\s+(\S+)\s+([\s\S]+)$/i.exec(text);
    if (write) return { tool: 'writeFile', mode, suite, path: write[1], content: write[2] };
    if (hasModel) return null;
    if (mode === 'plan') return { tool: 'listDirectory', mode, suite, path: '.' };
    return { tool: 'writeFile', mode, suite, path: 'notes/from-chat.txt', content: text };
  }

  /** The tools a model may call this turn. They are the same allowlisted jail tools as typed commands, chosen by mode. */
  private agentTools(id: string, mode: NightcodeMode): AgentTool[] {
    const suite = 'nightcode' as const;
    const root = this.workspace(id);
    const run = (request: JailRequest) => async () => clip(JSON.stringify(await runJail(root, { ...request, mode, suite }), null, 1));
    const file = z.string().min(1).max(240);
    const all: Record<string, AgentTool> = {
      readFile: { name: 'readFile', description: 'Read a text file in the session folder.', schema: z.object({ path: file }), run: (input) => run({ tool: 'readFile', path: String(input.path) })() },
      listDirectory: { name: 'listDirectory', description: 'List files in a folder of the session. Use "." for the top.', schema: z.object({ path: file.optional() }), run: (input) => run({ tool: 'listDirectory', path: String(input.path || '.') })() },
      glob: { name: 'glob', description: 'Find files by a glob pattern such as *.txt.', schema: z.object({ pattern: file, path: file.optional() }), run: (input) => run({ tool: 'glob', pattern: String(input.pattern), path: String(input.path || '.') })() },
      grep: { name: 'grep', description: 'Search files for a word or phrase.', schema: z.object({ pattern: file }), run: (input) => run({ tool: 'grep', pattern: String(input.pattern), path: '.' })() },
      writeFile: { name: 'writeFile', description: 'Create or replace a text file.', schema: z.object({ path: file, content: z.string().max(100_000) }), run: (input) => run({ tool: 'writeFile', path: String(input.path), content: String(input.content) })() },
      editFile: { name: 'editFile', description: 'Replace one piece of text in a file.', schema: z.object({ path: file, oldString: z.string().min(1).max(2000), newString: z.string().max(2000) }), run: (input) => run({ tool: 'editFile', path: String(input.path), oldString: String(input.oldString), newString: String(input.newString) })() },
      bash: { name: 'bash', description: 'Run a shell command in the session folder. Network commands are refused.', schema: z.object({ command: z.string().min(1).max(500) }), run: (input) => run({ tool: 'bash', command: String(input.command) })() },
    };
    return toolsFor(mode).map((name) => all[name]);
  }

  private async modelTurn(id: string, mode: NightcodeMode, model: KitModel): Promise<void> {
    const session = this.getSession(id);
    const system = [
      'You are NightCode, a careful coding assistant working in one small session folder.',
      systemPrompt(mode),
      `Files in the session: ${session.files.join(', ') || 'none yet'}.`,
      'Call tools when you need to look at or change files. Never claim a change you did not make with a tool.',
      'Keep replies short.',
    ].join('\n');
    const history = session.messages
      .filter((message) => message.tool !== 'refused')
      .slice(-12)
      .map((message) => ({ role: message.role, content: message.body.slice(0, 1500) }));
    try {
      const run = await model.agent(system, history, this.agentTools(id, mode));
      for (const step of run.steps) {
        this.add(id, 'assistant', `${step.tool} ${summarize(step.input)}\n${clip(step.output, 1500)}`, step.failed ? 'refused' : step.tool);
      }
      this.add(id, 'assistant', run.text, 'model');
    } catch (error) {
      this.add(id, 'assistant', error instanceof Error ? error.message.split('\n')[0] : 'The model stopped.', 'refused');
    }
  }

  private speak(mode: NightcodeMode, request: JailRequest, result: Record<string, unknown>): string {
    const prompt = systemPrompt(mode);
    if (request.tool === 'readFile') return `${prompt}\nRead ${String(result.path)}.\n${String(result.content || '')}`;
    if (request.tool === 'listDirectory') {
      const entries = Array.isArray(result.entries) ? result.entries.join(', ') : '';
      return `${prompt}\nFiles: ${entries || '(empty)'}.`;
    }
    if (request.tool === 'glob') return `${prompt}\nMatches: ${(result.files as string[] | undefined)?.join(', ') || 'none'}.`;
    if (request.tool === 'grep') return `${prompt}\nMatches: ${JSON.stringify(result.matches || [])}`;
    if (request.tool === 'editFile') return `${prompt}\nEdited ${String(result.path)}.`;
    if (request.tool === 'bash') return `${prompt}\n${String(result.output || '')}`;
    return `${prompt}\nWrote ${String(result.path)} (${String(result.bytes)} bytes).`;
  }

  private files(id: string): string[] {
    return walk(this.workspace(id), this.workspace(id));
  }

  private workspace(id: string): string {
    return path.join(this.workspaceRoot, id);
  }

  private add(sessionId: string, role: 'user' | 'assistant', body: string, tool: string) {
    this.db.prepare('INSERT INTO messages (id, session_id, role, body, tool, created) VALUES (?, ?, ?, ?, ?, ?)').run(
      `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      sessionId,
      role,
      body,
      tool,
      Date.now(),
    );
  }
}

function clip(text: string, max = 4000): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function summarize(input: Record<string, unknown>): string {
  return clip(Object.values(input).map((value) => String(value).replace(/\s+/g, ' ')).join(' '), 80);
}

/** Whether NightCode may call a model: the flag, a positive spend cap, and at least one key. */
export function nightcodeArmed(env: Record<string, string | undefined> = process.env, hasKey = true): boolean {
  const flag = (env.DAWN_NIGHTCODE_MODEL || '').trim().toLowerCase();
  const cap = Number(env.DAWN_SPEND_CAP_USD || '');
  return Boolean(flag) && flag !== 'off' && flag !== 'mock' && Number.isFinite(cap) && cap > 0 && hasKey;
}

/** What the page says about the replies: the live model, or one plain line on why they are fixtures. */
export function modelState(model: KitModel | null, env: Record<string, string | undefined> = process.env): { model: string; reason?: string } {
  if (model && nightcodeArmed(env)) return { model: `${model.choice.provider}:${model.choice.model}` };
  if (!model) return { model: 'mock', reason: 'Fixture replies. No model key is set on this server.' };
  return { model: 'mock', reason: 'Fixture replies. The model is off on this server.' };
}

function walk(root: string, dir: string): string[] {
  const names = readdirSync(dir);
  const out: string[] = [];
  for (const name of names) {
    if (name.startsWith('.')) continue;
    const next = path.join(dir, name);
    if (statSync(next).isDirectory()) out.push(...walk(root, next));
    else out.push(path.relative(root, next));
  }
  return out.sort();
}

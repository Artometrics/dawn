import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { runJail, type JailRequest } from './jail.ts';

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
};

/**
 * NightCode session desk.
 * Antonio's chat route used Clerk, Prisma on Neon, and Polar credits.
 * This keeps his PLAN/BUILD split and the same tool names, stores sessions in
 * SQLite, and runs tools in scripts/kit-jail.mjs. Gemini is not called.
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

  getSession(id: string): NightcodeSession {
    const row = this.db.prepare('SELECT id, title, mode FROM sessions WHERE id = ?').get(id) as { id: string; title: string; mode: NightcodeMode } | undefined;
    if (!row) throw new Error('Session not found');
    const messages = this.db.prepare('SELECT id, role, body, tool, created FROM messages WHERE session_id = ? ORDER BY created ASC').all(id) as NightcodeMessage[];
    return { ...row, messages, files: this.files(id) };
  }

  async postMessage(id: string, text: string, mode: NightcodeMode): Promise<NightcodeSession> {
    const session = this.getSession(id);
    const body = text.trim().slice(0, 4000);
    if (!body) throw new Error('Say what to plan or build.');
    if (mode !== 'plan' && mode !== 'build') throw new Error('Mode must be plan or build.');
    this.db.prepare('UPDATE sessions SET mode = ? WHERE id = ?').run(mode, id);
    this.add(id, 'user', body, '');
    const request = this.command(body, mode);
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

  modelState(): { model: 'mock'; gemini: 'off'; reason: string } {
    const cap = Number(process.env.DAWN_SPEND_CAP_USD || '');
    const armed = process.env.DAWN_NIGHTCODE_MODEL === 'gemini' && Number.isFinite(cap) && cap > 0;
    if (!armed) {
      return { model: 'mock', gemini: 'off', reason: 'Gemini stays off until DAWN_SPEND_CAP_USD is a positive number and DAWN_NIGHTCODE_MODEL=gemini.' };
    }
    return { model: 'mock', gemini: 'off', reason: 'The spend cap is set, and this build still does not call Gemini.' };
  }

  private command(text: string, mode: NightcodeMode): JailRequest {
    const read = /^read\s+(\S+)\s*$/i.exec(text);
    if (read) return { tool: 'readFile', mode, path: read[1] };
    const list = /^list(?:\s+(\S+))?\s*$/i.exec(text);
    if (list) return { tool: 'listDirectory', mode, path: list[1] || '.' };
    const write = /^write\s+(\S+)\s+([\s\S]+)$/i.exec(text);
    if (write) return { tool: 'writeFile', mode, path: write[1], content: write[2] };
    if (mode === 'plan') return { tool: 'listDirectory', mode, path: '.' };
    return { tool: 'writeFile', mode, path: 'notes/from-chat.txt', content: text };
  }

  private speak(mode: NightcodeMode, request: JailRequest, result: Record<string, unknown>): string {
    if (request.tool === 'readFile') return `Read ${String(result.path)}.\n${String(result.content || '')}`;
    if (request.tool === 'listDirectory') {
      const entries = Array.isArray(result.entries) ? result.entries.join(', ') : '';
      return mode === 'plan'
        ? `Plan only. Files: ${entries || '(empty)'}. Writes stay off.`
        : `Build mode. Files: ${entries || '(empty)'}.`;
    }
    return `Wrote ${String(result.path)} (${String(result.bytes)} bytes). Bash was not run.`;
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

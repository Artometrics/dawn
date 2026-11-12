import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { runJail } from './jail.ts';
import { z } from 'zod';
import type { KitModel } from '../dawn-agents/model-reply.ts';

export const TEAMMATES = [
  { id: 'builder', name: 'Builder' },
  { id: 'reviewer', name: 'Reviewer' },
] as const;

export type TeammateMessage = {
  id: string;
  speaker: string;
  body: string;
  handoffTo: string;
  created: number;
};

export type TeammateRoom = {
  id: string;
  active: string;
  messages: TeammateMessage[];
  teammates: { id: string; name: string }[];
};

/**
 * Group chat adapted from code-with-antonio/ai-teammates lib/handoff-tool.ts.
 * Clerk, Neon, Trigger.dev, and Daytona are not used. 
 * A handoff switches the speaker and stores the note. A reply comes from the chosen
 * model when the server has a key, and is a labeled fixture reply when it has none.
 */
export class TeammatesDesk {
  private readonly db: DatabaseSync;
  private readonly root: string;

  constructor(dbPath: string) {
    mkdirSync(path.dirname(dbPath), { recursive: true });
    this.root = path.join(path.dirname(dbPath), 'teammate-rooms');
    mkdirSync(this.root, { recursive: true });
    this.db = new DatabaseSync(dbPath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        active TEXT NOT NULL,
        created INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS lines (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        speaker TEXT NOT NULL,
        body TEXT NOT NULL,
        handoff_to TEXT NOT NULL,
        created INTEGER NOT NULL
      );
    `);
  }

  createRoom(): { id: string } {
    const id = `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    mkdirSync(path.join(this.root, id), { recursive: true });
    this.db.prepare('INSERT INTO rooms (id, active, created) VALUES (?, ?, ?)').run(id, 'builder', Date.now());
    this.add(id, 'builder', 'Builder is here. Ask, or hand the turn to Reviewer.', '');
    return { id };
  }

  getRoom(id: string): TeammateRoom {
    const row = this.db.prepare('SELECT id, active FROM rooms WHERE id = ?').get(id) as { id: string; active: string } | undefined;
    if (!row) throw new Error('Room not found');
    const messages = this.db.prepare('SELECT id, speaker, body, handoff_to AS handoffTo, created FROM lines WHERE room_id = ? ORDER BY created ASC').all(id) as TeammateMessage[];
    return { ...row, messages, teammates: [...TEAMMATES] };
  }

  async postMessage(id: string, text: string, model: KitModel | null = null): Promise<TeammateRoom> {
    const room = this.getRoom(id);
    const body = text.trim().slice(0, 2000);
    if (!body) throw new Error('Say something to the team.');
    const handoff = /^handoff\s+(\S+)\s+([\s\S]+)$/i.exec(body);
    this.add(id, 'you', body, '');
    if (handoff) {
      const bot = TEAMMATES.find((item) => item.id === handoff[1]);
      if (!bot) throw new Error('That teammate is not in this chat.');
      const note = handoff[2].trim().slice(0, 500);
      await runJail(path.join(this.root, id), { tool: 'handoff', mode: 'build', to: bot.id, text: note });
      this.db.prepare('UPDATE rooms SET active = ? WHERE id = ?').run(bot.id, id);
      this.add(id, bot.id, `${bot.name} took the turn. ${note}`, bot.id);
      return this.getRoom(id);
    }
    const speaker = TEAMMATES.find((item) => item.id === room.active) || TEAMMATES[0];
    await runJail(path.join(this.root, id), {
      tool: 'writeFile',
      mode: 'build',
      path: `notes/${speaker.id}.txt`,
      content: body,
    });
    if (!model) {
      this.add(id, speaker.id, `Fixture reply from ${speaker.name}. No model key is set on this server.`, '');
      return this.getRoom(id);
    }
    const system = [
      `You are ${speaker.name}, one of two teammates (Builder and Reviewer) in a shared chat with the user.`,
      speaker.id === 'builder' ? 'Builder drafts and makes things.' : 'Reviewer checks the work and says what to fix.',
      'When the other teammate should take over, call the handoff tool with a short note. Keep replies short.',
    ].join(' ');
    const other = TEAMMATES.find((item) => item.id !== speaker.id);
    const history = this.getRoom(id).messages.slice(-12).map((line) => ({
      role: line.speaker === 'you' ? ('user' as const) : ('assistant' as const),
      content: line.speaker === 'you' ? line.body : `${line.speaker}: ${line.body}`,
    }));
    let handoffNote = '';
    const tools = other
      ? [{
          name: 'handoff',
          description: `Pass the turn to ${other.name} with a note.`,
          schema: z.object({ note: z.string().min(1).max(500) }),
          run: async (input: Record<string, unknown>) => {
            handoffNote = String(input.note).trim().slice(0, 500);
            return `${other.name} will take the turn.`;
          },
        }]
      : [];
    try {
      const run = await model.agent(system, history, tools, 2);
      this.add(id, speaker.id, run.text, '');
      if (other && handoffNote) {
        await runJail(path.join(this.root, id), { tool: 'handoff', mode: 'build', to: other.id, text: handoffNote });
        this.db.prepare('UPDATE rooms SET active = ? WHERE id = ?').run(other.id, id);
        this.add(id, other.id, `${other.name} took the turn. ${handoffNote}`, other.id);
      }
    } catch (error) {
      this.add(id, speaker.id, error instanceof Error ? error.message.split('\n')[0] : 'The model stopped.', '');
    }
    return this.getRoom(id);
  }

  private add(roomId: string, speaker: string, body: string, handoffTo: string) {
    this.db.prepare('INSERT INTO lines (id, room_id, speaker, body, handoff_to, created) VALUES (?, ?, ?, ?, ?, ?)').run(
      `l_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      roomId,
      speaker,
      body,
      handoffTo,
      Date.now(),
    );
  }
}

import { AGENT_SLOTS, ROSTER_MAX, type AgentSlot } from './catalog';
import { parseCharacter, type ForgeCharacter } from './schema';

export const ROSTER_KEY = 'dawn.forge.roster.v1';
export const PORTRAIT_MAX = 60000;
export const SPRITE_MAX = 20000;

export type RosterEntry = {
  id: string;
  character: ForgeCharacter;
  /** PNG data URL for lists and the agent sheet. Empty until a render exists. */
  portrait: string;
  /** Small transparent PNG data URL that the Village scene draws. */
  sprite: string;
  /** The agent this character stands in for in the Village, or ''. */
  agentId: '' | AgentSlot;
  createdAt: number;
  updatedAt: number;
};

export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

const PNG_URL = /^data:image\/png;base64,[A-Za-z0-9+/]+=*$/;

export function validImage(value: unknown, max: number): value is string {
  return value === '' || (typeof value === 'string' && value.length <= max && PNG_URL.test(value));
}

export function isAgentSlot(value: unknown): value is AgentSlot {
  return typeof value === 'string' && (AGENT_SLOTS as readonly string[]).includes(value);
}

export function parseEntry(input: unknown): RosterEntry | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Record<string, unknown>;
  if (typeof raw.id !== 'string' || raw.id.length < 8 || raw.id.length > 80) return null;
  const character = parseCharacter(raw.character);
  if (!character.ok) return null;
  const portrait = raw.portrait ?? '';
  const sprite = raw.sprite ?? '';
  if (!validImage(portrait, PORTRAIT_MAX) || !validImage(sprite, SPRITE_MAX)) return null;
  const agentId = raw.agentId === '' || raw.agentId === undefined ? '' : raw.agentId;
  if (agentId !== '' && !isAgentSlot(agentId)) return null;
  const createdAt = typeof raw.createdAt === 'number' ? raw.createdAt : 0;
  const updatedAt = typeof raw.updatedAt === 'number' ? raw.updatedAt : createdAt;
  if (!(createdAt > 1700000000000) || updatedAt < createdAt) return null;
  return { id: raw.id, character: character.value, portrait, sprite, agentId, createdAt, updatedAt };
}

export function parseRoster(input: unknown): RosterEntry[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: RosterEntry[] = [];
  for (const item of input) {
    const entry = parseEntry(item);
    if (!entry || seen.has(entry.id)) continue;
    seen.add(entry.id);
    out.push(entry);
    if (out.length >= ROSTER_MAX) break;
  }
  return enforceOneHolder(out);
}

/** One character per agent. The most recently updated holder keeps the slot. */
function enforceOneHolder(list: RosterEntry[]): RosterEntry[] {
  const winners = new Map<string, RosterEntry>();
  for (const entry of list) {
    if (!entry.agentId) continue;
    const held = winners.get(entry.agentId);
    if (!held || entry.updatedAt > held.updatedAt) winners.set(entry.agentId, entry);
  }
  return list.map((entry) => (entry.agentId && winners.get(entry.agentId) !== entry ? { ...entry, agentId: '' as const } : entry));
}

export function loadRoster(storage: StorageLike): RosterEntry[] {
  try {
    const raw = storage.getItem(ROSTER_KEY);
    if (!raw) return [];
    return sortRoster(parseRoster(JSON.parse(raw)));
  } catch {
    return [];
  }
}

export function saveRoster(storage: StorageLike, list: RosterEntry[]): { ok: true } | { ok: false; error: string } {
  try {
    storage.setItem(ROSTER_KEY, JSON.stringify(list));
    return { ok: true };
  } catch {
    return { ok: false, error: 'This phone has no room left to keep characters.' };
  }
}

export function sortRoster(list: RosterEntry[]): RosterEntry[] {
  return [...list].sort((a, b) => b.updatedAt - a.updatedAt);
}

export type UpsertResult = { ok: true; roster: RosterEntry[]; entry: RosterEntry } | { ok: false; error: string };

export function upsertEntry(
  list: RosterEntry[],
  next: { id: string; character: ForgeCharacter; portrait: string; sprite: string },
  now: number,
): UpsertResult {
  const parsed = parseCharacter(next.character);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  if (!validImage(next.portrait, PORTRAIT_MAX) || !validImage(next.sprite, SPRITE_MAX)) {
    return { ok: false, error: 'The portrait is too large to keep.' };
  }
  const existing = list.find((item) => item.id === next.id);
  if (!existing && list.length >= ROSTER_MAX) {
    return { ok: false, error: `The roster holds ${ROSTER_MAX} characters. Remove one first.` };
  }
  const entry: RosterEntry = {
    id: next.id,
    character: parsed.value,
    portrait: next.portrait,
    sprite: next.sprite,
    agentId: existing?.agentId ?? '',
    createdAt: existing?.createdAt ?? now,
    updatedAt: Math.max(now, existing?.createdAt ?? 0),
  };
  return { ok: true, roster: sortRoster([entry, ...list.filter((item) => item.id !== next.id)]), entry };
}

export function removeEntry(list: RosterEntry[], id: string): RosterEntry[] {
  return list.filter((item) => item.id !== id);
}

/** Pass '' to release the agent. Any other character holding the agent loses it. */
export function assignAgent(list: RosterEntry[], id: string, agentId: '' | AgentSlot, now: number): RosterEntry[] {
  if (!list.some((item) => item.id === id)) return list;
  return list.map((item) => {
    if (item.id === id) return item.agentId === agentId ? item : { ...item, agentId, updatedAt: Math.max(now, item.createdAt) };
    if (agentId && item.agentId === agentId) return { ...item, agentId: '' as const, updatedAt: Math.max(now, item.createdAt) };
    return item;
  });
}

export type AgentLook = { characterId: string; name: string; sprite: string; portrait: string };

export function looksByAgent(list: RosterEntry[]): Partial<Record<AgentSlot, AgentLook>> {
  const looks: Partial<Record<AgentSlot, AgentLook>> = {};
  for (const entry of list) {
    if (!entry.agentId || !entry.sprite) continue;
    looks[entry.agentId] = { characterId: entry.id, name: entry.character.name, sprite: entry.sprite, portrait: entry.portrait };
  }
  return looks;
}

/** The shape stored at users/{uid}/characters/{id}. It mirrors firestore.rules. */
export function entryToDoc(entry: RosterEntry) {
  return {
    id: entry.id,
    name: entry.character.name,
    spec: entry.character,
    portrait: entry.portrait,
    sprite: entry.sprite,
    agentId: entry.agentId,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

export function docToEntry(doc: unknown): RosterEntry | null {
  if (!doc || typeof doc !== 'object') return null;
  const raw = doc as Record<string, unknown>;
  return parseEntry({ ...raw, character: raw.spec });
}

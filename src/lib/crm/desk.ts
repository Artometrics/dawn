/** People, companies, and the five-stage board. Dates are unix milliseconds so the desk can sit in JSON. */

export const STAGES = [
  { id: 'lead', label: 'Lead' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'proposal', label: 'Proposal' },
  { id: 'won', label: 'Won' },
  { id: 'lost', label: 'Lost' },
] as const;

export type Stage = (typeof STAGES)[number]['id'];

export type Contact = {
  id: string;
  name: string;
  companyId: string;
  companyName: string;
  email: string;
  phone: string;
  instagram: string;
  website: string;
  tags: string[];
  source: string;
  createdAt: number;
  updatedAt: number;
};

export type Company = {
  id: string;
  name: string;
  website: string;
  phone: string;
  notes: string;
  createdAt: number;
  updatedAt: number;
};

export type Deal = {
  id: string;
  title: string;
  contactId: string;
  companyId: string;
  contactName: string;
  companyName: string;
  stage: Stage;
  valueCents: number;
  createdAt: number;
  updatedAt: number;
};

export type Note = {
  id: string;
  contactId: string;
  body: string;
  createdAt: number;
};

export type Task = {
  id: string;
  title: string;
  contactId: string;
  dueAt: number | null;
  done: boolean;
  notes: string;
  createdAt: number;
  updatedAt: number;
};

export type CrmData = {
  contacts: Contact[];
  companies: Company[];
  deals: Deal[];
  notes: Note[];
  tasks: Task[];
};

export const EMPTY_CRM: CrmData = { contacts: [], companies: [], deals: [], notes: [], tasks: [] };

export const CSV_COLUMNS = ['name', 'company', 'email', 'phone', 'instagram', 'website', 'tags', 'source'] as const;

const CAP = { contacts: 2000, companies: 500, deals: 1000, notes: 4000, tasks: 2000 };

export type Ok<T> = { ok: true; data: CrmData } & T;
export type Err = { ok: false; error: string; data: CrmData };

export function stageLabel(stage: Stage): string {
  return STAGES.find((item) => item.id === stage)?.label ?? stage;
}

export function isStage(value: string): value is Stage {
  return STAGES.some((item) => item.id === value);
}

export function money(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(Math.round(cents));
  const dollars = Math.floor(abs / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const rem = String(abs % 100).padStart(2, '0');
  return `${sign}$${dollars}.${rem}`;
}

function nid(prefix: string): string {
  const buf = crypto.getRandomValues(new Uint8Array(8));
  let hex = '';
  for (const byte of buf) hex += byte.toString(16).padStart(2, '0');
  return `${prefix}_${hex}`;
}

function clip(value: string, max: number): string {
  return value.trim().slice(0, max);
}

/** Drop blanks, a leading hash, duplicates, and tags longer than 24 characters. */
export function cleanTags(value: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of value.split(',')) {
    const tag = part.trim().replace(/^#+/, '');
    if (!tag || tag.length > 24) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
    if (out.length >= 8) break;
  }
  return out;
}

export function tomorrowMorning(now: number): number {
  const date = new Date(now);
  date.setDate(date.getDate() + 1);
  date.setHours(9, 0, 0, 0);
  return date.getTime();
}

export type WhenBucket = 'overdue' | 'today' | 'later';

export function whenBucket(due: number, now: number): WhenBucket {
  const a = new Date(due);
  const b = new Date(now);
  const day = (date: Date) => date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  const left = day(a);
  const right = day(b);
  if (left < right) return 'overdue';
  if (left === right) return 'today';
  return 'later';
}

export function dueLabel(due: number, now: number): string {
  const bucket = whenBucket(due, now);
  if (bucket === 'overdue') return 'Overdue';
  if (bucket === 'today') return 'Today';
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dueDate = new Date(due);
  if (
    dueDate.getFullYear() === tomorrow.getFullYear() &&
    dueDate.getMonth() === tomorrow.getMonth() &&
    dueDate.getDate() === tomorrow.getDate()
  ) {
    return 'Tomorrow';
  }
  return dueDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function todayLists(data: CrmData, now: number) {
  const open = data.tasks.filter((task) => !task.done && task.dueAt);
  return {
    overdue: open.filter((task) => task.dueAt && whenBucket(task.dueAt, now) === 'overdue'),
    today: open.filter((task) => task.dueAt && whenBucket(task.dueAt, now) === 'today'),
    proposals: data.deals.filter((deal) => deal.stage === 'proposal'),
  };
}

export type SearchHit = {
  id: string;
  kind: 'person' | 'company' | 'deal' | 'task' | 'note';
  title: string;
  meta: string;
};

function matches(query: string, parts: Array<string | undefined>): boolean {
  const tokens = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;
  const hay = parts.filter(Boolean).join(' ').toLowerCase();
  return tokens.every((token) => hay.includes(token));
}

export function searchDesk(query: string, data: CrmData): SearchHit[] {
  const q = query.trim();
  if (!q) return [];
  const hits: SearchHit[] = [];
  for (const contact of data.contacts) {
    if (matches(q, [contact.name, contact.companyName, contact.email, contact.phone, contact.instagram, contact.source, contact.tags.join(' ')])) {
      hits.push({ id: contact.id, kind: 'person', title: contact.name, meta: contact.companyName || contact.email || 'Person' });
    }
  }
  for (const company of data.companies) {
    if (matches(q, [company.name, company.website, company.phone, company.notes])) {
      hits.push({ id: company.id, kind: 'company', title: company.name, meta: 'Company' });
    }
  }
  for (const deal of data.deals) {
    if (matches(q, [deal.title, deal.contactName, deal.companyName, deal.stage, stageLabel(deal.stage)])) {
      hits.push({ id: deal.id, kind: 'deal', title: deal.title, meta: deal.companyName || deal.contactName || 'Deal' });
    }
  }
  for (const task of data.tasks) {
    if (matches(q, [task.title, task.notes])) hits.push({ id: task.id, kind: 'task', title: task.title, meta: 'Task' });
  }
  for (const note of data.notes) {
    if (matches(q, [note.body])) {
      const person = data.contacts.find((contact) => contact.id === note.contactId);
      hits.push({ id: note.id, kind: 'note', title: note.body.slice(0, 80), meta: person ? person.name : 'Note' });
    }
  }
  return hits.slice(0, 40);
}

function ensureCompany(data: CrmData, name: string, now: number): { data: CrmData; company: Company | null; error?: string } {
  const trimmed = clip(name, 80);
  if (!trimmed) return { data, company: null };
  const found = data.companies.find((company) => company.name.toLowerCase() === trimmed.toLowerCase());
  if (found) return { data, company: found };
  if (data.companies.length >= CAP.companies) return { data, company: null, error: 'The company list is full.' };
  const company: Company = { id: nid('co'), name: trimmed, website: '', phone: '', notes: '', createdAt: now, updatedAt: now };
  return { data: { ...data, companies: [company, ...data.companies] }, company };
}

export type ContactInput = {
  id?: string;
  name: string;
  companyName?: string;
  email?: string;
  phone?: string;
  instagram?: string;
  website?: string;
  tags?: string;
  source?: string;
};

export function saveContact(data: CrmData, input: ContactInput, now: number): Ok<{ contact: Contact }> | Err {
  const name = clip(input.name, 80);
  if (!name) return { ok: false, error: 'A person needs a name.', data };
  const existing = input.id ? data.contacts.find((contact) => contact.id === input.id) : undefined;
  if (input.id && !existing) return { ok: false, error: 'That person is not on the desk.', data };
  if (!existing && data.contacts.length >= CAP.contacts) return { ok: false, error: 'The people list is full.', data };
  const company = ensureCompany(data, input.companyName || '', now);
  if (company.error) return { ok: false, error: company.error, data };
  const contact: Contact = {
    id: existing?.id ?? nid('p'),
    name,
    companyId: company.company?.id ?? '',
    companyName: company.company?.name ?? '',
    email: clip(input.email || '', 120),
    phone: clip(input.phone || '', 40),
    instagram: clip(input.instagram || '', 40),
    website: clip(input.website || '', 160),
    tags: cleanTags(input.tags || ''),
    source: clip(input.source || '', 40),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  const contacts = existing
    ? company.data.contacts.map((row) => (row.id === contact.id ? contact : row))
    : [contact, ...company.data.contacts];
  return { ok: true, data: { ...company.data, contacts }, contact };
}

/** Name is enough. A follow-up tomorrow is on unless the caller turns it off. */
export function quickAdd(
  data: CrmData,
  input: { name: string; phone?: string; email?: string; companyName?: string; followUp?: boolean },
  now: number,
): Ok<{ contact: Contact; task: Task | null }> | Err {
  const saved = saveContact(
    data,
    { name: input.name, phone: input.phone, email: input.email, companyName: input.companyName, tags: '', source: 'phone' },
    now,
  );
  if (!saved.ok) return saved;
  if (input.followUp === false) return { ok: true, data: saved.data, contact: saved.contact, task: null };
  const taskResult = saveTask(
    saved.data,
    { title: `Follow up ${saved.contact.name}`, contactId: saved.contact.id, dueAt: tomorrowMorning(now), notes: '' },
    now,
  );
  if (!taskResult.ok) return { ok: true, data: saved.data, contact: saved.contact, task: null };
  return { ok: true, data: taskResult.data, contact: saved.contact, task: taskResult.task };
}

export function saveCompany(
  data: CrmData,
  input: { id?: string; name: string; website?: string; phone?: string; notes?: string },
  now: number,
): Ok<{ company: Company }> | Err {
  const name = clip(input.name, 80);
  if (!name) return { ok: false, error: 'A company needs a name.', data };
  const existing = input.id ? data.companies.find((company) => company.id === input.id) : undefined;
  if (input.id && !existing) return { ok: false, error: 'That company is not on the desk.', data };
  if (!existing && data.companies.length >= CAP.companies) return { ok: false, error: 'The company list is full.', data };
  const company: Company = {
    id: existing?.id ?? nid('co'),
    name,
    website: clip(input.website || '', 160),
    phone: clip(input.phone || '', 40),
    notes: clip(input.notes || '', 500),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  const companies = existing ? data.companies.map((row) => (row.id === company.id ? company : row)) : [company, ...data.companies];
  return { ok: true, data: { ...data, companies }, company };
}

export function saveDeal(
  data: CrmData,
  input: { id?: string; title: string; contactId?: string; stage?: string; valueCents?: number },
  now: number,
): Ok<{ deal: Deal }> | Err {
  const title = clip(input.title, 80);
  if (!title) return { ok: false, error: 'A deal needs a title.', data };
  const existing = input.id ? data.deals.find((deal) => deal.id === input.id) : undefined;
  if (input.id && !existing) return { ok: false, error: 'That deal is not on the board.', data };
  if (!existing && data.deals.length >= CAP.deals) return { ok: false, error: 'The board is full.', data };
  const contact = data.contacts.find((item) => item.id === input.contactId) ?? null;
  const stage = input.stage && isStage(input.stage) ? input.stage : existing?.stage ?? 'lead';
  const value = Math.max(0, Math.round(input.valueCents ?? existing?.valueCents ?? 0));
  const deal: Deal = {
    id: existing?.id ?? nid('d'),
    title,
    contactId: contact?.id ?? existing?.contactId ?? '',
    companyId: contact?.companyId ?? existing?.companyId ?? '',
    contactName: contact?.name ?? existing?.contactName ?? '',
    companyName: contact?.companyName ?? existing?.companyName ?? '',
    stage,
    valueCents: value,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  const deals = existing ? data.deals.map((row) => (row.id === deal.id ? deal : row)) : [deal, ...data.deals];
  return { ok: true, data: { ...data, deals }, deal };
}

export function moveDeal(data: CrmData, id: string, stage: string, now: number): Ok<{ deal: Deal }> | Err {
  const deal = data.deals.find((row) => row.id === id);
  if (!deal) return { ok: false, error: 'That deal is not on the board.', data };
  if (!isStage(stage)) return { ok: false, error: 'That stage is not on the board.', data };
  return saveDeal(data, { ...deal, stage, valueCents: deal.valueCents }, now);
}

export function addNote(data: CrmData, contactId: string, body: string, now: number): Ok<{ note: Note }> | Err {
  const text = clip(body, 2000);
  if (!text) return { ok: false, error: 'The note is empty.', data };
  if (!data.contacts.some((contact) => contact.id === contactId)) return { ok: false, error: 'That person is not on the desk.', data };
  if (data.notes.length >= CAP.notes) return { ok: false, error: 'The note list is full.', data };
  const note: Note = { id: nid('n'), contactId, body: text, createdAt: now };
  return { ok: true, data: { ...data, notes: [note, ...data.notes] }, note };
}

export function saveTask(
  data: CrmData,
  input: { id?: string; title: string; contactId?: string; dueAt?: number | null; notes?: string; done?: boolean },
  now: number,
): Ok<{ task: Task }> | Err {
  const title = clip(input.title, 120);
  if (!title) return { ok: false, error: 'A task needs a title.', data };
  const existing = input.id ? data.tasks.find((task) => task.id === input.id) : undefined;
  if (input.id && !existing) return { ok: false, error: 'That task is not on the desk.', data };
  if (!existing && data.tasks.length >= CAP.tasks) return { ok: false, error: 'The task list is full.', data };
  const task: Task = {
    id: existing?.id ?? nid('t'),
    title,
    contactId: input.contactId ?? existing?.contactId ?? '',
    dueAt: input.dueAt === undefined ? existing?.dueAt ?? null : input.dueAt,
    done: input.done ?? existing?.done ?? false,
    notes: clip(input.notes ?? existing?.notes ?? '', 500),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  const tasks = existing ? data.tasks.map((row) => (row.id === task.id ? task : row)) : [task, ...data.tasks];
  return { ok: true, data: { ...data, tasks }, task };
}

export function setTaskDone(data: CrmData, id: string, done: boolean, now: number): CrmData {
  return {
    ...data,
    tasks: data.tasks.map((task) => (task.id === id ? { ...task, done, updatedAt: now } : task)),
  };
}

export type CsvRow = Record<(typeof CSV_COLUMNS)[number], string>;

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function contactsToCsv(contacts: Contact[]): string {
  const lines = [CSV_COLUMNS.join(',')];
  for (const contact of contacts) {
    const cells = [
      contact.name,
      contact.companyName,
      contact.email,
      contact.phone,
      contact.instagram,
      contact.website,
      contact.tags.join(', '),
      contact.source,
    ];
    lines.push(cells.map(csvCell).join(','));
  }
  return `${lines.join('\n')}\n`;
}

export function parseContactsCsv(text: string): CsvRow[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];
  const header = rows[0].map((cell) => cell.trim().toLowerCase());
  const index = new Map(header.map((name, i) => [name, i]));
  if (!index.has('name')) return [];
  const out: CsvRow[] = [];
  for (const row of rows.slice(1)) {
    const next = {} as CsvRow;
    for (const column of CSV_COLUMNS) {
      const at = index.get(column);
      next[column] = at === undefined ? '' : (row[at] ?? '').trim();
    }
    if (next.name) out.push(next);
  }
  return out;
}

export function importContacts(data: CrmData, text: string, now: number): Ok<{ imported: number; skipped: number }> | Err {
  const rows = parseContactsCsv(text);
  let imported = 0;
  let skipped = 0;
  let current = data;
  for (const row of rows) {
    if (current.contacts.some((contact) => contact.name.toLowerCase() === row.name.toLowerCase() && contact.email.toLowerCase() === row.email.toLowerCase() && row.email)) {
      skipped += 1;
      continue;
    }
    const saved = saveContact(
      current,
      {
        name: row.name,
        companyName: row.company,
        email: row.email,
        phone: row.phone,
        instagram: row.instagram,
        website: row.website,
        tags: row.tags,
        source: row.source,
      },
      now,
    );
    if (!saved.ok) {
      skipped += 1;
      continue;
    }
    current = saved.data;
    imported += 1;
  }
  return { ok: true, data: current, imported, skipped };
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const source = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else quoted = false;
      } else cell += char;
      continue;
    }
    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === ',') {
      row.push(cell);
      cell = '';
      continue;
    }
    if (char === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }
    if (char !== '\r') cell += char;
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((item) => item.some((value) => value.trim()));
}

function num(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function parseCrm(raw: unknown): CrmData {
  if (!raw || typeof raw !== 'object') return EMPTY_CRM;
  const row = raw as Record<string, unknown>;
  const list = <T>(value: unknown, parse: (item: unknown) => T | null, cap: number): T[] =>
    (Array.isArray(value) ? value.map(parse).filter((item): item is T => item !== null) : []).slice(0, cap);
  return {
    contacts: list(row.contacts, parseContact, CAP.contacts),
    companies: list(row.companies, parseCompany, CAP.companies),
    deals: list(row.deals, parseDeal, CAP.deals),
    notes: list(row.notes, parseNote, CAP.notes),
    tasks: list(row.tasks, parseTask, CAP.tasks),
  };
}

function parseContact(raw: unknown): Contact | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.id !== 'string' || typeof row.name !== 'string' || !row.name.trim()) return null;
  return {
    id: row.id,
    name: row.name.slice(0, 80),
    companyId: typeof row.companyId === 'string' ? row.companyId : '',
    companyName: typeof row.companyName === 'string' ? row.companyName.slice(0, 80) : '',
    email: typeof row.email === 'string' ? row.email.slice(0, 120) : '',
    phone: typeof row.phone === 'string' ? row.phone.slice(0, 40) : '',
    instagram: typeof row.instagram === 'string' ? row.instagram.slice(0, 40) : '',
    website: typeof row.website === 'string' ? row.website.slice(0, 160) : '',
    tags: Array.isArray(row.tags) ? row.tags.filter((tag): tag is string => typeof tag === 'string').slice(0, 8) : [],
    source: typeof row.source === 'string' ? row.source.slice(0, 40) : '',
    createdAt: num(row.createdAt),
    updatedAt: num(row.updatedAt),
  };
}

function parseCompany(raw: unknown): Company | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.id !== 'string' || typeof row.name !== 'string' || !row.name.trim()) return null;
  return {
    id: row.id,
    name: row.name.slice(0, 80),
    website: typeof row.website === 'string' ? row.website.slice(0, 160) : '',
    phone: typeof row.phone === 'string' ? row.phone.slice(0, 40) : '',
    notes: typeof row.notes === 'string' ? row.notes.slice(0, 500) : '',
    createdAt: num(row.createdAt),
    updatedAt: num(row.updatedAt),
  };
}

function parseDeal(raw: unknown): Deal | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.id !== 'string' || typeof row.title !== 'string') return null;
  const stage = typeof row.stage === 'string' && isStage(row.stage) ? row.stage : 'lead';
  return {
    id: row.id,
    title: row.title.slice(0, 80),
    contactId: typeof row.contactId === 'string' ? row.contactId : '',
    companyId: typeof row.companyId === 'string' ? row.companyId : '',
    contactName: typeof row.contactName === 'string' ? row.contactName : '',
    companyName: typeof row.companyName === 'string' ? row.companyName : '',
    stage,
    valueCents: Math.max(0, Math.round(num(row.valueCents))),
    createdAt: num(row.createdAt),
    updatedAt: num(row.updatedAt),
  };
}

function parseNote(raw: unknown): Note | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.id !== 'string' || typeof row.contactId !== 'string' || typeof row.body !== 'string') return null;
  return { id: row.id, contactId: row.contactId, body: row.body.slice(0, 2000), createdAt: num(row.createdAt) };
}

function parseTask(raw: unknown): Task | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.id !== 'string' || typeof row.title !== 'string') return null;
  return {
    id: row.id,
    title: row.title.slice(0, 120),
    contactId: typeof row.contactId === 'string' ? row.contactId : '',
    dueAt: typeof row.dueAt === 'number' ? row.dueAt : null,
    done: row.done === true,
    notes: typeof row.notes === 'string' ? row.notes.slice(0, 500) : '',
    createdAt: num(row.createdAt),
    updatedAt: num(row.updatedAt),
  };
}

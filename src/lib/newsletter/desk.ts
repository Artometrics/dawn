import { encodeDesk, loadDesk, parsePayload, saveDesk, type StorageLike } from '../desks/store';
import { renderMarkdown, slugify } from './markdown';

/** The sentence stored with every signup. It matches the checkbox on the letter page. */
export const CONSENT_TEXT =
  'I agree to receive the Artometrics letter by email. I can unsubscribe in one click.';

/** Placeholder postal address from the retired desk. Replace it before a real mailing. */
export const ADDRESS_LINES = [
  'Artometrics',
  '548 Market Street, PMB 00000',
  'San Francisco, CA 94104',
  'United States',
];

/** Confirmed readers mailed in one pass. The rest stay queued. */
export const SEND_BATCH_CAP = 50;
export const SUBSCRIBER_CAP = 2000;
export const ISSUE_CAP = 200;

export const SIGNUP_MESSAGE =
  'Check the confirmation from the studio. If this address is already on the list, it stays as it is.';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type IssueStatus = 'draft' | 'sent';
export type SubscriberStatus = 'pending' | 'confirmed' | 'unsubscribed';

export type Issue = {
  id: string;
  title: string;
  slug: string;
  subject: string;
  dek: string;
  body: string;
  status: IssueStatus;
  createdAt: number;
  updatedAt: number;
  sentAt: number | null;
};

export type Subscriber = {
  id: string;
  email: string;
  status: SubscriberStatus;
  consentAt: number | null;
  consentText: string;
  createdAt: number;
  confirmToken: string;
  unsubToken: string;
};

export type IssueSend = {
  id: string;
  issueId: string;
  sentAt: number;
  recipients: number;
  opens: number;
  clicks: number;
  openedIds: string[];
  clickedIds: string[];
  /** Local sends never leave the desk. The gateway uses the same flag. */
  dryRun: boolean;
  heldBack: number;
};

export type NewsletterData = {
  issues: Issue[];
  subscribers: Subscriber[];
  sends: IssueSend[];
};

export const EMPTY_NEWSLETTER: NewsletterData = { issues: [], subscribers: [], sends: [] };

export function loadNewsletter(storage: StorageLike): NewsletterData {
  const envelope = loadDesk(storage, 'newsletter');
  if (!envelope) return EMPTY_NEWSLETTER;
  return parseNewsletter(parsePayload(envelope.payload));
}

export function saveNewsletter(storage: StorageLike, data: NewsletterData, now = Date.now()): void {
  const envelope = encodeDesk('newsletter', data, now);
  if (!envelope) return;
  saveDesk(storage, envelope);
}

export type Ok<T> = { ok: true; data: NewsletterData } & T;
export type Err = { ok: false; error: string; data: NewsletterData };

function hex(bytes = 8): string {
  const buf = crypto.getRandomValues(new Uint8Array(bytes));
  let out = '';
  for (const byte of buf) out += byte.toString(16).padStart(2, '0');
  return out;
}

function nid(prefix: string): string {
  return `${prefix}_${hex()}`;
}

function clip(value: string, max: number): string {
  return value.trim().slice(0, max);
}

function uniqueSlug(issues: Issue[], title: string, ignoreId?: string): string {
  const base = slugify(title);
  const taken = new Set(issues.filter((issue) => issue.id !== ignoreId).map((issue) => issue.slug));
  if (!taken.has(base)) return base;
  for (let n = 2; n < 100; n += 1) {
    const next = `${base.slice(0, 56)}-${n}`;
    if (!taken.has(next)) return next;
  }
  return `${base.slice(0, 48)}-${hex(3)}`;
}

export function newsletterStats(data: NewsletterData) {
  return {
    pending: data.subscribers.filter((row) => row.status === 'pending').length,
    confirmed: data.subscribers.filter((row) => row.status === 'confirmed').length,
    unsubscribed: data.subscribers.filter((row) => row.status === 'unsubscribed').length,
    sent: data.issues.filter((issue) => issue.status === 'sent').length,
    recipients: data.sends.reduce((sum, send) => sum + send.recipients, 0),
    opens: data.sends.reduce((sum, send) => sum + send.opens, 0),
    clicks: data.sends.reduce((sum, send) => sum + send.clicks, 0),
  };
}

export function sentIssues(data: NewsletterData): Issue[] {
  return data.issues
    .filter((issue) => issue.status === 'sent')
    .sort((a, b) => (b.sentAt ?? 0) - (a.sentAt ?? 0));
}

export function saveIssue(
  data: NewsletterData,
  input: { id?: string; title: string; subject: string; dek: string; body: string },
  now: number,
): Ok<{ issue: Issue }> | Err {
  const title = clip(input.title, 120);
  if (!title) return { ok: false, error: 'The letter needs a title.', data };
  const existing = input.id ? data.issues.find((issue) => issue.id === input.id) : undefined;
  if (input.id && !existing) return { ok: false, error: 'That letter is not on the desk.', data };
  if (existing?.status === 'sent') return { ok: false, error: 'A sent letter stays as it was mailed.', data };
  if (!existing && data.issues.length >= ISSUE_CAP) return { ok: false, error: 'The desk is holding its limit of letters.', data };
  const issue: Issue = {
    id: existing?.id ?? nid('iss'),
    title,
    slug: uniqueSlug(data.issues, title, existing?.id),
    subject: clip(input.subject || title, 140),
    dek: clip(input.dek, 180),
    body: input.body.slice(0, 40_000),
    status: 'draft',
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    sentAt: null,
  };
  const issues = existing
    ? data.issues.map((row) => (row.id === issue.id ? issue : row))
    : [issue, ...data.issues];
  return { ok: true, data: { ...data, issues }, issue };
}

/**
 * Files a send on the desk. This function never contacts a mail provider.
 * The gateway is the only place that can mail, and only when its flag is on.
 */
export function sendIssue(data: NewsletterData, id: string, now: number): Ok<{ send: IssueSend }> | Err {
  const issue = data.issues.find((row) => row.id === id);
  if (!issue) return { ok: false, error: 'That letter is not on the desk.', data };
  if (!issue.title.trim() || !issue.body.trim()) return { ok: false, error: 'Write a title and a letter before sending.', data };
  const confirmed = data.subscribers.filter((row) => row.status === 'confirmed');
  if (confirmed.length === 0) return { ok: false, error: 'Nobody has confirmed yet.', data };
  const recipients = Math.min(confirmed.length, SEND_BATCH_CAP);
  const send: IssueSend = {
    id: nid('send'),
    issueId: issue.id,
    sentAt: now,
    recipients,
    opens: 0,
    clicks: 0,
    openedIds: [],
    clickedIds: [],
    dryRun: true,
    heldBack: confirmed.length - recipients,
  };
  const next: Issue = { ...issue, status: 'sent', sentAt: issue.sentAt ?? now, updatedAt: now };
  return {
    ok: true,
    send,
    data: {
      ...data,
      issues: data.issues.map((row) => (row.id === issue.id ? next : row)),
      sends: [send, ...data.sends],
    },
  };
}

export function subscribe(
  data: NewsletterData,
  input: { email: string; consent: boolean; now: number },
): Ok<{ message: string }> | Err {
  const email = input.email.trim().toLowerCase();
  if (!EMAIL.test(email) || email.length > 160) return { ok: false, error: 'That email does not look right.', data };
  if (!input.consent) return { ok: false, error: 'Consent is required before an address is added.', data };
  if (data.subscribers.some((row) => row.email === email)) {
    return { ok: true, data, message: SIGNUP_MESSAGE };
  }
  if (data.subscribers.length >= SUBSCRIBER_CAP) return { ok: false, error: 'The list is full.', data };
  const row: Subscriber = {
    id: nid('sub'),
    email,
    status: 'pending',
    consentAt: input.now,
    consentText: CONSENT_TEXT,
    createdAt: input.now,
    confirmToken: hex(16),
    unsubToken: hex(16),
  };
  return { ok: true, message: SIGNUP_MESSAGE, data: { ...data, subscribers: [row, ...data.subscribers] } };
}

export function confirmSubscriber(data: NewsletterData, token: string, now: number): Ok<{ changed: boolean }> | Err {
  const row = data.subscribers.find((item) => item.confirmToken === token);
  if (!row || row.status === 'unsubscribed') return { ok: false, error: 'That confirmation link is not valid.', data };
  if (row.status === 'confirmed') return { ok: true, data, changed: false };
  return {
    ok: true,
    changed: true,
    data: {
      ...data,
      subscribers: data.subscribers.map((item) =>
        item.id === row.id ? { ...item, status: 'confirmed' as const, consentAt: item.consentAt ?? now } : item,
      ),
    },
  };
}

export function unsubscribeSubscriber(data: NewsletterData, token: string): Ok<{ changed: boolean }> | Err {
  const row = data.subscribers.find((item) => item.unsubToken === token);
  if (!row) return { ok: false, error: 'That unsubscribe link is not valid.', data };
  if (row.status === 'unsubscribed') return { ok: true, data, changed: false };
  return {
    ok: true,
    changed: true,
    data: {
      ...data,
      subscribers: data.subscribers.map((item) => (item.id === row.id ? { ...item, status: 'unsubscribed' as const } : item)),
    },
  };
}

function touchSend(data: NewsletterData, sendId: string, readerId: string, field: 'openedIds' | 'clickedIds'): NewsletterData {
  const id = readerId.trim().slice(0, 40);
  if (!id) return data;
  let changed = false;
  const sends = data.sends.map((send) => {
    if (send.id !== sendId && send.issueId !== sendId) return send;
    const list = send[field];
    if (list.includes(id)) return send;
    changed = true;
    const next = { ...send, [field]: [...list, id] };
    if (field === 'openedIds') next.opens += 1;
    else next.clicks += 1;
    return next;
  });
  return changed ? { ...data, sends } : data;
}

/** Counts a reader once per send. Pass a send id or an issue id (the latest send is used when several match). */
export function recordOpen(data: NewsletterData, sendOrIssueId: string, readerId: string): NewsletterData {
  const send = data.sends.find((row) => row.id === sendOrIssueId) ?? data.sends.find((row) => row.issueId === sendOrIssueId);
  if (!send) return data;
  return touchSend(data, send.id, readerId, 'openedIds');
}

export function recordClick(data: NewsletterData, sendOrIssueId: string, readerId: string): NewsletterData {
  const send = data.sends.find((row) => row.id === sendOrIssueId) ?? data.sends.find((row) => row.issueId === sendOrIssueId);
  if (!send) return data;
  return touchSend(data, send.id, readerId, 'clickedIds');
}

export function issueHtml(issue: Issue): string {
  const body = renderMarkdown(issue.body);
  const address = ADDRESS_LINES.map((line) => `<span>${line}</span>`).join('<br>');
  return `${body}\n<footer><p>${address}</p></footer>`;
}

function isStatus(value: unknown): value is SubscriberStatus {
  return value === 'pending' || value === 'confirmed' || value === 'unsubscribed';
}

export function parseNewsletter(raw: unknown): NewsletterData {
  if (!raw || typeof raw !== 'object') return EMPTY_NEWSLETTER;
  const row = raw as Record<string, unknown>;
  const issues = Array.isArray(row.issues) ? row.issues.map(parseIssue).filter((item): item is Issue => item !== null) : [];
  const subscribers = Array.isArray(row.subscribers)
    ? row.subscribers.map(parseSubscriber).filter((item): item is Subscriber => item !== null)
    : [];
  const sends = Array.isArray(row.sends) ? row.sends.map(parseSend).filter((item): item is IssueSend => item !== null) : [];
  return {
    issues: issues.slice(0, ISSUE_CAP),
    subscribers: subscribers.slice(0, SUBSCRIBER_CAP),
    sends: sends.slice(0, 500),
  };
}

function parseIssue(raw: unknown): Issue | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.id !== 'string' || typeof row.title !== 'string' || !row.title.trim()) return null;
  const status: IssueStatus = row.status === 'sent' ? 'sent' : 'draft';
  const createdAt = typeof row.createdAt === 'number' ? row.createdAt : 0;
  return {
    id: row.id,
    title: row.title.slice(0, 120),
    slug: typeof row.slug === 'string' && row.slug ? row.slug.slice(0, 70) : slugify(row.title),
    subject: typeof row.subject === 'string' ? row.subject.slice(0, 140) : row.title.slice(0, 140),
    dek: typeof row.dek === 'string' ? row.dek.slice(0, 180) : '',
    body: typeof row.body === 'string' ? row.body.slice(0, 40_000) : '',
    status,
    createdAt,
    updatedAt: typeof row.updatedAt === 'number' ? row.updatedAt : createdAt,
    sentAt: typeof row.sentAt === 'number' ? row.sentAt : null,
  };
}

function parseSubscriber(raw: unknown): Subscriber | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.id !== 'string' || typeof row.email !== 'string' || !EMAIL.test(row.email)) return null;
  if (!isStatus(row.status)) return null;
  if (typeof row.confirmToken !== 'string' || typeof row.unsubToken !== 'string') return null;
  return {
    id: row.id,
    email: row.email,
    status: row.status,
    consentAt: typeof row.consentAt === 'number' ? row.consentAt : null,
    consentText: typeof row.consentText === 'string' ? row.consentText.slice(0, 240) : CONSENT_TEXT,
    createdAt: typeof row.createdAt === 'number' ? row.createdAt : 0,
    confirmToken: row.confirmToken.slice(0, 80),
    unsubToken: row.unsubToken.slice(0, 80),
  };
}

function parseSend(raw: unknown): IssueSend | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.id !== 'string' || typeof row.issueId !== 'string') return null;
  const ids = (value: unknown) => (Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string').slice(0, 5000) : []);
  return {
    id: row.id,
    issueId: row.issueId,
    sentAt: typeof row.sentAt === 'number' ? row.sentAt : 0,
    recipients: typeof row.recipients === 'number' ? row.recipients : 0,
    opens: typeof row.opens === 'number' ? row.opens : 0,
    clicks: typeof row.clicks === 'number' ? row.clicks : 0,
    openedIds: ids(row.openedIds),
    clickedIds: ids(row.clickedIds),
    dryRun: row.dryRun !== false,
    heldBack: typeof row.heldBack === 'number' ? row.heldBack : 0,
  };
}

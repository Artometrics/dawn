import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireAdmin } from './authz.js';
import {
  ADDRESS_IS_PLACEHOLDER,
  ADDRESS_LINES,
  CONSENT_TEXT,
  GENERIC_SUBSCRIBE,
  PROJECT_ID,
  REGION,
  publicBase,
} from './config.js';
import { draftIssue } from './draft.js';
import { HttpError, applyCors, clientIp, readBody, sendJson, time } from './http.js';
import { confirmHtml, deliver, humanUnsubscribeUrl, unsubscribeUrl } from './mail.js';
import { slugify } from './markdown.js';
import { geminiEnabled, transportMode } from './secrets.js';
import { processDueIssues, recordClick, recordOpen, sendIssue } from './send.js';
import { FieldValue, Timestamp, db } from './store.js';
import { hashToken, newToken, subscriberId } from './tokens.js';

const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const here = dirname(fileURLToPath(import.meta.url));

function normalize(pathname) {
  let path = pathname || '/';
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
  if (path.startsWith('/api/')) path = path.slice(4);
  else if (path === '/api') path = '/';
  return path || '/';
}

function match(method, path) {
  const routes = [
    ['GET', '/health', health],
    ['GET', '/openapi.yaml', openapi],
    ['POST', '/subscribe', subscribe],
    ['GET', '/confirm', confirm],
    ['GET', '/unsubscribe', unsubscribe],
    ['POST', '/unsubscribe', unsubscribe],
    ['GET', '/archive', archive],
    ['GET', '/archive/:slug', archiveOne],
    ['POST', '/draft', draft],
    ['GET', '/subscribers/count', subscriberCount],
    ['GET', '/subscribers', subscribers],
    ['GET', '/issues', issues],
    ['POST', '/issues', createIssue],
    ['GET', '/issues/:id', issueOne],
    ['PATCH', '/issues/:id', updateIssue],
    ['POST', '/issues/:id/send', sendOne],
    ['POST', '/issues/:id/schedule', scheduleOne],
    ['POST', '/scheduled/process', processScheduled],
    ['GET', '/stats', stats],
    ['GET', '/stats/:issueId', stats],
    ['GET', '/dry-runs', dryRuns],
    ['GET', '/track/open/:token', trackOpen],
    ['GET', '/track/click/:token', trackClick],
  ];
  for (const [routeMethod, routePath, handler] of routes) {
    if (routeMethod !== method) continue;
    const names = [];
    const pattern = routePath.replace(/:([^/]+)/g, (_all, name) => {
      names.push(name);
      return '([^/]+)';
    });
    const found = new RegExp(`^${pattern}$`).exec(path);
    if (!found) continue;
    const params = {};
    names.forEach((name, index) => {
      params[name] = decodeURIComponent(found[index + 1]);
    });
    return { handler, params };
  }
  return null;
}

function zeroStats() {
  return {
    recipients: 0,
    sent: 0,
    failed: 0,
    opens: 0,
    uniqueOpens: 0,
    clicks: 0,
    uniqueClicks: 0,
    unsubscribes: 0,
  };
}

function issueJson(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    title: data.title,
    slug: data.slug,
    subject: data.subject,
    preheader: data.preheader || '',
    dek: data.dek || '',
    bodyMarkdown: data.bodyMarkdown || '',
    status: data.status,
    createdBy: data.createdBy || null,
    createdAt: time(data.createdAt),
    updatedAt: time(data.updatedAt),
    scheduledAt: time(data.scheduledAt),
    sentAt: time(data.sentAt),
    physicalAddress: data.physicalAddress || ADDRESS_LINES,
    stats: data.stats || zeroStats(),
    gemini: data.gemini || null,
    lastError: data.lastError || null,
  };
}

function subscriberJson(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    email: data.email,
    status: data.status,
    consentAt: time(data.consentAt),
    consentText: data.consentText,
    confirmedAt: time(data.confirmedAt),
    unsubscribedAt: time(data.unsubscribedAt),
    source: data.source || 'web',
    createdAt: time(data.createdAt),
  };
}

function cleanEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  if (!EMAIL.test(email) || email.length > 320) {
    throw new HttpError(400, 'Enter an email address like name@studio.com.', 'invalid_email');
  }
  return email;
}

async function countStatus(status) {
  const snap = await db.collection('subscribers').where('status', '==', status).count().get();
  return snap.data().count;
}

async function health(_req, res) {
  sendJson(res, 200, {
    ok: true,
    service: 'artometrics-newsletter',
    projectId: PROJECT_ID,
    region: REGION,
    transport: transportMode(),
    gemini: geminiEnabled() ? 'ready' : 'off',
    address: ADDRESS_LINES,
    addressIsPlaceholder: ADDRESS_IS_PLACEHOLDER,
    consentText: CONSENT_TEXT,
  });
}

async function openapi(_req, res) {
  const spec = readFileSync(join(here, '..', 'openapi.yaml'), 'utf8');
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/yaml; charset=utf-8');
  res.end(spec);
}

async function subscribe(req, res) {
  const body = await readBody(req);
  if (body.website) {
    sendJson(res, 200, { ok: true, message: GENERIC_SUBSCRIBE });
    return;
  }
  if (body.consent !== true) {
    throw new HttpError(400, 'Check the consent box before joining the list.', 'consent_required');
  }
  const email = cleanEmail(body.email);
  const id = subscriberId(email);
  const ref = db.collection('subscribers').doc(id);
  const existing = await ref.get();
  const current = existing.exists ? existing.data() : null;
  if (current?.status === 'confirmed') {
    sendJson(res, 200, { ok: true, message: GENERIC_SUBSCRIBE });
    return;
  }
  if (current?.status === 'pending') {
    const last = current.lastConfirmSentAt?.toMillis?.() || 0;
    if (Date.now() - last < 60_000) {
      sendJson(res, 200, { ok: true, message: GENERIC_SUBSCRIBE });
      return;
    }
  }
  const confirmToken = newToken();
  const unsubToken = current?.unsubscribeToken || newToken();
  await ref.set(
    {
      email,
      status: 'pending',
      consentAt: FieldValue.serverTimestamp(),
      consentText: CONSENT_TEXT,
      consentIp: clientIp(req),
      consentUserAgent: String(req.headers['user-agent'] || '').slice(0, 240),
      createdAt: current?.createdAt || FieldValue.serverTimestamp(),
      confirmedAt: null,
      unsubscribedAt: null,
      confirmToken,
      confirmTokenHash: hashToken(confirmToken),
      unsubscribeToken: unsubToken,
      unsubscribeTokenHash: hashToken(unsubToken),
      lastConfirmSentAt: FieldValue.serverTimestamp(),
      source: String(body.source || 'web').slice(0, 40),
    },
    { merge: true },
  );
  const confirmUrl = `${publicBase()}/confirm?token=${encodeURIComponent(confirmToken)}`;
  const humanUnsub = humanUnsubscribeUrl(unsubToken);
  await deliver({
    to: email,
    subject: 'Confirm your Artometrics letter',
    html: confirmHtml({ confirmUrl, unsubscribeUrl: humanUnsub }),
    text: `Confirm your Artometrics letter: ${confirmUrl}\n\n${ADDRESS_LINES.join('\n')}\n\nUnsubscribe: ${humanUnsub}`,
    headers: {
      'List-Unsubscribe': `<${unsubscribeUrl(unsubToken)}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
    kind: 'confirm',
    issueId: null,
  });
  await db.collection('events').add({
    type: 'subscribe',
    subscriberId: id,
    issueId: null,
    createdAt: FieldValue.serverTimestamp(),
    url: null,
  });
  sendJson(res, 200, { ok: true, message: GENERIC_SUBSCRIBE });
}

async function findByHash(field, token) {
  if (!token) return null;
  const snap = await db.collection('subscribers').where(field, '==', hashToken(token)).limit(1).get();
  return snap.empty ? null : snap.docs[0];
}

async function confirm(req, res, _params, url) {
  const doc = await findByHash('confirmTokenHash', url.searchParams.get('token'));
  if (!doc) throw new HttpError(400, 'That confirmation link is not valid.', 'bad_token');
  const data = doc.data();
  if (data.status === 'unsubscribed') {
    throw new HttpError(409, 'This address has left the list. Join again from the signup form.', 'unsubscribed');
  }
  if (data.status !== 'confirmed') {
    await doc.ref.update({
      status: 'confirmed',
      confirmedAt: FieldValue.serverTimestamp(),
    });
    await db.collection('events').add({
      type: 'confirm',
      subscriberId: doc.id,
      issueId: null,
      createdAt: FieldValue.serverTimestamp(),
      url: null,
    });
  }
  sendJson(res, 200, { ok: true, status: 'confirmed', email: data.email });
}

async function unsubscribe(req, res, _params, url) {
  const body = req.method === 'POST' ? await readBody(req) : {};
  const token = url.searchParams.get('token') || body.token;
  if (req.method === 'POST' && body['List-Unsubscribe'] && body['List-Unsubscribe'] !== 'One-Click') {
    throw new HttpError(400, 'One-click unsubscribe was not set.', 'bad_unsubscribe');
  }
  const doc = await findByHash('unsubscribeTokenHash', token);
  if (!doc) throw new HttpError(400, 'That unsubscribe link is not valid.', 'bad_token');
  const data = doc.data();
  if (data.status !== 'unsubscribed') {
    await doc.ref.update({
      status: 'unsubscribed',
      unsubscribedAt: FieldValue.serverTimestamp(),
    });
    await db.collection('events').add({
      type: 'unsubscribe',
      subscriberId: doc.id,
      issueId: null,
      createdAt: FieldValue.serverTimestamp(),
      url: null,
    });
  }
  sendJson(res, 200, { ok: true, status: 'unsubscribed' });
}

async function archive(_req, res) {
  const snap = await db.collection('issues').where('status', '==', 'sent').orderBy('sentAt', 'desc').limit(50).get();
  sendJson(res, 200, { issues: snap.docs.map(issueJson) });
}

async function archiveOne(_req, res, params) {
  const snap = await db.collection('issues').where('slug', '==', params.slug).limit(5).get();
  const sent = snap.docs.find((doc) => doc.data().status === 'sent');
  if (!sent) throw new HttpError(404, 'That letter is not on the shelf.', 'not_found');
  sendJson(res, 200, { issue: issueJson(sent) });
}

async function draft(req, res) {
  const actor = await requireAdmin(req);
  const body = await readBody(req);
  const drafted = await draftIssue({ notes: body.notes, url: body.url });
  let issue = null;
  if (body.save === true) {
    issue = await writeIssue(actor, drafted);
  }
  sendJson(res, 200, { draft: drafted, issue });
}

async function subscriberCount(req, res, _params, url) {
  await requireAdmin(req);
  const status = url.searchParams.get('status');
  if (status && !['pending', 'confirmed', 'unsubscribed'].includes(status)) {
    throw new HttpError(400, 'Status must be pending, confirmed, or unsubscribed.', 'bad_status');
  }
  if (status) {
    const count = await countStatus(status);
    sendJson(res, 200, { status, count });
    return;
  }
  const [pending, confirmed, unsubscribed] = await Promise.all([
    countStatus('pending'),
    countStatus('confirmed'),
    countStatus('unsubscribed'),
  ]);
  sendJson(res, 200, {
    pending,
    confirmed,
    unsubscribed,
    total: pending + confirmed + unsubscribed,
  });
}

async function subscribers(req, res, _params, url) {
  await requireAdmin(req);
  const status = url.searchParams.get('status');
  let query = db.collection('subscribers').limit(200);
  if (status) {
    if (!['pending', 'confirmed', 'unsubscribed'].includes(status)) {
      throw new HttpError(400, 'Status must be pending, confirmed, or unsubscribed.', 'bad_status');
    }
    query = db.collection('subscribers').where('status', '==', status).limit(200);
  }
  const snap = await query.get();
  const people = snap.docs.map(subscriberJson).sort((a, b) => a.email.localeCompare(b.email));
  sendJson(res, 200, { subscribers: people });
}

async function issues(req, res) {
  await requireAdmin(req);
  const snap = await db.collection('issues').orderBy('updatedAt', 'desc').limit(50).get();
  sendJson(res, 200, { issues: snap.docs.map(issueJson) });
}

function issueFields(input, actor) {
  const title = String(input.title || '').trim();
  if (!title) throw new HttpError(400, 'Give the letter a title.', 'invalid_issue');
  const subject = String(input.subject || title).trim();
  return {
    title: title.slice(0, 180),
    slug: slugify(input.slug || title),
    subject: subject.slice(0, 240),
    preheader: String(input.preheader || '').slice(0, 240),
    dek: String(input.dek || '').slice(0, 400),
    bodyMarkdown: String(input.bodyMarkdown || '').slice(0, 100000),
    createdBy: actor.email,
  };
}

async function writeIssue(actor, input) {
  const fields = issueFields(input, actor);
  const taken = await db.collection('slugs').doc(fields.slug).get();
  if (taken.exists) throw new HttpError(409, 'That slug is already on a letter.', 'slug_taken');
  const ref = db.collection('issues').doc();
  await ref.set({
    ...fields,
    status: 'draft',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    scheduledAt: null,
    sentAt: null,
    stats: zeroStats(),
    gemini: input.generator ? { generator: input.generator } : null,
    physicalAddress: ADDRESS_LINES,
  });
  await db.collection('slugs').doc(fields.slug).set({ issueId: ref.id });
  const saved = await ref.get();
  return issueJson(saved);
}

async function createIssue(req, res) {
  const actor = await requireAdmin(req);
  const body = await readBody(req);
  sendJson(res, 201, { issue: await writeIssue(actor, body) });
}

async function issueOne(req, res, params) {
  await requireAdmin(req);
  const snap = await db.collection('issues').doc(params.id).get();
  if (!snap.exists) throw new HttpError(404, 'That letter is not on the desk.', 'not_found');
  sendJson(res, 200, { issue: issueJson(snap) });
}

async function updateIssue(req, res, params) {
  await requireAdmin(req);
  const ref = db.collection('issues').doc(params.id);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpError(404, 'That letter is not on the desk.', 'not_found');
  const current = snap.data();
  if (!['draft', 'scheduled'].includes(current.status)) {
    throw new HttpError(409, 'Sent letters stay as they were mailed.', 'locked');
  }
  const body = await readBody(req);
  const title = String(body.title ?? current.title).trim().slice(0, 180);
  if (!title) throw new HttpError(400, 'Give the letter a title.', 'invalid_issue');
  await ref.update({
    title,
    subject: String(body.subject ?? current.subject).trim().slice(0, 240),
    preheader: String(body.preheader ?? current.preheader ?? '').slice(0, 240),
    dek: String(body.dek ?? current.dek ?? '').slice(0, 400),
    bodyMarkdown: String(body.bodyMarkdown ?? current.bodyMarkdown ?? '').slice(0, 100000),
    updatedAt: FieldValue.serverTimestamp(),
  });
  const saved = await ref.get();
  sendJson(res, 200, { issue: issueJson(saved) });
}

async function sendOne(req, res, params) {
  const actor = await requireAdmin(req);
  const result = await sendIssue(params.id, actor.email);
  sendJson(res, 200, result);
}

async function scheduleOne(req, res, params) {
  const actor = await requireAdmin(req);
  const body = await readBody(req);
  const when = new Date(body.scheduledAt);
  if (Number.isNaN(when.getTime())) {
    throw new HttpError(400, 'Choose a date and time to send.', 'bad_schedule');
  }
  const ref = db.collection('issues').doc(params.id);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpError(404, 'That letter is not on the desk.', 'not_found');
  if (!['draft', 'scheduled'].includes(snap.data().status)) {
    throw new HttpError(409, 'This letter can no longer be scheduled.', 'locked');
  }
  await ref.update({
    status: 'scheduled',
    scheduledAt: Timestamp.fromDate(when),
    updatedAt: FieldValue.serverTimestamp(),
    scheduledBy: actor.email,
  });
  const saved = await ref.get();
  sendJson(res, 200, { issue: issueJson(saved) });
}

async function processScheduled(req, res) {
  await requireAdmin(req);
  const results = await processDueIssues();
  sendJson(res, 200, { results });
}

async function stats(req, res, params) {
  await requireAdmin(req);
  const [pending, confirmed, unsubscribed] = await Promise.all([
    countStatus('pending'),
    countStatus('confirmed'),
    countStatus('unsubscribed'),
  ]);
  let query = db.collection('issues').orderBy('updatedAt', 'desc').limit(50);
  if (params.issueId) {
    const one = await db.collection('issues').doc(params.issueId).get();
    if (!one.exists) throw new HttpError(404, 'That letter is not on the desk.', 'not_found');
    sendJson(res, 200, {
      subscribers: { pending, confirmed, unsubscribed },
      issue: issueJson(one),
    });
    return;
  }
  const snap = await query.get();
  sendJson(res, 200, {
    subscribers: { pending, confirmed, unsubscribed },
    issues: snap.docs.map((doc) => {
      const issue = issueJson(doc);
      return {
        id: issue.id,
        title: issue.title,
        slug: issue.slug,
        status: issue.status,
        sentAt: issue.sentAt,
        stats: issue.stats,
      };
    }),
  });
}

async function dryRuns(req, res) {
  await requireAdmin(req);
  const snap = await db.collection('dryRuns').orderBy('createdAt', 'desc').limit(40).get();
  sendJson(res, 200, {
    dryRuns: snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        to: data.to,
        subject: data.subject,
        kind: data.kind,
        issueId: data.issueId,
        transport: data.transport,
        createdAt: time(data.createdAt),
        headers: data.headers || {},
        text: data.text || '',
        html: data.html || '',
      };
    }),
  });
}

async function trackOpen(_req, res, params) {
  try {
    await recordOpen(params.token);
  } catch (error) {
    console.error('open tracking failed', error);
  }
  res.statusCode = 200;
  res.setHeader('Content-Type', 'image/gif');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.end(PIXEL);
}

function safeHttpUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

async function trackClick(_req, res, params, url) {
  const target = safeHttpUrl(url.searchParams.get('u'));
  if (!target) throw new HttpError(400, 'That link cannot be followed.', 'bad_url');
  try {
    await recordClick(params.token, target);
  } catch (error) {
    console.error('click tracking failed', error);
  }
  res.statusCode = 302;
  res.setHeader('Location', target);
  res.setHeader('Cache-Control', 'no-store');
  res.end();
}

export async function handleApi(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  const url = new URL(req.url || '/', 'http://localhost');
  const path = normalize(url.pathname);
  try {
    const route = match(req.method || 'GET', path);
    if (!route) throw new HttpError(404, 'That path is not on the desk.', 'not_found');
    await route.handler(req, res, route.params, url);
  } catch (error) {
    if (error instanceof HttpError) {
      sendJson(res, error.status, { error: { code: error.code, message: error.message } });
      return;
    }
    console.error(error);
    sendJson(res, 500, {
      error: { code: 'internal', message: 'Something went wrong on the desk.' },
    });
  }
}


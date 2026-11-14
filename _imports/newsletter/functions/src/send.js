import { ADDRESS_LINES } from './config.js';
import { HttpError } from './http.js';
import {
  clickBase,
  deliver,
  deliverBatch,
  letterText,
  humanUnsubscribeUrl,
  openPixelUrl,
  renderLetterHtml,
  rewriteLinks,
  unsubscribeUrl,
} from './mail.js';
import { renderMarkdown } from './markdown.js';
import { FieldValue, Timestamp, db } from './store.js';
import { newToken } from './tokens.js';

const BATCH = 50;

export async function eachConfirmed(fn) {
  let last = null;
  for (;;) {
    let query = db.collection('subscribers').where('status', '==', 'confirmed').orderBy('__name__').limit(200);
    if (last) query = query.startAfter(last);
    const snap = await query.get();
    if (snap.empty) break;
    for (const doc of snap.docs) await fn(doc);
    last = snap.docs[snap.docs.length - 1];
    if (snap.size < 200) break;
  }
}

export async function sendIssue(issueId, actorEmail) {
  const ref = db.collection('issues').doc(issueId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpError(404, 'That letter is not on the desk.', 'not_found');
  const issue = snap.data();
  if (issue.status === 'sent') {
    throw new HttpError(409, 'This letter was already sent.', 'already_sent');
  }
  if (!['draft', 'scheduled', 'sending', 'failed'].includes(issue.status)) {
    throw new HttpError(409, `This letter is ${issue.status}.`, 'bad_status');
  }
  await ref.update({
    status: 'sending',
    updatedAt: FieldValue.serverTimestamp(),
    lastError: null,
  });

  const pending = [];
  await eachConfirmed(async (subscriber) => {
    const sendId = `${issueId}_${subscriber.id}`;
    const existing = await db.collection('sends').doc(sendId).get();
    if (existing.exists) return;
    pending.push(subscriber);
  });

  const alreadySent = (
    await db.collection('sends').where('issueId', '==', issueId).count().get()
  ).data().count;

  if (pending.length === 0 && alreadySent === 0) {
    await ref.update({
      status: issue.status === 'scheduled' ? 'scheduled' : 'draft',
      updatedAt: FieldValue.serverTimestamp(),
    });
    throw new HttpError(409, 'The confirmed list is empty.', 'empty_list');
  }

  let sent = alreadySent;
  let failed = 0;
  let transport = 'dry-run';
  const bodyHtml = renderMarkdown(issue.bodyMarkdown || '');

  for (let index = 0; index < pending.length; index += BATCH) {
    const slice = pending.slice(index, index + BATCH);
    const messages = [];
    const prepared = [];
    for (const subscriber of slice) {
      const data = subscriber.data();
      const token = newToken();
      const sendId = `${issueId}_${subscriber.id}`;
      const unsub = unsubscribeUrl(data.unsubscribeToken);
      const humanUnsub = humanUnsubscribeUrl(data.unsubscribeToken);
      const trackedHtml = rewriteLinks(bodyHtml, clickBase(token));
      const html = renderLetterHtml({
        title: issue.title,
        dek: issue.dek,
        preheader: issue.preheader,
        bodyHtml: trackedHtml,
        unsubscribeUrl: humanUnsub,
        openPixelUrl: openPixelUrl(token),
      });
      const text = letterText({
        title: issue.title,
        dek: issue.dek,
        bodyMarkdown: issue.bodyMarkdown,
        unsubscribeUrl: humanUnsub,
      });
      const headers = {
        'List-Unsubscribe': `<${unsub}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      };
      messages.push({
        to: data.email,
        subject: issue.subject || issue.title,
        html,
        text,
        headers,
        kind: 'issue',
        issueId,
      });
      prepared.push({ sendId, subscriberId: subscriber.id, email: data.email, token });
    }
    try {
      const result = await deliverBatch(messages);
      transport = result.transport;
      const batch = db.batch();
      for (const item of prepared) {
        batch.set(db.collection('sends').doc(item.sendId), {
          issueId,
          subscriberId: item.subscriberId,
          email: item.email,
          openToken: item.token,
          openCount: 0,
          clickCount: 0,
          openedAt: null,
          clickedAt: null,
          sentAt: FieldValue.serverTimestamp(),
        });
        batch.set(db.collection('events').doc(), {
          type: 'send',
          issueId,
          subscriberId: item.subscriberId,
          createdAt: FieldValue.serverTimestamp(),
          url: null,
        });
      }
      await batch.commit();
      sent += prepared.length;
    } catch (error) {
      failed += slice.length;
      await ref.update({
        lastError: String(error.message || error).slice(0, 500),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  }

  const status = sent > 0 ? 'sent' : 'failed';
  await ref.update({
    status,
    sentAt: status === 'sent' ? FieldValue.serverTimestamp() : null,
    updatedAt: FieldValue.serverTimestamp(),
    sentBy: actorEmail || null,
    physicalAddress: ADDRESS_LINES,
    'stats.recipients': sent + failed,
    'stats.sent': sent,
    'stats.failed': failed,
  });
  return { id: issueId, status, sent, failed, transport };
}

export async function processDueIssues() {
  const now = Timestamp.now();
  const snap = await db
    .collection('issues')
    .where('status', '==', 'scheduled')
    .where('scheduledAt', '<=', now)
    .get();
  const results = [];
  for (const doc of snap.docs) {
    try {
      results.push(await sendIssue(doc.id, 'scheduler'));
    } catch (error) {
      results.push({ id: doc.id, error: error.message || String(error) });
    }
  }
  return results;
}

export async function recordOpen(token) {
  if (!token) return;
  const snap = await db.collection('sends').where('openToken', '==', token).limit(1).get();
  if (snap.empty) return;
  const sendRef = snap.docs[0].ref;
  const issueRef = db.collection('issues').doc(snap.docs[0].data().issueId);
  await db.runTransaction(async (tx) => {
    const send = await tx.get(sendRef);
    if (!send.exists) return;
    const data = send.data();
    const first = !data.openedAt;
    tx.update(sendRef, {
      openedAt: data.openedAt || FieldValue.serverTimestamp(),
      openCount: (data.openCount || 0) + 1,
    });
    tx.update(issueRef, {
      'stats.opens': FieldValue.increment(1),
      ...(first ? { 'stats.uniqueOpens': FieldValue.increment(1) } : {}),
    });
    const eventRef = db.collection('events').doc();
    tx.set(eventRef, {
      type: 'open',
      issueId: data.issueId,
      subscriberId: data.subscriberId,
      createdAt: FieldValue.serverTimestamp(),
      url: null,
    });
  });
}

export async function recordClick(token, url) {
  const snap = await db.collection('sends').where('openToken', '==', token).limit(1).get();
  if (snap.empty) return false;
  const sendRef = snap.docs[0].ref;
  const issueRef = db.collection('issues').doc(snap.docs[0].data().issueId);
  await db.runTransaction(async (tx) => {
    const send = await tx.get(sendRef);
    if (!send.exists) return;
    const data = send.data();
    const first = !data.clickedAt;
    tx.update(sendRef, {
      clickedAt: data.clickedAt || FieldValue.serverTimestamp(),
      clickCount: (data.clickCount || 0) + 1,
    });
    tx.update(issueRef, {
      'stats.clicks': FieldValue.increment(1),
      ...(first ? { 'stats.uniqueClicks': FieldValue.increment(1) } : {}),
    });
    tx.set(db.collection('events').doc(), {
      type: 'click',
      issueId: data.issueId,
      subscriberId: data.subscriberId,
      createdAt: FieldValue.serverTimestamp(),
      url,
    });
  });
  return true;
}

export async function deliverOne(message) {
  return deliver(message);
}

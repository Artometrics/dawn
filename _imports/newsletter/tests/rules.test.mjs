import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');

const env = await initializeTestEnvironment({
  projectId: 'newsletter-510519',
  firestore: { rules },
});

function issue(overrides = {}) {
  const now = Timestamp.fromDate(new Date('2026-04-02T15:00:00Z'));
  return {
    title: 'Field notes',
    slug: 'field-notes',
    subject: 'Field notes',
    preheader: '',
    dek: 'A short dek.',
    bodyMarkdown: 'The first paragraph.',
    status: 'draft',
    createdBy: 'team@artometrics.com',
    createdAt: now,
    updatedAt: now,
    scheduledAt: null,
    sentAt: null,
    gemini: null,
    physicalAddress: [
      'Artometrics',
      '548 Market Street, PMB 00000',
      'San Francisco, CA 94104',
      'United States',
    ],
    stats: {
      recipients: 0,
      sent: 0,
      failed: 0,
      opens: 0,
      uniqueOpens: 0,
      clicks: 0,
      uniqueClicks: 0,
      unsubscribes: 0,
    },
    ...overrides,
  };
}

function asAdmin(email = 'team@artometrics.com') {
  return env.authenticatedContext(`uid-${email}`, { email, email_verified: true }).firestore();
}

test.beforeEach(async () => {
  await env.clearFirestore();
});

test.after(async () => {
  await env.cleanup();
});

test('strangers and anonymous clients cannot read the list or drafts', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'subscribers', 'one'), { email: 'reader@example.com', status: 'confirmed' });
    await setDoc(doc(ctx.firestore(), 'issues', 'draft'), issue());
    await setDoc(doc(ctx.firestore(), 'dryRuns', 'log'), { to: 'reader@example.com', subject: 'Confirm' });
  });
  const anon = env.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(anon, 'subscribers', 'one')));
  await assertFails(getDoc(doc(anon, 'issues', 'draft')));
  await assertFails(getDoc(doc(anon, 'dryRuns', 'log')));
  const stranger = env.authenticatedContext('stranger', {
    email: 'stranger@example.com',
    email_verified: true,
  }).firestore();
  await assertFails(getDoc(doc(stranger, 'subscribers', 'one')));
  await assertFails(getDocs(query(collection(stranger, 'issues'), orderBy('updatedAt', 'desc'))));
});

test('a sent letter is public and a draft is not', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(
      doc(ctx.firestore(), 'issues', 'sent'),
      issue({
        slug: 'sent-letter',
        status: 'sent',
        sentAt: Timestamp.fromDate(new Date('2026-04-03T15:00:00Z')),
        stats: {
          recipients: 2,
          sent: 2,
          failed: 0,
          opens: 1,
          uniqueOpens: 1,
          clicks: 0,
          uniqueClicks: 0,
          unsubscribes: 0,
        },
      }),
    );
    await setDoc(doc(ctx.firestore(), 'issues', 'draft'), issue({ slug: 'still-draft' }));
  });
  const anon = env.unauthenticatedContext().firestore();
  await assertSucceeds(getDoc(doc(anon, 'issues', 'sent')));
  await assertSucceeds(
    getDocs(query(collection(anon, 'issues'), where('status', '==', 'sent'), orderBy('sentAt', 'desc'))),
  );
  await assertFails(getDoc(doc(anon, 'issues', 'draft')));
});

test('allowlisted editors can draft and cannot publish or touch the list', async () => {
  const db = asAdmin();
  await assertSucceeds(setDoc(doc(db, 'issues', 'new'), issue()));
  await assertSucceeds(setDoc(doc(db, 'slugs', 'field-notes'), { issueId: 'new' }));
  await assertSucceeds(
    updateDoc(doc(db, 'issues', 'new'), {
      title: 'Field notes, revised',
      updatedAt: Timestamp.fromDate(new Date('2026-04-02T16:00:00Z')),
    }),
  );
  await assertFails(updateDoc(doc(db, 'issues', 'new'), { status: 'sent' }));
  await assertFails(
    updateDoc(doc(db, 'issues', 'new'), {
      stats: {
        recipients: 9,
        sent: 9,
        failed: 0,
        opens: 0,
        uniqueOpens: 0,
        clicks: 0,
        uniqueClicks: 0,
        unsubscribes: 0,
      },
    }),
  );
  await assertFails(deleteDoc(doc(db, 'issues', 'new')));
  await assertFails(setDoc(doc(db, 'subscribers', 'x'), { email: 'a@b.co', status: 'confirmed' }));
  await assertFails(getDoc(doc(db, 'subscribers', 'x')));
  const kyle = asAdmin('kylesmcauliffe@gmail.com');
  await assertSucceeds(getDoc(doc(kyle, 'issues', 'new')));
});

test('an unverified allowlisted token cannot write', async () => {
  const db = env.authenticatedContext('unverified', {
    email: 'team@artometrics.com',
    email_verified: false,
  }).firestore();
  await assertFails(setDoc(doc(db, 'issues', 'nope'), issue()));
});

test('scheduling keeps the slug and the counts', async () => {
  const db = asAdmin();
  await assertSucceeds(setDoc(doc(db, 'issues', 'plan'), issue({ slug: 'plan' })));
  await assertSucceeds(
    updateDoc(doc(db, 'issues', 'plan'), {
      status: 'scheduled',
      scheduledAt: Timestamp.fromDate(new Date('2026-05-01T15:00:00Z')),
      updatedAt: Timestamp.fromDate(new Date('2026-04-02T16:00:00Z')),
    }),
  );
  await assertFails(updateDoc(doc(db, 'issues', 'plan'), { slug: 'renamed' }));
});

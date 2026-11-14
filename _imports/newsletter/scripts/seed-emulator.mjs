process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8181';
process.env.GCLOUD_PROJECT = 'newsletter-510519';

const { FieldValue, Timestamp } = await import('firebase-admin/firestore');
const { db } = await import('../functions/src/store.js');
const { ADDRESS_LINES } = await import('../functions/src/config.js');

const id = 'specimen-letter';
await db.collection('issues').doc(id).set({
  title: 'What this letter is',
  slug: 'what-this-letter-is',
  subject: 'What this letter is',
  preheader: 'A specimen on the local desk. It was not mailed.',
  dek: 'A specimen, so the shelf is not empty while you look around. It was not mailed.',
  bodyMarkdown: [
    'This page is the public copy of a letter after it has been sent.',
    '',
    'Joining the list takes a confirmation click. The time of that consent is stored. Every letter carries a postal address and a one-click unsubscribe.',
    '',
    'On this machine the transport is a dry run. Nothing in the log has been mailed.',
  ].join('\n'),
  status: 'sent',
  createdBy: 'team@artometrics.com',
  createdAt: FieldValue.serverTimestamp(),
  updatedAt: FieldValue.serverTimestamp(),
  scheduledAt: null,
  sentAt: Timestamp.fromDate(new Date('2026-04-02T15:00:00Z')),
  gemini: null,
  physicalAddress: ADDRESS_LINES,
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
});
await db.collection('slugs').doc('what-this-letter-is').set({ issueId: id });
console.log('Seeded specimen letter what-this-letter-is');

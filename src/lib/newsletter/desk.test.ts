import assert from 'node:assert/strict';
import test from 'node:test';
import { encodeDesk, decodeDesk, DESK_PAYLOAD_MAX } from '../desks/store';
import { renderMarkdown, markdownToText, slugify } from './markdown';
import {
  ADDRESS_LINES,
  CONSENT_TEXT,
  EMPTY_NEWSLETTER,
  SEND_BATCH_CAP,
  SIGNUP_MESSAGE,
  confirmSubscriber,
  newsletterStats,
  parseNewsletter,
  recordClick,
  recordOpen,
  saveIssue,
  sendIssue,
  subscribe,
  unsubscribeSubscriber,
} from './desk';

const now = 1_763_000_000_000;

test('markdown keeps links and escapes html', () => {
  const html = renderMarkdown('Hello <script>\n\nSee [the studio](https://artometrics.com).\n\n- one\n- two');
  assert.match(html, /<a href="https:\/\/artometrics.com">the studio<\/a>/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /<ul><li>one<\/li><li>two<\/li><\/ul>/);
  assert.equal(markdownToText('**Bold** and [a](https://example.com)'), 'Bold and a (https://example.com)');
  assert.equal(slugify('The Letter, from the Studio!'), 'the-letter-from-the-studio');
  assert.equal(slugify(''), 'letter');
});

test('signup stores consent, hides whether the address exists, and confirms in a second step', () => {
  const refused = subscribe(EMPTY_NEWSLETTER, { email: 'reader@example.com', consent: false, now });
  assert.equal(refused.ok, false);
  const first = subscribe(EMPTY_NEWSLETTER, { email: ' Reader@Example.com ', consent: true, now });
  assert.equal(first.ok, true);
  if (!first.ok) return;
  assert.equal(first.message, SIGNUP_MESSAGE);
  assert.equal(first.data.subscribers[0].status, 'pending');
  assert.equal(first.data.subscribers[0].consentText, CONSENT_TEXT);
  assert.equal(first.data.subscribers[0].consentAt, now);
  const again = subscribe(first.data, { email: 'reader@example.com', consent: true, now: now + 1 });
  assert.equal(again.ok, true);
  if (!again.ok) return;
  assert.equal(again.message, SIGNUP_MESSAGE);
  assert.equal(again.data.subscribers.length, 1);
  const confirmed = confirmSubscriber(first.data, first.data.subscribers[0].confirmToken, now + 2);
  assert.equal(confirmed.ok, true);
  if (!confirmed.ok) return;
  assert.equal(confirmed.data.subscribers[0].status, 'confirmed');
  const left = unsubscribeSubscriber(confirmed.data, confirmed.data.subscribers[0].unsubToken);
  assert.equal(left.ok, true);
  if (!left.ok) return;
  assert.equal(left.data.subscribers[0].status, 'unsubscribed');
  assert.equal(confirmSubscriber(left.data, first.data.subscribers[0].confirmToken, now).ok, false);
});

test('a send stays on the desk, caps the batch, and counts each reader once', () => {
  let data = EMPTY_NEWSLETTER;
  const saved = saveIssue(data, { title: 'November', subject: 'November', dek: 'A note', body: 'Hello **there**' }, now);
  assert.equal(saved.ok, true);
  if (!saved.ok) return;
  data = saved.data;
  const blocked = sendIssue(data, saved.issue.id, now);
  assert.equal(blocked.ok, false);
  for (let i = 0; i < SEND_BATCH_CAP + 1; i += 1) {
    const joined = subscribe(data, { email: `r${i}@example.com`, consent: true, now });
    assert.equal(joined.ok, true);
    if (!joined.ok) return;
    data = confirmSubscriber(joined.data, joined.data.subscribers[0].confirmToken, now).data;
  }
  const sent = sendIssue(data, saved.issue.id, now + 5);
  assert.equal(sent.ok, true);
  if (!sent.ok) return;
  assert.equal(sent.send.dryRun, true);
  assert.equal(sent.send.recipients, SEND_BATCH_CAP);
  assert.equal(sent.send.heldBack, 1);
  assert.equal(sent.data.issues.find((issue) => issue.id === saved.issue.id)?.status, 'sent');
  const once = recordOpen(sent.data, sent.send.id, 'r_0123456789abcdef');
  const twice = recordOpen(once, sent.send.id, 'r_0123456789abcdef');
  const clicked = recordClick(twice, sent.send.issueId, 'r_0123456789abcdef');
  assert.equal(newsletterStats(clicked).opens, 1);
  assert.equal(newsletterStats(clicked).clicks, 1);
  assert.equal(parseNewsletter(JSON.parse(JSON.stringify(clicked))).sends[0].dryRun, true);
});

test('the desk envelope round-trips and refuses an oversized payload', () => {
  const envelope = encodeDesk('newsletter', EMPTY_NEWSLETTER, now);
  assert.ok(envelope);
  assert.deepEqual(decodeDesk(envelope, 'newsletter'), envelope);
  assert.equal(decodeDesk({ kind: 'crm', payload: '{}', updatedAt: now }, 'newsletter'), null);
  assert.equal(encodeDesk('newsletter', { pad: 'x'.repeat(DESK_PAYLOAD_MAX) }, now), null);
  assert.ok(ADDRESS_LINES.length >= 3);
});

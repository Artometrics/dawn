import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { ADDRESS_LINES, ADMIN_EMAILS, CONSENT_TEXT } from '../functions/src/config.js';
import { markdownToText, renderMarkdown, slugify } from '../functions/src/markdown.js';
import { ipIsBlocked } from '../functions/src/ssrf.js';

test('markdown keeps links and escapes html', () => {
  const html = renderMarkdown('Hello <script>\n\nSee [the studio](https://artometrics.com).\n\n- one\n- two');
  assert.match(html, /<a href="https:\/\/artometrics.com">the studio<\/a>/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /<ul><li>one<\/li><li>two<\/li><\/ul>/);
  assert.equal(markdownToText('**Bold** and [a](https://example.com)'), 'Bold and a (https://example.com)');
});

test('slugify is archive-safe', () => {
  assert.equal(slugify('The Letter, from the Studio!'), 'the-letter-from-the-studio');
  assert.equal(slugify(''), 'letter');
});

test('private and metadata addresses are blocked', () => {
  for (const ip of ['127.0.0.1', '10.1.1.1', '192.168.0.4', '172.16.0.1', '169.254.169.254', '::1', '0.0.0.0']) {
    assert.equal(ipIsBlocked(ip), true, ip);
  }
  assert.equal(ipIsBlocked('8.8.8.8'), false);
  assert.equal(ipIsBlocked('1.1.1.1'), false);
});

test('allowlist and address are the same in rules, mail, and the site', () => {
  const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
  const site = readFileSync(new URL('../web/src/lib/compliance.ts', import.meta.url), 'utf8');
  const spec = readFileSync(new URL('../functions/openapi.yaml', import.meta.url), 'utf8');
  for (const email of ADMIN_EMAILS) {
    assert.match(rules, new RegExp(email.replace('.', '\\.')));
    assert.match(site, new RegExp(email.replace('.', '\\.')));
  }
  for (const line of ADDRESS_LINES) {
    assert.match(site, new RegExp(line.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(site, new RegExp(CONSENT_TEXT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(spec, /\/subscribers\/count/);
  assert.match(spec, /\/issues\/\{id\}\/send/);
  assert.match(spec, /List-Unsubscribe/);
  assert.match(spec, /\/stats/);
});

test('transport stays dry-run when asked, even if a key is present', async () => {
  const previousDry = process.env.NEWSLETTER_DRY_RUN;
  const previousKey = process.env.RESEND_API_KEY;
  process.env.NEWSLETTER_DRY_RUN = '1';
  process.env.RESEND_API_KEY = 're_live_looking_key';
  const { transportMode } = await import('../functions/src/secrets.js');
  assert.equal(transportMode(), 'dry-run');
  process.env.NEWSLETTER_DRY_RUN = previousDry;
  process.env.RESEND_API_KEY = previousKey;
});

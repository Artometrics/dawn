import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';
import { decideBrowserTarget, isBlockedAddress, runApprovedBrowse, runFixtureBrowser } from './browser-job.ts';

const chrome = ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium'].find((item) => existsSync(item));

test('private hosts and unlisted public hosts are refused before any browser opens', async () => {
  assert.equal(decideBrowserTarget('http://127.0.0.1/', ['127.0.0.1']).allow, false);
  assert.equal(decideBrowserTarget('http://169.254.169.254/latest', []).allow, false);
  assert.equal(decideBrowserTarget('http://10.1.2.3/', ['10.1.2.3']).allow, false);
  assert.equal(decideBrowserTarget('http://192.168.1.1/', []).allow, false);
  assert.equal(decideBrowserTarget('file:///etc/passwd', ['localhost']).allow, false);
  assert.equal(decideBrowserTarget('https://user:pass@example.com/', ['example.com']).allow, false);
  const refused = decideBrowserTarget('https://example.com/', []);
  assert.equal(refused.allow, false);
  if (!refused.allow) assert.match(refused.reason, /refused/);
  assert.equal(decideBrowserTarget('https://example.com/docs', ['example.com']).allow, true);
  assert.equal(isBlockedAddress('8.8.8.8'), false);
  let lookups = 0;
  await assert.rejects(
    () => runApprovedBrowse('https://example.com/docs', ['example.com'], {
      connect: false,
      lookup: async () => { lookups += 1; return ['93.184.216.34']; },
    }),
    /not enabled/,
  );
  assert.equal(lookups, 1);
  await assert.rejects(
    () => runApprovedBrowse('https://example.com/', ['example.com'], {
      connect: true,
      lookup: async () => ['127.0.0.1'],
      chromeBin: chrome,
    }),
    /private/,
  );
});

test('Chrome clicks a locally served fixture and reads the DOM', { skip: chrome ? false : 'Chrome is not installed' }, async () => {
  const result = await runFixtureBrowser(chrome!);
  assert.equal(result.engine, 'chrome');
  assert.equal(result.clicked, true);
  assert.equal(result.title, 'Dawn fixture');
  assert.equal(result.text, 'collected');
  assert.ok(result.screenshotBytes > 500);
});

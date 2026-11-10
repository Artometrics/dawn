import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { appendChat, approveSend, deliverSend, draftSend, readChat, readLocalPage, readProjectFile, readSends, runBrowserJob, runSandboxFile, writeProjectFile, writeSandboxPage } from './local-desk.ts';

test('chat and a send draft survive a reopen and nothing is delivered', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'dawn-local-desk-'));
  try {
    await appendChat(root, 'letter-carrier', 'Hello from the visit');
    const again = await readChat(root, 'letter-carrier');
    assert.equal(again.length, 1);
    assert.equal(again[0].text, 'Hello from the visit');
    const draft = await draftSend(root, 'team@example.com', 'A note to review');
    assert.equal(draft.status, 'review');
    const sends = await readSends(root);
    assert.equal(sends.length, 1);
    assert.equal(sends[0].status, 'review');
    await writeSandboxPage(root, 'booth.html', '<button>Collect</button>');
    assert.match(await readLocalPage(root, 'booth.html'), /Collect/);
    await assert.rejects(() => readLocalPage(root, 'https://example.com'), /local sandbox/);
    await assert.rejects(() => writeSandboxPage(root, '../escape.html', 'no'), /short html/);
    await writeProjectFile(root, 'note.txt', 'kept');
    assert.equal(await readProjectFile(root, 'note.txt'), 'kept');
    await writeSandboxPage(root, 'booth.html', '<p>local</p>');
    assert.match(await runBrowserJob(root, 'booth.html'), /local/);
    await assert.rejects(() => runBrowserJob(root, 'https://example.com'), /refused/);
    await assert.rejects(() => writeProjectFile(root, '../note.txt', 'no'), /plain file/);
    await writeSandboxPage(root, 'fixture.js', "'ran'");
    assert.equal(await runSandboxFile(root, 'fixture.js'), 'ran');
    const held = await draftSend(root, 'review@localhost', 'hold');
    const approved = await approveSend(root, held.id);
    assert.equal(approved.status, 'approved');
    assert.deepEqual(deliverSend(approved), { delivered: false, reason: 'Outbound is off.' });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

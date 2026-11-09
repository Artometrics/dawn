import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { acceptMockMail, appendChat, approveSend, deliverSend, draftSend, readChat, readLocalPage, readMockMail, readProjectFile, readSends, runSandboxFile, writeProjectFile, writeSandboxPage } from './local-desk.ts';

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
    assert.match(await readLocalPage(root, 'booth.html'), /local/);
    await assert.rejects(() => writeProjectFile(root, '../note.txt', 'no'), /plain file/);
    await writeSandboxPage(root, 'fixture.js', 'process.exit(1)');
    await assert.rejects(() => runSandboxFile(root, 'fixture.js'), /not a security boundary/);
    const held = await draftSend(root, 'review@localhost', 'hold');
    const approved = await approveSend(root, held.id);
    assert.equal(approved.status, 'approved');
    assert.equal(deliverSend(approved).delivered, false);
    assert.equal(deliverSend(approved).transport, 'off');
    const mock = await acceptMockMail(root, approved);
    assert.equal(mock.transport, 'mock');
    assert.equal(mock.delivered, false);
    assert.match(mock.note, /Nothing was sent/);
    const mailbox = await readMockMail(root);
    assert.equal(mailbox.length, 1);
    assert.equal(mailbox[0].body, 'hold');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

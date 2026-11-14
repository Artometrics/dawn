import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

const testEnv = await initializeTestEnvironment({
  projectId: 'dawn-510519',
  firestore: {
    rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'),
    host: '127.0.0.1',
    port: 8080,
  },
});

await testEnv.clearFirestore();

const alice = testEnv.authenticatedContext('alice').firestore();
const bob = testEnv.authenticatedContext('bob').firestore();
const anon = testEnv.unauthenticatedContext().firestore();
const now = Date.now();

await assertFails(getDoc(doc(anon, 'rooms/hq')));

await assertSucceeds(setDoc(doc(alice, 'rooms/hq'), {
  title: 'hq',
  createdBy: 'alice',
  createdAt: serverTimestamp(),
}));

await assertFails(setDoc(doc(bob, 'rooms/hq'), {
  title: 'hq',
  createdBy: 'bob',
  createdAt: serverTimestamp(),
}));

await assertSucceeds(getDoc(doc(bob, 'rooms/hq')));

await assertSucceeds(addDoc(collection(alice, 'rooms/hq/messages'), {
  uid: 'alice',
  name: 'Ada',
  text: 'hello room',
  createdAt: serverTimestamp(),
}));

await assertFails(addDoc(collection(alice, 'rooms/hq/messages'), {
  uid: 'bob',
  name: 'Ada',
  text: 'spoofed',
  createdAt: serverTimestamp(),
}));

await assertFails(setDoc(doc(bob, 'rooms/hq/members/alice'), {
  name: 'Nope',
  joinedAt: serverTimestamp(),
}));

const approvalId = 'approval-trinity-post-01';
const approval = {
  id: approvalId,
  agentId: 'trinity',
  kind: 'post',
  summary: 'We opened the HQ',
  status: 'pending',
  createdAt: now,
  updatedAt: now,
};

await assertFails(setDoc(doc(alice, `users/alice/approvals/${approvalId}`), {
  ...approval,
  status: 'approved',
}));

await assertSucceeds(setDoc(doc(alice, `users/alice/approvals/${approvalId}`), approval));

await assertFails(addDoc(collection(alice, 'rooms/hq/messages'), {
  uid: 'alice',
  name: 'Ada',
  text: approval.summary,
  via: 'trinity',
  approvalId,
  createdAt: serverTimestamp(),
}));

await assertSucceeds(updateDoc(doc(alice, `users/alice/approvals/${approvalId}`), {
  status: 'approved',
  updatedAt: now + 5,
}));

const posted = await assertSucceeds(addDoc(collection(alice, 'rooms/hq/messages'), {
  uid: 'alice',
  name: 'Ada',
  text: approval.summary,
  via: 'trinity',
  approvalId,
  createdAt: serverTimestamp(),
}));

await assertFails(addDoc(collection(alice, 'rooms/hq/messages'), {
  uid: 'alice',
  name: 'Ada',
  text: 'A different sentence',
  via: 'trinity',
  approvalId,
  createdAt: serverTimestamp(),
}));

await assertSucceeds(getDoc(doc(bob, posted.path)));

const questId = 'quest-abc-1234567890';
await assertSucceeds(setDoc(doc(alice, `users/alice/quests/${questId}`), {
  id: questId,
  title: 'A small book',
  note: '',
  status: 'active',
  milestones: [
    { label: 'Start', done: false },
    { label: 'Shape', done: false },
    { label: 'Finish', done: false },
  ],
  createdAt: now,
  updatedAt: now,
}));

await assertFails(getDoc(doc(bob, `users/alice/quests/${questId}`)));
await assertSucceeds(getDoc(doc(alice, `users/alice/quests/${questId}`)));

const characterId = 'character-abc-1234567890';
const png = 'data:image/png;base64,iVBORw0KGgo=';
const character = {
  id: characterId,
  name: 'Napoleon',
  spec: {
    version: 1,
    id: 'napoleon',
    name: 'Napoleon',
    epithet: 'The Emperor of the French',
    body: { height: 0.4, build: 0.6 },
    colors: { skin: '#e0b48f', hair: '#3a2a20', cloth: '#1f3a6e', trim: '#c9a24a' },
    parts: { head: 'round', face: 'stern', hair: 'cropped', outfit: 'greatcoat', accessory: 'bicorne' },
    paintOverlay: true,
  },
  portrait: png,
  sprite: png,
  agentId: 'trinity',
  createdAt: now,
  updatedAt: now,
};
await assertSucceeds(setDoc(doc(alice, `users/alice/characters/${characterId}`), character));
await assertSucceeds(getDoc(doc(alice, `users/alice/characters/${characterId}`)));
await assertFails(getDoc(doc(bob, `users/alice/characters/${characterId}`)));
await assertFails(setDoc(doc(bob, `users/alice/characters/${characterId}`), character));
await assertFails(setDoc(doc(anon, `users/alice/characters/${characterId}`), character));
await assertSucceeds(setDoc(doc(alice, `users/alice/characters/${characterId}`), { ...character, agentId: '', updatedAt: now + 1 }));
await assertFails(setDoc(doc(alice, `users/alice/characters/${characterId}`), { ...character, createdAt: now - 5, updatedAt: now + 2 }));
await assertFails(setDoc(doc(alice, `users/alice/characters/${characterId}`), { ...character, agentId: 'mallory' }));
await assertFails(setDoc(doc(alice, `users/alice/characters/${characterId}`), { ...character, portrait: 'data:text/html;base64,AAAA' }));
await assertFails(setDoc(doc(alice, `users/alice/characters/${characterId}`), { ...character, name: 'Someone else' }));
await assertFails(setDoc(doc(alice, `users/alice/characters/${characterId}`), { ...character, extra: true }));
await assertFails(setDoc(doc(alice, 'users/alice/characters/other-id-1234567890'), character));
await assertSucceeds(deleteDoc(doc(alice, `users/alice/characters/${characterId}`)));

const desk = { kind: 'newsletter', payload: '{"issues":[]}', updatedAt: now };
await assertSucceeds(setDoc(doc(alice, 'users/alice/desks/newsletter'), desk));
await assertSucceeds(getDoc(doc(alice, 'users/alice/desks/newsletter')));
await assertFails(getDoc(doc(bob, 'users/alice/desks/newsletter')));
await assertFails(setDoc(doc(anon, 'users/alice/desks/newsletter'), desk));
await assertFails(setDoc(doc(alice, 'users/alice/desks/newsletter'), { ...desk, kind: 'crm' }));
await assertFails(setDoc(doc(alice, 'users/alice/desks/extra'), desk));
await assertSucceeds(deleteDoc(doc(alice, 'users/alice/desks/newsletter')));

for (const kind of ['cuts', 'shows', 'research']) {
  const row = { kind, payload: '{}', updatedAt: now };
  await assertSucceeds(setDoc(doc(alice, `users/alice/desks/${kind}`), row));
  await assertFails(getDoc(doc(bob, `users/alice/desks/${kind}`)));
  await assertFails(setDoc(doc(anon, `users/alice/desks/${kind}`), row));
  await assertFails(setDoc(doc(alice, `users/alice/desks/${kind}`), { ...row, kind: 'extra' }));
}
await assertFails(setDoc(doc(alice, 'users/alice/desks/extra'), { kind: 'cuts', payload: '{}', updatedAt: now }));

await testEnv.cleanup();
console.log('firestore rules ok');

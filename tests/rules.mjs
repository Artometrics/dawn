import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import {
  addDoc,
  collection,
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

await testEnv.cleanup();
console.log('firestore rules ok');

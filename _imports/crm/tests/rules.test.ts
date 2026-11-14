import { readFileSync } from 'node:fs'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { deleteField, doc, getDoc, getDocs, collection, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { ref, uploadString } from 'firebase/storage'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

const live = Boolean(process.env.FIRESTORE_EMULATOR_HOST)
if (process.env.REQUIRE_RULES === '1' && !live) {
  throw new Error('Firestore emulator is required')
}

const kyleToken = { email: 'kylesmcauliffe@gmail.com', email_verified: true }
const teamToken = { email: 'team@artometrics.com', email_verified: true }

function contactBody(uid = 'kyle') {
  return {
    name: 'Mara Ellison',
    companyId: 'demo-co-northline',
    companyName: 'Northline',
    email: 'mara@northline.test',
    phone: '+1 415 555 0142',
    instagram: 'mara.edits',
    website: 'https://northline.test',
    tags: ['press'],
    source: 'Instagram',
    ownerUid: uid,
    demo: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
}

describe.skipIf(!live)('firestore and storage rules', () => {
  let testEnv: RulesTestEnvironment

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'demo-crm',
      firestore: { rules: readFileSync('firestore.rules', 'utf8') },
      storage: { rules: readFileSync('storage.rules', 'utf8') },
    })
  })

  afterAll(async () => {
    await testEnv.cleanup()
  })

  beforeEach(async () => {
    await testEnv.clearFirestore()
    await testEnv.clearStorage()
  })

  it('blocks strangers and unverified allowlist emails', async () => {
    const outsider = testEnv.unauthenticatedContext().firestore()
    await assertFails(getDocs(collection(outsider, 'contacts')))
    const stranger = testEnv.authenticatedContext('stranger', { email: 'stranger@example.com', email_verified: true }).firestore()
    await assertFails(getDoc(doc(stranger, 'contacts', 'c1')))
    const unverified = testEnv.authenticatedContext('kyle', { email: 'kylesmcauliffe@gmail.com', email_verified: false }).firestore()
    await assertFails(setDoc(doc(unverified, 'contacts', 'c1'), contactBody()))
  })

  it('lets Kyle create a valid contact and the team read it', async () => {
    const kyle = testEnv.authenticatedContext('kyle', kyleToken).firestore()
    await assertSucceeds(setDoc(doc(kyle, 'contacts', 'c1'), contactBody()))
    const team = testEnv.authenticatedContext('team', teamToken).firestore()
    await assertSucceeds(getDoc(doc(team, 'contacts', 'c1')))
  })

  it('rejects extra fields, huge names, owner changes, and demo flips', async () => {
    const kyle = testEnv.authenticatedContext('kyle', kyleToken).firestore()
    await assertFails(setDoc(doc(kyle, 'contacts', 'bad'), { ...contactBody(), secret: true }))
    await assertFails(setDoc(doc(kyle, 'contacts', 'long'), { ...contactBody(), name: 'M'.repeat(121) }))
    await assertSucceeds(setDoc(doc(kyle, 'contacts', 'c1'), contactBody()))
    await assertFails(updateDoc(doc(kyle, 'contacts', 'c1'), { ownerUid: 'team', updatedAt: serverTimestamp() }))
    await assertFails(updateDoc(doc(kyle, 'contacts', 'c1'), { demo: true, updatedAt: serverTimestamp() }))
    await assertFails(updateDoc(doc(kyle, 'contacts', 'c1'), { name: deleteField(), updatedAt: serverTimestamp() }))
    const team = testEnv.authenticatedContext('team', teamToken).firestore()
    await assertSucceeds(updateDoc(doc(team, 'contacts', 'c1'), { name: 'Mara E.', updatedAt: serverTimestamp() }))
  })

  it('keeps deals, notes, and activities inside the model', async () => {
    const kyle = testEnv.authenticatedContext('kyle', kyleToken).firestore()
    await assertFails(setDoc(doc(kyle, 'deals', 'd1'), {
      title: 'Film',
      contactId: '',
      companyId: '',
      contactName: '',
      companyName: '',
      stage: 'nurture',
      value: 10,
      currency: 'USD',
      ownerUid: 'kyle',
      demo: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }))
    await assertSucceeds(setDoc(doc(kyle, 'deals', 'd1'), {
      title: 'Film',
      contactId: '',
      companyId: '',
      contactName: '',
      companyName: '',
      stage: 'lead',
      value: 42000,
      currency: 'USD',
      ownerUid: 'kyle',
      demo: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }))
    await assertFails(setDoc(doc(kyle, 'notes', 'n1'), {
      contactId: 'c1',
      body: '',
      authorUid: 'kyle',
      authorName: 'Kyle',
      demo: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      occurredAt: serverTimestamp(),
    }))
    await assertSucceeds(setDoc(doc(kyle, 'activities', 'a1'), {
      contactId: 'c1',
      kind: 'created',
      summary: 'Added',
      actorUid: 'kyle',
      demo: false,
      createdAt: serverTimestamp(),
      occurredAt: serverTimestamp(),
    }))
    await assertFails(updateDoc(doc(kyle, 'activities', 'a1'), { summary: 'Rewritten' }))
  })

  it('lets the desk read a morning digest and blocks client writes', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'digests', 'latest'), {
        date: '2026-10-21',
        timezone: 'America/Los_Angeles',
        overdue: [],
        today: [{ taskId: 't1', title: 'Send the rate card', contactId: 'c1', contactName: 'Mara', dueAt: '2026-10-21T16:00:00.000Z' }],
        truncated: false,
        emailed: false,
        emailStatus: 'off',
      })
    })
    const kyle = testEnv.authenticatedContext('kyle', kyleToken).firestore()
    await assertSucceeds(getDoc(doc(kyle, 'digests', 'latest')))
    await assertFails(setDoc(doc(kyle, 'digests', 'latest'), { date: '2026-10-22', emailStatus: 'sent' }))
    await assertFails(updateDoc(doc(kyle, 'digests', 'latest'), { emailStatus: 'sent' }))
    const stranger = testEnv.authenticatedContext('stranger', { email: 'stranger@example.com', email_verified: true }).firestore()
    await assertFails(getDoc(doc(stranger, 'digests', 'latest')))
    await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(), 'digests', 'latest')))
  })

  it('limits storage to the allowlist and known file types', async () => {
    const kyle = testEnv.authenticatedContext('kyle', kyleToken).storage()
    const stranger = testEnv.authenticatedContext('stranger', { email: 'stranger@example.com', email_verified: true }).storage()
    await assertSucceeds(uploadString(ref(kyle, 'attachments/c1/note.txt'), 'hello', 'raw', { contentType: 'text/plain' }))
    await assertFails(uploadString(ref(kyle, 'attachments/c1/secret.zip'), 'hello', 'raw', { contentType: 'application/zip' }))
    await assertFails(uploadString(ref(stranger, 'attachments/c1/note.txt'), 'hello', 'raw', { contentType: 'text/plain' }))
    const huge = 'x'.repeat(10 * 1024 * 1024 + 1)
    await assertFails(uploadString(ref(kyle, 'attachments/c1/big.txt'), huge, 'raw', { contentType: 'text/plain' }))
  })
})

import { actorName, explainWrite } from '@/lib/auth'
import {
  allowedContentType,
  cleanHandle,
  cleanPhone,
  cleanTags,
  cleanWebsite,
  MAX_FILE_BYTES,
  problemForContact,
  safeStorageName,
  type ContactDraft,
} from '@/lib/fields'
import { stageLabel, type ActivityKind, type Company, type Contact, type Deal, type Stage } from '@/lib/types'
import type { User } from 'firebase/auth'
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type Firestore,
} from 'firebase/firestore'
import { deleteObject, ref, uploadBytes, type FirebaseStorage } from 'firebase/storage'

function fail(error: unknown): never {
  throw new Error(explainWrite(error))
}

function warn(error: unknown) {
  console.warn(explainWrite(error))
}

function contactPayload(user: User, draft: ContactDraft, companyId: string, demo: boolean) {
  return {
    name: draft.name.trim(),
    companyId,
    companyName: draft.companyName.trim(),
    email: draft.email.trim(),
    phone: cleanPhone(draft.phone),
    instagram: cleanHandle(draft.instagram),
    website: cleanWebsite(draft.website),
    tags: cleanTags(draft.tags),
    source: draft.source.trim(),
    ownerUid: user.uid,
    demo,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
}

export function createContact(db: Firestore, user: User, draft: ContactDraft, companies: Company[]): { id: string; pending: Promise<void> } {
  const problem = problemForContact(draft)
  if (problem) throw new Error(problem)
  const company = linkCompany(db, user, draft.companyName, companies, false)
  const ref = doc(collection(db, 'contacts'))
  const pending = setDoc(ref, contactPayload(user, draft, company.companyId, false)).then(() => undefined).catch(fail)
  void logActivity(db, user, ref.id, 'created', `Added ${draft.name.trim()}`, false)
  return { id: ref.id, pending }
}

export function updateContact(db: Firestore, user: User, contact: Contact, draft: ContactDraft, companies: Company[]) {
  const problem = problemForContact(draft)
  if (problem) throw new Error(problem)
  const company = linkCompany(db, user, draft.companyName, companies, contact.demo)
  const payload = contactPayload(user, draft, company.companyId, contact.demo)
  const pending = updateDoc(doc(db, 'contacts', contact.id), {
    name: payload.name,
    companyId: payload.companyId,
    companyName: payload.companyName,
    email: payload.email,
    phone: payload.phone,
    instagram: payload.instagram,
    website: payload.website,
    tags: payload.tags,
    source: payload.source,
    updatedAt: serverTimestamp(),
  }).catch(fail)
  void logActivity(db, user, contact.id, 'edit', `Updated ${payload.name}`, contact.demo)
  return pending
}

function linkCompany(db: Firestore, user: User, companyName: string, companies: Company[], demo: boolean) {
  const trimmed = companyName.trim().slice(0, 160)
  if (!trimmed) return { companyId: '', companyName: '' }
  const found = companies.find((company) => company.name.toLowerCase() === trimmed.toLowerCase())
  if (found) return { companyId: found.id, companyName: found.name }
  const ref = doc(collection(db, 'companies'))
  void setDoc(ref, {
    name: trimmed,
    website: '',
    phone: '',
    notes: '',
    ownerUid: user.uid,
    demo,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }).catch(warn)
  return { companyId: ref.id, companyName: trimmed }
}

export async function deleteContact(db: Firestore, storage: FirebaseStorage, contactId: string) {
  const groups = ['notes', 'activities', 'tasks', 'files'] as const
  for (const name of groups) {
    const snap = await getDocs(query(collection(db, name), where('contactId', '==', contactId)))
    for (const item of snap.docs) {
      if (name === 'files') {
        const path = item.data().storagePath
        if (typeof path === 'string') {
          try {
            await deleteObject(ref(storage, path))
          } catch {
            /* already gone */
          }
        }
      }
      await deleteDoc(item.ref)
    }
  }
  const deals = await getDocs(query(collection(db, 'deals'), where('contactId', '==', contactId)))
  for (const deal of deals.docs) {
    await updateDoc(deal.ref, { contactId: '', updatedAt: serverTimestamp() })
  }
  await deleteDoc(doc(db, 'contacts', contactId))
}

export function createCompany(db: Firestore, user: User, input: { name: string; website: string; phone: string; notes: string }) {
  const name = input.name.trim()
  if (!name) throw new Error('Name is required.')
  const ref = doc(collection(db, 'companies'))
  return setDoc(ref, {
    name: name.slice(0, 160),
    website: cleanWebsite(input.website),
    phone: cleanPhone(input.phone),
    notes: input.notes.trim().slice(0, 4000),
    ownerUid: user.uid,
    demo: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }).then(() => ref.id)
}

export async function updateCompany(
  db: Firestore,
  company: Company,
  input: { name: string; website: string; phone: string; notes: string },
  contacts: Contact[],
  deals: Deal[],
) {
  const name = input.name.trim()
  if (!name) throw new Error('Name is required.')
  await updateDoc(doc(db, 'companies', company.id), {
    name: name.slice(0, 160),
    website: cleanWebsite(input.website),
    phone: cleanPhone(input.phone),
    notes: input.notes.trim().slice(0, 4000),
    updatedAt: serverTimestamp(),
  })
  if (name !== company.name) {
    for (const contact of contacts.filter((item) => item.companyId === company.id)) {
      await updateDoc(doc(db, 'contacts', contact.id), { companyName: name, updatedAt: serverTimestamp() })
    }
    for (const deal of deals.filter((item) => item.companyId === company.id)) {
      await updateDoc(doc(db, 'deals', deal.id), { companyName: name, updatedAt: serverTimestamp() })
    }
  }
}

export async function deleteCompany(db: Firestore, companyId: string, contacts: Contact[], deals: Deal[]) {
  for (const contact of contacts.filter((item) => item.companyId === companyId)) {
    await updateDoc(doc(db, 'contacts', contact.id), { companyId: '', updatedAt: serverTimestamp() })
  }
  for (const deal of deals.filter((item) => item.companyId === companyId)) {
    await updateDoc(doc(db, 'deals', deal.id), { companyId: '', updatedAt: serverTimestamp() })
  }
  await deleteDoc(doc(db, 'companies', companyId))
}

export type DealDraft = {
  title: string
  value: number
  stage: Stage
  contactId: string
  contactName: string
  companyId: string
  companyName: string
}

export function saveDeal(db: Firestore, user: User, existing: Deal | null, draft: DealDraft) {
  const title = draft.title.trim()
  if (!title) throw new Error('Title is required.')
  const value = Math.max(0, Math.round(Number.isFinite(draft.value) ? draft.value : 0))
  const fields = {
    title: title.slice(0, 160),
    contactId: draft.contactId,
    companyId: draft.companyId,
    contactName: draft.contactName.slice(0, 160),
    companyName: draft.companyName.slice(0, 160),
    stage: draft.stage,
    value,
    currency: 'USD',
    updatedAt: serverTimestamp(),
  }
  if (!existing) {
    const ref = doc(collection(db, 'deals'))
    const pending = setDoc(ref, {
      ...fields,
      ownerUid: user.uid,
      demo: false,
      createdAt: serverTimestamp(),
    }).catch(fail)
    if (draft.contactId) void logActivity(db, user, draft.contactId, 'stage', `${fields.title} · ${stageLabel(draft.stage)}`, false)
    return pending.then(() => ref.id)
  }
  const pending = updateDoc(doc(db, 'deals', existing.id), fields).catch(fail)
  if (existing.stage !== draft.stage && (draft.contactId || existing.contactId)) {
    void logActivity(
      db,
      user,
      draft.contactId || existing.contactId,
      'stage',
      `${fields.title} → ${stageLabel(draft.stage)}`,
      existing.demo,
    )
  }
  return pending
}

export function moveDeal(db: Firestore, user: User, deal: Deal, stage: Stage) {
  if (deal.stage === stage) return Promise.resolve()
  return saveDeal(db, user, deal, {
    title: deal.title,
    value: deal.value,
    stage,
    contactId: deal.contactId,
    contactName: deal.contactName,
    companyId: deal.companyId,
    companyName: deal.companyName,
  })
}

export function deleteDeal(db: Firestore, id: string) {
  return deleteDoc(doc(db, 'deals', id))
}

export function createNote(db: Firestore, user: User, contactId: string, body: string, demo: boolean, kind: ActivityKind = 'note') {
  const text = body.trim()
  if (!text) throw new Error('Write something first.')
  const ref = doc(collection(db, 'notes'))
  const pending = setDoc(ref, {
    contactId,
    body: text.slice(0, 8000),
    authorUid: user.uid,
    authorName: actorName(user),
    demo,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    occurredAt: serverTimestamp(),
  }).catch(fail)
  const summary = kind === 'draft' ? 'Follow-up draft' : text.slice(0, 120)
  void logActivity(db, user, contactId, kind, summary, demo)
  return pending
}

export function deleteNote(db: Firestore, id: string) {
  return deleteDoc(doc(db, 'notes', id))
}

export function createTask(db: Firestore, user: User, input: { title: string; contactId: string; dueAt: Date; notes?: string }, demo = false) {
  const title = input.title.trim()
  if (!title) throw new Error('Title is required.')
  const ref = doc(collection(db, 'tasks'))
  const pending = setDoc(ref, {
    title: title.slice(0, 160),
    contactId: input.contactId,
    dueAt: Timestamp.fromDate(input.dueAt),
    done: false,
    notes: (input.notes ?? '').trim().slice(0, 500),
    ownerUid: user.uid,
    demo,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }).catch(fail)
  if (input.contactId) void logActivity(db, user, input.contactId, 'task', title.slice(0, 160), demo)
  return pending
}

export function setTaskDone(db: Firestore, id: string, done: boolean) {
  return updateDoc(doc(db, 'tasks', id), { done, updatedAt: serverTimestamp() }).catch(fail)
}

export function deleteTask(db: Firestore, id: string) {
  return deleteDoc(doc(db, 'tasks', id))
}

export async function uploadContactFile(db: Firestore, storage: FirebaseStorage, user: User, contact: Contact, file: File) {
  if (file.size > MAX_FILE_BYTES) throw new Error('Files stay under 10MB.')
  const contentType = allowedContentType(file.type, file.name)
  if (!contentType) throw new Error('Use a photo, PDF, or text file.')
  const stored = safeStorageName(file.name)
  const storagePath = `attachments/${contact.id}/${stored}`
  await uploadBytes(ref(storage, storagePath), file, { contentType })
  await setDoc(doc(collection(db, 'files')), {
    contactId: contact.id,
    name: file.name.slice(0, 120) || stored,
    storagePath,
    contentType,
    size: file.size,
    ownerUid: user.uid,
    demo: contact.demo,
    createdAt: serverTimestamp(),
  })
  void logActivity(db, user, contact.id, 'file', (file.name || stored).slice(0, 120), contact.demo)
}

export async function deleteDeskFile(db: Firestore, storage: FirebaseStorage, file: { id: string; storagePath: string }) {
  try {
    await deleteObject(ref(storage, file.storagePath))
  } catch {
    /* already gone */
  }
  await deleteDoc(doc(db, 'files', file.id))
}

export function logActivity(
  db: Firestore,
  user: User,
  contactId: string,
  kind: ActivityKind,
  summary: string,
  demo: boolean,
  occurredAt?: Date,
) {
  if (!contactId) return Promise.resolve()
  return setDoc(doc(collection(db, 'activities')), {
    contactId,
    kind,
    summary: summary.trim().slice(0, 300) || kind,
    actorUid: user.uid,
    demo,
    createdAt: serverTimestamp(),
    occurredAt: occurredAt ? Timestamp.fromDate(occurredAt) : serverTimestamp(),
  }).catch(warn)
}

export async function importRows(
  db: Firestore,
  user: User,
  rows: Array<{ name: string; company: string; email: string; phone: string; instagram: string; website: string; tags: string; source: string }>,
  companies: Company[],
) {
  const known = [...companies]
  let count = 0
  for (const row of rows) {
    const draft: ContactDraft = {
      name: row.name,
      companyName: row.company,
      email: row.email,
      phone: row.phone,
      instagram: row.instagram,
      website: row.website,
      tags: row.tags,
      source: row.source,
    }
    if (problemForContact(draft)) continue
    const company = linkCompany(db, user, draft.companyName, known, false)
    if (company.companyId && !known.some((item) => item.id === company.companyId)) {
      known.push({
        id: company.companyId,
        name: company.companyName,
        website: '',
        phone: '',
        notes: '',
        ownerUid: user.uid,
        demo: false,
        createdAt: null,
        updatedAt: null,
      })
    }
    const ref = doc(collection(db, 'contacts'))
    await setDoc(ref, contactPayload(user, draft, company.companyId, false))
    void logActivity(db, user, ref.id, 'created', `Imported ${draft.name.trim()}`, false)
    count += 1
  }
  return count
}

export async function clearDemo(db: Firestore, storage: FirebaseStorage) {
  const names = ['files', 'notes', 'activities', 'tasks', 'deals', 'contacts', 'companies'] as const
  for (const name of names) {
    const snap = await getDocs(query(collection(db, name), where('demo', '==', true)))
    if (name === 'files') {
      for (const item of snap.docs) {
        const path = item.data().storagePath
        if (typeof path === 'string') {
          try {
            await deleteObject(ref(storage, path))
          } catch {
            /* already gone */
          }
        }
      }
    }
    let batch = writeBatch(db)
    let count = 0
    for (const item of snap.docs) {
      batch.delete(item.ref)
      count += 1
      if (count === 400) {
        await batch.commit()
        batch = writeBatch(db)
        count = 0
      }
    }
    if (count) await batch.commit()
  }
}

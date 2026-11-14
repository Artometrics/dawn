import { actorName } from '@/lib/auth'
import { shiftDays } from '@/lib/time'
import type { User } from 'firebase/auth'
import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  Timestamp,
  where,
  writeBatch,
  type Firestore,
} from 'firebase/firestore'

export async function demoIsLoaded(db: Firestore): Promise<boolean> {
  const snap = await getDocs(query(collection(db, 'contacts'), where('demo', '==', true), limit(1)))
  return !snap.empty
}

export async function seedDemo(db: Firestore, user: User) {
  if (await demoIsLoaded(db)) return
  const now = new Date()
  const batch = writeBatch(db)
  const ownerUid = user.uid
  const actor = actorName(user)

  const companies = [
    ['demo-co-northline', 'Northline Magazine', 'https://northline.test'],
    ['demo-co-kite', 'Kite & Co', 'https://kite.test'],
    ['demo-co-fieldday', 'Fieldday Studio', 'https://fieldday.test'],
    ['demo-co-harbor', 'Harbor YouTube', 'https://harbor.test'],
    ['demo-co-lumen', 'Lumen Apps', 'https://lumen.test'],
  ] as const
  for (const [id, name, website] of companies) {
    batch.set(doc(db, 'companies', id), {
      name,
      website,
      phone: '',
      notes: '',
      ownerUid,
      demo: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  }

  const contacts = [
    ['demo-ct-mara', 'Mara Ellison', 'demo-co-northline', 'Northline Magazine', 'mara@northline.test', '+1 415 555 0142', 'mara.edits', 'Instagram', ['press', 'magazine']],
    ['demo-ct-jonah', 'Jonah Peck', 'demo-co-kite', 'Kite & Co', 'jonah@kite.test', '+1 212 555 0194', 'kiteandco', 'Referral', ['app', 'film']],
    ['demo-ct-asha', 'Asha Reddy', 'demo-co-harbor', 'Harbor YouTube', 'asha@harbor.test', '', 'harbor.yt', 'YouTube', ['sponsor']],
    ['demo-ct-lena', 'Lena Voss', 'demo-co-lumen', 'Lumen Apps', 'lena@lumen.test', '+1 628 555 0118', 'lenavoss', 'Intro', ['app']],
    ['demo-ct-chris', 'Chris Adeyemi', 'demo-co-fieldday', 'Fieldday Studio', 'chris@fieldday.test', '', 'fieldday', 'Website', ['rebrand']],
    ['demo-ct-priya', 'Priya Shah', 'demo-co-northline', 'Northline Magazine', 'priya@northline.test', '', 'priya.shah', 'Instagram', ['press']],
  ] as const
  for (const [id, name, companyId, companyName, email, phone, instagram, source, tags] of contacts) {
    batch.set(doc(db, 'contacts', id), {
      name,
      companyId,
      companyName,
      email,
      phone,
      instagram,
      website: '',
      tags: [...tags],
      source,
      ownerUid,
      demo: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  }

  const deals = [
    ['demo-deal-northline', 'Autumn issue package', 'demo-ct-mara', 'Mara Ellison', 'demo-co-northline', 'Northline Magazine', 'proposal', 18000],
    ['demo-deal-kite', 'Launch film + cutdown', 'demo-ct-jonah', 'Jonah Peck', 'demo-co-kite', 'Kite & Co', 'contacted', 42000],
    ['demo-deal-harbor', 'Series sponsor read', 'demo-ct-asha', 'Asha Reddy', 'demo-co-harbor', 'Harbor YouTube', 'lead', 9500],
    ['demo-deal-lumen', 'App onboarding', 'demo-ct-lena', 'Lena Voss', 'demo-co-lumen', 'Lumen Apps', 'won', 27000],
    ['demo-deal-fieldday', 'Studio rebrand', 'demo-ct-chris', 'Chris Adeyemi', 'demo-co-fieldday', 'Fieldday Studio', 'lost', 15000],
  ] as const
  for (const [id, title, contactId, contactName, companyId, companyName, stage, value] of deals) {
    batch.set(doc(db, 'deals', id), {
      title,
      contactId,
      contactName,
      companyId,
      companyName,
      stage,
      value,
      currency: 'USD',
      ownerUid,
      demo: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  }

  const tasks = [
    ['demo-task-mara', 'Send Mara the rate card', 'demo-ct-mara', 0, false],
    ['demo-task-kite', 'Send the Kite cutdown', 'demo-ct-jonah', -1, false],
    ['demo-task-asha', 'Confirm the Harbor read', 'demo-ct-asha', 3, false],
    ['demo-task-lena', 'Invoice Lumen', 'demo-ct-lena', -2, true],
  ] as const
  for (const [id, title, contactId, day, done] of tasks) {
    batch.set(doc(db, 'tasks', id), {
      title,
      contactId,
      dueAt: Timestamp.fromDate(shiftDays(now, day)),
      done,
      notes: '',
      ownerUid,
      demo: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  }

  const notes = [
    ['demo-note-mara-1', 'demo-ct-mara', 'Wants the autumn issue to include the studio app. Asked for a one-page rate.', -10],
    ['demo-note-mara-2', 'demo-ct-mara', 'Follow up with the rate card before Friday. She reads Instagram first.', -2],
    ['demo-note-jonah', 'demo-ct-jonah', 'Kite launch film. Needs a YouTube cutdown and a 15s for the app store.', -4],
  ] as const
  for (const [id, contactId, body, day] of notes) {
    batch.set(doc(db, 'notes', id), {
      contactId,
      body,
      authorUid: ownerUid,
      authorName: actor,
      demo: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      occurredAt: Timestamp.fromDate(shiftDays(now, day, 15)),
    })
  }

  const activities = [
    ['demo-act-mara-add', 'demo-ct-mara', 'created', 'Added from Instagram', -12],
    ['demo-act-mara-stage', 'demo-ct-mara', 'stage', 'Autumn issue package → Proposal', -6],
    ['demo-act-jonah-add', 'demo-ct-jonah', 'created', 'Intro from a client', -8],
    ['demo-act-asha-add', 'demo-ct-asha', 'created', 'Added from YouTube', -5],
    ['demo-act-lena', 'demo-ct-lena', 'stage', 'App onboarding → Won', -3],
  ] as const
  for (const [id, contactId, kind, summary, day] of activities) {
    batch.set(doc(db, 'activities', id), {
      contactId,
      kind,
      summary,
      actorUid: ownerUid,
      demo: true,
      createdAt: serverTimestamp(),
      occurredAt: Timestamp.fromDate(shiftDays(now, day, 11)),
    })
  }

  await batch.commit()
}

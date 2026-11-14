import { initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore'
import { onRequest } from 'firebase-functions/v2/https'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { buildDigest, resolveEmail, type OpenTask } from './digest'
import { handleIntake, type ParsedLead } from './intake'

initializeApp()

const ZONE = 'America/Los_Angeles'
const db = getFirestore()

async function sendResend(body: { date: string; overdue: { title: string }[]; today: { title: string }[] }) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM
  if (!apiKey || !from) throw new Error('Resend is not configured.')
  const lines = [
    `Morning list ${body.date}`,
    ...body.overdue.map((item) => `Overdue: ${item.title}`),
    ...body.today.map((item) => `Today: ${item.title}`),
  ]
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: ['kylesmcauliffe@gmail.com', 'team@artometrics.com'],
      subject: `Artometrics ${body.date}`,
      text: lines.join('\n'),
    }),
  })
  if (!response.ok) throw new Error('Resend refused the digest.')
}

export const morningDigest = onSchedule(
  { schedule: '0 8 * * *', timeZone: ZONE, region: 'us-central1' },
  async () => {
    const now = new Date()
    const [taskSnap, contactSnap] = await Promise.all([
      db.collection('tasks').orderBy('dueAt', 'asc').limit(500).get(),
      db.collection('contacts').select('name').limit(2000).get(),
    ])
    const names = new Map<string, string>()
    contactSnap.forEach((item) => {
      const name = item.get('name')
      if (typeof name === 'string') names.set(item.id, name)
    })
    const tasks: OpenTask[] = []
    taskSnap.forEach((item) => {
      const due = item.get('dueAt') as { toDate?: () => Date } | undefined
      const dueAt = due && typeof due.toDate === 'function' ? due.toDate() : null
      if (!dueAt) return
      tasks.push({
        id: item.id,
        title: String(item.get('title') ?? ''),
        contactId: String(item.get('contactId') ?? ''),
        done: item.get('done') === true,
        dueAt,
      })
    })
    const draft = buildDigest({ tasks, names, now, timeZone: ZONE, emailStatus: 'off' })
    const emailStatus = await resolveEmail(process.env.RESEND_ENABLED, () => sendResend(draft))
    const digest = { ...draft, emailed: emailStatus === 'sent', emailStatus }
    const payload = { ...digest, generatedAt: FieldValue.serverTimestamp() }
    const batch = db.batch()
    batch.set(db.collection('digests').doc('latest'), payload)
    batch.set(db.collection('digests').doc(digest.date), payload)
    await batch.commit()
  },
)

function stamp() {
  return FieldValue.serverTimestamp()
}

async function writeLead(lead: ParsedLead) {
  const dueAt = Timestamp.fromDate(new Date())
  const batch = db.batch()
  if (lead.companyId) {
    batch.set(db.collection('companies').doc(lead.companyId), {
      name: lead.companyName,
      website: lead.website,
      phone: lead.phone,
      notes: '',
      ownerUid: 'intake',
      demo: false,
      createdAt: stamp(),
      updatedAt: stamp(),
    })
  }
  batch.set(db.collection('contacts').doc(lead.contactId), {
    name: lead.name,
    companyId: lead.companyId,
    companyName: lead.companyName,
    email: lead.email,
    phone: lead.phone,
    instagram: lead.instagram,
    website: lead.website,
    tags: ['form'],
    source: lead.source,
    ownerUid: 'intake',
    demo: false,
    createdAt: stamp(),
    updatedAt: stamp(),
  })
  batch.set(db.collection('deals').doc(lead.dealId), {
    title: `Lead · ${lead.name}`.slice(0, 160),
    contactId: lead.contactId,
    companyId: lead.companyId,
    contactName: lead.name,
    companyName: lead.companyName,
    stage: 'lead',
    value: 0,
    currency: 'USD',
    ownerUid: 'intake',
    demo: false,
    createdAt: stamp(),
    updatedAt: stamp(),
  })
  batch.set(db.collection('tasks').doc(lead.taskId), {
    title: `Follow up ${lead.name}`.slice(0, 160),
    contactId: lead.contactId,
    dueAt,
    done: false,
    notes: lead.note.slice(0, 500),
    ownerUid: 'intake',
    demo: false,
    createdAt: stamp(),
    updatedAt: stamp(),
  })
  if (lead.noteId) {
    batch.set(db.collection('notes').doc(lead.noteId), {
      contactId: lead.contactId,
      body: lead.note,
      authorUid: 'intake',
      authorName: 'Form',
      demo: false,
      createdAt: stamp(),
      updatedAt: stamp(),
      occurredAt: stamp(),
    })
  }
  batch.set(db.collection('activities').doc(lead.activityId), {
    contactId: lead.contactId,
    kind: 'created',
    summary: 'Added from a form',
    actorUid: 'intake',
    demo: false,
    createdAt: stamp(),
    occurredAt: stamp(),
  })
  await batch.commit()
}

export const intake = onRequest({ region: 'us-central1', cors: false }, async (request, response) => {
  const headerBag: Record<string, string | undefined> = {}
  for (const [key, value] of Object.entries(request.headers)) {
    headerBag[key.toLowerCase()] = Array.isArray(value) ? value[0] : value
  }
  const queryToken = typeof request.query.token === 'string' ? request.query.token : undefined
  const result = await handleIntake({
    method: request.method,
    secret: process.env.INTAKE_SECRET,
    headers: headerBag,
    queryToken,
    payload: request.body,
  }, writeLead)
  response.status(result.status).json(result.body)
})

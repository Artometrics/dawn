import { describe, expect, it, vi } from 'vitest'
import { buildDigest, dayKey, resolveEmail } from '../functions/src/digest'
import { handleIntake, leadId, parseLead } from '../functions/src/intake'
import { digestDateLabel, mapDigest } from '../src/lib/digestView'
import { readFileSync } from 'node:fs'

const zone = 'America/Los_Angeles'
const morning = new Date('2026-10-21T15:00:00.000Z')

describe('morning digest', () => {
  it('buckets overdue and today in Pacific time and skips done work', () => {
    const digest = buildDigest({
      now: morning,
      timeZone: zone,
      names: new Map([['demo-ct-mara', 'Mara Ellison']]),
      tasks: [
        { id: 'late', title: 'Send the Kite cutdown', contactId: '', done: false, dueAt: new Date('2026-10-20T16:00:00.000Z') },
        { id: 'now', title: 'Send the rate card', contactId: 'demo-ct-mara', done: false, dueAt: new Date('2026-10-21T16:00:00.000Z') },
        { id: 'later', title: 'Confirm the Harbor read', contactId: '', done: false, dueAt: new Date('2026-10-22T16:00:00.000Z') },
        { id: 'done', title: 'Invoice Lumen', contactId: '', done: true, dueAt: new Date('2026-10-19T16:00:00.000Z') },
      ],
    })
    expect(dayKey(morning, zone)).toBe('2026-10-21')
    expect(digest.date).toBe('2026-10-21')
    expect(digest.overdue.map((item) => item.taskId)).toEqual(['late'])
    expect(digest.today.map((item) => item.title)).toEqual(['Send the rate card'])
    expect(digest.today[0]?.contactName).toBe('Mara Ellison')
    expect(digest.emailed).toBe(false)
    expect(digest.emailStatus).toBe('off')
  })

  it('leaves Resend uncalled unless the flag is exactly true', async () => {
    const send = vi.fn(async () => undefined)
    expect(await resolveEmail(undefined, send)).toBe('off')
    expect(await resolveEmail('false', send)).toBe('off')
    expect(await resolveEmail('', send)).toBe('off')
    expect(send).not.toHaveBeenCalled()
    expect(await resolveEmail('true', send)).toBe('sent')
    expect(send).toHaveBeenCalledOnce()
    expect(await resolveEmail('true', async () => {
      throw new Error('no key')
    })).toBe('error')
  })
})

describe('form intake', () => {
  const secret = 'desk-secret-value'

  it('rejects a missing secret, a bad token, and a nameless form', async () => {
    const write = vi.fn(async () => undefined)
    expect((await handleIntake({ method: 'GET', secret, headers: {}, payload: { name: 'Ada' } }, write)).status).toBe(405)
    expect((await handleIntake({ method: 'POST', secret: '', headers: { 'x-intake-token': secret }, payload: { name: 'Ada' } }, write)).status).toBe(503)
    expect((await handleIntake({ method: 'POST', secret, headers: { 'x-intake-token': 'nope' }, payload: { name: 'Ada' } }, write)).status).toBe(401)
    expect((await handleIntake({ method: 'POST', secret, headers: { authorization: `Bearer ${secret}` }, payload: {} }, write)).status).toBe(400)
    expect(write).not.toHaveBeenCalled()
  })

  it('creates one stable lead from a token-protected form', async () => {
    const write = vi.fn(async () => undefined)
    const payload = {
      full_name: 'Nia Brooks',
      Company: 'Harbor YouTube',
      email: 'nia@harbor.test',
      phone: '+1 (917) 555-0100',
      instagram: '@nia.brooks',
      note: 'Wants a sponsor read.',
      responseId: 'form-88',
      token: secret,
    }
    const first = await handleIntake({ method: 'POST', secret, headers: {}, payload, now: 1000 }, write)
    const second = await handleIntake({
      method: 'POST',
      secret,
      headers: {},
      queryToken: secret,
      payload: { ...payload, token: undefined },
      now: 2000,
    }, write)
    expect(first.status).toBe(201)
    expect(second.status).toBe(201)
    expect(first.body.contactId).toBe(leadId('form-88', 1000))
    expect(second.body.contactId).toBe(first.body.contactId)
    expect(write).toHaveBeenCalledTimes(2)
    const lead = write.mock.calls[0][0]
    expect(lead.name).toBe('Nia Brooks')
    expect(lead.companyName).toBe('Harbor YouTube')
    expect(lead.instagram).toBe('nia.brooks')
    expect(lead.phone).toBe('+1 (917) 555-0100')
    expect(lead.source).toBe('Form')
    expect(lead.note).toBe('Wants a sponsor read.')
    expect(parseLead({ name: 'Ada', email: 'not-an-email' }, 1)).toEqual({ ok: false, error: 'Email looks wrong.' })
  })
})

describe('digest on the desk', () => {
  it('maps a morning document and ignores a broken one', () => {
    expect(digestDateLabel('2026-10-21')).toBe('21 OCT')
    const mapped = mapDigest({
      date: '2026-10-21',
      emailStatus: 'off',
      overdue: [{ taskId: 'late', title: 'Send the Kite cutdown', contactId: 'c2', contactName: 'Jonah' }],
      today: [{ title: '' }],
    })
    expect(mapped?.overdue).toHaveLength(1)
    expect(mapped?.today).toHaveLength(0)
    expect(mapDigest({ date: 'tomorrow' })).toBeNull()
    expect(mapDigest(undefined)).toBeNull()
  })

  it('loads production config from Hosting and keeps emulators in dev only', () => {
    const firebase = readFileSync('src/lib/firebase.ts', 'utf8')
    const rules = readFileSync('firestore.rules', 'utf8')
    expect(firebase).toContain("if (import.meta.env.PROD) return loadHostingConfig()")
    expect(firebase).toContain("fetch('/__/firebase/init.json')")
    expect(firebase).toContain('import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS')
    expect(rules).toContain('match /digests/{id}')
    expect(rules).toContain('allow create, update, delete: if false;')
    const index = readFileSync('functions/src/index.ts', 'utf8')
    expect(index).toContain('resolveEmail(process.env.RESEND_ENABLED')
    expect(index).toContain('process.env.INTAKE_SECRET')
  })
})

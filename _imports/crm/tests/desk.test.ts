import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { contactsToCsv, parseContactsCsv } from '../src/lib/csv'
import { cleanHandle, cleanTags, cleanWebsite, problemForContact } from '../src/lib/fields'
import { searchDesk } from '../src/lib/search'
import { dueLabel, isSameDay, shiftDays, whenBucket } from '../src/lib/time'
import type { Company, Contact, Deal, Note, Task } from '../src/lib/types'

describe('desk helpers', () => {
  it('keeps the allowlist in both rules files', () => {
    const firestore = readFileSync('firestore.rules', 'utf8')
    const storage = readFileSync('storage.rules', 'utf8')
    for (const email of ['kylesmcauliffe@gmail.com', 'team@artometrics.com']) {
      expect(firestore).toContain(email)
      expect(storage).toContain(email)
    }
    expect(firestore).toContain('email_verified == true')
    expect(storage).toContain('email_verified == true')
    expect(firestore).not.toContain('allow read: if true')
    expect(firestore).not.toContain('allow write: if true')
  })

  it('cleans tags, handles, and websites', () => {
    expect(cleanTags('Press, press, #magazine, this tag is way too long for the desk')).toEqual(['Press', 'magazine'])
    expect(cleanHandle('https://instagram.com/mara.edits/')).toBe('mara.edits')
    expect(cleanHandle('@kiteandco')).toBe('kiteandco')
    expect(cleanWebsite('northline.test')).toBe('https://northline.test')
    expect(problemForContact({
      name: '',
      companyName: '',
      email: '',
      phone: '',
      instagram: '',
      website: '',
      tags: '',
      source: '',
    })).toBe('Name is required.')
  })

  it('round-trips a contact csv', () => {
    const csv = contactsToCsv([{
      name: 'Mara Ellison',
      company: 'Northline Magazine',
      email: 'mara@northline.test',
      phone: '+1 415 555 0142',
      instagram: 'mara.edits',
      website: '',
      tags: 'press, magazine',
      source: 'Instagram',
    }])
    expect(parseContactsCsv(csv)).toEqual([{
      name: 'Mara Ellison',
      company: 'Northline Magazine',
      email: 'mara@northline.test',
      phone: '+1 415 555 0142',
      instagram: 'mara.edits',
      website: '',
      tags: 'press, magazine',
      source: 'Instagram',
    }])
  })

  it('buckets follow-ups', () => {
    const now = new Date(2026, 9, 21, 15, 0, 0)
    expect(whenBucket(shiftDays(now, -1), now)).toBe('overdue')
    expect(whenBucket(now, now)).toBe('today')
    expect(dueLabel(shiftDays(now, 1), now)).toBe('Tomorrow')
    expect(isSameDay(now, new Date(2026, 9, 21, 1, 0, 0))).toBe(true)
  })

  it('searches across the desk', () => {
    const contact = {
      id: 'c1',
      name: 'Mara Ellison',
      companyId: 'co',
      companyName: 'Northline',
      email: 'mara@northline.test',
      phone: '',
      instagram: 'mara.edits',
      website: '',
      tags: ['press'],
      source: 'Instagram',
      ownerUid: 'kyle',
      demo: true,
      createdAt: null,
      updatedAt: null,
    } satisfies Contact
    const notes = [{ id: 'n1', contactId: 'c1', body: 'Rate card', authorUid: 'k', authorName: 'Kyle', demo: true, createdAt: null, updatedAt: null, occurredAt: null }] satisfies Note[]
    const desk = { contacts: [contact], companies: [] as Company[], deals: [] as Deal[], tasks: [] as Task[], notes }
    expect(searchDesk('mara press', desk).map((hit) => hit.kind)).toEqual(['person'])
    expect(searchDesk('rate', desk).map((hit) => hit.kind)).toEqual(['note'])
  })
})

import type { Company, Contact, Deal, Note, Task } from '@/lib/types'

export type SearchHit = {
  id: string
  kind: 'person' | 'company' | 'deal' | 'task' | 'note'
  title: string
  meta: string
  href: string
}

function hit(query: string, parts: Array<string | undefined>): boolean {
  const tokens = query.toLowerCase().trim().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return false
  const hay = parts.filter(Boolean).join(' ').toLowerCase()
  return tokens.every((token) => hay.includes(token))
}

export function searchDesk(
  query: string,
  data: { contacts: Contact[]; companies: Company[]; deals: Deal[]; tasks: Task[]; notes: Note[] },
): SearchHit[] {
  const q = query.trim()
  if (!q) return []
  const hits: SearchHit[] = []
  for (const contact of data.contacts) {
    if (hit(q, [contact.name, contact.companyName, contact.email, contact.phone, contact.instagram, contact.source, contact.tags.join(' ')])) {
      hits.push({
        id: contact.id,
        kind: 'person',
        title: contact.name,
        meta: contact.companyName || contact.email || 'Person',
        href: `/people/${contact.id}`,
      })
    }
  }
  for (const company of data.companies) {
    if (hit(q, [company.name, company.website, company.phone, company.notes])) {
      hits.push({
        id: company.id,
        kind: 'company',
        title: company.name,
        meta: 'Company',
        href: `/companies/${company.id}`,
      })
    }
  }
  for (const deal of data.deals) {
    if (hit(q, [deal.title, deal.contactName, deal.companyName, deal.stage])) {
      hits.push({
        id: deal.id,
        kind: 'deal',
        title: deal.title,
        meta: deal.companyName || deal.contactName || 'Deal',
        href: `/pipeline?deal=${deal.id}`,
      })
    }
  }
  for (const task of data.tasks) {
    if (hit(q, [task.title, task.notes])) {
      hits.push({
        id: task.id,
        kind: 'task',
        title: task.title,
        meta: 'Task',
        href: task.contactId ? `/people/${task.contactId}` : '/tasks',
      })
    }
  }
  for (const note of data.notes) {
    if (hit(q, [note.body])) {
      const person = data.contacts.find((contact) => contact.id === note.contactId)
      hits.push({
        id: note.id,
        kind: 'note',
        title: note.body.slice(0, 80),
        meta: person ? person.name : 'Note',
        href: `/people/${note.contactId}`,
      })
    }
  }
  return hits.slice(0, 40)
}

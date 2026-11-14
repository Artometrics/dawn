export const STAGES = [
  { id: 'lead', label: 'Lead' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'proposal', label: 'Proposal' },
  { id: 'won', label: 'Won' },
  { id: 'lost', label: 'Lost' },
] as const

export type Stage = (typeof STAGES)[number]['id']

export type Contact = {
  id: string
  name: string
  companyId: string
  companyName: string
  email: string
  phone: string
  instagram: string
  website: string
  tags: string[]
  source: string
  ownerUid: string
  demo: boolean
  createdAt: Date | null
  updatedAt: Date | null
}

export type Company = {
  id: string
  name: string
  website: string
  phone: string
  notes: string
  ownerUid: string
  demo: boolean
  createdAt: Date | null
  updatedAt: Date | null
}

export type Deal = {
  id: string
  title: string
  contactId: string
  companyId: string
  contactName: string
  companyName: string
  stage: Stage
  value: number
  currency: string
  ownerUid: string
  demo: boolean
  createdAt: Date | null
  updatedAt: Date | null
}

export type Note = {
  id: string
  contactId: string
  body: string
  authorUid: string
  authorName: string
  demo: boolean
  createdAt: Date | null
  updatedAt: Date | null
  occurredAt: Date | null
}

export type ActivityKind = 'created' | 'note' | 'stage' | 'task' | 'edit' | 'file' | 'draft'

export type Activity = {
  id: string
  contactId: string
  kind: ActivityKind
  summary: string
  actorUid: string
  demo: boolean
  createdAt: Date | null
  occurredAt: Date | null
}

export type Task = {
  id: string
  title: string
  contactId: string
  dueAt: Date | null
  done: boolean
  notes: string
  ownerUid: string
  demo: boolean
  createdAt: Date | null
  updatedAt: Date | null
}

export type DeskFile = {
  id: string
  contactId: string
  name: string
  storagePath: string
  contentType: string
  size: number
  ownerUid: string
  demo: boolean
  createdAt: Date | null
}

export function stageLabel(stage: Stage): string {
  return STAGES.find((item) => item.id === stage)?.label ?? stage
}

export function isStage(value: string): value is Stage {
  return STAGES.some((item) => item.id === value)
}

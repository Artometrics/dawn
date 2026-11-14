import { timingSafeEqual } from 'node:crypto'

const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
const HANDLE_RE = /^[A-Za-z0-9._]{0,40}$/
const PHONE_RE = /^[0-9+() ._-]{0,40}$/

export type ParsedLead = {
  contactId: string
  companyId: string
  dealId: string
  taskId: string
  noteId: string | null
  activityId: string
  name: string
  companyName: string
  email: string
  phone: string
  instagram: string
  website: string
  note: string
  source: string
}

export type IntakeResult = {
  status: number
  body: { ok: boolean; error?: string; contactId?: string }
}

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function pick(record: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value
  }
  return ''
}

export function leadId(responseId: string, now: number): string {
  const raw = (responseId || `t${now}`).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 80)
  return `lead-${raw || now.toString(36)}`.slice(0, 120)
}

export function tokensMatch(secret: string, token: string): boolean {
  const left = Buffer.from(secret)
  const right = Buffer.from(token)
  if (left.length === 0 || left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

export function readToken(
  headers: Record<string, string | undefined>,
  queryToken: string | undefined,
  bodyToken: unknown,
): string {
  const header = headers['x-intake-token']
  const authorization = headers.authorization?.replace(/^Bearer\s+/i, '')
  const body = typeof bodyToken === 'string' ? bodyToken : ''
  return (header || authorization || queryToken || body).trim()
}

function cleanHandle(value: string): string {
  const fromUrl = value.match(/instagram\.com\/([A-Za-z0-9._]+)/i)
  const next = (fromUrl?.[1] ?? value).replace(/^@/, '')
  return next.slice(0, 40)
}

function cleanPhone(value: string): string {
  return value.replace(/[^\d+() .-]/g, '').slice(0, 40)
}

function cleanWebsite(value: string): string {
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value.slice(0, 300)
  return `https://${value}`.slice(0, 300)
}

export function parseLead(payload: unknown, now: number): { ok: true; lead: ParsedLead } | { ok: false; error: string } {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return { ok: false, error: 'Send a JSON object.' }
  const record = payload as Record<string, unknown>
  const name = text(pick(record, ['name', 'fullName', 'full_name', 'Name']), 120)
  if (!name) return { ok: false, error: 'Name is required.' }
  const email = text(pick(record, ['email', 'emailAddress', 'Email']), 160)
  if (email && !EMAIL_RE.test(email)) return { ok: false, error: 'Email looks wrong.' }
  const phone = cleanPhone(text(pick(record, ['phone', 'phoneNumber', 'Phone']), 40))
  if (!PHONE_RE.test(phone)) return { ok: false, error: 'Phone looks wrong.' }
  const instagram = cleanHandle(text(pick(record, ['instagram', 'handle', 'Instagram']), 80))
  if (!HANDLE_RE.test(instagram)) return { ok: false, error: 'Instagram handle only.' }
  const website = cleanWebsite(text(pick(record, ['website', 'url', 'Website']), 300))
  if (website && !/^https?:\/\/.{3,290}$/.test(website)) return { ok: false, error: 'Website needs a full link.' }
  const companyName = text(pick(record, ['company', 'companyName', 'Company']), 160)
  const note = text(pick(record, ['note', 'message', 'comments', 'Notes']), 8000)
  const source = text(pick(record, ['source']), 80) || 'Form'
  const responseId = text(pick(record, ['responseId', 'response_id']), 80)
  const contactId = leadId(responseId, now)
  return {
    ok: true,
    lead: {
      contactId,
      companyId: companyName ? `co-${contactId}`.slice(0, 120) : '',
      dealId: `deal-${contactId}`.slice(0, 120),
      taskId: `task-${contactId}`.slice(0, 120),
      noteId: note ? `note-${contactId}`.slice(0, 120) : null,
      activityId: `act-${contactId}`.slice(0, 120),
      name,
      companyName,
      email,
      phone,
      instagram,
      website,
      note: note.slice(0, 8000),
      source,
    },
  }
}

export async function handleIntake(
  input: {
    method: string
    secret: string | undefined
    headers: Record<string, string | undefined>
    queryToken?: string
    payload: unknown
    now?: number
  },
  write: (lead: ParsedLead) => Promise<void>,
): Promise<IntakeResult> {
  if (input.method.toUpperCase() !== 'POST') return { status: 405, body: { ok: false, error: 'POST only.' } }
  const secret = input.secret?.trim() ?? ''
  if (!secret) return { status: 503, body: { ok: false, error: 'Intake secret is not set.' } }
  const bodyToken = input.payload && typeof input.payload === 'object' && !Array.isArray(input.payload)
    ? (input.payload as Record<string, unknown>).token
    : undefined
  const token = readToken(input.headers, input.queryToken, bodyToken)
  if (!tokensMatch(secret, token)) return { status: 401, body: { ok: false, error: 'Bad token.' } }
  const parsed = parseLead(input.payload, input.now ?? Date.now())
  if (!parsed.ok) return { status: 400, body: { ok: false, error: parsed.error } }
  await write(parsed.lead)
  return { status: 201, body: { ok: true, contactId: parsed.lead.contactId } }
}

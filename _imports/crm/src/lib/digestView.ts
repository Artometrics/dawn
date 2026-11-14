export type DigestLine = {
  taskId: string
  title: string
  contactId: string
  contactName: string
}

export type DeskDigest = {
  date: string
  emailStatus: string
  overdue: DigestLine[]
  today: DigestLine[]
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

function lines(value: unknown): DigestLine[] {
  if (!Array.isArray(value)) return []
  const out: DigestLine[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const title = typeof row.title === 'string' ? row.title : ''
    if (!title) continue
    out.push({
      taskId: typeof row.taskId === 'string' ? row.taskId : '',
      title,
      contactId: typeof row.contactId === 'string' ? row.contactId : '',
      contactName: typeof row.contactName === 'string' ? row.contactName : '',
    })
  }
  return out
}

export function mapDigest(data: Record<string, unknown> | undefined): DeskDigest | null {
  if (!data) return null
  const date = typeof data.date === 'string' ? data.date : ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  return {
    date,
    emailStatus: typeof data.emailStatus === 'string' ? data.emailStatus : 'off',
    overdue: lines(data.overdue),
    today: lines(data.today),
  }
}

export function digestDateLabel(date: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!match) return date
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) return date
  return `${day} ${MONTHS[month - 1]}`
}

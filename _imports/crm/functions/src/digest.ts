export type OpenTask = {
  id: string
  title: string
  contactId: string
  done: boolean
  dueAt: Date
}

export type DigestLine = {
  taskId: string
  title: string
  contactId: string
  contactName: string
  dueAt: string
}

export type DigestBody = {
  date: string
  timezone: string
  overdue: DigestLine[]
  today: DigestLine[]
  truncated: boolean
  emailed: boolean
  emailStatus: 'off' | 'sent' | 'error'
}

const CAP = 40

export function dayKey(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function bucketFor(due: Date, now: Date, timeZone: string): 'overdue' | 'today' | 'later' {
  const dueKey = dayKey(due, timeZone)
  const nowKey = dayKey(now, timeZone)
  if (dueKey < nowKey) return 'overdue'
  if (dueKey === nowKey) return 'today'
  return 'later'
}

export function buildDigest(input: {
  tasks: OpenTask[]
  names: Map<string, string>
  now: Date
  timeZone: string
  emailStatus?: DigestBody['emailStatus']
}): DigestBody {
  const overdue: DigestLine[] = []
  const today: DigestLine[] = []
  let truncated = false
  const open = input.tasks
    .filter((task) => !task.done && task.title.trim())
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())
  for (const task of open) {
    const bucket = bucketFor(task.dueAt, input.now, input.timeZone)
    if (bucket === 'later') continue
    const list = bucket === 'overdue' ? overdue : today
    if (list.length >= CAP) {
      truncated = true
      continue
    }
    list.push({
      taskId: task.id,
      title: task.title.trim().slice(0, 160),
      contactId: task.contactId,
      contactName: (input.names.get(task.contactId) ?? '').slice(0, 120),
      dueAt: task.dueAt.toISOString(),
    })
  }
  return {
    date: dayKey(input.now, input.timeZone),
    timezone: input.timeZone,
    overdue,
    today,
    truncated,
    emailed: input.emailStatus === 'sent',
    emailStatus: input.emailStatus ?? 'off',
  }
}

export async function resolveEmail(
  flag: string | undefined,
  send: () => Promise<void>,
): Promise<DigestBody['emailStatus']> {
  if (flag !== 'true') return 'off'
  try {
    await send()
    return 'sent'
  } catch {
    return 'error'
  }
}

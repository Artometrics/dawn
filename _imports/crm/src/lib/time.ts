const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

export function startOfDay(date: Date): Date {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function isBeforeDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() < startOfDay(b).getTime()
}

export function shiftDays(date: Date, days: number, hour = 9): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  next.setHours(hour, 0, 0, 0)
  return next
}

export function issueDate(date: Date): string {
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`
}

export type WhenBucket = 'overdue' | 'today' | 'later'

export function whenBucket(due: Date, now = new Date()): WhenBucket {
  if (isBeforeDay(due, now)) return 'overdue'
  if (isSameDay(due, now)) return 'today'
  return 'later'
}

export function dueLabel(due: Date, now = new Date()): string {
  const bucket = whenBucket(due, now)
  if (bucket === 'overdue') return 'Overdue'
  if (bucket === 'today') return 'Today'
  const tomorrow = shiftDays(now, 1)
  if (isSameDay(due, tomorrow)) return 'Tomorrow'
  return due.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export function money(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

export function shortWhen(date: Date, now = new Date()): string {
  if (isSameDay(date, now)) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

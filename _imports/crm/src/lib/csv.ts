import Papa from 'papaparse'

export const CSV_COLUMNS = ['name', 'company', 'email', 'phone', 'instagram', 'website', 'tags', 'source'] as const

export type ContactCsvRow = Record<(typeof CSV_COLUMNS)[number], string>

export function contactsToCsv(rows: ContactCsvRow[]): string {
  return `\uFEFF${Papa.unparse(rows, { columns: [...CSV_COLUMNS] })}`
}

export function parseContactsCsv(text: string): ContactCsvRow[] {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
  })
  return parsed.data
    .map((row) => {
      const lowered: Record<string, string> = {}
      for (const [key, value] of Object.entries(row)) {
        lowered[key.trim().toLowerCase()] = typeof value === 'string' ? value : ''
      }
      const next = {} as ContactCsvRow
      for (const column of CSV_COLUMNS) {
        next[column] = (lowered[column] ?? '').trim()
      }
      return next
    })
    .filter((row) => row.name.length > 0)
}

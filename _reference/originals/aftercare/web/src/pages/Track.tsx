import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Page } from '@/components/Page'
import { api } from '@/lib/api'

type Log = {
  id: number
  type: string
  value: number | null
  label: string | null
  notes: string | null
  loggedOn: string
}

export function TrackPage() {
  const [logs, setLogs] = useState<Log[]>([])
  const [value, setValue] = useState(3)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    try {
      const data = await api<{ logs: Log[] }>('/api/tracking')
      setLogs(data.logs)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load tracking')
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const moodLogs = useMemo(() => logs.filter((l) => l.type === 'mood').slice(0, 14).reverse(), [logs])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api('/api/tracking', {
        method: 'POST',
        body: JSON.stringify({ type: 'mood', value, label: `mood-${value}`, notes }),
      })
      setNotes('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Page title="Track" subtitle="Gentle mood check-ins over time.">
      <form className="panel form-stack" onSubmit={onSubmit}>
        <label>
          Mood today (1–5)
          <input type="range" min={1} max={5} value={value} onChange={(e) => setValue(Number(e.target.value))} />
          <span className="muted">Selected: {value}</span>
        </label>
        <label>
          Note
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button className="btn primary" type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Log check-in'}
        </button>
      </form>

      <div className="panel">
        <p className="eyebrow">Recent mood</p>
        <div className="chart">
          {moodLogs.map((log) => (
            <div key={log.id} className="bar-wrap" title={`${log.loggedOn}: ${log.value}`}>
              <div className="bar" style={{ height: `${((log.value || 0) / 5) * 100}%` }} />
              <span>{log.loggedOn.slice(5)}</span>
            </div>
          ))}
          {!moodLogs.length ? <p className="muted">No mood logs yet.</p> : null}
        </div>
      </div>
    </Page>
  )
}

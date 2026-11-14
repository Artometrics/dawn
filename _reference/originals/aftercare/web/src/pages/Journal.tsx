import { useEffect, useState, type FormEvent } from 'react'
import { Page } from '@/components/Page'
import { api } from '@/lib/api'

type Entry = {
  id: number
  title: string | null
  body: string
  mood: string | null
  createdAt: string | null
}

const moods = ['tender', 'clear', 'heavy', 'hopeful', 'restless', 'grateful']

export function JournalPage() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [mood, setMood] = useState('tender')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    try {
      const data = await api<{ entries: Entry[] }>('/api/journal')
      setEntries(data.entries)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load journal')
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api('/api/journal', {
        method: 'POST',
        body: JSON.stringify({ title, body, mood }),
      })
      setTitle('')
      setBody('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Page title="Journal" subtitle="Private notes that stay with your account.">
      <form className="panel form-stack" onSubmit={onSubmit}>
        <label>
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Optional" />
        </label>
        <label>
          How does it feel?
          <div className="chip-row">
            {moods.map((m) => (
              <button
                key={m}
                type="button"
                className={mood === m ? 'chip active' : 'chip'}
                onClick={() => setMood(m)}
              >
                {m}
              </button>
            ))}
          </div>
        </label>
        <label>
          Entry
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} required placeholder="Write freely…" />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button className="btn primary" type="submit" disabled={saving || !body.trim()}>
          {saving ? 'Saving…' : 'Save entry'}
        </button>
      </form>

      <div className="stack-list">
        {entries.map((entry) => (
          <article key={entry.id} className="panel entry">
            <header>
              <strong>{entry.title || 'Untitled'}</strong>
              <span className="muted">{entry.mood} · {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : ''}</span>
            </header>
            <p>{entry.body}</p>
          </article>
        ))}
        {!entries.length ? <p className="muted">No entries yet — your first note can be small.</p> : null}
      </div>
    </Page>
  )
}

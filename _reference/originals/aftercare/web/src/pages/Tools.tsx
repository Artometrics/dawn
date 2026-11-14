import { useEffect, useState, type FormEvent } from 'react'
import { Page } from '@/components/Page'
import { api } from '@/lib/api'
import { birthdayInsight, moonPhaseApprox } from '@/lib/calculators'

type ProfilePayload = {
  profile: {
    displayName: string | null
    birthDate: string | null
    birthTime: string | null
    birthPlace: string | null
  }
  insight: ReturnType<typeof birthdayInsight> | null
}

export function ToolsPage() {
  const [displayName, setDisplayName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [birthTime, setBirthTime] = useState('')
  const [birthPlace, setBirthPlace] = useState('')
  const [insight, setInsight] = useState<ReturnType<typeof birthdayInsight> | null>(null)
  const [moon, setMoon] = useState(moonPhaseApprox())
  const [calcDate, setCalcDate] = useState(new Date().toISOString().slice(0, 10))
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api<ProfilePayload>('/api/profile')
      .then((data) => {
        setDisplayName(data.profile.displayName || '')
        setBirthDate(data.profile.birthDate || '')
        setBirthTime(data.profile.birthTime || '')
        setBirthPlace(data.profile.birthPlace || '')
        setInsight(data.insight)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load profile'))
  }, [])

  async function onSave(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const data = await api<ProfilePayload>('/api/profile', {
        method: 'PUT',
        body: JSON.stringify({ displayName, birthDate, birthTime, birthPlace }),
      })
      setInsight(data.insight)
      setMessage('Saved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  function onCalc() {
    setMoon(moonPhaseApprox(new Date(`${calcDate}T12:00:00Z`)))
    if (birthDate) setInsight(birthdayInsight(birthDate))
  }

  return (
    <Page title="Tools" subtitle="Birthdays, moon phase, and soft calculations.">
      <form className="panel form-stack" onSubmit={onSave}>
        <h2 className="section-title">Birth profile</h2>
        <label>
          Display name
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </label>
        <label>
          Birth date
          <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
        </label>
        <label>
          Birth time
          <input type="time" value={birthTime} onChange={(e) => setBirthTime(e.target.value)} />
        </label>
        <label>
          Birth place
          <input value={birthPlace} onChange={(e) => setBirthPlace(e.target.value)} placeholder="City, region" />
        </label>
        {error ? <p className="error">{error}</p> : null}
        {message ? <p className="info">{message}</p> : null}
        <button className="btn primary" type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save profile'}
        </button>
      </form>

      {insight?.sunSign ? (
        <div className="panel insight-grid">
          <div><span className="muted">Sun</span><strong>{insight.sunSign}</strong></div>
          <div><span className="muted">Age</span><strong>{insight.age ?? '—'}</strong></div>
          <div><span className="muted">Next birthday</span><strong>{insight.nextBirthday?.daysUntil ?? '—'} days</strong></div>
          <div><span className="muted">Life path</span><strong>{insight.lifePath ?? '—'}</strong></div>
          <p className="full">{insight.note}</p>
          <p className="muted full">Reflective tools — not medical or scientific advice.</p>
        </div>
      ) : null}

      <div className="panel form-stack">
        <h2 className="section-title">Moon calculator</h2>
        <label>
          Date
          <input type="date" value={calcDate} onChange={(e) => setCalcDate(e.target.value)} />
        </label>
        <button className="btn ghost" type="button" onClick={onCalc}>Calculate</button>
        <p>
          <strong>{moon.name}</strong> · ~{moon.illumination}% illuminated · day {moon.ageDays} of the cycle
        </p>
      </div>
    </Page>
  )
}

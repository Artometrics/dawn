import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Page } from '@/components/Page'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'

type SkyResponse = {
  skyNote: string
  moon: { name: string; illumination: number }
  sunSign: string | null
  insight: { nextBirthday?: { daysUntil: number } | null; age?: number | null } | null
}

export function HomePage() {
  const { user } = useAuth()
  const [sky, setSky] = useState<SkyResponse | null>(null)

  useEffect(() => {
    api<SkyResponse>('/api/sky', { method: 'POST', body: '{}' })
      .then(setSky)
      .catch(() =>
        setSky({
          skyNote: 'Welcome home. Soften your breath and choose one gentle ritual.',
          moon: { name: 'Listening', illumination: 50 },
          sunSign: null,
          insight: null,
        }),
      )
  }, [])

  const name = user?.name || user?.email?.split('@')[0] || 'friend'

  return (
    <Page title={`Hello, ${name}`} subtitle="One ritual is enough for today.">
      <motion.div
        className="ritual-panel"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5 }}
      >
        <p className="eyebrow">Today’s sky</p>
        <p className="sky-note">{sky?.skyNote || 'Gathering the soft light…'}</p>
        <div className="meta-row">
          <span>{sky?.moon.name}</span>
          {sky?.sunSign ? <span>Sun in {sky.sunSign}</span> : <Link to="/app/tools">Add birthday</Link>}
          {sky?.insight?.nextBirthday ? <span>{sky.insight.nextBirthday.daysUntil}d to birthday</span> : null}
        </div>
      </motion.div>

      <div className="ritual-actions">
        <Link className="ritual-link" to="/app/journal">
          <strong>Journal</strong>
          <span>Write what you feel</span>
        </Link>
        <Link className="ritual-link" to="/app/tarot">
          <strong>Pull a card</strong>
          <span>Soft guidance, illustrated</span>
        </Link>
        <Link className="ritual-link" to="/app/track">
          <strong>Check in</strong>
          <span>Mood and gentle tracking</span>
        </Link>
      </div>
    </Page>
  )
}

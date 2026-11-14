import { useEffect, useState, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Page } from '@/components/Page'
import { api } from '@/lib/api'

type PullCard = {
  cardId: string
  name: string
  reversed: boolean
  position?: string
  imageUrl?: string | null
}

type Pull = {
  id: number
  spreadType: string
  cards: PullCard[]
  interpretation: string | null
  question: string | null
  createdAt: string | null
}

export function TarotPage() {
  const [spreadType, setSpreadType] = useState<'single' | 'three'>('single')
  const [question, setQuestion] = useState('')
  const [pull, setPull] = useState<Pull | null>(null)
  const [history, setHistory] = useState<Pull[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api<{ pulls: Pull[] }>('/api/tarot')
      .then((d) => setHistory(d.pulls))
      .catch(() => undefined)
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const data = await api<{ pull: Pull }>('/api/tarot', {
        method: 'POST',
        body: JSON.stringify({ spreadType, question, withArt: true }),
      })
      setPull(data.pull)
      setHistory((h) => [data.pull, ...h].slice(0, 30))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not pull cards')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Page title="Tarot" subtitle="Illustrated pulls with gentle interpretation.">
      <form className="panel form-stack" onSubmit={onSubmit}>
        <label>
          Spread
          <div className="chip-row">
            <button type="button" className={spreadType === 'single' ? 'chip active' : 'chip'} onClick={() => setSpreadType('single')}>
              Single card
            </button>
            <button type="button" className={spreadType === 'three' ? 'chip active' : 'chip'} onClick={() => setSpreadType('three')}>
              Past · Present · Future
            </button>
          </div>
        </label>
        <label>
          Question
          <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="What soft guidance do I need?" />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button className="btn primary" type="submit" disabled={loading}>
          {loading ? 'Shuffling & painting…' : 'Pull'}
        </button>
      </form>

      <AnimatePresence mode="wait">
        {pull ? (
          <motion.div
            key={pull.id}
            className="tarot-result"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className={`tarot-grid ${pull.spreadType}`}>
              {pull.cards.map((card, i) => (
                <motion.figure
                  key={`${card.cardId}-${i}`}
                  className={card.reversed ? 'tarot-card reversed' : 'tarot-card'}
                  initial={{ rotateY: 90, opacity: 0 }}
                  animate={{ rotateY: 0, opacity: 1 }}
                  transition={{ delay: 0.15 * i, duration: 0.55 }}
                >
                  {card.imageUrl ? (
                    <img src={card.imageUrl} alt={card.name} />
                  ) : (
                    <div className="tarot-fallback">{card.name}</div>
                  )}
                  <figcaption>
                    <span>{card.position}</span>
                    <strong>{card.name}{card.reversed ? ' · reversed' : ''}</strong>
                  </figcaption>
                </motion.figure>
              ))}
            </div>
            <div className="panel">
              <p className="eyebrow">Reading</p>
              <p>{pull.interpretation}</p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {history.length ? (
        <div className="stack-list">
          <h2 className="section-title">Recent pulls</h2>
          {history.slice(0, 5).map((h) => (
            <button key={h.id} type="button" className="panel entry linkish" onClick={() => setPull(h)}>
              <strong>{h.cards.map((c) => c.name).join(' · ')}</strong>
              <span className="muted">{h.createdAt ? new Date(h.createdAt).toLocaleString() : ''}</span>
            </button>
          ))}
        </div>
      ) : null}
    </Page>
  )
}

import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/lib/auth'

export function WelcomePage() {
  const { user } = useAuth()

  return (
    <div className="welcome">
      <div className="welcome-bg" aria-hidden />
      <motion.div
        className="welcome-content"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.p
          className="brand-hero"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.6 }}
        >
          Aftercare
        </motion.p>
        <h1>Astrology, tarot, and journaling — soft guidance for your inner life.</h1>
        <p className="lede">
          Check in with the stars, pull a card, write what you feel. A calm space that remembers you.
        </p>
        <div className="cta-row">
          {user ? (
            <Link className="btn primary" to="/app">Enter your space</Link>
          ) : (
            <>
              <Link className="btn primary" to="/signup">Begin</Link>
              <Link className="btn ghost" to="/login">I have an account</Link>
            </>
          )}
        </div>
      </motion.div>
      <motion.div
        className="welcome-visual"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 1 }}
      >
        <div className="orb orb-a" />
        <div className="orb orb-b" />
        <div className="card-fan" aria-hidden>
          <span /><span /><span />
        </div>
      </motion.div>
    </div>
  )
}

import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AuthError } from '@netlify/identity'
import { useAuth } from '@/lib/auth'

export function ForgotPage() {
  const { recover } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)
    try {
      await recover(email)
      setInfo('If that email exists, a recovery link is on its way.')
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'Could not send recovery email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={onSubmit}>
        <p className="brand-mini">Aftercare</p>
        <h1>Reset password</h1>
        <p className="muted">We’ll send a gentle recovery link to your inbox.</p>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        {error ? <p className="error">{error}</p> : null}
        {info ? <p className="info">{info}</p> : null}
        <button className="btn primary" type="submit" disabled={loading}>
          {loading ? 'Sending…' : 'Send link'}
        </button>
        <p className="auth-links">
          <Link to="/login">Back to sign in</Link>
        </p>
      </form>
    </div>
  )
}

import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { AuthError } from '@netlify/identity'
import { useAuth } from '@/lib/auth'

export function SignupPage() {
  const { user, signup } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to="/app" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)
    try {
      await signup(email, password, name)
      navigate('/app')
    } catch (err) {
      const message = err instanceof AuthError ? err.message : 'Could not create account'
      if (/confirm/i.test(message)) {
        setInfo('Check your email to confirm your account, then sign in.')
      } else {
        setError(message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={onSubmit}>
        <p className="brand-mini">Aftercare</p>
        <h1>Create your space</h1>
        <p className="muted">A private place for cards, birthdays, and soft notes.</p>
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </label>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" minLength={6} />
        </label>
        {error ? <p className="error">{error}</p> : null}
        {info ? <p className="info">{info}</p> : null}
        <button className="btn primary" type="submit" disabled={loading}>
          {loading ? 'Creating…' : 'Sign up'}
        </button>
        <p className="auth-links">
          <Link to="/login">Already have an account?</Link>
        </p>
      </form>
    </div>
  )
}

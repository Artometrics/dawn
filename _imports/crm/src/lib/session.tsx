import { explainAuth, consumeRedirect, signInApple, signInGoogle, signOutDesk } from '@/lib/auth'
import { isAllowedEmail } from '@/lib/allowlist'
import { useServices } from '@/lib/services'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

type SessionValue = {
  ready: boolean
  user: User | null
  allowed: boolean
  error: string | null
  clearError: () => void
  google: () => Promise<void>
  apple: () => Promise<void>
  preview: () => Promise<void>
  signOut: () => Promise<void>
}

const SessionContext = createContext<SessionValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const { auth } = useServices()
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (next) => {
      setUser(next)
      setReady(true)
    })
    consumeRedirect(auth).catch((err: unknown) => setError(explainAuth(err)))
    return unsub
  }, [auth])

  const value = useMemo<SessionValue>(() => {
    const run = (fn: () => Promise<void>) => async () => {
      setError(null)
      try {
        await fn()
      } catch (err) {
        setError(explainAuth(err))
      }
    }
    return {
      ready,
      user,
      allowed: Boolean(user && user.emailVerified && isAllowedEmail(user.email)),
      error,
      clearError: () => setError(null),
      google: run(() => signInGoogle(auth)),
      apple: run(() => signInApple(auth)),
      preview: run(async () => {
        if (!import.meta.env.DEV) return
        const { signInPreview } = await import('@/lib/previewAuth')
        await signInPreview(auth)
      }),
      signOut: run(() => signOutDesk(auth)),
    }
  }, [auth, error, ready, user])

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  const value = useContext(SessionContext)
  if (!value) throw new Error('Session is not ready')
  return value
}

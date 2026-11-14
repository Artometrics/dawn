import {
  getUser,
  login,
  logout,
  signup,
  requestPasswordRecovery,
  onAuthChange,
  handleAuthCallback,
  type User,
} from '@netlify/identity'
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

type AuthContextValue = {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<User>
  signup: (email: string, password: string, name?: string) => Promise<User>
  logout: () => Promise<void>
  recover: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function boot() {
      try {
        await handleAuthCallback().catch(() => null)
        const u = await getUser()
        if (active) setUser(u)
      } catch {
        if (active) setUser(null)
      } finally {
        if (active) setLoading(false)
      }
    }

    void boot()
    const unsub = onAuthChange((_event, u) => setUser(u))
    return () => {
      active = false
      unsub()
    }
  }, [])

  const value: AuthContextValue = {
    user,
    loading,
    login: async (email, password) => {
      const u = await login(email, password)
      setUser(u)
      return u
    },
    signup: async (email, password, name) => {
      const u = await signup(email, password, name ? { full_name: name } : undefined)
      setUser(u)
      return u
    },
    logout: async () => {
      await logout()
      setUser(null)
    },
    recover: async (email) => {
      await requestPasswordRecovery(email)
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

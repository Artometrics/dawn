import { NavLink, Outlet, Navigate, useNavigate } from 'react-router-dom'
import { BookOpen, Calculator, Home, LogOut, Sparkles, HeartPulse } from 'lucide-react'
import { useAuth } from '@/lib/auth'

const links = [
  { to: '/app', label: 'Home', icon: Home, end: true },
  { to: '/app/journal', label: 'Journal', icon: BookOpen },
  { to: '/app/tarot', label: 'Tarot', icon: Sparkles },
  { to: '/app/track', label: 'Track', icon: HeartPulse },
  { to: '/app/tools', label: 'Tools', icon: Calculator },
]

export function AppShell() {
  const { user, loading, logout } = useAuth()
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className="boot">
        <div className="boot-orb" />
        <p>Opening Aftercare…</p>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  async function onLogout() {
    await logout()
    navigate('/')
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand-mark">
          <span className="heart" aria-hidden>
            ♡
          </span>
          <div>
            <strong>Aftercare</strong>
            <small>soft guidance</small>
          </div>
        </div>
        <nav className="sidebar-nav" aria-label="Main">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'nav active' : 'nav')}>
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <button className="ghost-btn logout" type="button" onClick={onLogout}>
          <LogOut size={16} /> Sign out
        </button>
        <button
          className="ghost-btn logout-mobile"
          type="button"
          aria-label="Sign out"
          title="Sign out"
          onClick={onLogout}
        >
          <LogOut size={16} />
        </button>
      </aside>

      <main className="main">
        <Outlet />
      </main>

      <nav className="bottom-nav" aria-label="Main">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'tab active' : 'tab')}>
            <Icon size={20} strokeWidth={1.75} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

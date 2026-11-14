import { IconButton } from '@/components/ui'
import { QuickAdd } from '@/components/QuickAdd'
import { SearchPalette } from '@/components/SearchPalette'
import { useCrm } from '@/lib/crm'
import { issueDate, money } from '@/lib/time'
import { Kanban, ListTodo, Plus, Search, Settings, Sun, Users } from 'lucide-react'
import { Suspense, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useSearchParams } from 'react-router-dom'

const items = [
  { to: '/', label: 'Today', icon: Sun, on: (path: string) => path === '/' },
  { to: '/people', label: 'People', icon: Users, on: (path: string) => path.startsWith('/people') || path.startsWith('/companies') },
  { to: '/pipeline', label: 'Pipeline', icon: Kanban, on: (path: string) => path.startsWith('/pipeline') },
  { to: '/tasks', label: 'Tasks', icon: ListTodo, on: (path: string) => path.startsWith('/tasks') },
]

export function Shell() {
  const { deals, banner, setBanner, offline } = useCrm()
  const { pathname } = useLocation()
  const [params, setParams] = useSearchParams()
  const [addOpen, setAddOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const openValue = deals
    .filter((deal) => deal.stage !== 'won' && deal.stage !== 'lost')
    .reduce((sum, deal) => sum + deal.value, 0)

  useEffect(() => {
    if (params.get('add') === '1') {
      setAddOpen(true)
      const next = new URLSearchParams(params)
      next.delete('add')
      setParams(next, { replace: true })
    }
  }, [params, setParams])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target
      const typing = target instanceof HTMLElement && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      if (event.key === '/' && !typing) {
        event.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="min-h-dvh bg-ink text-cream">
      <div className="md:pl-[88px]">
        <header className="sticky top-0 z-20 bg-ink px-4 pt-[calc(0.75rem+env(safe-area-inset-top))]">
          <div className="flex items-center justify-between">
            <Link to="/" className="font-display text-[1.35rem] leading-none tracking-[0.12em]">
              ARTO
            </Link>
            <div className="flex">
              <IconButton label="Search" onClick={() => setSearchOpen(true)}>
                <Search size={22} />
              </IconButton>
              <Link to="/settings" aria-label="Settings" className="grid size-11 place-items-center">
                <Settings size={22} />
              </Link>
            </div>
          </div>
          <div className="issue-rule mt-2 h-1 bg-signal" />
          <div className="flex items-baseline justify-between py-2 text-[13px] font-semibold">
            <span>{issueDate(new Date())}</span>
            <span className="flex items-baseline gap-3">
              {offline ? <span className="text-cream-dim">On this phone</span> : null}
              <span className="tabular-nums text-tiffany">{money(openValue)} open</span>
            </span>
          </div>
        </header>
        {banner ? (
          <button type="button" className="block w-full bg-signal px-4 py-2 text-left text-sm font-semibold text-white" onClick={() => setBanner(null)}>
            {banner}
          </button>
        ) : null}
        <main className="px-4 pb-32 md:pb-16">
          <Suspense fallback={<p className="text-cream-dim">Opening.</p>}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      <nav aria-label="Desk" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ink pb-[env(safe-area-inset-bottom)] md:inset-y-0 md:right-auto md:flex md:w-[88px] md:flex-col md:border-t-0 md:border-r md:pt-[calc(1rem+env(safe-area-inset-top))] md:pb-4">
        <ul className="grid grid-cols-4 md:grid-cols-1 md:gap-2">
          {items.map((item) => {
            const Icon = item.icon
            const active = item.on(pathname)
            return (
              <li key={item.to}>
                <NavLink to={item.to} aria-current={active ? 'page' : undefined} className="grid min-h-14 place-items-center gap-0.5 py-1 text-[11px] font-semibold">
                  <Icon size={22} color={active ? '#E10600' : '#F4EFE6'} />
                  <span className={active ? 'text-cream' : 'text-cream-dim'}>{item.label}</span>
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>
      <button
        type="button"
        aria-label="Add person"
        className="fixed right-4 z-30 grid size-14 place-items-center bg-signal text-white bottom-[calc(4.75rem+env(safe-area-inset-bottom))] md:bottom-8"
        onClick={() => setAddOpen(true)}
      >
        <Plus size={26} />
      </button>
      <QuickAdd open={addOpen} onOpenChange={setAddOpen} />
      <SearchPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  )
}

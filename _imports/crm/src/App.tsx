import { AuthScreen, Denied } from '@/components/AuthScreen'
import { Shell } from '@/components/Shell'
import { Splash } from '@/components/Splash'
import { CrmProvider } from '@/lib/crm'
import { SessionProvider, useSession } from '@/lib/session'
import { lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

const TodayPage = lazy(() => import('@/pages/TodayPage').then((m) => ({ default: m.TodayPage })))
const PeoplePage = lazy(() => import('@/pages/PeoplePage').then((m) => ({ default: m.PeoplePage })))
const ContactPage = lazy(() => import('@/pages/ContactPage').then((m) => ({ default: m.ContactPage })))
const CompanyPage = lazy(() => import('@/pages/CompanyPage').then((m) => ({ default: m.CompanyPage })))
const PipelinePage = lazy(() => import('@/pages/PipelinePage').then((m) => ({ default: m.PipelinePage })))
const TasksPage = lazy(() => import('@/pages/TasksPage').then((m) => ({ default: m.TasksPage })))
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })))

export function App() {
  return (
    <SessionProvider>
      <Gate />
    </SessionProvider>
  )
}

function Gate() {
  const session = useSession()
  if (!session.ready) return <Splash />
  if (!session.user) return <AuthScreen />
  if (!session.allowed) return <Denied />
  return (
    <CrmProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Shell />}>
            <Route index element={<TodayPage />} />
            <Route path="people" element={<PeoplePage />} />
            <Route path="people/:id" element={<ContactPage />} />
            <Route path="companies/:id" element={<CompanyPage />} />
            <Route path="pipeline" element={<PipelinePage />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </CrmProvider>
  )
}

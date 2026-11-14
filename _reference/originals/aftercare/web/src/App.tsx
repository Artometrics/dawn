import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/lib/auth'
import { AppShell } from '@/components/AppShell'
import { WelcomePage } from '@/pages/Welcome'
import { LoginPage } from '@/pages/Login'
import { SignupPage } from '@/pages/Signup'
import { ForgotPage } from '@/pages/Forgot'
import { HomePage } from '@/pages/Home'
import { JournalPage } from '@/pages/Journal'
import { TarotPage } from '@/pages/Tarot'
import { TrackPage } from '@/pages/Track'
import { ToolsPage } from '@/pages/Tools'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot" element={<ForgotPage />} />
          <Route path="/app" element={<AppShell />}>
            <Route index element={<HomePage />} />
            <Route path="journal" element={<JournalPage />} />
            <Route path="tarot" element={<TarotPage />} />
            <Route path="track" element={<TrackPage />} />
            <Route path="tools" element={<ToolsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

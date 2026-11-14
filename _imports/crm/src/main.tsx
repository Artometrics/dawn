import { App } from '@/App'
import { BootError, Splash } from '@/components/Splash'
import { bootFirebase, type Services } from '@/lib/firebase'
import { ServicesProvider } from '@/lib/services'
import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/anton/latin-400.css'
import '@fontsource/source-sans-3/latin-400.css'
import '@fontsource/source-sans-3/latin-600.css'
import '@/index.css'

function Root() {
  const [services, setServices] = useState<Services | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    bootFirebase().then(setServices).catch((err: unknown) => {
      setError(err instanceof Error ? err.message : 'Could not start')
    })
  }, [])

  if (error) return <BootError message={error} />
  if (!services) return <Splash />
  return (
    <ServicesProvider value={services}>
      <App />
    </ServicesProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)

import { createContext, useContext, type ReactNode } from 'react'
import type { Services } from '@/lib/firebase'

const ServicesContext = createContext<Services | null>(null)

export function ServicesProvider({ value, children }: { value: Services; children: ReactNode }) {
  return <ServicesContext.Provider value={value}>{children}</ServicesContext.Provider>
}

export function useServices() {
  const value = useContext(ServicesContext)
  if (!value) throw new Error('Firebase is not ready')
  return value
}

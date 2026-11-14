import { explainWrite } from '@/lib/auth'
import { clearDemo } from '@/lib/api'
import { seedDemo } from '@/lib/seed'
import { useServices } from '@/lib/services'
import { useSession } from '@/lib/session'
import { isStage, type Activity, type ActivityKind, type Company, type Contact, type Deal, type DeskFile, type Note, type Task } from '@/lib/types'
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

type CrmValue = {
  ready: boolean
  offline: boolean
  banner: string | null
  setBanner: (message: string | null) => void
  contacts: Contact[]
  companies: Company[]
  deals: Deal[]
  tasks: Task[]
  notes: Note[]
  demoBusy: boolean
  loadDemo: () => Promise<void>
  wipeDemo: () => Promise<void>
}

const CrmContext = createContext<CrmValue | null>(null)

function asDate(value: unknown): Date | null {
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate()
  }
  return null
}

function str(data: DocumentData, key: string): string {
  const value = data[key]
  return typeof value === 'string' ? value : ''
}

function bool(data: DocumentData, key: string): boolean {
  return data[key] === true
}

function mapContact(snap: QueryDocumentSnapshot): Contact {
  const data = snap.data()
  const tags = Array.isArray(data.tags) ? data.tags.filter((tag): tag is string => typeof tag === 'string') : []
  return {
    id: snap.id,
    name: str(data, 'name'),
    companyId: str(data, 'companyId'),
    companyName: str(data, 'companyName'),
    email: str(data, 'email'),
    phone: str(data, 'phone'),
    instagram: str(data, 'instagram'),
    website: str(data, 'website'),
    tags,
    source: str(data, 'source'),
    ownerUid: str(data, 'ownerUid'),
    demo: bool(data, 'demo'),
    createdAt: asDate(data.createdAt),
    updatedAt: asDate(data.updatedAt),
  }
}

function mapCompany(snap: QueryDocumentSnapshot): Company {
  const data = snap.data()
  return {
    id: snap.id,
    name: str(data, 'name'),
    website: str(data, 'website'),
    phone: str(data, 'phone'),
    notes: str(data, 'notes'),
    ownerUid: str(data, 'ownerUid'),
    demo: bool(data, 'demo'),
    createdAt: asDate(data.createdAt),
    updatedAt: asDate(data.updatedAt),
  }
}

function mapDeal(snap: QueryDocumentSnapshot): Deal {
  const data = snap.data()
  const stage = str(data, 'stage')
  return {
    id: snap.id,
    title: str(data, 'title'),
    contactId: str(data, 'contactId'),
    companyId: str(data, 'companyId'),
    contactName: str(data, 'contactName'),
    companyName: str(data, 'companyName'),
    stage: isStage(stage) ? stage : 'lead',
    value: typeof data.value === 'number' ? data.value : 0,
    currency: str(data, 'currency') || 'USD',
    ownerUid: str(data, 'ownerUid'),
    demo: bool(data, 'demo'),
    createdAt: asDate(data.createdAt),
    updatedAt: asDate(data.updatedAt),
  }
}

function mapTask(snap: QueryDocumentSnapshot): Task {
  const data = snap.data()
  return {
    id: snap.id,
    title: str(data, 'title'),
    contactId: str(data, 'contactId'),
    dueAt: asDate(data.dueAt),
    done: bool(data, 'done'),
    notes: str(data, 'notes'),
    ownerUid: str(data, 'ownerUid'),
    demo: bool(data, 'demo'),
    createdAt: asDate(data.createdAt),
    updatedAt: asDate(data.updatedAt),
  }
}

function mapNote(snap: QueryDocumentSnapshot): Note {
  const data = snap.data()
  return {
    id: snap.id,
    contactId: str(data, 'contactId'),
    body: str(data, 'body'),
    authorUid: str(data, 'authorUid'),
    authorName: str(data, 'authorName'),
    demo: bool(data, 'demo'),
    createdAt: asDate(data.createdAt),
    updatedAt: asDate(data.updatedAt),
    occurredAt: asDate(data.occurredAt),
  }
}

export function mapActivity(snap: QueryDocumentSnapshot): Activity {
  const data = snap.data()
  const kind = str(data, 'kind')
  const allowed: ActivityKind[] = ['created', 'note', 'stage', 'task', 'edit', 'file', 'draft']
  return {
    id: snap.id,
    contactId: str(data, 'contactId'),
    kind: allowed.includes(kind as ActivityKind) ? (kind as ActivityKind) : 'edit',
    summary: str(data, 'summary'),
    actorUid: str(data, 'actorUid'),
    demo: bool(data, 'demo'),
    createdAt: asDate(data.createdAt),
    occurredAt: asDate(data.occurredAt),
  }
}

export function mapFile(snap: QueryDocumentSnapshot): DeskFile {
  const data = snap.data()
  return {
    id: snap.id,
    contactId: str(data, 'contactId'),
    name: str(data, 'name'),
    storagePath: str(data, 'storagePath'),
    contentType: str(data, 'contentType'),
    size: typeof data.size === 'number' ? data.size : 0,
    ownerUid: str(data, 'ownerUid'),
    demo: bool(data, 'demo'),
    createdAt: asDate(data.createdAt),
  }
}

export function CrmProvider({ children }: { children: ReactNode }) {
  const { db, storage } = useServices()
  const { user } = useSession()
  const [ready, setReady] = useState(false)
  const [offline, setOffline] = useState(!navigator.onLine)
  const [fromCache, setFromCache] = useState(false)
  const [banner, setBanner] = useState<string | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [demoBusy, setDemoBusy] = useState(false)

  useEffect(() => {
    const on = () => setOffline(!navigator.onLine)
    window.addEventListener('online', on)
    window.addEventListener('offline', on)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', on)
    }
  }, [])

  useEffect(() => {
    let hits = 0
    const mark = (cached: boolean) => {
      setFromCache(cached)
      hits += 1
      if (hits >= 4) setReady(true)
    }
    const fail = (error: unknown) => {
      setBanner(explainWrite(error))
      setReady(true)
    }
    const unsubs = [
      onSnapshot(query(collection(db, 'contacts'), orderBy('updatedAt', 'desc'), limit(2000)), (snap) => {
        setContacts(snap.docs.map(mapContact))
        mark(snap.metadata.fromCache)
      }, fail),
      onSnapshot(query(collection(db, 'companies'), orderBy('name', 'asc'), limit(2000)), (snap) => {
        setCompanies(snap.docs.map(mapCompany))
        mark(snap.metadata.fromCache)
      }, fail),
      onSnapshot(query(collection(db, 'deals'), orderBy('updatedAt', 'desc'), limit(2000)), (snap) => {
        setDeals(snap.docs.map(mapDeal))
        mark(snap.metadata.fromCache)
      }, fail),
      onSnapshot(query(collection(db, 'tasks'), orderBy('dueAt', 'asc'), limit(2000)), (snap) => {
        setTasks(snap.docs.map(mapTask))
        mark(snap.metadata.fromCache)
      }, fail),
      onSnapshot(query(collection(db, 'notes'), orderBy('occurredAt', 'desc'), limit(800)), (snap) => {
        setNotes(snap.docs.map(mapNote))
      }, fail),
    ]
    return () => unsubs.forEach((unsub) => unsub())
  }, [db])

  const value = useMemo<CrmValue>(() => ({
    ready,
    offline: offline || fromCache,
    banner,
    setBanner,
    contacts,
    companies,
    deals,
    tasks,
    notes,
    demoBusy,
    loadDemo: async () => {
      if (!user) return
      setDemoBusy(true)
      try {
        await seedDemo(db, user)
      } catch (error) {
        setBanner(explainWrite(error))
      } finally {
        setDemoBusy(false)
      }
    },
    wipeDemo: async () => {
      setDemoBusy(true)
      try {
        await clearDemo(db, storage)
      } catch (error) {
        setBanner(explainWrite(error))
      } finally {
        setDemoBusy(false)
      }
    },
  }), [banner, companies, contacts, db, deals, demoBusy, fromCache, notes, offline, ready, storage, tasks, user])

  return <CrmContext.Provider value={value}>{children}</CrmContext.Provider>
}

export function useCrm() {
  const value = useContext(CrmContext)
  if (!value) throw new Error('Desk data is not ready')
  return value
}

import { Button, controlClass, Field, Sheet } from '@/components/ui'
import {
  createNote,
  createTask,
  deleteContact,
  deleteDeskFile,
  setTaskDone,
  updateContact,
  uploadContactFile,
} from '@/lib/api'
import { explainWrite } from '@/lib/auth'
import { useCrm, mapActivity, mapFile } from '@/lib/crm'
import type { ContactDraft } from '@/lib/fields'
import { useServices } from '@/lib/services'
import { useSession } from '@/lib/session'
import { dueLabel, money, shiftDays, shortWhen } from '@/lib/time'
import { stageLabel, type Activity, type DeskFile } from '@/lib/types'
import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { getDownloadURL, ref } from 'firebase/storage'
import { ArrowLeft, AtSign, Copy, Globe, Mail, Paperclip, Phone, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

export function ContactPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { db, storage, app, emulators, appCheck } = useServices()
  const { user } = useSession()
  const crm = useCrm()
  const contact = crm.contacts.find((item) => item.id === id)
  const deals = crm.deals.filter((deal) => deal.contactId === id)
  const tasks = crm.tasks.filter((task) => task.contactId === id)
  const [activities, setActivities] = useState<Activity[]>([])
  const [files, setFiles] = useState<DeskFile[]>([])
  const [note, setNote] = useState('')
  const [edit, setEdit] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [draft, setDraft] = useState('')
  const [aiBusy, setAiBusy] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const notes = crm.notes.filter((item) => item.contactId === id)

  useEffect(() => {
    if (!id) return
    const notesUnsub = () => undefined
    const act = onSnapshot(
      query(collection(db, 'activities'), where('contactId', '==', id), orderBy('occurredAt', 'desc'), limit(100)),
      (snap) => setActivities(snap.docs.map(mapActivity)),
      (error) => crm.setBanner(explainWrite(error)),
    )
    const fileUnsub = onSnapshot(
      query(collection(db, 'files'), where('contactId', '==', id), orderBy('createdAt', 'desc'), limit(40)),
      (snap) => setFiles(snap.docs.map(mapFile)),
      (error) => crm.setBanner(explainWrite(error)),
    )
    return () => {
      notesUnsub()
      act()
      fileUnsub()
    }
  }, [crm.setBanner, db, id])

  const stream = useMemo(() => {
    const rows = [
      ...notes.map((item) => ({ id: item.id, at: item.occurredAt?.getTime() ?? 0, kind: 'note' as const, text: item.body, when: item.occurredAt })),
      ...activities
        .filter((item) => item.kind !== 'note' && item.kind !== 'draft')
        .map((item) => ({ id: item.id, at: item.occurredAt?.getTime() ?? 0, kind: 'activity' as const, text: item.summary, when: item.occurredAt })),
    ]
    return rows.sort((a, b) => b.at - a.at)
  }, [activities, notes])

  if (!contact) {
    return (
      <div>
        <Link to="/people" className="inline-flex min-h-11 items-center gap-2 text-sm"><ArrowLeft size={18} /> People</Link>
        <p className="mt-6">{crm.ready ? 'That person is gone.' : 'Opening the desk.'}</p>
      </div>
    )
  }

  async function runAi(mode: 'summary' | 'draft') {
    if (!contact) return
    if (emulators || !appCheck) {
      crm.setBanner('Drafts run on the live project after AI Logic and App Check are on. Nothing is sent.')
      return
    }
    setAiBusy(true)
    try {
      const { askDesk, historyText } = await import('@/lib/ai')
      setDraft(await askDesk(app, historyText(contact, notes, activities, deals, tasks), mode))
    } catch (error) {
      crm.setBanner(`${explainWrite(error)} Nothing was sent.`)
    } finally {
      setAiBusy(false)
    }
  }

  return (
    <div>
      <Link to="/people" className="inline-flex min-h-11 items-center gap-2 text-sm text-cream-dim"><ArrowLeft size={18} /> People</Link>
      <div className="mt-2 flex items-start justify-between gap-3">
        <h1 className="font-display text-[2.4rem] leading-none break-words">{contact.name}</h1>
        <button type="button" className="min-h-11 text-sm font-semibold text-tiffany" onClick={() => setEdit(true)}>Edit</button>
      </div>
      {contact.companyId ? (
        <Link to={`/companies/${contact.companyId}`} className="mt-2 inline-block text-cream-dim">{contact.companyName}</Link>
      ) : contact.companyName ? <p className="mt-2 text-cream-dim">{contact.companyName}</p> : null}
      <div className="mt-4 flex gap-2">
        {contact.phone ? <a className="grid size-11 place-items-center bg-raise" aria-label="Call" href={`tel:${contact.phone}`}><Phone size={18} /></a> : null}
        {contact.email ? <a className="grid size-11 place-items-center bg-raise" aria-label="Email" href={`mailto:${contact.email}`}><Mail size={18} /></a> : null}
        {contact.instagram ? (
          <a className="inline-flex min-h-11 items-center gap-2 bg-raise px-3" aria-label="Instagram" href={`https://instagram.com/${contact.instagram}`}>
            <AtSign size={18} />
            {contact.instagram}
          </a>
        ) : null}
        {contact.website ? <a className="grid size-11 place-items-center bg-raise" aria-label="Website" href={contact.website}><Globe size={18} /></a> : null}
      </div>
      {contact.tags.length > 0 ? <p className="mt-4 text-sm text-tiffany">{contact.tags.join(' · ')}</p> : null}

      {deals.length > 0 ? (
        <section className="mt-8">
          <h2 className="font-display text-[1.6rem] leading-none">Deals</h2>
          <ul>
            {deals.map((deal) => (
              <li key={deal.id} className="border-b border-line">
                <Link to={`/pipeline?deal=${deal.id}`} className="flex min-h-14 items-center justify-between gap-3">
                  <span>{deal.title}<span className="mt-0.5 block text-[13px] text-cream-dim">{stageLabel(deal.stage)}</span></span>
                  <span className="tabular-nums text-tiffany">{money(deal.value)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="font-display text-[1.6rem] leading-none">Follow-ups</h2>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            if (!user) return
            try {
              const pending = createTask(db, user, { title: taskTitle, contactId: contact.id, dueAt: shiftDays(new Date(), 0) }, contact.demo)
              setTaskTitle('')
              void pending.catch((error: unknown) => crm.setBanner(explainWrite(error)))
            } catch (error) {
              crm.setBanner(explainWrite(error))
            }
          }}
        >
          <input className={controlClass} placeholder="Next step" value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} />
          <Button type="submit">Add</Button>
        </form>
        <ul>
          {tasks.map((task) => (
            <li key={task.id} className="flex min-h-12 items-center gap-2 border-b border-line">
              <button type="button" aria-label={task.done ? 'Mark open' : 'Mark done'} className="grid size-11 place-items-center" onClick={() => void setTaskDone(db, task.id, !task.done)}>
                <span className={`size-4 border ${task.done ? 'bg-tiffany border-tiffany' : 'border-cream'}`} />
              </button>
              <span className="flex-1">{task.title}</span>
              <span className="text-[13px] text-cream-dim">{task.dueAt ? dueLabel(task.dueAt) : ''}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-[1.6rem] leading-none">Note</h2>
        <form
          className="mt-3"
          onSubmit={(event) => {
            event.preventDefault()
            if (!user) return
            try {
              const pending = createNote(db, user, contact.id, note, contact.demo)
              setNote('')
              void pending.catch((error: unknown) => crm.setBanner(explainWrite(error)))
            } catch (error) {
              crm.setBanner(explainWrite(error))
            }
          }}
        >
          <textarea className={`${controlClass} min-h-24 py-3`} value={note} onChange={(event) => setNote(event.target.value)} placeholder="What happened" />
          <Button type="submit" className="mt-3">Save note</Button>
        </form>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-[1.6rem] leading-none">Timeline</h2>
        <ul className="mt-3">
          {stream.map((item) => (
            <li key={item.id} className="border-b border-line py-3">
              <p className="text-[13px] text-cream-dim">{item.when ? shortWhen(item.when) : ''}</p>
              <p className="mt-1 whitespace-pre-wrap">{item.text}</p>
            </li>
          ))}
          {stream.length === 0 ? <li className="text-cream-dim">No history yet.</li> : null}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-[1.6rem] leading-none">Files</h2>
        <label className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-tiffany">
          <Paperclip size={18} /> Add file
          <input
            type="file"
            accept="image/*,application/pdf,text/plain,.heic,.heif"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (!file || !user) return
              void uploadContactFile(db, storage, user, contact, file).catch((error: unknown) => crm.setBanner(explainWrite(error)))
            }}
          />
        </label>
        <ul>
          {files.map((file) => (
            <FileRow key={file.id} file={file} onDelete={() => void deleteDeskFile(db, storage, file).catch((error: unknown) => crm.setBanner(explainWrite(error)))} />
          ))}
        </ul>
      </section>

      <section className="mt-8 mb-6">
        <h2 className="font-display text-[1.6rem] leading-none">Draft</h2>
        <p className="mt-2 text-sm text-cream-dim">Summary and follow-up stay here. Nothing is sent.</p>
        <div className="mt-3 flex gap-2">
          <Button variant="quiet" disabled={aiBusy} onClick={() => void runAi('summary')}><Sparkles size={16} /> Summarize</Button>
          <Button variant="line" disabled={aiBusy} onClick={() => void runAi('draft')}>Follow-up</Button>
        </div>
        {draft ? (
          <div className="mt-4 border border-line p-3">
            <p className="text-[13px] font-semibold text-tiffany">Not sent</p>
            <p className="mt-2 whitespace-pre-wrap">{draft}</p>
            <div className="mt-3 flex gap-2">
              <Button
                variant="quiet"
                onClick={() => {
                  void navigator.clipboard.writeText(draft).then(() => crm.setBanner('Copied. Not sent.')).catch(() => crm.setBanner('Copy failed.'))
                }}
              >
                <Copy size={16} /> Copy
              </Button>
              <Button
                onClick={() => {
                  if (!user) return
                  try {
                    const pending = createNote(db, user, contact.id, draft, contact.demo, 'draft')
                    setDraft('')
                    crm.setBanner('Saved on the timeline. Not sent.')
                    void pending.catch((error: unknown) => crm.setBanner(explainWrite(error)))
                  } catch (error) {
                    crm.setBanner(explainWrite(error))
                  }
                }}
              >
                Save draft
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      <button type="button" className="mb-8 min-h-11 text-sm text-cream-dim" onClick={() => setConfirm(true)}>Remove person</button>
      <EditContact open={edit} contactId={contact.id} onOpenChange={setEdit} />
      <Sheet open={confirm} onOpenChange={setConfirm} title="Remove" hint={`Remove ${contact.name} and their notes.`}>
        <Button
          className="w-full"
          onClick={() => {
            void deleteContact(db, storage, contact.id)
              .then(() => navigate('/people'))
              .catch((error: unknown) => crm.setBanner(explainWrite(error)))
          }}
        >
          Remove
        </Button>
      </Sheet>
    </div>
  )
}

function FileRow({ file, onDelete }: { file: DeskFile; onDelete: () => void }) {
  const { storage } = useServices()
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    getDownloadURL(ref(storage, file.storagePath)).then((next) => {
      if (live) setUrl(next)
    }).catch(() => undefined)
    return () => {
      live = false
    }
  }, [file.storagePath, storage])
  return (
    <li className="flex min-h-12 items-center justify-between gap-3 border-b border-line">
      {url ? <a href={url} className="truncate text-tiffany">{file.name}</a> : <span className="truncate">{file.name}</span>}
      <button type="button" className="min-h-11 text-sm text-cream-dim" onClick={onDelete}>Remove</button>
    </li>
  )
}

function EditContact({ open, onOpenChange, contactId }: { open: boolean; onOpenChange: (open: boolean) => void; contactId: string }) {
  const { db } = useServices()
  const { user } = useSession()
  const { contacts, companies, setBanner } = useCrm()
  const contact = contacts.find((item) => item.id === contactId)
  const [draft, setDraft] = useState<ContactDraft>({ name: '', companyName: '', email: '', phone: '', instagram: '', website: '', tags: '', source: '' })

  useEffect(() => {
    if (!contact || !open) return
    setDraft({
      name: contact.name,
      companyName: contact.companyName,
      email: contact.email,
      phone: contact.phone,
      instagram: contact.instagram,
      website: contact.website,
      tags: contact.tags.join(', '),
      source: contact.source,
    })
  }, [contact, open])

  if (!contact) return null

  function set<K extends keyof ContactDraft>(key: K, value: string) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Edit">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          if (!user || !contact) return
          try {
            const pending = updateContact(db, user, contact, draft, companies)
            onOpenChange(false)
            void pending.catch((error: unknown) => setBanner(explainWrite(error)))
          } catch (error) {
            setBanner(explainWrite(error))
          }
        }}
      >
        <Field label="Name"><input className={controlClass} value={draft.name} onChange={(event) => set('name', event.target.value)} /></Field>
        <Field label="Company"><input className={controlClass} value={draft.companyName} onChange={(event) => set('companyName', event.target.value)} /></Field>
        <Field label="Email"><input className={controlClass} inputMode="email" value={draft.email} onChange={(event) => set('email', event.target.value)} /></Field>
        <Field label="Phone"><input className={controlClass} inputMode="tel" value={draft.phone} onChange={(event) => set('phone', event.target.value)} /></Field>
        <Field label="Instagram"><input className={controlClass} value={draft.instagram} onChange={(event) => set('instagram', event.target.value)} /></Field>
        <Field label="Website"><input className={controlClass} inputMode="url" value={draft.website} onChange={(event) => set('website', event.target.value)} /></Field>
        <Field label="Tags"><input className={controlClass} value={draft.tags} onChange={(event) => set('tags', event.target.value)} /></Field>
        <Field label="Source">
          <input className={controlClass} list="sources" value={draft.source} onChange={(event) => set('source', event.target.value)} />
          <datalist id="sources">
            <option value="Instagram" />
            <option value="YouTube" />
            <option value="Referral" />
            <option value="Website" />
            <option value="Intro" />
          </datalist>
        </Field>
        <Button type="submit" className="w-full">Save</Button>
      </form>
    </Sheet>
  )
}

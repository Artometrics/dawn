import { Button, controlClass, Field, Sheet } from '@/components/ui'
import { createContact, createTask } from '@/lib/api'
import { explainWrite } from '@/lib/auth'
import { useCrm } from '@/lib/crm'
import { useServices } from '@/lib/services'
import { useSession } from '@/lib/session'
import { shiftDays } from '@/lib/time'
import { useState } from 'react'

const blank = { name: '', companyName: '', email: '', phone: '' }

export function QuickAdd({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { db } = useServices()
  const { user } = useSession()
  const { companies, setBanner } = useCrm()
  const [draft, setDraft] = useState(blank)
  const [follow, setFollow] = useState(true)
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof typeof blank>(key: K, value: string) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function save() {
    if (!user) return
    setError(null)
    try {
      const created = createContact(
        db,
        user,
        { ...draft, instagram: '', website: '', tags: '', source: '' },
        companies,
      )
      if (follow && draft.name.trim()) {
        void createTask(db, user, {
          title: `Follow up ${draft.name.trim()}`,
          contactId: created.id,
          dueAt: shiftDays(new Date(), 1),
        }).catch((err: unknown) => setBanner(explainWrite(err)))
      }
      onOpenChange(false)
      setDraft(blank)
      setFollow(true)
      void created.pending.catch((err: unknown) => setBanner(explainWrite(err)))
    } catch (err) {
      setError(explainWrite(err))
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Add" hint="Name is enough.">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          save()
        }}
      >
        <Field label="Name">
          <input className={controlClass} value={draft.name} autoComplete="name" onChange={(event) => set('name', event.target.value)} />
        </Field>
        <Field label="Company">
          <input className={controlClass} value={draft.companyName} onChange={(event) => set('companyName', event.target.value)} />
        </Field>
        <Field label="Phone">
          <input className={controlClass} inputMode="tel" autoComplete="tel" value={draft.phone} onChange={(event) => set('phone', event.target.value)} />
        </Field>
        <Field label="Email">
          <input className={controlClass} inputMode="email" autoComplete="email" value={draft.email} onChange={(event) => set('email', event.target.value)} />
        </Field>
        <label className="mb-4 flex min-h-11 items-center gap-3 text-sm">
          <input type="checkbox" checked={follow} onChange={(event) => setFollow(event.target.checked)} />
          Follow up tomorrow
        </label>
        {error ? <p className="mb-3 text-sm text-cream">{error}</p> : null}
        <Button type="submit" className="w-full">Save</Button>
      </form>
    </Sheet>
  )
}

import { Button, controlClass, Field, PageTitle, Sheet } from '@/components/ui'
import { createCompany } from '@/lib/api'
import { explainWrite } from '@/lib/auth'
import { useCrm } from '@/lib/crm'
import { useServices } from '@/lib/services'
import { useSession } from '@/lib/session'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

export function PeoplePage() {
  const { contacts, companies, ready, setBanner } = useCrm()
  const { db } = useServices()
  const { user } = useSession()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'companies' ? 'companies' : 'people'
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', website: '', phone: '' })

  function saveCompany() {
    if (!user) return
    try {
      const pending = createCompany(db, user, { ...form, notes: '' })
      setOpen(false)
      setForm({ name: '', website: '', phone: '' })
      void pending.catch((error: unknown) => setBanner(explainWrite(error)))
    } catch (error) {
      setBanner(explainWrite(error))
    }
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <PageTitle>{tab === 'people' ? 'People' : 'Companies'}</PageTitle>
        {tab === 'companies' ? (
          <button type="button" className="mb-1 min-h-11 text-sm font-semibold text-tiffany" onClick={() => setOpen(true)}>
            Add
          </button>
        ) : null}
      </div>
      <div className="mt-4 flex gap-2">
        {(['people', 'companies'] as const).map((item) => (
          <button
            key={item}
            type="button"
            className={`min-h-11 px-3 text-sm font-semibold ${tab === item ? 'bg-signal text-white' : 'bg-raise text-cream'}`}
            onClick={() => {
              const next = new URLSearchParams(params)
              if (item === 'companies') next.set('tab', 'companies')
              else next.delete('tab')
              setParams(next, { replace: true })
            }}
          >
            {item === 'people' ? 'People' : 'Companies'}
          </button>
        ))}
      </div>
      {!ready ? <p className="mt-6 text-cream-dim">Opening the desk.</p> : null}
      {tab === 'people' ? (
        <ul className="mt-4">
          {contacts.map((contact) => (
            <li key={contact.id} className="border-b border-line">
              <Link to={`/people/${contact.id}`} className="flex min-h-16 items-center justify-between gap-3">
                <span>
                  <span className="block text-lg">{contact.name}</span>
                  <span className="text-[13px] text-cream-dim">{[contact.companyName, contact.tags[0]].filter(Boolean).join(' · ') || contact.source || 'Person'}</span>
                </span>
                {contact.demo ? <span className="text-[11px] font-semibold uppercase tracking-wide text-tiffany">Demo</span> : null}
              </Link>
            </li>
          ))}
          {ready && contacts.length === 0 ? <li className="mt-6 text-cream-dim">Nobody on the desk.</li> : null}
        </ul>
      ) : (
        <ul className="mt-4">
          {companies.map((company) => (
            <li key={company.id} className="border-b border-line">
              <Link to={`/companies/${company.id}`} className="flex min-h-16 items-center justify-between gap-3">
                <span>
                  <span className="block text-lg">{company.name}</span>
                  <span className="text-[13px] text-cream-dim">{company.website.replace(/^https?:\/\//, '') || 'Company'}</span>
                </span>
              </Link>
            </li>
          ))}
          {ready && companies.length === 0 ? <li className="mt-6 text-cream-dim">No companies.</li> : null}
        </ul>
      )}
      <Sheet open={open} onOpenChange={setOpen} title="Company">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            saveCompany()
          }}
        >
          <Field label="Name">
            <input className={controlClass} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </Field>
          <Field label="Website">
            <input className={controlClass} inputMode="url" value={form.website} onChange={(event) => setForm({ ...form, website: event.target.value })} />
          </Field>
          <Field label="Phone">
            <input className={controlClass} inputMode="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          </Field>
          <Button type="submit" className="w-full">Save</Button>
        </form>
      </Sheet>
    </div>
  )
}

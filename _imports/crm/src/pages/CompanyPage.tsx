import { Button, controlClass, Field, Sheet } from '@/components/ui'
import { deleteCompany, updateCompany } from '@/lib/api'
import { explainWrite } from '@/lib/auth'
import { useCrm } from '@/lib/crm'
import { useServices } from '@/lib/services'
import { money } from '@/lib/time'
import { stageLabel } from '@/lib/types'
import { ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

export function CompanyPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { db } = useServices()
  const crm = useCrm()
  const company = crm.companies.find((item) => item.id === id)
  const people = crm.contacts.filter((contact) => contact.companyId === id)
  const deals = crm.deals.filter((deal) => deal.companyId === id)
  const [edit, setEdit] = useState(false)
  const [form, setForm] = useState({ name: '', website: '', phone: '', notes: '' })

  useEffect(() => {
    if (!company) return
    setForm({ name: company.name, website: company.website, phone: company.phone, notes: company.notes })
  }, [company])

  if (!company) {
    return (
      <div>
        <Link to="/people?tab=companies" className="inline-flex min-h-11 items-center gap-2 text-sm"><ArrowLeft size={18} /> Companies</Link>
        <p className="mt-6">{crm.ready ? 'That company is gone.' : 'Opening the desk.'}</p>
      </div>
    )
  }

  return (
    <div>
      <Link to="/people?tab=companies" className="inline-flex min-h-11 items-center gap-2 text-sm text-cream-dim"><ArrowLeft size={18} /> Companies</Link>
      <div className="mt-2 flex items-start justify-between gap-3">
        <h1 className="font-display text-[2.4rem] leading-none break-words">{company.name}</h1>
        <button type="button" className="min-h-11 text-sm font-semibold text-tiffany" onClick={() => setEdit(true)}>Edit</button>
      </div>
      {company.website ? <a className="mt-3 inline-block text-tiffany" href={company.website}>{company.website.replace(/^https?:\/\//, '')}</a> : null}
      {company.phone ? <p className="mt-2">{company.phone}</p> : null}
      {company.notes ? <p className="mt-4 whitespace-pre-wrap text-cream-dim">{company.notes}</p> : null}
      <section className="mt-8">
        <h2 className="font-display text-[1.6rem] leading-none">People</h2>
        <ul>
          {people.map((person) => (
            <li key={person.id} className="border-b border-line">
              <Link to={`/people/${person.id}`} className="flex min-h-12 items-center">{person.name}</Link>
            </li>
          ))}
          {people.length === 0 ? <li className="mt-3 text-cream-dim">Nobody here.</li> : null}
        </ul>
      </section>
      <section className="mt-8">
        <h2 className="font-display text-[1.6rem] leading-none">Deals</h2>
        <ul>
          {deals.map((deal) => (
            <li key={deal.id} className="flex min-h-12 items-center justify-between gap-3 border-b border-line">
              <Link to={`/pipeline?deal=${deal.id}`}>{deal.title}</Link>
              <span className="text-[13px] text-cream-dim">{stageLabel(deal.stage)} · <span className="tabular-nums text-tiffany">{money(deal.value)}</span></span>
            </li>
          ))}
        </ul>
      </section>
      <Sheet open={edit} onOpenChange={setEdit} title="Edit">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void updateCompany(db, company, form, crm.contacts, crm.deals)
              .then(() => setEdit(false))
              .catch((error: unknown) => crm.setBanner(explainWrite(error)))
          }}
        >
          <Field label="Name"><input className={controlClass} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
          <Field label="Website"><input className={controlClass} value={form.website} onChange={(event) => setForm({ ...form, website: event.target.value })} /></Field>
          <Field label="Phone"><input className={controlClass} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field>
          <Field label="Notes"><textarea className={`${controlClass} min-h-24 py-3`} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field>
          <Button type="submit" className="w-full">Save</Button>
        </form>
        <button
          type="button"
          className="mt-3 min-h-11 w-full text-sm text-cream-dim"
          onClick={() => {
            void deleteCompany(db, company.id, crm.contacts, crm.deals)
              .then(() => navigate('/people?tab=companies'))
              .catch((error: unknown) => crm.setBanner(explainWrite(error)))
          }}
        >
          Remove company
        </button>
      </Sheet>
    </div>
  )
}

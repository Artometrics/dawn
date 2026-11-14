import { Button, controlClass, Field, PageTitle, Sheet } from '@/components/ui'
import { deleteDeal, moveDeal, saveDeal, type DealDraft } from '@/lib/api'
import { explainWrite } from '@/lib/auth'
import { useCrm } from '@/lib/crm'
import { useServices } from '@/lib/services'
import { useSession } from '@/lib/session'
import { money } from '@/lib/time'
import { STAGES, stageLabel, type Deal, type Stage } from '@/lib/types'
import { useEffect, useState, type DragEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

const finePointer = typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches

export function PipelinePage() {
  const { db } = useServices()
  const { user } = useSession()
  const { deals, contacts, ready, setBanner } = useCrm()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [openId, setOpenId] = useState<string | 'new' | null>(params.get('deal'))
  const openDeal = openId && openId !== 'new' ? deals.find((deal) => deal.id === openId) ?? null : null

  useEffect(() => {
    setOpenId(params.get('deal'))
  }, [params])

  function close() {
    setOpenId(null)
    if (params.get('deal')) navigate('/pipeline', { replace: true })
  }

  function dropOn(stage: Stage, event: DragEvent) {
    event.preventDefault()
    const id = event.dataTransfer.getData('text/plain')
    const deal = deals.find((item) => item.id === id)
    if (!deal || !user) return
    void moveDeal(db, user, deal, stage).catch((error: unknown) => setBanner(explainWrite(error)))
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <PageTitle>Pipeline</PageTitle>
        <button type="button" className="mb-1 min-h-11 text-sm font-semibold text-tiffany" onClick={() => setOpenId('new')}>Add</button>
      </div>
      {!ready ? <p className="mt-6 text-cream-dim">Opening the desk.</p> : null}
      <div className="mt-4 flex gap-3 overflow-x-auto snap-x snap-mandatory pb-4 md:grid md:grid-cols-5 md:overflow-visible">
        {STAGES.map((stage) => {
          const column = deals.filter((deal) => deal.stage === stage.id)
          return (
            <section
              key={stage.id}
              className="min-w-[78vw] snap-start border border-line p-3 md:min-w-0"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => dropOn(stage.id, event)}
            >
              <h2 className="font-display text-[1.4rem] leading-none">{stage.label}</h2>
              <p className="mt-1 text-[13px] text-cream-dim">{column.length}</p>
              <ul className="mt-3">
                {column.map((deal) => (
                  <li key={deal.id} className="border-t border-line">
                    <button
                      type="button"
                      draggable={finePointer}
                      onDragStart={(event) => {
                        event.dataTransfer.setData('text/plain', deal.id)
                        event.dataTransfer.effectAllowed = 'move'
                      }}
                      className="w-full py-3 text-left"
                      onClick={() => setOpenId(deal.id)}
                    >
                      <span className="block">{deal.title}</span>
                      <span className="mt-1 flex items-baseline justify-between gap-2 text-[13px]">
                        <span className="text-cream-dim">{deal.companyName || deal.contactName || '—'}</span>
                        <span className="tabular-nums text-tiffany">{money(deal.value)}</span>
                      </span>
                    </button>
                  </li>
                ))}
                {column.length === 0 ? <li className="pt-3 text-[13px] text-cream-dim">Empty</li> : null}
              </ul>
            </section>
          )
        })}
      </div>
      <DealSheet
        open={openId === 'new' || Boolean(openDeal)}
        deal={openId === 'new' ? null : openDeal}
        contacts={contacts}
        onClose={close}
      />
    </div>
  )
}

function DealSheet({
  open,
  deal,
  contacts,
  onClose,
}: {
  open: boolean
  deal: Deal | null
  contacts: { id: string; name: string; companyId: string; companyName: string }[]
  onClose: () => void
}) {
  const { db } = useServices()
  const { user } = useSession()
  const { setBanner } = useCrm()
  const [title, setTitle] = useState('')
  const [value, setValue] = useState('0')
  const [stage, setStage] = useState<Stage>('lead')
  const [contactId, setContactId] = useState('')

  useEffect(() => {
    if (!open) return
    setTitle(deal?.title ?? '')
    setValue(String(deal?.value ?? 0))
    setStage(deal?.stage ?? 'lead')
    setContactId(deal?.contactId ?? '')
  }, [deal, open])

  const person = contacts.find((item) => item.id === contactId)

  function draft(): DealDraft {
    return {
      title,
      value: Number(value),
      stage,
      contactId,
      contactName: person?.name ?? deal?.contactName ?? '',
      companyId: person?.companyId ?? (contactId ? deal?.companyId ?? '' : ''),
      companyName: person?.companyName ?? (contactId ? deal?.companyName ?? '' : ''),
    }
  }

  return (
    <Sheet open={open} onOpenChange={(next) => { if (!next) onClose() }} title={deal ? 'Deal' : 'New deal'}>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          if (!user) return
          try {
            const pending = saveDeal(db, user, deal, draft())
            onClose()
            void pending.catch((error: unknown) => setBanner(explainWrite(error)))
          } catch (error) {
            setBanner(explainWrite(error))
          }
        }}
      >
        <Field label="Title"><input className={controlClass} value={title} onChange={(event) => setTitle(event.target.value)} /></Field>
        <Field label="Value">
          <input className={`${controlClass} tabular-nums`} inputMode="numeric" value={value} onChange={(event) => setValue(event.target.value)} />
        </Field>
        <Field label="Person">
          <select className={controlClass} value={contactId} onChange={(event) => setContactId(event.target.value)}>
            <option value="">None</option>
            {contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name}</option>)}
          </select>
        </Field>
        <div className="mb-4 flex flex-wrap gap-2">
          {STAGES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`min-h-11 px-3 text-sm font-semibold ${stage === item.id ? 'bg-signal text-white' : 'bg-raise text-cream'}`}
              onClick={() => setStage(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <Button type="submit" className="w-full">Save</Button>
        {deal ? (
          <button
            type="button"
            className="mt-3 min-h-11 w-full text-sm text-cream-dim"
            onClick={() => {
              void deleteDeal(db, deal.id).then(onClose).catch((error: unknown) => setBanner(explainWrite(error)))
            }}
          >
            Remove {stageLabel(deal.stage).toLowerCase()}
          </button>
        ) : null}
      </form>
    </Sheet>
  )
}
